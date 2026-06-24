/**
 * GET /api/skills/list?workspace_id=<id>
 * List active learned skills for a workspace, newest first.
 *
 * DELETE /api/skills/list  (body: { id })
 * Soft-delete a skill (deleted_at = now()).
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'

export default async function handler(req, res) {
  const db = getServerSupabase()

  if (req.method === 'GET') {
    const { workspace_id } = req.query || {}
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

    if (!db) return res.status(200).json({ skills: [], mode: 'no-db' })

    let q = db
      .from('skill_manifests')
      .select('id, skill_name, display_name, skill_type, description, source_type, metadata, created_at')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const ws = coerceWorkspaceId(workspace_id)
    if (ws) q = q.eq('workspace_id', ws)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ skills: data || [] })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id required' })

    if (!db) return res.status(200).json({ deleted: false, mode: 'no-db' })

    const { error } = await db
      .from('skill_manifests')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ deleted: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
