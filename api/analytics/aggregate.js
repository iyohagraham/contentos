/**
 * GET /api/analytics/aggregate?workspace_id=&period=7d|30d|90d|all
 * Cross-platform aggregation over post_analytics + platform_snapshots +
 * revenue_events for the period. Powers the Analytics dashboard.
 *
 * Returns: {
 *   totalViews, totalLikes, totalComments, totalShares, totalSaves,
 *   totalClicks, totalRevenue, avgEngagement, publishedCount, postsTracked,
 *   byPlatform: { [platform]: { views, likes, ..., posts } },
 *   byDate: [ { date, views } ],
 *   topPosts: [ { video_id, title, platform, views, ... } ],
 *   followerTrend: [ { date, platform, followers } ]
 * }
 *
 * Degrades gracefully: empty aggregates when Supabase isn't configured.
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'

function periodToSince(period) {
  const days = { '7d': 7, '30d': 30, '90d': 90, all: 365 * 5 }
  const d = days[period] || 30
  return new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, period = '30d' } = req.query
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ mode: 'no-db', totalViews: 0, byPlatform: {}, byDate: [], topPosts: [], followerTrend: [] })

  const wsId = coerceWorkspaceId(workspace_id)
  const since = periodToSince(period)

  // 1. Post-level metrics
  const { data: pa, error: paErr } = await db.from('post_analytics')
    .select('views, likes, comments, shares, saves, clicks, engagement_rate, platform, video_id, snapshot_date, performance_score')
    .eq('workspace_id', wsId)
    .gte('snapshot_date', since)

  if (paErr) return res.status(500).json({ error: paErr.message })

  // 2. Revenue events
  const { data: rev, error: revErr } = await db.from('revenue_events')
    .select('amount, currency, video_id, event_at')
    .eq('workspace_id', wsId)
    .gte('event_at', since)
  if (revErr) console.error('[analytics/aggregate] revenue fetch failed:', revErr.message)

  // 3. Published video count + titles for top posts
  const { data: vids } = await db.from('videos')
    .select('id, title')
    .eq('workspace_id', wsId)
    .eq('status', 'published')

  // 4. Follower trend (platform_snapshots)
  const { data: snaps, error: snapErr } = await db.from('platform_snapshots')
    .select('platform, snapshot_date, followers')
    .eq('workspace_id', wsId)
    .gte('snapshot_date', since)
  if (snapErr) console.error('[analytics/aggregate] snapshots fetch failed:', snapErr.message)

  const titleById = new Map((vids || []).map(v => [v.id, v.title]))

  // Aggregate
  const totals = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, revenue: 0 }
  const byPlatform = {}
  const byDate = {}
  const topPosts = {}

  for (const r of (pa || [])) {
    const p = r.platform || 'unknown'
    totals.views += r.views || 0
    totals.likes += r.likes || 0
    totals.comments += r.comments || 0
    totals.shares += r.shares || 0
    totals.saves += r.saves || 0
    totals.clicks += r.clicks || 0

    byPlatform[p] = byPlatform[p] || { views: 0, likes: 0, comments: 0, shares: 0, posts: 0, engagement: [] }
    byPlatform[p].views += r.views || 0
    byPlatform[p].likes += r.likes || 0
    byPlatform[p].comments += r.comments || 0
    byPlatform[p].shares += r.shares || 0
    byPlatform[p].posts += 1
    if (r.engagement_rate) byPlatform[p].engagement.push(r.engagement_rate)

    byDate[r.snapshot_date] = (byDate[r.snapshot_date] || 0) + (r.views || 0)

    if (r.video_id) {
      const k = `${r.video_id}|${p}`
      topPosts[k] = topPosts[k] || { video_id: r.video_id, platform: p, views: 0, score: 0 }
      topPosts[k].views += r.views || 0
      topPosts[k].score = Math.max(topPosts[k].score, r.performance_score || 0)
    }
  }

  for (const r of (rev || [])) totals.revenue += Number(r.amount) || 0

  const totalViews = totals.views
  const avgEngagement = (pa && pa.length)
    ? parseFloat((pa.reduce((s, r) => s + (r.engagement_rate || 0), 0) / pa.length * 100).toFixed(1))
    : 0

  // Finalize per-platform avg engagement
  for (const p of Object.keys(byPlatform)) {
    const e = byPlatform[p].engagement
    byPlatform[p].avgEngagement = e.length ? parseFloat((e.reduce((s, x) => s + x, 0) / e.length * 100).toFixed(1)) : 0
    delete byPlatform[p].engagement
  }

  const byDateArr = Object.entries(byDate)
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const topPostsArr = Object.values(topPosts)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map(p => ({ ...p, title: titleById.get(p.video_id) || 'Untitled' }))

  const followerTrend = (snaps || []).map(s => ({ date: s.snapshot_date, platform: s.platform, followers: s.followers || 0 }))

  return res.status(200).json({
    period,
    since,
    postsTracked: (pa || []).length,
    publishedCount: vids?.length || 0,
    totalViews,
    totalLikes: totals.likes,
    totalComments: totals.comments,
    totalShares: totals.shares,
    totalSaves: totals.saves,
    totalClicks: totals.clicks,
    totalRevenue: parseFloat(totals.revenue.toFixed(2)),
    avgEngagement,
    byPlatform,
    byDate: byDateArr,
    topPosts: topPostsArr,
    followerTrend
  })
}