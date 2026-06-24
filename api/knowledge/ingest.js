/**
 * POST /api/knowledge/ingest
 * Ingest a document into the Knowledge System.
 * Supports: URL (web page), YouTube URL, plain text, GitHub repo URL.
 *
 * Pipeline:
 *   1. Fetch content from source
 *   2. Chunk text
 *   3. Embed chunks (text-embedding-3-small)
 *   4. Extract structured knowledge objects (AI)
 *   5. Store in knowledge_assets + knowledge_chunks + knowledge_objects
 */
import { getServerSupabase } from '../_db.js'
import { embed, embedBatch, hasEmbedProvider } from '../_providers/embed.js'
import { textGenerateJSON } from '../_providers/text.js'
import { chunkText, chunkTranscript, estimateTokens } from './_chunker.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, source_url, text, asset_type = 'url', title, categories = [] } = req.body
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })
  if (!source_url && !text) return res.status(400).json({ error: 'source_url or text required' })

  const db = getServerSupabase()

  try {
    // Step 1: Create asset record
    let assetData = { workspace_id, title: title || source_url || 'Untitled', asset_type, source_url, categories, ingestion_status: 'processing' }
    let content = text || ''

    if (source_url && !text) {
      const fetched = await fetchContent(source_url, asset_type)
      content = fetched.content
      assetData.title = assetData.title === source_url ? (fetched.title || source_url) : assetData.title
      assetData.raw_content = content.slice(0, 10000) // store first 10k chars
    }

    let asset = { id: `local_${Date.now()}` }
    if (db) {
      const { data, error } = await db.from('knowledge_assets').insert(assetData).select().single()
      if (error) throw error
      asset = data
    }

    // Step 2: Chunk
    const rawChunks = assetType(asset_type) === 'transcript'
      ? chunkTranscript(parseTranscript(content)).map(c => ({ content: c.content, metadata: c.metadata }))
      : chunkText(content).map((c, i) => ({ content: c, metadata: { index: i } }))

    // Step 3: Embed (batch for efficiency)
    let chunks = rawChunks
    if (hasEmbedProvider() && rawChunks.length > 0) {
      const texts = rawChunks.map(c => c.content)
      const embeddings = await embedBatch(texts)
      chunks = rawChunks.map((c, i) => ({ ...c, embedding: embeddings[i] }))
    }

    // Step 4: Store chunks
    if (db && chunks.length > 0) {
      const chunkRows = chunks.map((c, i) => ({
        asset_id: asset.id,
        chunk_index: i,
        content: c.content,
        token_count: estimateTokens(c.content),
        embedding: c.embedding,
        chunk_type: 'text',
        metadata: c.metadata
      }))
      await db.from('knowledge_chunks').insert(chunkRows)
    }

    // Step 5: Extract knowledge objects (AI)
    let objects = []
    if (content.length > 200) {
      objects = await extractKnowledgeObjects(content.slice(0, 8000), { workspace_id, asset_id: asset.id, db })
    }

    // Step 6: Update asset status
    if (db) {
      await db.from('knowledge_assets').update({
        ingestion_status: 'complete',
        chunk_count: chunks.length,
        object_count: objects.length,
        ingested_at: new Date().toISOString()
      }).eq('id', asset.id)
    }

    return res.status(200).json({
      asset_id: asset.id,
      chunks: chunks.length,
      objects: objects.length,
      status: 'complete'
    })
  } catch (err) {
    console.error('[knowledge/ingest]', err)
    if (db) {
      await db.from('knowledge_assets').update({ ingestion_status: 'failed', error: err.message })
    }
    return res.status(500).json({ error: err.message })
  }
}

async function fetchContent(url, assetType) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return fetchYouTube(url)
  }
  if (url.includes('github.com')) {
    return fetchGitHub(url)
  }
  // Generic URL: fetch and extract text
  const res = await fetch(url, { headers: { 'User-Agent': 'ContentOS/1.0' } })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const html = await res.text()
  return { content: htmlToText(html), title: extractTitle(html) }
}

async function fetchYouTube(url) {
  // Use oEmbed for title + description; transcript requires yt-dlp (server-side tool)
  const videoId = extractYouTubeId(url)
  if (!videoId) throw new Error('Could not extract YouTube video ID')

  const oEmbed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
  const meta = oEmbed.ok ? await oEmbed.json() : {}

  // Attempt caption fetch via YouTube's timedtext API (public, no auth)
  let transcript = ''
  try {
    const captionRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`)
    const html = await captionRes.text()
    const match = html.match(/"captionTracks":\[({[^}]+})\]/)
    if (match) {
      const track = JSON.parse(`[${match[1]}]`)[0]
      if (track?.baseUrl) {
        const xmlRes = await fetch(track.baseUrl)
        const xml = await xmlRes.text()
        transcript = xml.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim()
      }
    }
  } catch { /* transcript unavailable — use description only */ }

  return {
    title: meta.title || `YouTube: ${videoId}`,
    content: [meta.author_name, meta.title, transcript || '[Transcript unavailable]'].filter(Boolean).join('\n\n')
  }
}

async function fetchGitHub(url) {
  // Convert github.com URL to raw README
  const match = url.match(/github\.com\/([^/]+\/[^/]+)/)
  if (!match) throw new Error('Invalid GitHub URL')
  const repo = match[1]
  const readmeRes = await fetch(`https://raw.githubusercontent.com/${repo}/main/README.md`)
  if (!readmeRes.ok) {
    const masterRes = await fetch(`https://raw.githubusercontent.com/${repo}/master/README.md`)
    if (!masterRes.ok) throw new Error('Could not fetch GitHub README')
    return { title: repo, content: await masterRes.text() }
  }
  return { title: repo, content: await readmeRes.text() }
}

function extractYouTubeId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || null
}

function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1]?.trim() || null
}

function parseTranscript(text) {
  // Handle "[00:05] text" or "0:05 text" format
  const lines = text.split('\n')
  const segments = []
  for (const line of lines) {
    const m = line.match(/^\[?(\d+:\d+(?::\d+)?)\]?\s*(.+)/)
    if (m) segments.push({ timestamp: m[1], text: m[2] })
    else if (line.trim()) segments.push({ timestamp: null, text: line.trim() })
  }
  return segments.length > 3 ? segments : [{ timestamp: null, text }]
}

function assetType(type) {
  return ['youtube', 'transcript'].includes(type) ? 'transcript' : 'text'
}

async function extractKnowledgeObjects(content, { workspace_id, asset_id, db }) {
  const prompt = `Analyze this content and extract structured knowledge objects.

CONTENT:
${content}

Extract up to 8 knowledge objects. Each object must be one of these types:
- concept: a core idea or principle
- framework: a structured approach or model
- pattern: a recurring strategy or tactic
- hook_formula: a formula for creating attention-grabbing openings
- cta_formula: a formula for calls to action
- content_structure: a template for organizing content
- strategy: a high-level strategic approach
- technique: a specific actionable technique

Return JSON array:
[
  {
    "object_type": "hook_formula",
    "title": "The Open Loop Hook",
    "summary": "One sentence summary",
    "content": "Full description of how to use this",
    "examples": ["Example 1", "Example 2"],
    "applicability": ["short_form_video", "youtube_script"],
    "platform_relevance": ["tiktok", "instagram", "youtube"],
    "tags": ["hooks", "attention", "opening"]
  }
]`

  try {
    const objects = await textGenerateJSON(prompt, { maxTokens: 2000 })
    if (!Array.isArray(objects)) return []

    const stored = []
    for (const obj of objects.slice(0, 8)) {
      if (!obj.object_type || !obj.title || !obj.content) continue

      let embedding = null
      try {
        embedding = await embed(`${obj.title}: ${obj.summary || obj.content.slice(0, 500)}`)
      } catch { /* embedding optional */ }

      if (db) {
        const { data } = await db.from('knowledge_objects').insert({
          asset_id,
          workspace_id,
          object_type: obj.object_type,
          title: obj.title,
          summary: obj.summary || obj.content.slice(0, 200),
          content: obj.content,
          embedding,
          examples: obj.examples || [],
          applicability: obj.applicability || [],
          platform_relevance: obj.platform_relevance || [],
          tags: obj.tags || []
        }).select().single()
        if (data) stored.push(data)
      } else {
        stored.push(obj)
      }
    }
    return stored
  } catch {
    return []
  }
}

export { ingestHandler: handler }
