/**
 * POST /api/media/remove-bg
 * One-off background removal (transparent PNG) via Runware, with blob persistence.
 *
 * Body: { imageUrl, opts?: { workspaceId, ... } }
 * Returns: { url, cost?, provider }
 */
import { removeBgAsset } from './engine.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageUrl, opts = {} } = req.body || {}
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'imageUrl required (string)' })
  }

  try {
    const result = await removeBgAsset(imageUrl, opts)
    return res.status(200).json(result)
  } catch (err) {
    console.error('[media/remove-bg]', err)
    const msg = err.message || 'Background removal failed'
    if (msg.includes('RUNWARE_API_KEY') || msg.includes('not configured')) {
      return res.status(503).json({ error: 'Image generation not configured (RUNWARE_API_KEY missing)' })
    }
    return res.status(500).json({ error: msg })
  }
}
