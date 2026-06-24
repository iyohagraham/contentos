/**
 * POST /api/generate-script
 * Generate a short-form video script with RAG-enhanced context.
 * Falls back to demo if no AI provider configured.
 */
import { textChat, parseJSON, hasTextProvider } from './_providers/text.js'
import { buildRAGContext } from './knowledge/rag.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { topic, niche, audience, style, length, workspace_id, video_id } = req.body
  if (!topic) return res.status(400).json({ error: 'Topic is required' })

  const demoScript = {
    hook: "The #1 mistake costing creators thousands!",
    body: ["Most creators chase views — the pros chase conversions", "1K engaged fans beats 100K passive ones every time", "Stop optimizing for views. Optimize for action."],
    cta: "Drop a comment: what's your #1 content goal right now?",
    estimatedDuration: "45s",
    suggestedVisuals: ["Bold text on screen", "Split comparison", "CTA card"],
    fullScript: "The #1 mistake costing creators thousands!\n\nMost creators chase views — the pros chase conversions\n\n1K engaged fans beats 100K passive ones every time\n\nStop optimizing for views. Optimize for action.\n\nDrop a comment: what's your #1 content goal right now?"
  }

  if (!hasTextProvider()) {
    return res.status(200).json({ success: true, script: demoScript, demo: true, message: 'Demo mode: add KIMI_API_KEY to enable AI generation.' })
  }

  // RAG context (optional — non-blocking if knowledge base empty)
  const ragContext = workspace_id
    ? await buildRAGContext(workspace_id, `${topic} video script hook cta ${niche || ''}`)
    : ''

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

  const systemPrompt = `You are an expert viral short-form video scriptwriter for faceless content channels. Output ONLY valid JSON, no markdown fences.
${ragContext}`

  const userPrompt = `Write a short-form video script about: ${topic}
Style: ${styles[style] || styles.faceless}
Niche: ${niche || 'general'}
Audience: ${audience || 'general audience'}
Length: ${lengths[length] || lengths.short}

Output JSON: {"hook":"...","body":["...","..."],"cta":"...","estimatedDuration":"Xs","suggestedVisuals":["...","..."]}`

  try {
    const { content } = await textChat([{ role: 'user', content: userPrompt }], { systemPrompt, maxTokens: 1200 })
    const script = parseJSON(content)
    return res.status(200).json({
      success: true,
      script: { ...script, fullScript: `${script.hook}\n\n${(script.body || []).join('\n\n')}\n\n${script.cta}` }
    })
  } catch (error) {
    console.error('[generate-script]', error.message)
    return res.status(200).json({ success: true, script: demoScript, demo: true, message: `AI error: ${error.message}` })
  }
}
