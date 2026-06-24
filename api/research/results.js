/**
 * GET /api/research/results
 * Fetch research results for a workspace.
 * Query: { workspace_id, query_id?, result_type?, limit? }
 */
import { getServerSupabase } from '../_db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, query_id, result_type, limit = 50 } = req.query
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ results: [], queries: [] })

  let query = db.from('research_results')
    .select('*')
    .eq('workspace_id', workspace_id)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit))

  if (query_id) query = query.eq('query_id', query_id)
  if (result_type) query = query.eq('result_type', result_type)

  const { data: results, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  // Also fetch query history
  const { data: queries } = await db.from('research_queries')
    .select('id, query_type, query, status, result_count, created_at, completed_at')
    .eq('workspace_id', workspace_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return res.status(200).json({ results: results || [], queries: queries || [] })
}
