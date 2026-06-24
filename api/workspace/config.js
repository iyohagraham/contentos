/**
 * GET /api/workspace/config?workspace_id=...
 * POST /api/workspace/config — update config
 * Manages workspace operating mode, autonomy settings, brand brief.
 */
import { getServerSupabase } from '../_db.js'

export default async function handler(req, res) {
  const { workspace_id } = req.method === 'GET' ? req.query : req.body
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ config: getDefaultConfig(workspace_id) })

  if (req.method === 'GET') {
    const { data, error } = await db.from('workspace_config').select('*').eq('workspace_id', workspace_id).single()
    if (error?.code === 'PGRST116') {
      // Not found — create default
      const { data: created } = await db.from('workspace_config').insert({ workspace_id }).select().single()
      return res.status(200).json({ config: created || getDefaultConfig(workspace_id) })
    }
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ config: data })
  }

  if (req.method === 'POST') {
    const { config } = req.body
    if (!config) return res.status(400).json({ error: 'config required' })

    const { data, error } = await db.from('workspace_config')
      .upsert({ workspace_id, ...config }, { onConflict: 'workspace_id' })
      .select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ config: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

function getDefaultConfig(workspace_id) {
  return {
    workspace_id,
    operating_mode: 'creator',
    review_scripts: true,
    review_media: true,
    review_publish: false,
    max_posts_per_day: 3,
    content_mix: { educational: 40, inspirational: 25, entertaining: 20, promotional: 15 },
    research_scan_enabled: false,
    learning_loop_enabled: false,
    competitor_urls: []
  }
}
