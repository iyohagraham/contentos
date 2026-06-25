/**
 * POST /api/studio/pipeline
 * Run the FULL engine pipeline for a project (or a slice of it), stage by stage,
 * persisting each engine output and advancing the project — resumable end-to-end.
 *
 * Body: {
 *   workspace_id,
 *   project_id,             // required: the project to run
 *   from?, to?,             // optional engine-id bounds (default: full creative pipeline)
 *   stop_on_request_spec?   // default true: pause when a stage returns selected:false
 *                           //   (e.g. media/voice with no provider) instead of failing
 * }
 * Returns: { project, ran: [{ engine, status, durationMs }], stopped_at?, output_preview }
 *
 * The default pipeline is the CREATIVE/PLANNING slice that runs without paid
 * providers: knowledge → creative_director → story → storyboard → continuity →
 * scene_planner → composition. Media/voice/rendering stages are included only when
 * their providers are configured (otherwise they'd return request specs and pause).
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'
import { runEngine, isInvocable } from '../_engines/run.js'
import { getEngine } from '../_engines/registry.js'

// The ordered creative pipeline the orchestrator drives (provider-free stages).
const DEFAULT_PIPELINE = [
  'knowledge', 'creative_director', 'story', 'storyboard', 'continuity', 'scene_planner', 'composition'
]

// engine output contract → downstream input key (same map the per-stage runner uses)
const CONTRACT_TO_INPUT = {
  knowledge: 'knowledge', creative_direction: 'creative_direction', strategy: 'strategy',
  style_profile: 'style_profile', universe: 'universe', character: 'character', brand: 'brand',
  story: 'story', storyboard: 'storyboard', continuity_report: 'continuity', scene_plan: 'scene_plan',
  composition_manifest: 'manifest'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, project_id, from, to, stop_on_request_spec = true } = req.body || {}
  if (!project_id) return res.status(400).json({ error: 'project_id required' })

  const db = getServerSupabase()
  if (!db) return res.status(503).json({ error: 'Supabase required to run a project pipeline' })
  const wsId = coerceWorkspaceId(workspace_id)

  const { data: project } = await db.from('media_projects').select('*').eq('id', project_id).maybeSingle()
  if (!project) return res.status(404).json({ error: 'project not found' })

  // Resolve the stage list.
  let stages = DEFAULT_PIPELINE.filter(isInvocable)
  if (from) { const i = stages.indexOf(from); if (i >= 0) stages = stages.slice(i) }
  if (to) { const i = stages.indexOf(to); if (i >= 0) stages = stages.slice(0, i + 1) }

  // Seed the shared input bag from the project + already-stored outputs.
  const bag = { workspace_id, project_id: project.id, format: project.format }
  if (project.brief) { bag.brief = project.brief; bag.topic = project.brief }
  const { data: priors } = await db.from('engine_outputs').select('contract, output').eq('project_id', project.id)
  for (const p of (priors || [])) { const key = CONTRACT_TO_INPUT[p.contract]; if (key) bag[key] = p.output }

  const ran = []
  let stoppedAt = null
  const stagesDone = new Set(Array.isArray(project.stages_done) ? project.stages_done : [])

  for (const engineId of stages) {
    let result
    try {
      result = await runEngine(engineId, bag, { workspaceId: wsId, db })
    } catch (err) {
      await db.from('engine_outputs').upsert({ workspace_id: wsId, project_id: project.id, engine_id: engineId, status: 'failed', output: { error: err.message } }, { onConflict: 'project_id,engine_id' }).catch(() => {})
      await db.from('media_projects').update({ status: 'failed', current_stage: engineId }).eq('id', project.id).catch(() => {})
      return res.status(200).json({ project: { ...project, status: 'failed', current_stage: engineId }, ran, error: `${engineId}: ${err.message}`, stopped_at: engineId })
    }

    const meta = getEngine(engineId)
    const contract = (meta?.outputs || [])[0] || null
    await db.from('engine_outputs').upsert({
      workspace_id: wsId, project_id: project.id, engine_id: engineId, contract,
      output: result.output, status: result.status, duration_ms: result.durationMs
    }, { onConflict: 'project_id,engine_id' }).catch(() => {})

    stagesDone.add(engineId)
    ran.push({ engine: engineId, status: result.status, durationMs: result.durationMs })

    // Feed this output forward.
    const key = CONTRACT_TO_INPUT[contract]
    if (key) bag[key] = result.output
    // composition's manifest is nested under .manifest
    if (engineId === 'composition' && result.output?.manifest) bag.manifest = result.output.manifest

    // Pause politely if a stage couldn't fulfill (e.g. needs a media/voice provider).
    if (stop_on_request_spec && result.output && result.output.selected === false) {
      stoppedAt = engineId
      break
    }
  }

  const finalStatus = stoppedAt ? 'blocked' : 'complete'
  const { data: updated } = await db.from('media_projects').update({
    status: finalStatus,
    current_stage: ran.length ? ran[ran.length - 1].engine : project.current_stage,
    stages_done: [...stagesDone]
  }).eq('id', project.id).select().maybeSingle()

  return res.status(200).json({
    project: updated || project,
    ran,
    stopped_at: stoppedAt,
    status: finalStatus
  })
}