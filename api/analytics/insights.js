/**
 * POST /api/analytics/insights
 * Generate AI-powered learning insights from aggregated performance data.
 * Reads recent post_analytics + revenue, loads the workspace's knowledge/SKILLS
 * context via RAG+skill injection (base agent), and asks the model to surface
 * winner/loser patterns → stored as learning_insights rows.
 *
 * Body: { workspace_id, period? = '30d', max_insights? = 6 }
 * Returns: { generated, insights: [...] }  (also persisted to learning_insights)
 *
 * Idempotent-ish: insights are appended with a type+title (the Optimization
 * Agent later decides which to apply). Degrades to 503 on no text AI provider.
 */
import { runAgent } from '../agents/_base.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, period = '30d', max_insights = 6 } = req.body || {}
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

  try {
    const result = await runAgent({
      agentType: 'analytics',
      workspaceId: workspace_id,
      inputs: { period, max_insights },
      task: 'analyze content performance and generate learning insights for optimization',
      run: async ({ db }) => {
        if (!db) return { message: 'Supabase required for insight generation' }

        const since = new Date(Date.now() - ({ '7d': 7, '30d': 30, '90d': 90 }[period] || 30) * 86400000).toISOString().slice(0, 10)

        // Pull recent per-post metrics joined to video titles.
        const { data: pa, error: paErr } = await db.from('post_analytics')
          .select('views, likes, comments, shares, engagement_rate, performance_score, platform, snapshot_date, video_id, video_post_id')
          .eq('workspace_id', workspace_id)
          .gte('snapshot_date', since)
          .order('snapshot_date', { ascending: false })
        if (paErr) throw paErr

        const { data: rev } = await db.from('revenue_events')
          .select('amount, video_id, event_at')
          .eq('workspace_id', workspace_id)
          .gte('event_at', since)

        const videoIds = [...new Set((pa || []).map(r => r.video_id).filter(Boolean))]
        let titleById = {}
        if (videoIds.length) {
          const { data: vids } = await db.from('videos').select('id, title').in('id', videoIds)
          titleById = Object.fromEntries((vids || []).map(v => [v.id, v.title]))
        }

        // Condense to a per-post summary the model can reason over.
        const perPost = {}
        for (const r of (pa || [])) {
          const k = r.video_id || r.video_post_id
          if (!k) continue
          perPost[k] = perPost[k] || { title: titleById[r.video_id] || 'Untitled', platform: r.platform, views: 0, likes: 0, comments: 0, shares: 0, eng: 0, n: 0, score: 0 }
          perPost[k].views += r.views || 0
          perPost[k].likes += r.likes || 0
          perPost[k].comments += r.comments || 0
          perPost[k].shares += r.shares || 0
          perPost[k].score = Math.max(perPost[k].score, r.performance_score || 0)
          perPost[k].n += 1
        }
        for (const r of (rev || [])) {
          const k = r.video_id
          if (k && perPost[k]) perPost[k].revenue = (perPost[k].revenue || 0) + Number(r.amount || 0)
        }
        const posts = Object.entries(perPost).map(([id, p]) => ({
          id, title: p.title, platform: p.platform,
          views: p.views, likes: p.likes, comments: p.comments, shares: p.shares,
          engagement_rate: p.views ? parseFloat(((p.likes + p.comments + p.shares) / p.views).toFixed(4)) : 0,
          performance: p.score, revenue: p.revenue || 0
        }))

        if (posts.length < 2) {
          return { generated: 0, insights: [], reason: 'not enough tracked posts in period' }
        }

        // Ask the model to surface patterns from the real data.
        const messages = [{
          role: 'user',
          content: `Here is REAL per-post performance data for this workspace over the last ${period}:

${JSON.stringify(posts.slice(0, 40), null, 2)}

Surface the strongest actionable insights for improving future content. For each:
- insight_type: one of hook_pattern, format_winner, topic_resonance, posting_time, cta_effectiveness, thumbnail_style, content_length, pillar_performance
- title (<=80 chars)
- description (evidence-grounded, 1-2 sentences)
- confidence (0-1)
- impact (high|medium|low)
- recommendation (a concrete next action)
- platforms (array of affected platforms; ["all"] if general)

Return JSON array of up to ${max_insights} insights, ordered highest-impact first. Only include insights you can ground in the data above.`
        }]

        const systemPrompt = 'You are a content analytics analyst who converts raw performance data into concrete, evidence-grounded optimization insights. Never fabricate stats not supported by the provided data.'

        const { content } = await import('../_providers/text.js').then(async m => {
          const { textChat } = m
          return textChat(messages, { systemPrompt, maxTokens: 2000 })
        })

        let insights
        try {
          const { parseJSON } = await import('../_providers/text.js')
          insights = parseJSON(content)
        } catch { throw new Error('AI returned invalid insight format') }

        if (!Array.isArray(insights)) insights = []

        const persisted = []
        for (const ins of insights.slice(0, max_insights)) {
          if (!ins.title || !ins.insight_type) continue
          const { data } = await db.from('learning_insights').insert({
            workspace_id: workspace_id,
            insight_type: ins.insight_type,
            title: ins.title,
            description: ins.description || '',
            evidence: { posts_analyzed: posts.length, period },
            confidence: Number(ins.confidence) || 0.7,
            impact: ins.impact || 'medium',
            recommendation: ins.recommendation || null,
            platforms: ins.platforms || ['all']
          }).select().single()
          if (data) persisted.push(data)
        }

        return { generated: persisted.length, insights: persisted }
      }
    })
    return res.status(200).json(result)
  } catch (err) {
    console.error('[analytics/insights]', err)
    return res.status(500).json({ error: err.message })
  }
}