/**
 * Cron — weekly learning loop (Sundays 22:00 UTC).
 * Enqueues optimization jobs for all Brand Mode workspaces.
 * The Optimization Agent analyzes the past week, extracts patterns,
 * updates knowledge objects, and adjusts strategy weights.
 *
 * Also runs the Model Router auto-learning: recomputes per-model reliability
 * from model_routing_log and pushes overrides into the pure router registry
 * (cheap models that keep failing get down-ranked; steady ones stay favored).
 */
import { getServerSupabase } from '../_db.js'
import { enqueue } from '../_queue.js'
import { computeAndApplyLearnedRouting } from '../_providers/learned-routing.js'

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ queued: 0, message: 'Supabase not configured' })

  // Model Router auto-learning — runs regardless of workspace count (workspace-agnostic log).
  let routingLearn = null
  try {
    routingLearn = await computeAndApplyLearnedRouting({ lookbackDays: 14 })
  } catch (err) {
    console.error('[cron/learning-loop] router auto-learning failed:', err.message)
  }

  const { data: configs } = await db
    .from('workspace_config')
    .select('workspace_id')
    .eq('operating_mode', 'brand')
    .eq('learning_loop_enabled', true)

  const queued = []
  for (const cfg of configs || []) {
    const job = await enqueue({
      workspace_id: cfg.workspace_id,
      job_type: 'agent:optimization',
      payload: { trigger: 'weekly_learning_loop' },
      priority: 3,
      created_by: 'cron:learning-loop'
    })
    queued.push(job.id)
  }

  return res.status(200).json({
    queued: queued.length,
    job_ids: queued,
    routing_learn: routingLearn ? { applied: routingLearn.applied, cleared: routingLearn.cleared, models: routingLearn.models?.length || 0 } : null
  })
}
