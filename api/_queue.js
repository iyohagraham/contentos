/**
 * Job Queue — enqueue and manage async jobs via Supabase.
 * Agents communicate through this queue; no direct agent-to-agent calls.
 *
 * Job types:
 *   agent:strategy, agent:research, agent:analysis, agent:planning,
 *   agent:writing, agent:media, agent:publishing, agent:analytics,
 *   agent:optimization, agent:monetization, agent:notification,
 *   knowledge:ingest, research:scan, intelligence:analyze,
 *   production:assemble, publish:distribute
 */
import { getServerSupabase } from './_db.js'

/**
 * Enqueue a new job.
 */
export async function enqueue({
  workspace_id,
  job_type,
  payload = {},
  priority = 0,
  created_by = 'system',
  scheduled_for = null,
  max_retries = 3
}) {
  const db = getServerSupabase()
  if (!db) {
    // No Supabase — run inline (development mode)
    return { id: `local_${Date.now()}`, status: 'pending', job_type, payload }
  }
  const { data, error } = await db.from('jobs').insert({
    workspace_id,
    job_type,
    payload,
    priority,
    created_by,
    max_retries,
    scheduled_for: scheduled_for || new Date().toISOString(),
    status: 'pending'
  }).select().single()
  if (error) throw error
  return data
}

/**
 * Claim the next pending job (atomic lock).
 * Returns null if no jobs available.
 */
export async function claimNext(workspaceId = null, jobTypes = null) {
  const db = getServerSupabase()
  if (!db) return null

  // Atomic claim: find pending job and lock it in one operation
  let query = db.from('jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)

  if (workspaceId) query = query.eq('workspace_id', workspaceId)
  if (jobTypes?.length) query = query.in('job_type', jobTypes)

  const { data: jobs } = await query
  if (!jobs?.length) return null

  const job = jobs[0]
  const { data: locked, error } = await db.from('jobs')
    .update({ status: 'running', locked_at: new Date().toISOString(), started_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'pending') // only lock if still pending (race protection)
    .select().single()

  if (error || !locked) return null // another worker got it
  return locked
}

/**
 * Mark a job complete with its result.
 */
export async function complete(jobId, result = {}) {
  const db = getServerSupabase()
  if (!db) return
  await db.from('jobs').update({
    status: 'completed',
    result,
    completed_at: new Date().toISOString()
  }).eq('id', jobId)
}

/**
 * Mark a job failed, with retry logic.
 */
export async function fail(jobId, errorMessage) {
  const db = getServerSupabase()
  if (!db) return
  const { data: job } = await db.from('jobs').select('retry_count, max_retries').eq('id', jobId).single()
  const retryCount = (job?.retry_count || 0) + 1
  const maxRetries = job?.max_retries || 3
  const status = retryCount >= maxRetries ? 'failed' : 'pending'
  const backoffSeconds = Math.pow(2, retryCount) * 30 // 30s, 60s, 120s
  const scheduledFor = status === 'pending'
    ? new Date(Date.now() + backoffSeconds * 1000).toISOString()
    : null

  await db.from('jobs').update({
    status,
    error: errorMessage,
    retry_count: retryCount,
    ...(scheduledFor ? { scheduled_for: scheduledFor } : {})
  }).eq('id', jobId)
}

/**
 * Log a message for a job.
 */
export async function log(jobId, message, data = null, level = 'info') {
  const db = getServerSupabase()
  if (!db) return
  await db.from('job_logs').insert({ job_id: jobId, level, message, data })
}

export const queue = { enqueue, claimNext, complete, fail, log }
export default queue
