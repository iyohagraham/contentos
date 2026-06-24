/**
 * POST /api/generate-strategy
 * Generate a brand strategy with RAG-enhanced context.
 * Delegates to Strategy Agent when workspace_id provided; falls back to direct generation.
 */
import { textChat, parseJSON, hasTextProvider } from './_providers/text.js'
import { buildRAGContext } from './knowledge/rag.js'
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { niche, audience, product } = req.body

  const demoStrategy = {
    brand: {
      name: `${niche || 'Your'} Pro`,
      handle: `@${(niche || 'your').toLowerCase().replace(/\s/g, '')}pro`,
      tagline: `Master ${niche || 'your craft'} in minutes, not months`,
      positioning: `The go-to resource for ${audience || 'professionals'} who want results faster`
    },
    pillars: [
      { name: 'Educational', pct: 40, desc: 'How-to tutorials, tips, insights', examples: ['Step-by-step guides', 'Common mistakes'] },
      { name: 'Relatable', pct: 30, desc: 'Pain points, struggles, wins', examples: ['Day in the life', 'Before/after'] },
      { name: 'Engagement', pct: 20, desc: 'Questions, hot takes, polls', examples: ['Unpopular opinions', 'This or that'] },
      { name: 'Conversion', pct: 10, desc: 'Product mentions, CTAs', examples: ['Success stories', 'Product demos'] }
    ],
    schedule: {
      tiktok: { frequency: 'Daily', time: '6:00 PM', bestDays: ['Tue', 'Wed', 'Thu'] },
      instagram: { frequency: '5x/week', time: '12:00 PM', bestDays: ['Mon', 'Wed', 'Fri'] },
      youtube: { frequency: '3 Shorts + 1 Long', time: '2:00 PM', bestDays: ['Sat', 'Sun'] },
      facebook: { frequency: '3x/week', time: '1:00 PM', bestDays: ['Wed', 'Thu', 'Fri'] }
    },
    roadmap: [
      { phase: 'Month 1-2', goal: '0-10K followers', action: 'Focus on value content, build trust', metrics: { followers: '10K', engagement: '5%' } },
      { phase: 'Month 3-4', goal: '10-50K followers', action: 'Introduce soft CTAs, grow email list', metrics: { followers: '50K', engagement: '4%' } },
      { phase: 'Month 5-6', goal: '50K+ followers', action: 'Launch digital product, optimize funnel', metrics: { followers: '100K', revenue: '$10K/mo' } }
    ],
    product: {
      name: product || `${niche || 'Your'} Starter Pack`,
      price: '$27-97',
      format: 'Digital Download (PDF + Templates)',
      description: `Help ${audience || 'your audience'} skip the learning curve`,
      funnel: { top: 'Free lead magnet', middle: 'Email nurture (5-7 days)', bottom: 'Core product + upsell' }
    }
  }

  const { workspace_id } = req.body

  if (!hasTextProvider()) {
    return res.status(200).json({ success: true, strategy: demoStrategy, demo: true, message: 'Demo mode: add KIMI_API_KEY for AI generation.' })
  }

  const ragContext = workspace_id
    ? await buildRAGContext(workspace_id, `content strategy monetization ${niche || ''} ${audience || ''}`)
    : ''

  const userPrompt = `Create a complete monetization strategy for a faceless short-form video channel.
Niche: ${niche || 'general content'}
Audience: ${audience || 'general audience'}
Product to sell: ${product || 'a digital guide'}

Output ONLY valid JSON matching this exact shape:
{
  "brand": {"name":"...","handle":"@...","tagline":"...","positioning":"..."},
  "pillars": [{"name":"Educational","pct":40,"desc":"...","examples":["...","..."]}, ...4 pillars summing to 100],
  "schedule": {"tiktok":{"frequency":"...","time":"...","bestDays":["...","..."]}, "instagram":{...}, "youtube":{...}, "facebook":{...}},
  "roadmap": [{"phase":"Month 1-2","goal":"...","action":"...","metrics":{"followers":"...","engagement":"..."}}, ...3 phases],
  "product": {"name":"...","price":"...","format":"...","description":"...","funnel":{"top":"...","middle":"...","bottom":"..."}}
}`

  const systemPrompt = `You are an expert social media monetization strategist. Output ONLY valid JSON, no markdown.
${ragContext}`

  try {
    const { content } = await textChat([{ role: 'user', content: userPrompt }], { systemPrompt, maxTokens: 1500 })
    const strategy = parseJSON(content)
    return res.status(200).json({ success: true, strategy })
  } catch (error) {
    console.error('[generate-strategy]', error.message)
    return res.status(200).json({ success: true, strategy: demoStrategy, demo: true, message: `AI error: ${error.message}` })
  }
}