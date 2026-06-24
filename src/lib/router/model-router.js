/**
 * Model Router — the brain that turns a MediaRequest into a generated asset.
 *
 * PURE module: no imports from api/, no process.env, no node-only APIs. The real
 * provider adapters and the DB decision-logger are INJECTED at runtime (see
 * api/_providers/router-adapters.js). The frontend can import route() for a
 * preview of the decision without pulling in any server code.
 *
 *   route(request)    -> { provider, model, providerModelId, score, type, task, candidates }
 *   generate(request) -> provider asset, normalized to at least { url, provider, model }
 *   setRoutingLogger(fn)
 *
 * generate() tries candidates in ranked order: a missing adapter or a provider
 * failure automatically falls through to the next-best model (reliability for free).
 */
import { getModelsForTask } from './model-registry.js'
import { rankModels } from './scoring-engine.js'
import { resolveWeights, taskToType } from './routing-rules.js'
import { isProviderEnabled, getAdapter } from './provider-registry.js'

/** @type {((decision: object) => (void|Promise<void>))|null} */
let _logger = null

/**
 * Register a sink for routing decisions. The logger must never throw — generate()
 * wraps it in a guard — and is a no-op until a server sets it.
 * @param {(decision: object) => (void|Promise<void>)} fn
 */
export function setRoutingLogger(fn) {
  _logger = typeof fn === 'function' ? fn : null
}

/**
 * Rank the available candidate models for a request.
 * Filters to enabled models whose provider is enabled, then scores by weights.
 */
function rankedCandidates(request) {
  const { task, priority = 'balanced', quality = 'standard' } = request || {}
  const type = taskToType(task)
  const pool = getModelsForTask(task).filter(
    (m) => m.enabled !== false && isProviderEnabled(m.provider)
  )
  const weights = resolveWeights(priority, quality)
  return { type, ranked: rankModels(pool, weights) }
}

/**
 * Pure routing decision — pick the best provider+model for the request.
 * @param {object} request - { task, priority?, quality? , ... }
 * @returns {{ provider, model, providerModelId, score, type, task, candidates }}
 */
export function route(request = {}) {
  const { task } = request
  if (!task) throw new Error('route: request.task is required')
  const { type, ranked } = rankedCandidates(request)
  if (!ranked.length) throw new Error(`route: no available model for task "${task}"`)
  const winner = ranked[0]
  return {
    provider: winner.model.provider,
    model: winner.model.id,
    providerModelId: winner.model.providerModelId,
    score: winner.score,
    type,
    task,
    candidates: ranked.map((r) => ({ provider: r.model.provider, model: r.model.id, score: r.score }))
  }
}

/**
 * Route + generate. Iterates candidates in ranked order; the first provider with
 * a registered adapter that succeeds wins. Every attempt is logged.
 * @param {object} request - { type?, task, priority?, quality?, prompt?, imageUrl?, ... }
 * @returns {Promise<object>} provider asset + { provider, model }
 */
export async function generate(request = {}) {
  const { task, priority = 'balanced', quality = 'standard' } = request
  if (!task) throw new Error('generate: request.task is required')
  const { type, ranked } = rankedCandidates(request)
  if (!ranked.length) throw new Error(`generate: no available model for task "${task}"`)

  const candidates = ranked.map((r) => ({ provider: r.model.provider, model: r.model.id, score: r.score }))
  let lastError = null

  for (const cand of ranked) {
    const adapter = getAdapter(cand.model.provider)
    if (!adapter) {
      lastError = new Error(`no adapter registered for provider "${cand.model.provider}"`)
      continue
    }
    const startedAt = Date.now()
    try {
      const asset = await adapter({
        ...request,
        type,
        model: cand.model.id,
        providerModelId: cand.model.providerModelId
      })
      await logDecision({
        task, task_type: type, priority, quality,
        provider: cand.model.provider, model: cand.model.id,
        candidates, selected_score: cand.score,
        cost_usd: asset?.cost ?? null, duration_ms: Date.now() - startedAt,
        success: true, error: null, workspace_id: request.workspaceId || null
      })
      return { ...asset, provider: cand.model.provider, model: cand.model.id }
    } catch (err) {
      lastError = err
      await logDecision({
        task, task_type: type, priority, quality,
        provider: cand.model.provider, model: cand.model.id,
        candidates, selected_score: cand.score,
        cost_usd: null, duration_ms: Date.now() - startedAt,
        success: false, error: err?.message || String(err), workspace_id: request.workspaceId || null
      })
      // fall through to the next candidate
    }
  }

  throw new Error(`generate: all candidates failed for task "${task}": ${lastError?.message || 'no adapters registered'}`)
}

/** Fire the injected logger; logging must NEVER block or break generation. */
async function logDecision(decision) {
  if (!_logger) return
  try {
    await _logger(decision)
  } catch {
    /* swallow — logging is best-effort */
  }
}
