/**
 * POST /api/planning/calendar
 * Generate a content calendar from workspace strategy.
 * Creates video stubs and content_calendar entries for the specified horizon.
 *
 * Body: { workspace_id, horizon_days?, campaign_id? }
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'
import { textGenerateJSON } from '../_providers/text.js'
import { buildRAGContext } from '../knowledge/rag.js'

const DEFAULT_MIX = { educational: 40, inspirational: 25, entertaining: 20, promotional: 15 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, horizon_days = 30, campaign_id = null } = req.body
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

  const db = getServerSupabase()
  const wsId = coerceWorkspaceId(workspace_id)

  // Load workspace strategy
  let strategy = null
  let config = null
  if (db) {
    const [sRes, cRes] = await Promise.all([
      db.from('strategies').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(1),
      db.from('workspace_config').select('*').eq('workspace_id', wsId).single()
    ])
    strategy = sRes.data?.[0] || null
    config = cRes.data || null
  }

  // Get RAG context
  const ragContext = await buildRAGContext(wsId, 'content calendar planning strategy topics')

  const mix = config?.content_mix || DEFAULT_MIX
  const platforms = config?.brand_brief?.platforms || ['youtube', 'tiktok']
  const pillars = strategy?.content_pillars || [
    { name: 'Educational', pct: 40 },
    { name: 'Inspirational', pct: 25 },
    { name: 'Entertaining', pct: 20 },
    { name: 'Promotional', pct: 15 }
  ]

  const totalPosts = Math.round(horizon_days / 7 * 3) // ~3 posts per week default
  const startDate = new Date()

  const systemPrompt = `You are a content strategist for an autonomous content brand.
${strategy ? `Brand: ${strategy.brand_name || 'ContentOS Brand'}
Niche: ${strategy.positioning || 'content creation'}
Content pillars: ${JSON.stringify(pillars)}` : ''}
${ragContext}`

  const prompt = `Generate a ${horizon_days}-day content calendar with ${totalPosts} pieces of content.

Platforms: ${platforms.join(', ')}
Content mix: ${JSON.stringify(mix)}
Start date: ${startDate.toISOString().slice(0, 10)}

Requirements:
- Distribute content evenly (not all on same day)
- Follow the content mix percentages
- Vary formats (listicle, tutorial, story, contrarian take, case study, motivation)
- Mix funnel stages: 60% awareness, 25% consideration, 15% conversion
- Include pillar balance: no pillar should exceed its target % by more than 10%
- Score each post with an opportunity score (0-1)

Return JSON array of content items:
[
  {
    "title": "Specific video title",
    "topic": "what the video covers in detail",
    "content_pillar": "Educational",
    "content_type": "tutorial",
    "funnel_stage": "awareness",
    "platforms": ["youtube", "tiktok"],
    "scheduled_date": "YYYY-MM-DD",
    "opportunity_score": 0.85,
    "hook_angle": "specific hook concept",
    "cta": "what to ask viewers to do",
    "notes": "production notes or special requirements"
  }
]`

  try {
    const items = await textGenerateJSON(prompt, { maxTokens: 3000, systemPrompt })
    if (!Array.isArray(items)) throw new Error('AI returned invalid calendar format')

    const created = []
    if (db) {
      for (const item of items.slice(0, totalPosts + 5)) {
        // Create video stub
        const { data: video } = await db.from('videos').insert({
          workspace_id: wsId,
          title: item.title,
          topic: item.topic,
          status: 'draft',
          format: item.platforms?.includes('tiktok') ? 'vertical' : 'landscape',
          target_platforms: item.platforms || platforms,
          scheduled_time: item.scheduled_date ? `${item.scheduled_date}T09:00:00Z` : null
        }).select().single()

        if (video) {
          // Create calendar entry
          const { data: calEntry } = await db.from('content_calendar').insert({
            workspace_id: wsId,
            video_id: video.id,
            campaign_id,
            scheduled_date: item.scheduled_date,
            scheduled_time: '09:00',
            target_platforms: item.platforms || platforms,
            content_pillar: item.content_pillar,
            funnel_stage: item.funnel_stage,
            opportunity_score: item.opportunity_score,
            status: 'planned',
            notes: item.notes
          }).select().single()

          created.push({ video, calendar: calEntry, item })
        }
      }
    } else {
      // No DB — return the plan
      created.push(...items.map(item => ({ item })))
    }

    return res.status(200).json({
      created: created.length,
      horizon_days,
      calendar: created.map(c => ({
        video_id: c.video?.id,
        title: c.item.title,
        scheduled_date: c.item.scheduled_date,
        content_pillar: c.item.content_pillar,
        opportunity_score: c.item.opportunity_score
      }))
    })
  } catch (err) {
    console.error('[planning/calendar]', err)
    return res.status(500).json({ error: err.message })
  }
}
