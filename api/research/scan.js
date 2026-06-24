/**
 * POST /api/research/scan
 * Trigger a research scan for a workspace.
 * Enqueues a research job that the agent runner will pick up.
 *
 * Body: { workspace_id, query_type, query?, target_urls?, target_platforms? }
 * query_type: competitors | trends | niche | audience | keywords
 */
import { getServerSupabase } from '../_db.js'
import { enqueue } from '../_queue.js'
import { textGenerateJSON } from '../_providers/text.js'
import { embed } from '../_providers/embed.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, query_type, query = '', target_urls = [], target_platforms = [] } = req.body
  if (!workspace_id || !query_type) return res.status(400).json({ error: 'workspace_id and query_type required' })

  const db = getServerSupabase()

  // Log the research query
  let queryRecord = { id: `local_${Date.now()}` }
  if (db) {
    const { data } = await db.from('research_queries').insert({
      workspace_id, query_type, query, target_urls, target_platforms,
      status: 'pending', triggered_by: 'user'
    }).select().single()
    queryRecord = data || queryRecord
  }

  // For URL-based competitor/channel research, run inline (fast)
  if (query_type === 'competitors' && target_urls.length > 0) {
    const results = await researchUrls(target_urls, workspace_id, queryRecord.id, db)
    return res.status(200).json({ query_id: queryRecord.id, results, status: 'complete' })
  }

  // For broad research, enqueue async job
  const job = await enqueue({
    workspace_id,
    job_type: 'agent:research',
    payload: { query_type, query, target_urls, target_platforms, query_id: queryRecord.id },
    priority: 2,
    created_by: 'user'
  })

  return res.status(202).json({ query_id: queryRecord.id, job_id: job.id, status: 'queued' })
}

async function researchUrls(urls, workspace_id, query_id, db) {
  const results = []

  for (const url of urls.slice(0, 5)) {
    try {
      const data = await analyzeChannelUrl(url)
      if (!data) continue

      let embedding = null
      const embeddingText = `${data.handle || url} ${data.niche || ''} ${data.content_focus || ''}`
      try {
        embedding = await embed(embeddingText)
      } catch { /* optional */ }

      const result = {
        workspace_id, query_id,
        result_type: 'channel',
        title: data.display_name || data.handle || url,
        url, platform: data.platform,
        data, summary: data.summary || '',
        opportunity_score: data.opportunity_score || 0.5,
        embedding
      }

      if (db) {
        const { data: row } = await db.from('research_results').insert(result).select().single()
        if (row) results.push(row)
      } else {
        results.push(result)
      }
    } catch (err) {
      results.push({ url, error: err.message })
    }
  }

  if (db && results.length > 0) {
    await db.from('research_queries').update({ status: 'complete', result_count: results.length }).eq('id', query_id)
  }

  return results
}

async function analyzeChannelUrl(url) {
  const platform = detectPlatform(url)
  if (!platform) return null

  // Fetch basic metadata (oEmbed / public API)
  let meta = {}
  if (platform === 'youtube') {
    try {
      const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
      const channelHandle = url.match(/@([a-zA-Z0-9_.-]+)/)?.[1]
      if (videoId) {
        const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
        if (res.ok) {
          const data = await res.json()
          meta = { display_name: data.author_name, platform: 'youtube', handle: data.author_url?.split('/').pop() }
        }
      } else if (channelHandle) {
        meta = { handle: channelHandle, platform: 'youtube', display_name: `@${channelHandle}` }
      }
    } catch { /* continue */ }
  }

  // AI analysis of the channel based on URL and available metadata
  const prompt = `Analyze this social media channel and provide structured research data.

Channel URL: ${url}
Platform: ${platform}
Available metadata: ${JSON.stringify(meta)}

Provide a JSON analysis:
{
  "handle": "@channelname",
  "display_name": "Channel Display Name",
  "platform": "${platform}",
  "niche": "specific content niche",
  "content_focus": "brief description of content focus",
  "estimated_audience": "audience description",
  "content_style": "educational/entertainment/lifestyle/etc",
  "posting_frequency": "estimated posting frequency",
  "monetization_signals": ["affiliate", "courses", "sponsorships"],
  "strengths": ["strength 1", "strength 2"],
  "content_gaps": ["gap 1", "gap 2"],
  "opportunity_score": 0.7,
  "summary": "One sentence summary"
}`

  try {
    const data = await textGenerateJSON(prompt, { maxTokens: 800 })
    return { ...meta, ...data, platform }
  } catch {
    return { ...meta, platform, summary: `Channel at ${url}` }
  }
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('facebook.com')) return 'facebook'
  return null
}
