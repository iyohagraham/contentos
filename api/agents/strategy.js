/**
 * Strategy Agent
 * Generates or refreshes a brand strategy from workspace brief + knowledge base.
 * Trigger: workspace creation, weekly refresh, learning loop update.
 *
 * Input: { workspace_id, trigger: 'init'|'refresh'|'learning_update', insights? }
 * Output: { strategy_id, strategy, changes }
 */
import { runAgent } from './_base.js'
import { textGenerateJSON } from '../_providers/text.js'

export default async function run(payload, { jobId } = {}) {
  const { workspace_id, trigger = 'manual', insights } = payload

  return runAgent({
    agentType: 'strategy',
    workspaceId: workspace_id,
    inputs: payload,
    jobId,
    task: 'brand content strategy creation positioning pillars audience',
    run: async ({ db, ragContext, agentRunId }) => {
      // Load workspace config and existing strategy
      let config = null, existing = null
      if (db) {
        const [cRes, sRes] = await Promise.all([
          db.from('workspace_config').select('*').eq('workspace_id', workspace_id).single(),
          db.from('strategies').select('*').eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(1)
        ])
        config = cRes.data
        existing = sRes.data?.[0]
      }

      const brief = config?.brand_brief || {}

      const systemPrompt = `You are an expert content brand strategist specializing in faceless content channels and digital product businesses.
Your strategies are specific, actionable, and data-driven.
Always provide concrete examples, exact numbers, and specific platform tactics.
${ragContext}`

      const prompt = `${trigger === 'refresh' ? 'Refresh' : trigger === 'learning_update' ? 'Update' : 'Create'} a complete content brand strategy.

${brief.niche ? `NICHE: ${brief.niche}` : ''}
${brief.audience ? `TARGET AUDIENCE: ${brief.audience}` : ''}
${brief.monetization_goal ? `MONETIZATION GOAL: ${brief.monetization_goal}` : ''}
${brief.style ? `CONTENT STYLE: ${brief.style}` : ''}
${brief.platforms ? `PLATFORMS: ${brief.platforms.join(', ')}` : ''}
${existing ? `EXISTING STRATEGY TO IMPROVE: ${JSON.stringify(existing, null, 2)}` : ''}
${insights?.length ? `LEARNING INSIGHTS TO INCORPORATE: ${JSON.stringify(insights)}` : ''}

Generate a complete brand strategy JSON:
{
  "brand_name": "Specific brand name",
  "handle": "@specifichandle",
  "tagline": "Compelling one-liner tagline",
  "positioning": "Detailed positioning statement: who we serve, what we offer, why we're different",
  "content_pillars": [
    {
      "name": "pillar name",
      "pct": 40,
      "desc": "description of what this pillar covers",
      "examples": ["specific topic 1", "specific topic 2", "specific topic 3"]
    }
  ],
  "posting_schedule": {
    "youtube": { "frequency": "3x/week", "best_times": ["Tue 2PM", "Thu 2PM", "Sat 10AM"], "format": "8-15 min" },
    "tiktok": { "frequency": "daily", "best_times": ["7AM", "12PM", "7PM"], "format": "30-90 sec" }
  },
  "growth_roadmap": [
    { "phase": "Phase 1: Foundation (0-3 months)", "goal": "1000 subscribers", "action": "specific action", "metrics": ["metric1"] },
    { "phase": "Phase 2: Growth (3-6 months)", "goal": "10K subscribers", "action": "specific action", "metrics": ["metric1"] },
    { "phase": "Phase 3: Monetization (6-12 months)", "goal": "$5K/month", "action": "specific action", "metrics": ["metric1"] }
  ],
  "product_strategy": {
    "name": "specific product name",
    "price": 97,
    "format": "digital guide / mini-course / template pack",
    "funnel": "specific conversion funnel description",
    "launch_timeline": "when to launch based on audience size"
  },
  "viral_hooks": [
    "Hook formula 1 with [FILL IN] placeholder",
    "Hook formula 2 with [FILL IN] placeholder",
    "Hook formula 3 with [FILL IN] placeholder"
  ],
  "voice_tone": "specific voice and tone description",
  "competitor_differentiation": ["how we're different from competitor 1", "how we're different from competitor 2"]
}`

      const strategy = await textGenerateJSON(prompt, { maxTokens: 2500, systemPrompt })

      // Save or update strategy
      let strategyRecord = strategy
      if (db) {
        if (existing && trigger !== 'init') {
          const { data } = await db.from('strategies').update({ ...strategy, updated_at: new Date().toISOString() })
            .eq('id', existing.id).select().single()
          strategyRecord = data || strategy
        } else {
          const { data } = await db.from('strategies').insert({ workspace_id, ...strategy }).select().single()
          strategyRecord = data || strategy
        }
      }

      return {
        strategy_id: strategyRecord.id,
        strategy: strategyRecord,
        trigger,
        changes: trigger === 'init' ? ['Created initial strategy'] : ['Strategy refreshed with latest insights']
      }
    }
  })
}

// HTTP handler for direct API calls
export async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const result = await run(req.body)
    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
