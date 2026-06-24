/**
 * POST /api/generate-visual
 * Server-side image and video generation via fal.ai.
 * Replaces client-side fal.js which would expose the API key.
 *
 * Body: { type: 'image'|'video', prompt, opts }
 */
import { generateImage } from './_providers/image.js'
import { imageToVideo, motionTest } from './_providers/video.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, prompt, imageUrl, opts = {} } = req.body
  if (!type) return res.status(400).json({ error: 'type required (image or video)' })

  try {
    if (type === 'image') {
      if (!prompt) return res.status(400).json({ error: 'prompt required for image generation' })
      const result = await generateImage(prompt, opts)
      return res.status(200).json(result)
    }

    if (type === 'video') {
      if (!imageUrl) return res.status(400).json({ error: 'imageUrl required for video generation' })
      const fn = opts.test ? motionTest : imageToVideo
      const result = await fn(imageUrl, { prompt, ...opts })
      return res.status(200).json(result)
    }

    return res.status(400).json({ error: 'type must be image or video' })
  } catch (err) {
    console.error('[generate-visual]', err)
    const msg = err.message || 'Generation failed'
    if (msg.includes('FAL_KEY')) return res.status(503).json({ error: 'Image/video generation not configured (FAL_KEY missing)' })
    return res.status(500).json({ error: msg })
  }
}
