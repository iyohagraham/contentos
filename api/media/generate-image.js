/**
 * POST /api/media/generate-image
 * One-off text-to-image generation (Runware FLUX) with blob persistence.
 *
 * Body: { prompt, opts?: { model, width, height, steps, seed, workspaceId, ... } }
 * Returns: { url, width?, height?, seed?, cost?, provider }
 */
import { produceImage } from './engine.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { prompt, opts = {} } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt required (string)' })
  }

  try {
    const result = await produceImage(prompt, opts)
    return res.status(200).json(result)
  } catch (err) {
    console.error('[media/generate-image]', err)
    const msg = err.message || 'Image generation failed'
    if (msg.includes('RUNWARE_API_KEY') || msg.includes('not configured')) {
      return res.status(503).json({ error: 'Image generation not configured (RUNWARE_API_KEY missing)' })
    }
    return res.status(500).json({ error: msg })
  }
}
