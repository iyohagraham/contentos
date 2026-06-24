/**
 * POST /api/media/edit-image
 * One-off image edit — img2img (strength) or inpaint (maskUrl) via Runware FLUX,
 * with blob persistence.
 *
 * Body: { imageUrl, prompt, opts?: { maskUrl, strength, model, workspaceId, ... } }
 * Returns: { url, width?, height?, seed?, cost?, provider }
 */
import { editAsset } from './engine.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageUrl, prompt, opts = {} } = req.body || {}
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'imageUrl required (string)' })
  }
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt required (string)' })
  }

  try {
    const result = await editAsset(imageUrl, prompt, opts)
    return res.status(200).json(result)
  } catch (err) {
    console.error('[media/edit-image]', err)
    const msg = err.message || 'Image edit failed'
    if (msg.includes('RUNWARE_API_KEY') || msg.includes('not configured')) {
      return res.status(503).json({ error: 'Image generation not configured (RUNWARE_API_KEY missing)' })
    }
    return res.status(500).json({ error: msg })
  }
}
