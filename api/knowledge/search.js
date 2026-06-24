/**
 * POST /api/knowledge/search
 * Semantic search over knowledge chunks and objects.
 * Used by all agents for RAG context retrieval.
 *
 * Body: { workspace_id, query, type?: 'chunks'|'objects'|'both', object_type?, limit?, threshold? }
 * Returns: { chunks: [], objects: [], total: number }
 */
import { getServerSupabase, rpc } from '../_db.js'
import { embed, hasEmbedProvider } from '../_providers/embed.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    workspace_id,
    query,
    type = 'both',
    object_type = null,
    limit = 10,
    threshold = 0.7
  } = req.body

  if (!query) return res.status(400).json({ error: 'query required' })

  try {
    // Without embed provider, fall back to text search
    if (!hasEmbedProvider()) {
      return textFallbackSearch(req, res, { workspace_id, query, type, limit })
    }

    const queryEmbedding = await embed(query)
    const db = getServerSupabase()

    const results = { chunks: [], objects: [] }

    if ((type === 'chunks' || type === 'both') && db) {
      const data = await rpc('match_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        p_workspace_id: workspace_id || null
      })
      results.chunks = data || []
    }

    if ((type === 'objects' || type === 'both') && db) {
      const data = await rpc('match_knowledge_objects', {
        query_embedding: queryEmbedding,
        match_threshold: threshold - 0.05, // slightly lower bar for objects
        match_count: Math.ceil(limit / 2),
        p_workspace_id: workspace_id || null,
        p_object_type: object_type || null
      })
      results.objects = data || []
    }

    // Log the search for relevance improvement
    if (db && workspace_id) {
      await db.from('knowledge_search_log').insert({
        workspace_id,
        query_text: query,
        query_embedding: queryEmbedding,
        result_ids: [...results.chunks.map(c => c.id), ...results.objects.map(o => o.id)],
        result_count: results.chunks.length + results.objects.length
      })
    }

    return res.status(200).json({
      chunks: results.chunks,
      objects: results.objects,
      total: results.chunks.length + results.objects.length
    })
  } catch (err) {
    console.error('[knowledge/search]', err)
    return res.status(500).json({ error: err.message })
  }
}

async function textFallbackSearch(req, res, { workspace_id, query, type, limit }) {
  const db = getServerSupabase()
  if (!db) return res.status(200).json({ chunks: [], objects: [], total: 0, mode: 'no-db' })

  const results = { chunks: [], objects: [] }
  const like = `%${query}%`

  if (type !== 'objects') {
    const { data } = await db.from('knowledge_chunks')
      .select('id, content, chunk_type, metadata, asset_id')
      .ilike('content', like)
      .limit(limit)
    results.chunks = data || []
  }

  if (type !== 'chunks') {
    const { data } = await db.from('knowledge_objects')
      .select('id, object_type, title, summary, content, examples, tags')
      .or(`title.ilike.${like},content.ilike.${like}`)
      .is('deleted_at', null)
      .limit(limit)
    results.objects = data || []
  }

  return res.status(200).json({ ...results, total: results.chunks.length + results.objects.length, mode: 'text-fallback' })
}
