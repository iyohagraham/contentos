/**
 * GET /api/intelligence/playbooks
 * List playbooks for a workspace, optionally filtered by type.
 *
 * POST /api/intelligence/playbooks/apply
 * Apply a playbook formula to generate a specific title/hook/cta/etc.
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'
import { textGenerateJSON } from '../_providers/text.js'

export default async function handler(req, res) {
  const { workspace_id, playbook_type, analysis_id } = req.query

  if (req.method === 'GET') {
    const db = getServerSupabase()
    if (!db) return res.status(200).json({ playbooks: [] })

    const wsId = coerceWorkspaceId(workspace_id)
    let query = db.from('channel_playbooks')
      .select('*')
      .eq('workspace_id', wsId)
      .order('success_rate', { ascending: false })

    if (playbook_type) query = query.eq('playbook_type', playbook_type)
    if (analysis_id) query = query.eq('analysis_id', analysis_id)

    const { data, error } = await query.limit(50)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ playbooks: data || [] })
  }

  if (req.method === 'POST') {
    const { playbook_id, topic, audience, platform } = req.body
    const db = getServerSupabase()

    let playbook = null
    if (playbook_id && db) {
      const { data } = await db.from('channel_playbooks').select('*').eq('id', playbook_id).single()
      playbook = data
    }

    if (!playbook) return res.status(400).json({ error: 'playbook_id required' })

    const prompt = `Apply this playbook formula to create a specific ${playbook.playbook_type} for the given topic.

Formula: "${playbook.formula}"
Formula name: "${playbook.name}"
Examples: ${JSON.stringify(playbook.examples || [])}

Topic: ${topic}
Audience: ${audience || 'general'}
Platform: ${platform || 'youtube'}

Generate 3 variations applying this formula. Return JSON:
{
  "variations": [
    {
      "text": "Generated title/hook/cta",
      "explanation": "How the formula was applied"
    }
  ]
}`

    try {
      const result = await textGenerateJSON(prompt, { maxTokens: 800 })
      return res.status(200).json({ playbook, variations: result.variations || [] })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
