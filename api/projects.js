/**
 * /api/projects — media_projects CRUD (resumable engine-pipeline runs).
 *
 * GET  /api/projects?workspace_id=            → { projects: [...] }
 * GET  /api/projects?workspace_id=&id=<id>    → { project, outputs: { engine_id: output } }
 * POST /api/projects  { workspace_id, title, brief?, format?, ...refs }  → { project }
 * DELETE /api/projects?id=<id>                → { deleted: true }
 *
 * Degrades gracefully without Supabase (503 on writes, empty list on reads).
 */
import { getServerSupabase, coerceWorkspaceId } from './_db.js'

export default async function handler(req, res) {
  try {
    return await route(req, res)
  } catch (err) {
    console.error('[projects]', err)
    return res.status(500).json({ error: err.message })
  }
}

async function route(req, res) {
  const db = getServerSupabase()

  if (req.method === 'GET') {
    const { workspace_id, id } = req.query
    if (!db) return res.status(200).json({ projects: [], mode: 'no-db' })
    const wsId = coerceWorkspaceId(workspace_id)

    if (id) {
      const { data: project, error } = await db.from('media_projects').select('*').eq('id', id).maybeSingle()
      if (error) return res.status(500).json({ error: error.message })
      if (!project) return res.status(404).json({ error: 'project not found' })
      const { data: rows } = await db.from('engine_outputs').select('engine_id, contract, output, status, duration_ms, updated_at').eq('project_id', id)
      const outputs = {}
      for (const r of (rows || [])) outputs[r.engine_id] = { contract: r.contract, status: r.status, duration_ms: r.duration_ms, updated_at: r.updated_at, output: r.output }
      return res.status(200).json({ project, outputs })
    }

    const { data, error } = await db.from('media_projects')
      .select('id, title, brief, format, status, current_stage, stages_done, final_video_url, thumbnail_url, updated_at')
      .eq('workspace_id', wsId)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ projects: data || [] })
  }

  if (req.method === 'POST') {
    const { workspace_id, title, brief, format = '9:16', franchise_id, season, series, episode, style_profile_id, universe_id, brand_id, metadata } = req.body || {}
    if (!title) return res.status(400).json({ error: 'title required' })
    if (!db) return res.status(503).json({ error: 'Supabase not configured' })
    const { data, error } = await db.from('media_projects').insert({
      workspace_id: coerceWorkspaceId(workspace_id),
      title, brief: brief || null, format,
      franchise_id: franchise_id || null, season: season ?? null, series: series ?? null, episode: episode ?? null,
      style_profile_id: style_profile_id || null, universe_id: universe_id || null, brand_id: brand_id || null,
      status: 'draft', stages_done: [], metadata: metadata || {}
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ project: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })
    if (!db) return res.status(503).json({ error: 'Supabase not configured' })
    const { error } = await db.from('media_projects').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ deleted: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}