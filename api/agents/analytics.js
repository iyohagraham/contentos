/**
 * Analytics Agent
 * Syncs post performance from platforms and generates snapshots.
 * Runs daily. Currently mocks platform data (real API integration requires OAuth).
 *
 * Input: { workspace_id, lookback_days? }
 */
import { runAgent } from './_base.js'

export default async function run(payload, { jobId } = {}) {
  const { workspace_id, lookback_days = 30 } = payload

  return runAgent({
    agentType: 'analytics',
    workspaceId: workspace_id,
    inputs: payload,
    jobId,
    task: 'analytics performance tracking metrics',
    run: async ({ db }) => {
      if (!db) return { message: 'Supabase required for analytics agent' }

      const since = new Date(Date.now() - lookback_days * 86400000).toISOString().slice(0, 10)

      // Get published posts without recent analytics sync
      const { data: posts } = await db
        .from('video_posts')
        .select('*, videos(id, workspace_id, title)')
        .eq('videos.workspace_id', workspace_id)
        .eq('status', 'published')
        .gte('posted_at', since)

      if (!posts?.length) return { updated_posts: 0, new_snapshots: 0 }

      let updated = 0
      const today = new Date().toISOString().slice(0, 10)

      for (const post of posts) {
        // In production: call platform APIs (YouTube Data API, TikTok API, etc.)
        // For now: sync the metrics already stored on video_posts
        const { error } = await db.from('post_analytics').upsert({
          workspace_id,
          video_id: post.videos?.id,
          video_post_id: post.id,
          platform: post.platform,
          snapshot_date: today,
          views: post.views || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          saves: post.saves || 0,
          clicks: post.clicks || 0,
          engagement_rate: post.engagement_rate || 0,
          performance_score: computePerformanceScore(post)
        }, { onConflict: 'video_post_id,snapshot_date' })

        if (!error) updated++
      }

      // Update platform_snapshots for each channel
      const { data: channels } = await db.from('channels').select('id, platform, followers').eq('workspace_id', workspace_id)
      let snapshots = 0
      for (const ch of channels || []) {
        const { error } = await db.from('platform_snapshots').upsert({
          workspace_id, channel_id: ch.id, platform: ch.platform,
          snapshot_date: today, followers: ch.followers || 0
        }, { onConflict: 'channel_id,snapshot_date' })
        if (!error) snapshots++
      }

      return { updated_posts: updated, new_snapshots: snapshots }
    }
  })
}

function computePerformanceScore(post) {
  const views = post.views || 0
  const engagement = post.engagement_rate || 0
  // Normalize: views component (0-0.5) + engagement component (0-0.5)
  const viewScore = Math.min(views / 100000, 1) * 0.5
  const engScore = Math.min(engagement / 0.1, 1) * 0.5
  return parseFloat((viewScore + engScore).toFixed(2))
}

export async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const result = await run(req.body)
    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
