import { hasValidKey, kimiChat, parseJSON } from './_kimi.js'

/**
 * Generate a short-form video script using Kimi k2.7.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { topic, niche, audience, style, length } = req.body

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' })
  }

  const demoScript = {
    hook: "🚨 The #1 mistake costing freelancers thousands!",
    body: [
      "Most freelancers charge hourly - but that caps your income",
      "The pros use value-based pricing instead",
      "Quote projects, not hours - a $5K site is $5K whether it takes 5 hours or 50"
    ],
    cta: "Want my pricing template? Link in bio! 🔗",
    estimatedDuration: "38s",
    suggestedVisuals: ["Hook text", "Split screen comparison", "Show template"],
    fullScript: "🚨 The #1 mistake costing freelancers thousands!\n\nMost freelancers charge hourly - but that caps your income\n\nThe pros use value-based pricing instead\n\nQuote projects, not hours - a $5K site is $5K whether it takes 5 hours or 50\n\nWant my pricing template? Link in bio! 🔗"
  }

  if (!hasValidKey()) {
    return res.status(200).json({
      success: true,
      script: demoScript,
      demo: true,
      message: 'Demo mode: add KIMI_API_KEY to enable AI generation.'
    })
  }

  const styles = {
    educational: 'Educational and informative',
    relatable: 'Relatable and conversational',
    engagement: 'Engaging and provocative',
    conversion: 'Persuasive and action-oriented',
    faceless: 'Text-on-screen friendly, short punchy sentences'
  }
  const lengths = {
    short: '30-45 seconds (~75-100 words)',
    medium: '45-60 seconds (~100-150 words)',
    long: '60-90 seconds (~150-200 words)'
  }

  const userPrompt = `Write a short-form video script about: ${topic}

Style: ${styles[style] || styles.faceless}
Niche: ${niche || 'general'}
Audience: ${audience || 'general audience'}
Length: ${lengths[length] || lengths.short}

Include: (1) a scroll-stopping hook in the first 3 seconds, (2) 2-4 punchy main points, (3) a clear CTA.
Output ONLY valid JSON: {"hook":"...","body":["...","..."],"cta":"...","estimatedDuration":"Xs","suggestedVisuals":["...","..."]}`

  try {
    const content = await kimiChat([
      { role: 'system', content: 'You are an expert viral short-form video scriptwriter. Output ONLY valid JSON, no markdown fences. Keep it concise.' },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 1200 })

    const script = parseJSON(content)

    res.status(200).json({
      success: true,
      script: {
        ...script,
        fullScript: `${script.hook}\n\n${(script.body || []).join('\n\n')}\n\n${script.cta}`,
        provider: 'Kimi k2.7'
      }
    })
  } catch (error) {
    console.error('Kimi script error:', error.message)
    res.status(200).json({
      success: true,
      script: demoScript,
      demo: true,
      message: `AI error (using demo): ${error.message}`
    })
  }
}