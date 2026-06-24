/**
 * GET /api/knowledge/assets
 * List knowledge assets for a workspace.
 *
 * DELETE /api/knowledge/assets?id=<asset_id>
 * Soft-delete a knowledge asset (and its chunks/objects via CASCADE).
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'

export default async function handler(req, res) {
  const { workspace_id, id } = req.method === 'DELETE' ? req.query : req.query
  if (!workspace_id && !id) return res.status(400).json({ error: 'workspace_id required' })

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ assets: [], mode: 'no-db' })

  const wsId = coerceWorkspaceId(workspace_id)

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('knowledge_assets')
      .select('id, title, asset_type, source_url, ingestion_status, chunk_count, object_count, categories, created_at, ingested_at')
      .eq('workspace_id', wsId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ assets: data || [] })
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await db
      .from('knowledge_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ deleted: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
