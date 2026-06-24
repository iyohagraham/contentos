/**
 * GET /api/engines
 * Returns the ContentOS v2.0 engine architecture: all 21 engines (id, name,
 * responsibility, status, contracts, impl), the pipeline order, contract names,
 * and live/stub stats. Read-only introspection of the AI Media OS.
 *
 * GET /api/engines?run=<engineId>  (POST body = input) — invoke a single engine.
 */
import { ENGINES, pipelineOrder, engineStats, getEngine } from '../_engines/registry.js'
import { CONTRACTS } from '../_contracts/index.js'
import { getServerSupabase } from '../_db.js'

// Map engine id → dynamic import of its module (only the standalone engine files).
const ENGINE_MODULES = {
  composition: () => import('../_engines/composition/hyperframes.js'),
  creative_director: () => import('../_engines/creative-director.js'),
  style: () => import('../_engines/style.js'),
  universe: () => import('../_engines/universe.js'),
  character: () => import('../_engines/character.js'),
  brand: () => import('../_engines/brand.js'),
  storyboard: () => import('../_engines/storyboard.js'),
  continuity: () => import('../_engines/continuity.js'),
  scene_planner: () => import('../_engines/scene-planner.js'),
  music: () => import('../_engines/music.js'),
  franchise: () => import('../_engines/franchise.js')
}

export default async function handler(req, res) {
  const runId = req.query?.run

  if (runId) {
    const meta = getEngine(runId)
    if (!meta) return res.status(404).json({ error: `unknown engine "${runId}"` })
    const loader = ENGINE_MODULES[runId]
    if (!loader) return res.status(400).json({ error: `engine "${runId}" has no standalone module (served by existing impl: ${meta.impl})` })
    try {
      const mod = await loader()
      const engine = mod.default
      const input = req.method === 'POST' ? (req.body || {}) : (req.query || {})
      const ctx = { workspaceId: input.workspace_id || null, db: getServerSupabase() }
      const output = await engine.run(input, ctx)
      return res.status(200).json({ engine: runId, status: meta.status, output })
    } catch (err) {
      return res.status(500).json({ error: err.message, engine: runId })
    }
  }

  return res.status(200).json({
    platform: 'ContentOS — AI Media Operating System',
    version: '2.0',
    stats: engineStats(),
    pipeline: pipelineOrder().map((e) => ({ id: e.id, name: e.name, status: e.status, order: e.order })),
    engines: ENGINES,
    contracts: Object.keys(CONTRACTS)
  })
}