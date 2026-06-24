/**
 * Notification Agent — surfaces what needs operator attention in Autonomous Brand Mode.
 *
 * Pure DB scan (no AI keys required): detects failures and content waiting at a
 * review gate, writes de-duplicated rows to `notifications`, and returns a digest.
 * Runs on the same queue/cron path as the other agents.
 *
 * Inputs: { workspace_id, lookback_hours?, job_id }
 * Output: { created, failures, approvals_needed, open_total, summary }
 */
import { runAgent } from './_base.js'
import { coerceWorkspaceId } from '../_db.js'

const FAILED_VIDEO_STATUSES = ['publish_failed', 'assembly_failed', 'media_partial', 'publish_no_channels', 'assembly_manifest', 'rendered_unpersisted']

export default async function notificationAgent({ workspace_id, lookback_hours = 24, job_id } = {}) {
  return runAgent({
    agentType: 'notification',
    workspaceId: workspace_id,
    inputs: { lookback_hours, job_id },
    // No `task` → runAgent skips RAG retrieval (this agent needs no AI).
    run: async ({ db }) => {
      if (!db) return { created: 0, failures: 0, approvals_needed: 0, open_total: 0, summary: 'No database configured', alerts: [] }

      const ws = coerceWorkspaceId(workspace_id)
      const since = new Date(Date.now() - lookback_hours * 3600 * 1000).toISOString()
      const alerts = []

      // --- Failures: jobs ---
      const { data: failedJobs } = await wsQuery(db, 'jobs', ws)
        .eq('status', 'failed').gte('updated_at', since).limit(50)
      for (const j of failedJobs || []) {
        alerts.push({
          type: 'failure', severity: 'critical',
          title: `Job failed: ${j.job_type || 'unknown'}`,
          body: j.last_error || j.error || 'A queued job failed after its retries.',
          dedupe_key: `failed_job:${j.id}`,
          data: { job_id: j.id, job_type: j.job_type }
        })
      }

      // --- Failures: agent runs ---
      const { data: failedRuns } = await wsQuery(db, 'agent_runs', ws)
        .eq('status', 'failed').gte('created_at', since).limit(50)
      for (const r of failedRuns || []) {
        alerts.push({
          type: 'failure', severity: 'warning',
          title: `Agent failed: ${r.agent_type || 'unknown'}`,
          body: r.error || 'An agent run failed.',
          dedupe_key: `failed_run:${r.id}`,
          data: { agent_run_id: r.id, agent_type: r.agent_type }
        })
      }

      // --- Failures: stuck/failed content ---
      const { data: failedVideos } = await wsQuery(db, 'video_posts', ws)
        .in('status', FAILED_VIDEO_STATUSES).limit(50)
      for (const v of failedVideos || []) {
        alerts.push({
          type: 'failure', severity: 'warning',
          title: `Content stalled: ${truncate(v.title, 60)}`,
          body: `Video ${v.id} is in state "${v.status}"${v.publish_error || v.assembly_error ? ': ' + (v.publish_error || v.assembly_error) : ''}.`,
          dedupe_key: `stalled_video:${v.id}:${v.status}`,
          data: { video_id: v.id, status: v.status }
        })
      }

      // --- Approvals needed (driven by the workspace review gates) ---
      const cfgRes = await wsQuery(db, 'workspace_config', ws).limit(1).maybeSingle()
      const gates = cfgRes?.data || {}
      const gateMap = [
        { on: gates.review_scripts, statuses: ['ready'], label: 'script ready for review' },
        { on: gates.review_media, statuses: ['media_ready'], label: 'media ready for review' },
        { on: gates.review_publish, statuses: ['scheduled'], label: 'scheduled — awaiting publish approval' }
      ]
      let approvalsNeeded = 0
      for (const g of gateMap) {
        if (!g.on) continue
        const { data: waiting } = await wsQuery(db, 'video_posts', ws).in('status', g.statuses).limit(50)
        for (const v of waiting || []) {
          approvalsNeeded++
          alerts.push({
            type: 'approval_needed', severity: 'info',
            title: `Approval needed: ${truncate(v.title, 60)}`,
            body: `"${truncate(v.title, 80)}" is ${g.label}.`,
            dedupe_key: `approval:${v.id}:${v.status}`,
            data: { video_id: v.id, status: v.status }
          })
        }
      }

      // --- De-dupe against existing OPEN notifications, then insert the new ones ---
      let created = 0
      if (alerts.length) {
        const keys = alerts.map(a => a.dedupe_key)
        const { data: existing } = await wsQuery(db, 'notifications', ws)
          .eq('status', 'open').in('dedupe_key', keys)
        const seen = new Set((existing || []).map(e => e.dedupe_key))
        const fresh = alerts.filter(a => !seen.has(a.dedupe_key))
        if (fresh.length) {
          const rows = fresh.map(a => ({ ...a, workspace_id: ws, status: 'open' }))
          const { data: ins } = await db.from('notifications').insert(rows).select('id')
          created = ins?.length || fresh.length
        }
      }

      // --- Current open total ---
      const { count: openTotal } = await wsQuery(db, 'notifications', ws, '*', { count: 'exact', head: true })
        .eq('status', 'open')

      const failures = alerts.filter(a => a.type === 'failure').length
      const summary = `${failures} failure(s), ${approvalsNeeded} awaiting approval; ${created} new alert(s) created.`

      return { created, failures, approvals_needed: approvalsNeeded, open_total: openTotal || 0, summary, alerts }
    }
  })
}

/** Build a workspace-scoped query (null ws → global rows). */
function wsQuery(db, table, ws, select = '*', opts) {
  let q = db.from(table).select(select, opts)
  q = ws ? q.eq('workspace_id', ws) : q.is('workspace_id', null)
  return q
}

function truncate(s, n) {
  const str = String(s || 'untitled')
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}
