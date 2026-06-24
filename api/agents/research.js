/**
 * Research Agent
 * Scans competitors, trends, and niche opportunities.
 * Stores findings in research_results and market_signals.
 *
 * Input: { workspace_id, query_type, query?, target_urls?, query_id? }
 */
import { runAgent } from './_base.js'
import { textGenerateJSON } from '../_providers/text.js'
import { embed } from '../_providers/embed.js'

export default async function run(payload, { jobId } = {}) {
  const { workspace_id, query_type, query = '', target_urls = [], query_id } = payload

  return runAgent({
    agentType: 'research',
    workspaceId: workspace_id,
    inputs: payload,
    jobId,
    task: `${query_type} research ${query} content strategy competitors`,
    run: async ({ db, ragContext }) => {
      const results = []

      if (db && query_id) {
        await db.from('research_queries').update({ status: 'running' }).eq('id', query_id)
      }

      // Route by query type
      if (query_type === 'trends') {
        const trends = await researchTrends(workspace_id, ragContext)
        for (const trend of trends) {
          let embedding = null
          try { embedding = await embed(`${trend.title} ${trend.description}`) } catch { /* optional */ }
          if (db) {
            const { data } = await db.from('market_signals').insert({ ...trend, workspace_id, embedding }).select().single()
            if (data) results.push(data)
          } else {
            results.push(trend)
          }
        }
      }

      if (query_type === 'competitors' && target_urls.length > 0) {
        for (const url of target_urls.slice(0, 5)) {
          const analysis = await analyzeCompetitor(url)
          let embedding = null
          try { embedding = await embed(`${analysis.handle} ${analysis.niche} ${analysis.content_focus}`) } catch { /* optional */ }
          if (db) {
            const { data } = await db.from('competitor_analyses').insert({ ...analysis, workspace_id, embedding }).select().single()
            const resultData = { workspace_id, query_id, result_type: 'channel', title: analysis.display_name || url, url, platform: analysis.platform, data: analysis, opportunity_score: analysis.opportunity_score || 0.5 }
            await db.from('research_results').insert(resultData)
            if (data) results.push(data)
          } else {
            results.push(analysis)
          }
        }
      }

      if (query_type === 'niche') {
        const opportunities = await researchNicheOpportunities(query, ragContext)
        for (const opp of opportunities) {
          if (db) {
            const { data } = await db.from('research_results').insert({
              workspace_id, query_id, result_type: 'keyword',
              title: opp.keyword, data: opp,
              opportunity_score: opp.opportunity_score || 0.5
            }).select().single()
            if (data) results.push(data)
          } else {
            results.push(opp)
          }
        }
      }

      if (db && query_id) {
        await db.from('research_queries').update({ status: 'complete', result_count: results.length, completed_at: new Date().toISOString() }).eq('id', query_id)
      }

      return { results_found: results.length, results, query_type }
    }
  })
}

async function researchTrends(workspaceId, ragContext) {
  const prompt = `You are a content trend researcher. Identify 5-8 current content trends and opportunities.

Focus on:
- Rising topics getting more views than usual
- Underserved angles on popular topics
- Format innovations (new types of hooks, structures, edits)
- Platform-specific algorithm changes affecting content strategy

Return JSON array:
[
  {
    "signal_type": "trending_topic",
    "title": "Specific trend name",
    "description": "Why this is trending and opportunity",
    "platform": "youtube",
    "data": { "estimated_search_volume": "high", "competition": "medium", "growth_rate": "3x in 30 days" },
    "opportunity_score": 0.82,
    "expires_at": "2026-09-23"
  }
]`

  try {
    return await textGenerateJSON(prompt, { maxTokens: 1500 })
  } catch {
    return []
  }
}

async function analyzeCompetitor(url) {
  const platform = detectPlatform(url)
  const prompt = `Analyze this ${platform} channel as a competitor intelligence report.

Channel URL: ${url}

Provide detailed analysis:
{
  "channel_url": "${url}",
  "platform": "${platform}",
  "handle": "@handle",
  "display_name": "Channel Name",
  "niche": "specific niche",
  "estimated_subscribers": 50000,
  "content_focus": "what they make content about",
  "posting_frequency": "3x/week",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "content_gaps": ["gap1 — opportunity for you", "gap2 — opportunity for you"],
  "monetization_signals": ["courses", "affiliate", "sponsors"],
  "average_views": 50000,
  "engagement_rate": 0.05,
  "opportunity_score": 0.72,
  "key_takeaways": "What to learn from and what to do differently"
}`

  try {
    return await textGenerateJSON(prompt, { maxTokens: 1000 })
  } catch {
    return { channel_url: url, platform, error: 'Analysis failed' }
  }
}

async function researchNicheOpportunities(query, ragContext) {
  const prompt = `Research content niche opportunities for: "${query}"

Identify 5-10 specific keyword/topic opportunities with:
- High search intent (people actively looking for this)
- Reasonable competition (not dominated by huge channels)
- Monetization potential

Return JSON array:
[
  {
    "keyword": "specific keyword or topic",
    "intent": "informational/commercial/navigational",
    "competition_level": "low/medium/high",
    "audience_size": "estimated monthly searches",
    "monetization_fit": "how this drives revenue",
    "content_angle": "specific angle to take on this topic",
    "opportunity_score": 0.8,
    "related_keywords": ["keyword2", "keyword3"]
  }
]`

  try {
    return await textGenerateJSON(prompt, { maxTokens: 1500 })
  } catch {
    return []
  }
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  return 'web'
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
