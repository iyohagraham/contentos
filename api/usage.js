/**
 * GET /api/usage?workspace_id=&period=7d|30d|90d|all
 * Read-only spend + usage summary from model_routing_log: total cost, calls,
 * success rate, avg latency, and breakdowns by provider / model / task_type.
 * Powers a cost view. No-db safe (returns zeros).
 */
import { getServerSupabase, coerceWorkspaceId } from './_db.js'

function periodToSince(period) {
  const days = { '7d': 7, '30d': 30, '90d': 90, all: 365 * 5 }
  return new Date(Date.now() - (days[period] || 30) * 86400000).toISOString()
}

export default async function handler(req, res) {
  try {
    return await route(req, res)
  } catch (err) {
    console.error('[usage]', err)
    return res.status(500).json({ error: err.message })
  }
}

async function route(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, period = '30d' } = req.query
  const db = getServerSupabase()
  if (!db) return res.status(200).json({ mode: 'no-db', period, totals: { cost_usd: 0, calls: 0 }, byProvider: [], byModel: [], byTask: [] })

  const wsId = coerceWorkspaceId(workspace_id)
  const since = periodToSince(period)

  let q = db.from('model_routing_log')
    .select('provider, model, task_type, cost_usd, duration_ms, success')
    .gte('created_at', since)
  // workspace_id may be null (global) — only filter when we have a real one.
  if (wsId) q = q.eq('workspace_id', wsId)

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })

  const rows = data || []
  const agg = (keyFn) => {
    const m = {}
    for (const r of rows) {
      const k = keyFn(r) || 'unknown'
      m[k] = m[k] || { key: k, calls: 0, success: 0, cost_usd: 0, durations: [] }
      m[k].calls++
      if (r.success) m[k].success++
      m[k].cost_usd += Number(r.cost_usd) || 0
      if (r.duration_ms != null) m[k].durations.push(Number(r.duration_ms))
    }
    return Object.values(m).map((x) => ({
      key: x.key, calls: x.calls,
      success_rate: x.calls ? +(x.success / x.calls).toFixed(3) : 0,
      cost_usd: +x.cost_usd.toFixed(4),
      avg_ms: x.durations.length ? Math.round(x.durations.reduce((a, b) => a + b, 0) / x.durations.length) : null
    })).sort((a, b) => b.calls - a.calls)
  }

  const totalCost = rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)
  const totalSuccess = rows.filter((r) => r.success).length

  return res.status(200).json({
    period, since,
    totals: {
      cost_usd: +totalCost.toFixed(4),
      calls: rows.length,
      success_rate: rows.length ? +(totalSuccess / rows.length).toFixed(3) : 0
    },
    byProvider: agg((r) => r.provider),
    byModel: agg((r) => r.model),
    byTask: agg((r) => r.task_type)
  })
}
