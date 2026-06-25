/**
 * /api/franchises — Franchise hierarchy persistence.
 *
 * GET  /api/franchises?workspace_id=            → { franchises: [...] }
 * GET  /api/franchises?workspace_id=&id=<id>    → { franchise }
 * POST /api/franchises  { workspace_id, name, universe_id?, brand_id?,
 *                         op?, nodes?, seasons?, ... }
 *        → runs the Franchise engine (assemble | plan) and SAVES the resulting
 *          hierarchy to the franchises table → { franchise }
 * DELETE /api/franchises?id=<id>                → { deleted: true }
 *
 * Bridges the (pure) Franchise engine to durable storage so a media ecosystem
 * persists across sessions and projects can reference franchise/season/series/episode.
 */
import { getServerSupabase, coerceWorkspaceId } from './_db.js'
import { runEngine } from './_engines/run.js'

export default async function handler(req, res) {
  const db = getServerSupabase()

  if (req.method === 'GET') {
    const { workspace_id, id } = req.query
    if (!db) return res.status(200).json({ franchises: [], mode: 'no-db' })
    const wsId = coerceWorkspaceId(workspace_id)
    if (id) {
      const { data, error } = await db.from('franchises').select('*').eq('id', id).maybeSingle()
      if (error) return res.status(500).json({ error: error.message })
      if (!data) return res.status(404).json({ error: 'franchise not found' })
      return res.status(200).json({ franchise: data })
    }
    const { data, error } = await db.from('franchises')
      .select('id, name, universe_id, brand_id, hierarchy, updated_at')
      .eq('workspace_id', wsId).order('updated_at', { ascending: false }).limit(100)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ franchises: data || [] })
  }

  if (req.method === 'POST') {
    const { workspace_id, name, universe_id, brand_id, ...engineInput } = req.body || {}
    if (!name) return res.status(400).json({ error: 'name required' })
    if (!db) return res.status(503).json({ error: 'Supabase not configured' })
    const wsId = coerceWorkspaceId(workspace_id)

    // Build the hierarchy via the Franchise engine (assemble flat nodes, or plan scaffold).
    const ran = await runEngine('franchise', { ...engineInput, franchise: { name } }, { workspaceId: wsId, db })
    const hierarchy = ran.output.tree || ran.output.scaffold || { hierarchy: ran.output.hierarchy }

    const { data, error } = await db.from('franchises').insert({
      workspace_id: wsId, name, universe_id: universe_id || null, brand_id: brand_id || null, hierarchy
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ franchise: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })
    if (!db) return res.status(503).json({ error: 'Supabase not configured' })
    const { error } = await db.from('franchises').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ deleted: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}