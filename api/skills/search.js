/**
 * POST /api/skills/search
 * Semantic search over learned content skills (skill_manifests).
 * Used by the SkillsView UI and by agents browsing the skill library.
 *
 * Body: { workspace_id, query, limit?, threshold? }
 * Returns: { skills: [], total: number, mode: string }
 */
import { getServerSupabase, rpc, coerceWorkspaceId } from '../_db.js'
import { embed, hasEmbedProvider } from '../_providers/embed.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    workspace_id,
    query,
    limit = 8,
    threshold = 0.6
  } = req.body || {}

  if (!query) return res.status(400).json({ error: 'query required' })

  try {
    // Without an embed provider, fall back to text search over skill_manifests.
    if (!hasEmbedProvider()) {
      return textFallbackSearch(res, { workspace_id, query, limit })
    }

    const db = getServerSupabase()
    if (!db) {
      return res.status(200).json({ skills: [], total: 0, mode: 'no-db' })
    }

    const queryEmbedding = await embed(query)

    const matches = (await rpc('match_skills', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      p_workspace_id: coerceWorkspaceId(workspace_id)
    })) || []

    // match_skills returns only summary columns — hydrate full metadata so the UI
    // has when_to_use / structure, preserving similarity order.
    let skills = matches
    if (matches.length) {
      const ids = matches.map(m => m.id)
      const { data: full } = await db
        .from('skill_manifests')
        .select('id, skill_name, display_name, skill_type, description, source_type, metadata, created_at')
        .in('id', ids)
      const byId = new Map((full || []).map(r => [r.id, r]))
      skills = matches.map(m => ({ ...(byId.get(m.id) || {}), similarity: m.similarity }))
    }

    return res.status(200).json({
      skills,
      total: skills.length,
      mode: 'semantic'
    })
  } catch (err) {
    console.error('[skills/search]', err)
    return res.status(500).json({ error: err.message })
  }
}

async function textFallbackSearch(res, { workspace_id, query, limit }) {
  const db = getServerSupabase()
  if (!db) return res.status(200).json({ skills: [], total: 0, mode: 'no-db' })

  const like = `%${query}%`
  let q = db
    .from('skill_manifests')
    .select('id, skill_name, display_name, skill_type, description, source_type, metadata, created_at')
    .is('deleted_at', null)
    .eq('status', 'active')
    .or(`display_name.ilike.${like},description.ilike.${like}`)
    .limit(limit)

  const ws = coerceWorkspaceId(workspace_id)
  if (ws) q = q.eq('workspace_id', ws)

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })

  const skills = data || []
  return res.status(200).json({
    skills,
    total: skills.length,
    mode: 'text-fallback'
  })
}
