/**
 * Monetization Agent
 * Identifies monetization opportunities and optimizes revenue funnels from
 * content → product. Uses workspace products + post_analytics + revenue_events +
 * channel monetization DNA to recommend pricing, CTAs, lead-magnets, and which
 * content to double-down on for revenue.
 *
 * Input: { workspace_id, focus? = 'strategy' | 'optimize', lookback_days? = 30 }
 * Output: { recommendations, revenue_leaders, funnel_health, pricing_suggestions, summary }
 *
 * 10th agent. Registered in run.js.
 */
import { runAgent } from './_base.js'
import { textGenerateJSON } from '../_providers/text.js'

export default async function run(payload, { jobId } = {}) {
  const { workspace_id, focus = 'strategy', lookback_days = 30 } = payload

  return runAgent({
    agentType: 'monetization',
    workspaceId: workspace_id,
    inputs: payload,
    jobId,
    task: 'monetization revenue optimization product funnel pricing CTA lead magnet',
    run: async ({ db }) => {
      if (!db) return { message: 'Supabase required for monetization agent' }

      const since = new Date(Date.now() - lookback_days * 86400000).toISOString().slice(0, 10)

      // 1. Products
      const { data: products } = await db.from('products')
        .select('id, name, price, type, sales')
        .eq('workspace_id', workspace_id)

      // 2. Revenue events with video attribution
      const { data: revs } = await db.from('revenue_events')
        .select('amount, video_id, product_id, attribution_method, attribution_confidence, referring_platform, event_at')
        .eq('workspace_id', workspace_id)
        .gte('event_at', since)
        .order('event_at', { ascending: false })

      // 3. Post analytics (top performing content to monetize)
      const { data: topPosts } = await db.from('post_analytics')
        .select('video_id, platform, views, likes, comments, shares, performance_score')
        .eq('workspace_id', workspace_id)
        .gte('snapshot_date', since)
        .order('performance_score', { ascending: false })
        .limit(20)

      const videoIds = [...new Set([
        ...(revs || []).map(r => r.video_id).filter(Boolean),
        ...(topPosts || []).map(p => p.video_id).filter(Boolean)
      ])]
      let titleById = {}
      if (videoIds.length) {
        const { data: vids } = await db.from('videos').select('id, title, topic').in('id', videoIds)
        titleById = Object.fromEntries((vids || []).map(v => [v.id, v]))
      }

      // Build the revenue-by-video leaderboard.
      const revByVideo = {}
      for (const r of (revs || [])) {
        const k = r.video_id
        if (!k) continue
        revByVideo[k] = revByVideo[k] || { video_id: k, title: titleById[k]?.title || 'Unattributed', topic: titleById[k]?.topic, revenue: 0, events: 0 }
        revByVideo[k].revenue += Number(r.amount || 0)
        revByVideo[k].events += 1
      }
      const revenueLeaders = Object.values(revByVideo).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

      // Funnel health: revenue vs views (rough conversion).
      const totalRevenue = (revs || []).reduce((s, r) => s + Number(r.amount || 0), 0)
      const totalViews = (topPosts || []).reduce((s, p) => s + (p.views || 0), 0)
      const attributedRevenue = (revs || []).filter(r => r.video_id).reduce((s, r) => s + Number(r.amount || 0), 0)
      const attributionRate = totalRevenue > 0 ? parseFloat((attributedRevenue / totalRevenue).toFixed(2)) : 0
      const revenuePerView = totalViews > 0 ? parseFloat((totalRevenue / totalViews).toFixed(4)) : 0

      const funnel_health = {
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        attributed_revenue: parseFloat(attributedRevenue.toFixed(2)),
        attribution_rate: attributionRate,
        revenue_per_view: revenuePerView,
        products_count: products?.length || 0,
        revenue_events: revs?.length || 0,
        top_content_views: totalViews
      }

      // AI recommendation engine grounded in the real data.
      const prompt = `You are a monetization strategist for a faceless content brand.
Workspace products: ${JSON.stringify(products || [], null, 2)}
Revenue events (last ${lookback_days}d): ${JSON.stringify((revs || []).slice(0, 30), null, 2)}
Top-performing content (to monetize): ${JSON.stringify((topPosts || []).slice(0, 10).map(p => ({ title: titleById[p.video_id]?.title, topic: titleById[p.video_id]?.topic, views: p.views, platform: p.platform, score: p.performance_score })), null, 2)}
Funnel health: ${JSON.stringify(funnel_health)}
Focus: ${focus}

${focus === 'optimize'
  ? 'Optimize the existing funnel: tighten CTAs, strengthen attribution, and identify which top content gets a product/offer attached next.'
  : 'Recommend a monetization strategy: pricing tier, lead magnet, product/content fit, and which content pillars drive revenue.'}

Return JSON:
{
  "recommendations": [
    {
      "type": "pricing|cta|lead_magnet|product_fit|funnel|bundling",
      "title": "specific, <= 80 chars",
      "rationale": "1-2 sentences grounded in the data above",
      "expected_impact": "high|medium|low",
      "action": "a concrete next step",
      "product_ids": ["affect these products if applicable"]
    }
  ],
  "pricing_suggestions": [
    { "product_name": "...", "current_price": 0, "suggested_price": 0, "reason": "..." }
  ],
  "revenue_leaders": ["video titles that should get a direct product CTA next"],
  "summary": "one paragraph on the monetization opportunity and the single highest-leverage next action"
}

Only reference products/prices that appear in the data above. Up to 6 recommendations.`

      const systemPrompt = 'You are a monetization analyst who makes evidence-grounded, actionable revenue recommendations. Never fabricate products or stats not present in the provided data.'

      let analysis = {}
      try {
        analysis = await textGenerateJSON(prompt, { maxTokens: 2500, systemPrompt })
      } catch {
        analysis = { recommendations: [], summary: 'AI unavailable — returning raw funnel data.', pricing_suggestions: [], revenue_leaders: [] }
      }

      return {
        focus,
        funnel_health,
        revenue_leaders: revenueLeaders,
        recommendations: analysis.recommendations || [],
        pricing_suggestions: analysis.pricing_suggestions || [],
        double_down_content: analysis.revenue_leaders || [],
        summary: analysis.summary || ''
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
    console.error('[agents/monetization]', err)
    return res.status(500).json({ error: err.message })
  }
}