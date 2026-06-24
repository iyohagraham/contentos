/**
 * Auto-learning for the Model Router — reads the decision history in
 * model_routing_log and pushes runtime reliability overrides into the PURE
 * router (via model-registry.setModelOverride). The server bootstrap injects
 * these exactly like it injects adapters/enabled flags — the router stays clean.
 *
 *   computeAndApplyLearnedRouting({ lookbackDays })  -> reads log, applies overrides
 *   getLearnedScores()                              -> { model, calls, successRate,
 *                                                      learnedReliability, static } (read-only)
 *
 * Reliability mapping (success rate over recent calls, min sample = 8):
 *   rate >= 0.98 -> 10
 *   >= 0.95      -> 9
 *   >= 0.90      -> 8
 *   >= 0.80      -> 7
 *   >= 0.65      -> 6
 *   <  0.65      -> 4   (heavily down-rank so the router falls through to the
 *                        next-best candidate)
 *
 * Called by the weekly learning-loop cron and the manual /api/router/learn.
 * Degrades gracefully: no Supabase / no rows -> overrides cleared (revert to static).
 */
import { getServerSupabase } from '../_db.js'
import { setModelOverride, clearModelOverrides, getModelById } from '../../src/lib/router/model-registry.js'

const MIN_SAMPLE = 8
const LOOKBACK_DEFAULT_DAYS = 14

function rateToReliability(rate) {
  if (rate >= 0.98) return 10
  if (rate >= 0.95) return 9
  if (rate >= 0.90) return 8
  if (rate >= 0.80) return 7
  if (rate >= 0.65) return 6
  return 4
}

/**
 * Read model_routing_log for the lookback window, group by model, and apply
 * reliability overrides. Returns a summary of what was applied.
 * @param {{ lookbackDays?: number }} [opts]
 * @returns {Promise<{ applied: number, cleared: boolean, models: object[], from: string }>}
 */
export async function computeAndApplyLearnedRouting({ lookbackDays = LOOKBACK_DEFAULT_DAYS } = {}) {
  const db = getServerSupabase()
  const from = new Date(Date.now() - lookbackDays * 86400000).toISOString()

  if (!db) {
    clearModelOverrides()
    return { applied: 0, cleared: true, models: [], from, reason: 'no_supabase' }
  }

  const { data: rows, error } = await db.from('model_routing_log')
    .select('model, provider, success, duration_ms, error, created_at')
    .gte('created_at', from)

  if (error) throw error

  if (!rows || rows.length === 0) {
    clearModelOverrides()
    return { applied: 0, cleared: true, models: [], from, reason: 'empty' }
  }

  // Group by model + count successes/attempts.
  const stats = {}
  for (const r of rows) {
    const id = r.model
    if (!id) continue
    stats[id] = stats[id] || { model: id, provider: r.provider, total: 0, success: 0, failures: 0, durations: [] }
    stats[id].total += 1
    if (r.success) stats[id].success += 1
    else stats[id].failures += 1
    if (r.duration_ms != null) stats[id].durations.push(Number(r.duration_ms))
  }

  const models = []
  let applied = 0
  for (const [id, s] of Object.entries(stats)) {
    const staticRec = getModelById(id)
    const staticReliability = staticRec?.reliabilityScore ?? null
    const successRate = s.total > 0 ? s.success / s.total : null
    const avgDuration = s.durations.length ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length) : null

    if (s.total >= MIN_SAMPLE && successRate != null) {
      const learned = rateToReliability(successRate)
      setModelOverride(id, { reliabilityScore: learned })
      applied += 1
      models.push({ ...s, successRate: parseFloat(successRate.toFixed(3)), learnedReliability: learned, staticReliability, avgDurationMs: avgDuration, overridden: true })
    } else {
      // Not enough data to override — leave static; but surface for visibility.
      models.push({ ...s, successRate: successRate != null ? parseFloat(successRate.toFixed(3)) : null, staticReliability, avgDurationMs: avgDuration, overridden: false })
    }
  }

  return { applied, cleared: false, models, from, lookbackDays }
}

/** Read-only summary of current effective vs static reliability per model with log backing. */
export async function getLearnedScores({ lookbackDays = LOOKBACK_DEFAULT_DAYS } = {}) {
  return computeAndApplyLearnedRouting({ lookbackDays })
}