/**
 * GET /api/engines
 * Returns the ContentOS v2.0 engine architecture: all 21 engines (id, name,
 * responsibility, status, contracts, impl), the pipeline order, contract names,
 * and live/stub stats. Read-only introspection of the AI Media OS.
 *
 * GET /api/engines?run=<engineId>  (POST body = input) — invoke a single engine.
 */
import { ENGINES, pipelineOrder, engineStats, getEngine } from './_engines/registry.js'
import { CONTRACTS } from './_contracts/index.js'
import { runEngine, isInvocable } from './_engines/run.js'

export default async function handler(req, res) {
  const runId = req.query?.run

  if (runId) {
    const meta = getEngine(runId)
    if (!meta) return res.status(404).json({ error: `unknown engine "${runId}"` })
    if (!isInvocable(runId)) return res.status(400).json({ error: `engine "${runId}" has no standalone module (served by existing impl: ${meta.impl})` })
    try {
      const input = req.method === 'POST' ? (req.body || {}) : (req.query || {})
      const result = await runEngine(runId, input, { workspaceId: input.workspace_id || null })
      return res.status(200).json({ engine: runId, status: result.status, durationMs: result.durationMs, output: result.output })
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