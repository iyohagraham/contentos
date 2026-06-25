/**
 * POST /api/studio/branch
 * Fork a project at a chosen stage: creates a NEW project (copying the source's
 * brief/format/refs) and copies the source's engine_outputs UP TO AND INCLUDING
 * `at_stage`. The new project resumes from the next stage — explore a variant
 * (different style, re-rolled media) without disturbing the original.
 *
 * Body: { workspace_id, project_id, at_stage, title? }
 * Returns: { project, copied_stages }
 *
 * Pure copy (no engine runs, no providers). DB required.
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'

// Pipeline order — only stages at or before `at_stage` are carried into the branch.
const ORDER = [
  'knowledge', 'creative_director', 'strategy', 'style', 'universe', 'character',
  'brand', 'story', 'storyboard', 'continuity', 'scene_planner', 'media_loop',
  'composition', 'rendering', 'publishing'
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { workspace_id, project_id, at_stage, title } = req.body || {}
    if (!project_id || !at_stage) return res.status(400).json({ error: 'project_id and at_stage required' })
    const db = getServerSupabase()
    if (!db) return res.status(503).json({ error: 'Supabase required to branch a project' })
    const wsId = coerceWorkspaceId(workspace_id)

    const cutoff = ORDER.indexOf(at_stage)
    if (cutoff < 0) return res.status(400).json({ error: `unknown stage "${at_stage}"` })

    const { data: src } = await db.from('media_projects').select('*').eq('id', project_id).maybeSingle()
    if (!src) return res.status(404).json({ error: 'source project not found' })

    // 1. Create the branch project (copy refs; status running so it resumes).
    const stagesUpTo = ORDER.slice(0, cutoff + 1)
    const { data: branch, error: pErr } = await db.from('media_projects').insert({
      workspace_id: wsId,
      title: title || `${src.title} (branch @ ${at_stage})`,
      brief: src.brief, format: src.format,
      franchise_id: src.franchise_id, season: src.season, series: src.series, episode: src.episode,
      style_profile_id: src.style_profile_id, universe_id: src.universe_id, brand_id: src.brand_id,
      status: 'running', current_stage: at_stage, stages_done: stagesUpTo,
      metadata: { ...(src.metadata || {}), branched_from: project_id, branched_at: at_stage }
    }).select().single()
    if (pErr) return res.status(500).json({ error: pErr.message })

    // 2. Copy engine_outputs up to and including the cutoff stage.
    const { data: outs } = await db.from('engine_outputs').select('engine_id, contract, output, status').eq('project_id', project_id)
    const toCopy = (outs || []).filter((o) => {
      const i = ORDER.indexOf(o.engine_id)
      return i >= 0 && i <= cutoff
    })
    let copied = 0
    if (toCopy.length) {
      const rows = toCopy.map((o) => ({
        workspace_id: wsId, project_id: branch.id, engine_id: o.engine_id,
        contract: o.contract, output: o.output, status: o.status, history: []
      }))
      const { error: oErr } = await db.from('engine_outputs').insert(rows)
      if (!oErr) copied = rows.length
    }

    return res.status(200).json({ project: branch, copied_stages: copied })
  } catch (err) {
    console.error('[studio/branch]', err)
    return res.status(500).json({ error: err.message })
  }
}
