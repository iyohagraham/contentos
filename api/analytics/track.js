/**
 * POST /api/analytics/track
 * Ingest a performance data point for a published post. Also used manually to
 * back-fill metrics a platform webhook or scraper pulled in.
 *
 * Body: {
 *   workspace_id,
 *   video_post_id,                 required (the per-platform publishing record)
 *   video_id?,                     derived from video_post if omitted
 *   platform,                      video_post.platform used when omitted
 *   snapshot_date?,                defaults today (YYYY-MM-DD)
 *   views?, likes?, comments?, shares?, saves?, clicks?,
 *   unique_views?, watch_time_seconds?, completion_rate?,
 *   revenue?,                      optional — writes a revenue_event row too
 * }
 *
 * Idempotent: upserts on (video_post_id, snapshot_date).
 * Degrades gracefully without Supabase (returns 503 with the validated payload).
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'

function todayUTC() { return new Date().toISOString().slice(0, 10) }

function computeEngagementRate(m) {
  const interactions = (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0)
  const views = m.views || 0
  return views > 0 ? parseFloat((interactions / views).toFixed(4)) : 0
}

function computePerformanceScore(m) {
  const views = m.views || 0
  const eng = m.engagement_rate || computeEngagementRate(m)
  const viewScore = Math.min(views / 100000, 1) * 0.5
  const engScore = Math.min(eng / 0.1, 1) * 0.5
  return parseFloat((viewScore + engScore).toFixed(2))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body || {}
  const { workspace_id, video_post_id, video_id, platform, snapshot_date,
    revenue, ...metrics } = body

  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })
  if (!video_post_id) return res.status(400).json({ error: 'video_post_id required' })

  const db = getServerSupabase()
  if (!db) return res.status(503).json({ error: 'Supabase not configured' })

  const wsId = coerceWorkspaceId(workspace_id)
  const date = snapshot_date || todayUTC()

  // Resolve video_id + platform from video_posts when not supplied.
  let resolvedVideoId = video_id || null
  let resolvedPlatform = platform || null
  if (!resolvedVideoId || !resolvedPlatform) {
    const { data: vp } = await db.from('video_posts')
      .select('id, platform, video_id')
      .eq('id', video_post_id)
      .maybeSingle()
    if (vp) {
      resolvedVideoId = resolvedVideoId || vp.video_id
      resolvedPlatform = resolvedPlatform || vp.platform
    }
  }

  const engagement_rate = computeEngagementRate(metrics)

  const row = {
    workspace_id: wsId,
    video_id: resolvedVideoId,
    video_post_id,
    platform: resolvedPlatform || 'unknown',
    snapshot_date: date,
    views: Number(metrics.views) || 0,
    unique_views: Number(metrics.unique_views) || 0,
    likes: Number(metrics.likes) || 0,
    comments: Number(metrics.comments) || 0,
    shares: Number(metrics.shares) || 0,
    saves: Number(metrics.saves) || 0,
    clicks: Number(metrics.clicks) || 0,
    engagement_rate,
    watch_time_seconds: Number(metrics.watch_time_seconds) || 0,
    completion_rate: Number(metrics.completion_rate) || 0,
    performance_score: computePerformanceScore({ ...metrics, engagement_rate })
  }

  const { data, error } = await db.from('post_analytics')
    .upsert(row, { onConflict: 'video_post_id,snapshot_date' })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })

  // Optional revenue event (e.g. an affiliate click attributed to this post).
  let revenue_event = null
  if (revenue != null && revenue !== '' && resolvedVideoId) {
    const revRow = {
      workspace_id: wsId,
      video_id: resolvedVideoId,
      amount: Number(revenue) || 0,
      currency: body.currency || 'USD',
      attribution_method: body.attribution_method || 'platform_native',
      attribution_confidence: Number(body.attribution_confidence) || 0.7,
      referring_platform: resolvedPlatform,
      event_at: new Date().toISOString()
    }
    const { data: rev } = await db.from('revenue_events').insert(revRow).select().single()
    revenue_event = rev
  }

  return res.status(200).json({ tracked: true, analytics: data, revenue_event })
}