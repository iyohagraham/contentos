import ContentOS from '../openmontage-bridge.js'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { script, options = {} } = req.body

    if (!script) {
      return res.status(400).json({ error: 'Script is required' })
    }

    // Generate composition using the bridge
    const composition = ContentOS.createComposition(script, options)
    const html = ContentOS.generateHyperFramesHTML(composition)

    return res.status(200).json({
      success: true,
      composition,
      html,
      duration: composition.duration
    })
  } catch (error) {
    console.error('Composition generation error:', error)
    return res.status(500).json({ error: error.message })
  }
}
