/**
 * Cron — weekly research scan (Sundays 08:00 UTC).
 * Enqueues research jobs for all Brand Mode workspaces.
 */
import { getServerSupabase } from '../_db.js'
import { enqueue } from '../_queue.js'

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ queued: 0, message: 'Supabase not configured' })

  // Find all Brand Mode workspaces with research_scan_enabled
  const { data: configs } = await db
    .from('workspace_config')
    .select('workspace_id, competitor_urls')
    .eq('operating_mode', 'brand')
    .eq('research_scan_enabled', true)

  if (!configs?.length) return res.status(200).json({ queued: 0 })

  const queued = []
  for (const cfg of configs) {
    // Enqueue competitor research
    const job = await enqueue({
      workspace_id: cfg.workspace_id,
      job_type: 'agent:research',
      payload: {
        query_type: 'competitors',
        target_urls: cfg.competitor_urls || []
      },
      priority: 2,
      created_by: 'cron:research-scan'
    })
    queued.push(job.id)

    // Enqueue trend research
    const trendJob = await enqueue({
      workspace_id: cfg.workspace_id,
      job_type: 'agent:research',
      payload: { query_type: 'trends' },
      priority: 1,
      created_by: 'cron:research-scan'
    })
    queued.push(trendJob.id)
  }

  return res.status(200).json({ queued: queued.length, job_ids: queued })
}
