import { hasValidKey, kimiChat, parseJSON } from './_kimi.js'

/**
 * Generate viral video ideas using Kimi k2.7.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { niche, count = 10 } = req.body

  const demoIdeas = [
    { title: 'The mistake 90% of beginners make', type: 'educational', description: 'Show common mistake + correct way', visual: 'Split screen before/after' },
    { title: '3 things I wish I knew before starting', type: 'relatable', description: 'Share lessons learned', visual: 'Talking head + text overlays' },
    { title: 'Watch me go from 0 to $10K in 30 days', type: 'engagement', description: 'Document the journey', visual: 'Progress montage' },
    { title: 'Stop doing X, do this instead', type: 'educational', description: 'Contrarian take', visual: 'Red slash X, green check' },
    { title: 'The lazy person guide to Y', type: 'educational', description: 'Simplified approach', visual: 'Quick cuts, minimal effort' },
    { title: 'POV: You finally figured it out', type: 'relatable', description: 'Relatable win moment', visual: 'Celebration, relief' },
    { title: 'Unpopular opinion about Z', type: 'engagement', description: 'Hot take to spark comments', visual: 'Dramatic text + reaction' },
    { title: 'This changed everything for me', type: 'conversion', description: 'Product/tool reveal', visual: 'Before/after success' },
    { title: 'Day in my life as a X', type: 'relatable', description: 'Behind the scenes', visual: 'Fast-paced montage' },
    { title: 'Save this for later!', type: 'educational', description: 'Checklist or tutorial', visual: 'Numbered list on screen' }
  ]

  if (!hasValidKey()) {
    return res.status(200).json({ success: true, ideas: demoIdeas.slice(0, count), demo: true, message: 'Demo mode: add KIMI_API_KEY for AI generation.' })
  }

  const userPrompt = `Generate ${count} viral short-form video ideas for the "${niche || 'general'}" niche.
Each idea needs a 3-second hook. Mix educational, relatable, engagement, and conversion types.
Output ONLY valid JSON: {"ideas":[{"title":"...","type":"educational|relatable|engagement|conversion","description":"...","visual":"..."}]}`

  try {
    const content = await kimiChat([
      { role: 'system', content: 'You are a viral content strategist. Output ONLY valid JSON, no markdown.' },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 2000 })

    const result = parseJSON(content)
    res.status(200).json({ success: true, ideas: result.ideas || result, provider: 'Kimi k2.7' })
  } catch (error) {
    console.error('Kimi ideas error:', error.message)
    res.status(200).json({ success: true, ideas: demoIdeas.slice(0, count), demo: true, message: `AI error (using demo): ${error.message}` })
  }
}