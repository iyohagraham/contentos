/**
 * POST /api/generate-ideas
 * Generate viral video ideas with RAG-enhanced context.
 */
import { textChat, parseJSON, hasTextProvider } from './_providers/text.js'
import { buildRAGContext } from './knowledge/rag.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { niche, count = 10, workspace_id } = req.body

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

  if (!hasTextProvider()) {
    return res.status(200).json({ success: true, ideas: demoIdeas.slice(0, count), demo: true, message: 'Demo mode: add KIMI_API_KEY for AI generation.' })
  }

  const ragContext = workspace_id
    ? await buildRAGContext(workspace_id, `viral video ideas content topics ${niche || ''}`)
    : ''

  const systemPrompt = `You are a viral content strategist. Output ONLY valid JSON, no markdown.
${ragContext}`

  const userPrompt = `Generate ${count} viral short-form video ideas for the "${niche || 'general'}" niche.
Each idea needs a 3-second hook. Mix educational (40%), relatable (25%), engagement (20%), conversion (15%) types.
Include opportunity_score (0-1) for each idea based on viral potential.
Output JSON: {"ideas":[{"title":"...","type":"educational|relatable|engagement|conversion","description":"...","visual":"...","opportunity_score":0.8,"hook":"first 3 seconds"}]}`

  try {
    const { content } = await textChat([{ role: 'user', content: userPrompt }], { systemPrompt, maxTokens: 2000 })
    const result = parseJSON(content)
    return res.status(200).json({ success: true, ideas: result.ideas || result })
  } catch (error) {
    console.error('[generate-ideas]', error.message)
    return res.status(200).json({ success: true, ideas: demoIdeas.slice(0, count), demo: true, message: `AI error: ${error.message}` })
  }
}
