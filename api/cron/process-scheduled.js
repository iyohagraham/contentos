/**
 * Vercel Cron job - processes scheduled posts that are due.
 * Configured in vercel.json to run every 5 minutes.
 *
 * Reads due posts from the `videos` table (status='scheduled',
 * scheduled_time <= now), publishes them via the social manager,
 * and updates their status.
 */

import { createClient } from '@supabase/supabase-js'
import socialMediaManager from '../../src/lib/social/manager.js'

export default async function handler(req, res) {
  // Protect the cron endpoint with a secret
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      processed: 0,
      message: 'Supabase not configured - no scheduled posts to process'
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const now = new Date().toISOString()

  try {
    // Find due posts
    const { data: duePosts, error } = await supabase
      .from('videos')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)

    if (error) throw error

    const results = []

    for (const video of duePosts || []) {
      const platforms = video.target_platforms || []

      try {
        const result = await socialMediaManager.postToMultiple(
          platforms,
          video.video_url,
          { caption: video.title }
        )

        await supabase
          .from('videos')
          .update({
            status: result.success ? 'published' : 'failed',
            published_at: result.success ? now : null
          })
          .eq('id', video.id)

        results.push({ id: video.id, title: video.title, success: result.success })
      } catch (postError) {
        await supabase.from('videos').update({ status: 'failed' }).eq('id', video.id)
        results.push({ id: video.id, title: video.title, success: false, error: postError.message })
      }
    }

    return res.status(200).json({
      processed: results.length,
      results,
      timestamp: now
    })
  } catch (error) {
    console.error('Cron error:', error)
    return res.status(500).json({ error: error.message })
  }
}