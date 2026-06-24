/**
 * POST /api/generate-composition
 * Thin HTTP surface over the Composition Engine (HyperFrames).
 * Body: { script, options? } → { success, composition, html, manifest, duration }
 */
import { createComposition, generateHyperFramesHTML, toManifest } from './_engines/composition/hyperframes.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { script, options = {} } = req.body
    if (!script) return res.status(400).json({ error: 'Script is required' })

    const composition = createComposition(script, options)
    const html = generateHyperFramesHTML(composition)

    return res.status(200).json({
      success: true,
      composition,
      html,
      manifest: toManifest(composition),
      duration: composition.duration
    })
  } catch (error) {
    console.error('Composition generation error:', error)
    return res.status(500).json({ error: error.message })
  }
}