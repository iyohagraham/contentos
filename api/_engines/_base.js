/**
 * Engine base — the universal interface every ContentOS engine implements.
 *
 * ContentOS v2.0 is an AI Media Operating System composed of single-responsibility
 * ENGINES that communicate ONLY through structured JSON contracts (see
 * api/_contracts/). No engine imports another engine's internals; they exchange
 * contract objects. Every engine is independently upgradeable and provider-agnostic.
 *
 * An engine is a plain object created by `defineEngine({...})`:
 *   {
 *     id, name, responsibility, status: 'live'|'stub',
 *     inputs:  [contractName...],   // JSON contracts it consumes
 *     outputs: [contractName...],   // JSON contracts it produces
 *     run(input, ctx) -> Promise<output>   // the single entry point
 *   }
 *
 * `run` MUST:
 *   - accept a structured JSON input (validated against its declared input contract)
 *   - return a structured JSON output (shaped by its declared output contract)
 *   - never call a provider directly — go through a Router (Media/Voice/Music)
 *   - never throw for "not implemented": a stub returns { _stub: true, ... }
 *
 * ctx carries cross-cutting services (db, workspaceId, logger, routers) so engines
 * stay pure of secrets/wiring — exactly like the Model Router pattern.
 */

/**
 * @typedef {Object} EngineContext
 * @property {string} workspaceId
 * @property {object|null} db            server Supabase client (or null in localStorage mode)
 * @property {(msg: string, data?: object) => void} [log]
 * @property {object} [routers]          injected { media, voice, music } routers
 */

/**
 * @typedef {Object} EngineDefinition
 * @property {string} id                 stable engine id, e.g. 'storyboard'
 * @property {string} name               human label, e.g. 'Storyboard Engine'
 * @property {string} responsibility     one-sentence single responsibility
 * @property {'live'|'stub'} [status]    'live' = implemented, 'stub' = contract-only
 * @property {string[]} [inputs]         contract names consumed
 * @property {string[]} [outputs]        contract names produced
 * @property {(input: object, ctx: EngineContext) => Promise<object>} run
 */

/**
 * Define an engine. Wraps `run` with light guarantees:
 *   - injects a default no-op logger
 *   - tags stub outputs with { _stub: true } when status === 'stub' and the
 *     engine didn't already say so
 *   - never lets a missing ctx crash the engine
 * @param {EngineDefinition} def
 * @returns {EngineDefinition & { run: (input?: object, ctx?: EngineContext) => Promise<object> }}
 */
export function defineEngine(def) {
  if (!def || !def.id || typeof def.run !== 'function') {
    throw new Error('defineEngine: { id, run } are required')
  }
  const status = def.status || 'live'
  const wrappedRun = async (input = {}, ctx = {}) => {
    const context = {
      workspaceId: ctx.workspaceId || null,
      db: ctx.db || null,
      log: ctx.log || (() => {}),
      routers: ctx.routers || {}
    }
    const out = await def.run(input || {}, context)
    if (status === 'stub' && out && typeof out === 'object' && out._stub === undefined) {
      return { ...out, _stub: true, _engine: def.id }
    }
    return out
  }
  return {
    id: def.id,
    name: def.name || def.id,
    responsibility: def.responsibility || '',
    status,
    inputs: def.inputs || [],
    outputs: def.outputs || [],
    run: wrappedRun
  }
}

/**
 * Helper for stub engines: a structured, honest "not yet implemented" output that
 * still respects the declared output contract shape (callers can keep flowing).
 * @param {string} engineId
 * @param {object} [partial] partial contract-shaped data to merge
 */
export function stubOutput(engineId, partial = {}) {
  return {
    _stub: true,
    _engine: engineId,
    message: `${engineId} engine is a contract stub — interface defined, implementation pending`,
    ...partial
  }
}