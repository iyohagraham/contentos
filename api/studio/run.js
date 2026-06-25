/**
 * POST /api/studio/run
 * Run ONE engine stage for a project and persist its contract output (resumable).
 *
 * Body: {
 *   workspace_id,
 *   project_id?,            // when set, loads prior stage outputs + persists this one
 *   engine,                 // engine id to run (must be invocable)
 *   input?                  // explicit input; otherwise auto-wired from prior outputs + project
 * }
 * Returns: { engine, status, durationMs, output, project? }
 *
 * Auto-wiring: each engine's declared `inputs` (contracts) are filled from the
 * project's previously-stored engine_outputs by contract name, so you can run the
 * pipeline stage-by-stage without re-passing data. Without Supabase it still runs
 * the engine transiently (no persistence).
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'
import { runEngine, isInvocable } from '../_engines/run.js'
import { getEngine } from '../_engines/registry.js'

// engine output contract name → the input key downstream engines expect.
const CONTRACT_TO_INPUT = {
  knowledge: 'knowledge',
  creative_direction: 'creative_direction',
  strategy: 'strategy',
  style_profile: 'style_profile',
  universe: 'universe',
  character: 'character',
  brand: 'brand',
  story: 'story',
  storyboard: 'storyboard',
  continuity_report: 'continuity',
  scene_plan: 'scene_plan',
  composition_manifest: 'manifest'
}

const HISTORY_CAP = 10

/**
 * Upsert an engine output, preserving the PREVIOUS output as a history entry
 * (newest first, capped) so a re-run or edit is undoable. Reads the existing row
 * first; on first write history stays empty.
 */
async function upsertOutput(db, { wsId, projectId, engineId, contract, output, status, durationMs }) {
  const { data: existing } = await db.from('engine_outputs')
    .select('output, status, updated_at, history')
    .eq('project_id', projectId).eq('engine_id', engineId).maybeSingle()

  let history = Array.isArray(existing?.history) ? existing.history : []
  if (existing && existing.output !== undefined) {
    history = [{ output: existing.output, status: existing.status, at: existing.updated_at || new Date().toISOString() }, ...history].slice(0, HISTORY_CAP)
  }

  return db.from('engine_outputs').upsert({
    workspace_id: wsId, project_id: projectId, engine_id: engineId, contract,
    output, status, duration_ms: durationMs ?? null, history
  }, { onConflict: 'project_id,engine_id' }).select().single()
}

export default async function handler(req, res) {
  // PATCH — save an edited stage output (operator edits a contract before the next
  // stage). Persists to engine_outputs without re-running the engine.
  if (req.method === 'PATCH') {
    const { workspace_id, project_id, engine, output, restore_index } = req.body || {}
    if (!project_id || !engine) return res.status(400).json({ error: 'project_id and engine required' })
    const db = getServerSupabase()
    if (!db) return res.status(503).json({ error: 'Supabase not configured' })
    const wsId = coerceWorkspaceId(workspace_id)
    const meta = getEngine(engine)
    const contract = (meta?.outputs || [])[0] || null

    // Restore mode: promote a history entry back to current (current goes to history).
    if (restore_index !== undefined) {
      const { data: row } = await db.from('engine_outputs').select('history').eq('project_id', project_id).eq('engine_id', engine).maybeSingle()
      const hist = Array.isArray(row?.history) ? row.history : []
      const entry = hist[Number(restore_index)]
      if (!entry) return res.status(400).json({ error: 'restore_index out of range' })
      const { data, error } = await upsertOutput(db, { wsId, projectId: project_id, engineId: engine, contract, output: entry.output, status: 'restored' })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ restored: true, engine, output: data.output })
    }

    if (output === undefined) return res.status(400).json({ error: 'output (or restore_index) required' })
    const { data, error } = await upsertOutput(db, { wsId, projectId: project_id, engineId: engine, contract, output, status: 'edited' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ saved: true, engine, output: data.output })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, project_id, engine, input: explicitInput } = req.body || {}
  if (!engine) return res.status(400).json({ error: 'engine required' })
  if (!isInvocable(engine)) {
    const meta = getEngine(engine)
    return res.status(400).json({ error: meta ? `engine "${engine}" is served by an existing endpoint (${meta.impl}), not the studio runner` : `unknown engine "${engine}"` })
  }

  const db = getServerSupabase()
  const wsId = coerceWorkspaceId(workspace_id)

  // 1. Build the engine input: explicit input wins, else auto-wire from project state.
  let input = { ...(explicitInput || {}), workspace_id }
  let project = null

  if (project_id && db) {
    const { data: proj } = await db.from('media_projects').select('*').eq('id', project_id).maybeSingle()
    project = proj || null
    if (project) {
      input.project_id = project.id
      input.format = input.format || project.format
      if (project.brief && !input.brief) input.brief = project.brief
      if (project.brief && !input.topic) input.topic = project.brief

      // Pull prior outputs and map them in by contract name.
      const { data: priors } = await db.from('engine_outputs').select('contract, output').eq('project_id', project.id)
      for (const p of (priors || [])) {
        const key = CONTRACT_TO_INPUT[p.contract]
        if (key && input[key] === undefined) input[key] = p.output
      }
    }
  }

  // 2. Run the engine.
  let result
  try {
    result = await runEngine(engine, input, { workspaceId: wsId, db })
  } catch (err) {
    // Persist the failure on the project if we have one.
    if (project_id && db) {
      await db.from('engine_outputs').upsert({
        workspace_id: wsId, project_id, engine_id: engine, status: 'failed', output: { error: err.message }
      }, { onConflict: 'project_id,engine_id' }).catch(() => {})
      await db.from('media_projects').update({ status: 'failed', current_stage: engine }).eq('id', project_id).catch(() => {})
    }
    return res.status(500).json({ error: err.message, engine })
  }

  // 3. Persist the output (preserving prior as history) + advance the project.
  if (project_id && db) {
    const meta = getEngine(engine)
    const contract = (meta?.outputs || [])[0] || null
    await upsertOutput(db, { wsId, projectId: project_id, engineId: engine, contract, output: result.output, status: result.status, durationMs: result.durationMs }).catch(() => {})

    const stagesDone = Array.isArray(project?.stages_done) ? project.stages_done : []
    const nextStages = stagesDone.includes(engine) ? stagesDone : [...stagesDone, engine]
    const { data: updated } = await db.from('media_projects').update({
      current_stage: engine, stages_done: nextStages, status: 'running'
    }).eq('id', project_id).select().maybeSingle()
    project = updated || project
  }

  return res.status(200).json({ engine, status: result.status, durationMs: result.durationMs, output: result.output, project })
}