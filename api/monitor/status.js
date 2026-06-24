/**
 * GET /api/monitor/status?workspace_id=<id>
 * Autonomous Brand Mode health snapshot for the monitoring dashboard.
 *
 * Aggregates the autonomous loop's state: operating mode + review gates, job-queue
 * health, recent agent runs, model-routing decisions, content pipeline counts,
 * open notifications, and recent learning insights. Read-only; degrades gracefully
 * when a table is missing or the DB isn't configured.
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ configured: false, message: 'Database not configured (localStorage mode)' })

  const ws = coerceWorkspaceId(req.query.workspace_id)
  const scoped = (q) => (ws ? q.eq('workspace_id', ws) : q.is('workspace_id', null))
  const count = async (table, build) => {
    try {
      let q = db.from(table).select('*', { count: 'exact', head: true })
      q = scoped(q)
      if (build) q = build(q)
      const { count: c } = await q
      return c || 0
    } catch { return 0 }
  }
  const rows = async (table, build) => {
    try {
      let q = db.from(table).select(build?.select || '*')
      q = scoped(q)
      if (build?.apply) q = build.apply(q)
      const { data } = await q
      return data || []
    } catch { return [] }
  }

  try {
    // --- Operating mode + review gates ---
    const cfgRes = await scoped(db.from('workspace_config').select('*')).limit(1).maybeSingle().catch(() => ({ data: null }))
    const cfg = cfgRes?.data || {}

    // --- Job queue health ---
    const [jPending, jRunning, jFailed, jDone] = await Promise.all([
      count('jobs', q => q.eq('status', 'pending')),
      count('jobs', q => q.eq('status', 'running')),
      count('jobs', q => q.eq('status', 'failed')),
      count('jobs', q => q.eq('status', 'completed'))
    ])

    // --- Recent agent runs (last 20) ---
    const agentRuns = await rows('agent_runs', {
      select: 'id, agent_type, status, duration_ms, created_at, error',
      apply: q => q.order('created_at', { ascending: false }).limit(20)
    })
    const runOk = agentRuns.filter(r => r.status === 'completed').length
    const runTotal = agentRuns.length || 1
    const agentSuccessRate = Math.round((runOk / runTotal) * 100)

    // --- Routing decisions (last 15) + provider mix ---
    const routing = await rows('model_routing_log', {
      select: 'task, provider, model, success, cost_usd, duration_ms, created_at',
      apply: q => q.order('created_at', { ascending: false }).limit(15)
    })
    const byProvider = {}
    for (const r of routing) byProvider[r.provider] = (byProvider[r.provider] || 0) + 1

    // --- Content pipeline counts ---
    const [drafts, mediaReady, scheduled, published, assembled] = await Promise.all([
      count('video_posts', q => q.in('status', ['idea', 'draft', 'ready'])),
      count('video_posts', q => q.in('status', ['media_ready', 'assembled'])),
      count('video_posts', q => q.eq('status', 'scheduled')),
      count('video_posts', q => q.eq('status', 'published')),
      count('video_posts', q => q.eq('status', 'assembled'))
    ])

    // --- Open notifications ---
    const notifications = await rows('notifications', {
      select: 'id, type, severity, title, body, status, created_at, data',
      apply: q => q.eq('status', 'open').order('created_at', { ascending: false }).limit(30)
    })
    const sev = { critical: 0, warning: 0, info: 0 }
    for (const n of notifications) sev[n.severity] = (sev[n.severity] || 0) + 1

    // --- Recent learning insights ---
    const insights = await rows('learning_insights', {
      select: 'id, title, recommendation, impact, created_at',
      apply: q => q.order('created_at', { ascending: false }).limit(5)
    })

    return res.status(200).json({
      configured: true,
      generated_at: new Date().toISOString(),
      operating_mode: cfg.operating_mode || 'creator',
      review_gates: {
        review_scripts: cfg.review_scripts ?? true,
        review_media: cfg.review_media ?? true,
        review_publish: cfg.review_publish ?? true
      },
      jobs: { pending: jPending, running: jRunning, failed: jFailed, completed: jDone },
      agents: { recent: agentRuns, success_rate: agentSuccessRate },
      routing: { recent: routing, by_provider: byProvider },
      content: { drafts, media_ready: mediaReady, scheduled, published, assembled },
      notifications: { open: notifications, counts: sev, total: notifications.length },
      insights
    })
  } catch (err) {
    console.error('[monitor/status]', err)
    return res.status(500).json({ error: err.message })
  }
}
