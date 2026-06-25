/**
 * Engine invoker — the single place that maps an engine_id to its module and runs
 * it with an EngineContext. Used by /api/engines, /api/studio/*, and agents.
 *
 * Only standalone engine modules are listed here (the ones under api/_engines/*).
 * 'live (existing)' engines whose responsibility is served by other code
 * (knowledge/strategy/story/media_router/voice/rendering/publishing/analytics/
 * learning/asset_manager) are invoked through their existing endpoints, not here.
 */
import { getServerSupabase } from '../_db.js'

const MODULES = {
  // standalone engines
  composition: () => import('./composition/hyperframes.js'),
  creative_director: () => import('./creative-director.js'),
  style: () => import('./style.js'),
  universe: () => import('./universe.js'),
  character: () => import('./character.js'),
  brand: () => import('./brand.js'),
  storyboard: () => import('./storyboard.js'),
  continuity: () => import('./continuity.js'),
  scene_planner: () => import('./scene-planner.js'),
  music: () => import('./music.js'),
  franchise: () => import('./franchise.js'),
  // adapters over existing implementations (knowledge/story/media/voice/rendering)
  knowledge: () => import('./adapters/knowledge.js'),
  story: () => import('./adapters/story.js'),
  media_router: () => import('./adapters/media-router.js'),
  voice: () => import('./adapters/voice.js'),
  rendering: () => import('./adapters/rendering.js')
}

/** @returns {string[]} engine ids invokable via this module. */
export function invocableEngines() {
  return Object.keys(MODULES)
}

/** @param {string} engineId */
export function isInvocable(engineId) {
  return Object.prototype.hasOwnProperty.call(MODULES, engineId)
}

/**
 * Run one engine by id.
 * @param {string} engineId
 * @param {object} input    contract-shaped input
 * @param {object} [ctx]    { workspaceId, db, log } (db defaults to server client)
 * @returns {Promise<{ engine: string, status: string, durationMs: number, output: object }>}
 */
export async function runEngine(engineId, input = {}, ctx = {}) {
  const loader = MODULES[engineId]
  if (!loader) throw new Error(`runEngine: "${engineId}" is not an invocable engine`)
  const mod = await loader()
  const engine = mod.default
  const context = {
    workspaceId: ctx.workspaceId ?? input.workspace_id ?? null,
    db: ctx.db !== undefined ? ctx.db : getServerSupabase(),
    log: ctx.log || (() => {})
  }
  const started = Date.now()
  const output = await engine.run(input, context)
  return {
    engine: engineId,
    status: output && output._stub ? 'stub' : 'complete',
    durationMs: Date.now() - started,
    output
  }
}