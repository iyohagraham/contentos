/**
 * Cron — advance in-flight media projects (every 5 min).
 *
 * Finds projects in status 'draft' or 'running' that have a brief but haven't
 * completed the creative pipeline, and runs the next stages for each (capped per
 * tick). This makes project production autonomous: an operator creates a project
 * with a brief, and the pipeline advances itself toward 'complete' (or 'blocked'
 * when a paid provider stage needs configuration).
 *
 * Protected by CRON_SECRET when set. Calls the same pipeline orchestrator logic.
 */
import { getServerSupabase } from '../_db.js'
import { runEngine, isInvocable } from '../_engines/run.js'
import { getEngine } from '../_engines/registry.js'

const DEFAULT_PIPELINE = ['knowledge', 'creative_director', 'story', 'storyboard', 'continuity', 'scene_planner', 'media_loop', 'composition', 'rendering', 'publishing'].filter(isInvocable)
const CONTRACT_TO_INPUT = {
  knowledge: 'knowledge', creative_direction: 'creative_direction', style_profile: 'style_profile',
  universe: 'universe', character: 'character', brand: 'brand', story: 'story',
  storyboard: 'storyboard', continuity_report: 'continuity', scene_plan: 'scene_plan', composition_manifest: 'manifest', render_result: 'render_result'
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ advanced: 0, message: 'Supabase not configured' })

  const maxProjects = Number(process.env.CRON_MAX_PROJECTS) || 3

  const { data: projects } = await db.from('media_projects')
    .select('*')
    .in('status', ['draft', 'running'])
    .not('brief', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(maxProjects)

  if (!projects?.length) return res.status(200).json({ advanced: 0 })

  const summary = []
  for (const project of projects) {
    const done = new Set(Array.isArray(project.stages_done) ? project.stages_done : [])
    const next = DEFAULT_PIPELINE.find((e) => !done.has(e))
    if (!next) {
      await db.from('media_projects').update({ status: 'complete' }).eq('id', project.id).catch(() => {})
      summary.push({ project_id: project.id, action: 'completed' })
      continue
    }

    // Build input bag from prior outputs.
    const bag = { workspace_id: project.workspace_id, project_id: project.id, format: project.format, brief: project.brief, topic: project.brief }
    const { data: priors } = await db.from('engine_outputs').select('contract, output').eq('project_id', project.id)
    for (const p of (priors || [])) { const key = CONTRACT_TO_INPUT[p.contract]; if (key) bag[key] = p.output }
    // Referenced library blocks (style + universe).
    if (project.style_profile_id) {
      const { data: sp } = await db.from('style_profiles').select('profile').eq('id', project.style_profile_id).maybeSingle()
      if (sp?.profile) { bag.style_profile = sp.profile; bag.style_profile_id = project.style_profile_id }
    }
    if (project.universe_id) {
      const { data: uni } = await db.from('universes').select('universe').eq('id', project.universe_id).maybeSingle()
      if (uni?.universe) bag.universe = uni.universe
    }
    // Character roster (consistency) for the Media Loop.
    bag.characters = bag.universe?.characters || []
    const { data: chars } = await db.from('characters').select('character').eq('workspace_id', project.workspace_id).limit(50)
    if (chars?.length) bag.characters = [...bag.characters, ...chars.map((c) => c.character)]

    try {
      // Continuity runs in auto-fix mode.
      const stageInput = next === 'continuity' ? { ...bag, apply: true } : bag
      const result = await runEngine(next, stageInput, { workspaceId: project.workspace_id, db })
      const meta = getEngine(next)
      const contract = (meta?.outputs || [])[0] || null
      await db.from('engine_outputs').upsert({
        workspace_id: project.workspace_id, project_id: project.id, engine_id: next, contract,
        output: result.output, status: result.status, duration_ms: result.durationMs
      }, { onConflict: 'project_id,engine_id' })

      // Persist a continuity-corrected storyboard so the next tick's scene_planner uses it.
      if (next === 'continuity' && result.output?.fixed) {
        await db.from('engine_outputs').upsert({
          workspace_id: project.workspace_id, project_id: project.id, engine_id: 'storyboard',
          contract: 'storyboard', output: result.output.fixed, status: 'fixed'
        }, { onConflict: 'project_id,engine_id' }).catch(() => {})
      }

      done.add(next)
      const blocked = result.output && result.output.selected === false
      const allDone = DEFAULT_PIPELINE.every((e) => done.has(e))
      await db.from('media_projects').update({
        status: blocked ? 'blocked' : (allDone ? 'complete' : 'running'),
        current_stage: next,
        stages_done: [...done]
      }).eq('id', project.id)

      summary.push({ project_id: project.id, ran: next, status: result.status, blocked: !!blocked })
    } catch (err) {
      await db.from('media_projects').update({ status: 'failed', current_stage: next }).eq('id', project.id).catch(() => {})
      summary.push({ project_id: project.id, ran: next, error: err.message })
    }
  }

  return res.status(200).json({ advanced: summary.length, summary })
}