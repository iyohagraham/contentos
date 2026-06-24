/**
 * Planning Agent
 * Generates content calendar from strategy + intelligence.
 * Delegates to /api/planning/calendar with workspace context loaded.
 *
 * Input: { workspace_id, horizon_days?, campaign_id? }
 */
import { runAgent } from './_base.js'
import { textGenerateJSON } from '../_providers/text.js'

export default async function run(payload, { jobId } = {}) {
  const { workspace_id, horizon_days = 30, campaign_id } = payload

  return runAgent({
    agentType: 'planning',
    workspaceId: workspace_id,
    inputs: payload,
    jobId,
    task: 'content planning calendar strategy topics schedule',
    run: async ({ db, ragContext }) => {
      let strategy = null, insights = [], playbooks = []
      if (db) {
        const [sRes, iRes, pRes] = await Promise.all([
          db.from('strategies').select('*').eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(1),
          db.from('learning_insights').select('*').eq('workspace_id', workspace_id).eq('applied', false).order('confidence', { ascending: false }).limit(5),
          db.from('channel_playbooks').select('*').eq('workspace_id', workspace_id).limit(10)
        ])
        strategy = sRes.data?.[0]
        insights = iRes.data || []
        playbooks = pRes.data || []
      }

      const systemPrompt = `You are a content strategist generating an optimized ${horizon_days}-day content calendar.
${strategy ? `Brand strategy: ${JSON.stringify(strategy, null, 2)}` : ''}
${insights.length ? `Apply these recent learnings: ${insights.map(i => `${i.title}: ${i.recommendation}`).join('; ')}` : ''}
${playbooks.length ? `Use these proven formulas: ${playbooks.map(p => p.formula).join('; ')}` : ''}
${ragContext}`

      const totalPosts = Math.round(horizon_days / 7 * 3)
      const startDate = new Date()

      const prompt = `Generate a ${horizon_days}-day content calendar with ${totalPosts} posts.

Apply the opportunity scoring formula for each post:
score = (niche_gap×0.25) + (audience_resonance×0.25) + (platform_trend×0.20) + (pillar_balance×0.15) + (funnel_position×0.15)

Content mix targets: Educational 40%, Inspirational 25%, Entertaining 20%, Promotional 15%
Start date: ${startDate.toISOString().slice(0, 10)}

Return JSON array:
[{
  "title": "specific title",
  "topic": "detailed topic description",
  "content_pillar": "Educational",
  "content_type": "tutorial",
  "funnel_stage": "awareness",
  "platforms": ["youtube", "tiktok"],
  "scheduled_date": "YYYY-MM-DD",
  "opportunity_score": 0.85,
  "hook_angle": "specific hook concept",
  "cta": "specific CTA",
  "applies_insight": "which learning insight this applies"
}]`

      const items = await textGenerateJSON(prompt, { maxTokens: 3000, systemPrompt })
      if (!Array.isArray(items)) throw new Error('Planning agent returned invalid format')

      const created = []
      if (db) {
        for (const item of items.slice(0, totalPosts + 5)) {
          const { data: video } = await db.from('videos').insert({
            workspace_id, title: item.title, topic: item.topic,
            status: 'draft', target_platforms: item.platforms,
            scheduled_time: item.scheduled_date ? `${item.scheduled_date}T09:00:00Z` : null
          }).select().single()

          if (video) {
            await db.from('content_calendar').insert({
              workspace_id, video_id: video.id, campaign_id: campaign_id || null,
              scheduled_date: item.scheduled_date, content_pillar: item.content_pillar,
              funnel_stage: item.funnel_stage, opportunity_score: item.opportunity_score, status: 'planned'
            })
            created.push({ video_id: video.id, title: item.title, date: item.scheduled_date, score: item.opportunity_score })
          }
        }

        // Mark applied insights
        if (insights.length) {
          await db.from('learning_insights').update({ applied: true, applied_at: new Date().toISOString() }).in('id', insights.map(i => i.id))
        }
      }

      return { calendar_items: created, posts_planned: created.length, horizon_days }
    }
  })
}

export async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const result = await run(req.body)
    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
