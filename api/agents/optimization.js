/**
 * Optimization Agent — Weekly Learning Loop
 * Analyzes past week's performance, extracts patterns, updates strategy weights.
 * Runs every Sunday 22:00 UTC in Autonomous Brand Mode.
 *
 * Input: { workspace_id, trigger }
 * Output: { insights, strategy_updates, patterns_learned }
 */
import { runAgent } from './_base.js'
import { textGenerateJSON } from '../_providers/text.js'
import { enqueue } from '../_queue.js'

export default async function run(payload, { jobId } = {}) {
  const { workspace_id, trigger = 'manual' } = payload

  return runAgent({
    agentType: 'optimization',
    workspaceId: workspace_id,
    inputs: payload,
    jobId,
    task: 'performance optimization content analytics learning patterns',
    run: async ({ db, ragContext }) => {
      if (!db) return { message: 'Supabase required for optimization agent' }

      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

      // Load last 7 days of analytics
      const { data: analytics } = await db
        .from('post_analytics')
        .select('*, videos(title, topic, script)')
        .eq('workspace_id', workspace_id)
        .gte('snapshot_date', sevenDaysAgo.slice(0, 10))
        .order('performance_score', { ascending: false })

      if (!analytics?.length) {
        return { message: 'No analytics data yet — need published posts first', insights: [] }
      }

      // Classify winners (top 20%) and losers (bottom 20%)
      const sorted = [...analytics].sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
      const topN = Math.max(1, Math.floor(sorted.length * 0.2))
      const winners = sorted.slice(0, topN)
      const losers = sorted.slice(-topN)

      // AI pattern extraction
      const prompt = `Analyze this week's content performance and extract actionable patterns.

WINNERS (top ${topN} posts):
${winners.map(p => `- "${p.videos?.title}" | Views: ${p.views} | Engagement: ${(p.engagement_rate * 100).toFixed(1)}% | Completion: ${(p.completion_rate * 100).toFixed(1)}%`).join('\n')}

UNDERPERFORMERS (bottom ${topN} posts):
${losers.map(p => `- "${p.videos?.title}" | Views: ${p.views} | Engagement: ${(p.engagement_rate * 100).toFixed(1)}%`).join('\n')}

TOTAL POSTS ANALYZED: ${analytics.length}
PERIOD: Last 7 days

Extract specific, actionable insights. Return JSON:
{
  "patterns": [
    {
      "insight_type": "hook_pattern",
      "title": "Question hooks outperform statement hooks",
      "description": "Videos starting with questions averaged 34% higher completion rate",
      "evidence": { "winner_avg_views": 12000, "loser_avg_views": 3000, "sample_size": ${analytics.length} },
      "confidence": 0.78,
      "impact": "high",
      "recommendation": "Use question-format hooks for next 4 videos"
    }
  ],
  "strategy_updates": {
    "content_type_weights": { "tutorial": 1.3, "list": 0.8 },
    "hook_type_preference": "question",
    "optimal_length_minutes": 9,
    "best_posting_days": ["tuesday", "thursday"]
  },
  "weekly_summary": "One paragraph summary of the week's performance and key learning"
}`

      const analysis = await textGenerateJSON(prompt, { maxTokens: 2000 })
      const patterns = analysis.patterns || []

      // Store insights
      const stored = []
      for (const pattern of patterns) {
        const { data } = await db.from('learning_insights').insert({
          workspace_id,
          insight_type: pattern.insight_type,
          title: pattern.title,
          description: pattern.description,
          evidence: pattern.evidence,
          confidence: pattern.confidence,
          impact: pattern.impact,
          recommendation: pattern.recommendation,
          platforms: ['all'],
          valid_until: new Date(Date.now() + 30 * 86400000).toISOString()
        }).select().single()
        if (data) stored.push(data)
      }

      // Update performance tiers on analytics records
      for (const w of winners) {
        await db.from('post_analytics').update({ performance_tier: 'hit' }).eq('id', w.id)
      }
      for (const l of losers) {
        await db.from('post_analytics').update({ performance_tier: 'miss' }).eq('id', l.id)
      }

      // If significant updates, enqueue strategy refresh
      if (patterns.some(p => p.impact === 'high' && p.confidence > 0.75)) {
        await enqueue({
          workspace_id,
          job_type: 'agent:strategy',
          payload: { trigger: 'learning_update', insights: stored.slice(0, 3) },
          priority: 2,
          created_by: 'agent:optimization'
        })
      }

      return {
        posts_analyzed: analytics.length,
        winners: winners.length,
        underperformers: losers.length,
        insights: stored,
        strategy_updates: analysis.strategy_updates || {},
        patterns_learned: patterns.length,
        weekly_summary: analysis.weekly_summary
      }
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
