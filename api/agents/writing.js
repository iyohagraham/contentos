/**
 * Writing Agent
 * Generates a complete video script from a video stub.
 * Uses RAG to pull relevant frameworks, hooks, and techniques from Knowledge Base.
 * Applies channel playbooks if available.
 *
 * Input: { workspace_id, video_id }
 * Output: { script, alt_hooks, thumbnail_concepts }
 */
import { runAgent } from './_base.js'
import { textGenerateJSON } from '../_providers/text.js'

export default async function run(payload, { jobId } = {}) {
  const { workspace_id, video_id } = payload

  return runAgent({
    agentType: 'writing',
    workspaceId: workspace_id,
    inputs: payload,
    jobId,
    task: 'video script writing hook storytelling CTA structure',
    run: async ({ db, ragContext }) => {
      // Load video stub and strategy
      let video = null, strategy = null, playbooks = []
      if (db) {
        const [vRes, sRes, pRes] = await Promise.all([
          db.from('videos').select('*').eq('id', video_id).single(),
          db.from('strategies').select('*').eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(1),
          db.from('channel_playbooks').select('*').eq('workspace_id', workspace_id).in('playbook_type', ['hook_formula', 'cta_formula', 'content_structure']).limit(10)
        ])
        video = vRes.data
        strategy = sRes.data?.[0]
        playbooks = pRes.data || []
      }

      if (!video && !payload.title) throw new Error('video_id not found')

      const title = video?.title || payload.title || 'Untitled'
      const topic = video?.topic || payload.topic || title
      const platforms = video?.target_platforms || ['youtube']

      const systemPrompt = `You are an expert faceless content creator and scriptwriter.
You write compelling, high-retention video scripts for ${platforms.join(' and ')}.
Your scripts are optimized for watch time, engagement, and conversions.
${strategy ? `Brand voice: ${strategy.voice_tone || 'educational and engaging'}` : ''}
${playbooks.length > 0 ? `Available playbook formulas: ${playbooks.map(p => `${p.playbook_type}: ${p.formula}`).join('; ')}` : ''}
${ragContext}`

      const isShortForm = platforms.some(p => ['tiktok', 'instagram', 'reels'].includes(p))
      const duration = isShortForm ? '60-90 seconds' : '8-12 minutes'

      const prompt = `Write a complete, production-ready ${isShortForm ? 'short-form' : 'long-form'} video script.

TITLE: "${title}"
TOPIC: ${topic}
TARGET DURATION: ${duration}
PLATFORMS: ${platforms.join(', ')}
${strategy ? `BRAND: ${strategy.brand_name || ''} | NICHE: ${strategy.positioning || ''}` : ''}

The script MUST follow this structure:
${isShortForm ? `
1. HOOK (0-3s): Pattern interrupt — shock, question, or bold statement
2. PROBLEM (3-15s): The pain or desire the viewer has
3. SOLUTION (15-45s): Core value delivery (the "meat")
4. PROOF/EXAMPLE (45-70s): Evidence, story, or example
5. CTA (70-90s): Single clear action
` : `
1. HOOK (0-10s): Pattern interrupt opening that stops the scroll
2. PREVIEW (10-30s): What they'll learn and why it matters NOW
3. PROBLEM (30-90s): Establish the pain/problem with specifics
4. SOLUTION SETUP (90-180s): Why existing solutions fail
5. CORE CONTENT (180-480s): The actual value — 3-5 main points
6. PROOF (480-540s): Evidence, case study, or transformation
7. OBJECTION HANDLING (540-600s): Address the #1 objection
8. CTA (600-720s): Clear next step and channel plug
`}

Return JSON:
{
  "hook": "Exact word-for-word hook text (first ${isShortForm ? '3' : '10'} seconds)",
  "body": [
    { "section": "PROBLEM", "duration": "0:15-0:30", "script": "Exact narration text", "visual_cue": "What to show on screen" }
  ],
  "cta": "Exact word-for-word call to action",
  "total_duration": "${duration}",
  "word_count": 0,
  "tone": "educational/inspirational/entertaining",
  "key_points": ["main takeaway 1", "main takeaway 2", "main takeaway 3"],
  "b_roll_suggestions": ["visual 1", "visual 2", "visual 3"],
  "thumbnail_concepts": [
    { "text": "Thumbnail text overlay", "visual": "Background visual description", "emotion": "curiosity/shock/desire" }
  ]
}`

      const scriptData = await textGenerateJSON(prompt, { maxTokens: 3000, systemPrompt })

      // Generate alt hooks
      const altHooksPrompt = `Generate 4 alternative hook openings for this video:
Title: "${title}"
Original hook: "${scriptData.hook}"

Each hook should use a different psychological trigger:
1. Contrarian/shocking claim
2. Question that creates curiosity gap
3. Story/anecdote opening
4. Bold promise/result statement

Return JSON: { "alt_hooks": ["hook1", "hook2", "hook3", "hook4"] }`

      const altData = await textGenerateJSON(altHooksPrompt, { maxTokens: 500 }).catch(() => ({ alt_hooks: [] }))

      const fullScript = {
        hook: scriptData.hook,
        body: scriptData.body,
        cta: scriptData.cta,
        duration: scriptData.total_duration,
        word_count: scriptData.word_count || estimateWordCount(scriptData),
        key_points: scriptData.key_points,
        b_roll_suggestions: scriptData.b_roll_suggestions,
        tone: scriptData.tone
      }

      // Update video with script
      if (db && video_id) {
        await db.from('videos').update({
          script: fullScript,
          status: 'ready'
        }).eq('id', video_id)
      }

      return {
        video_id,
        script: fullScript,
        alt_hooks: altData.alt_hooks || [],
        thumbnail_concepts: scriptData.thumbnail_concepts || []
      }
    }
  })
}

function estimateWordCount(scriptData) {
  const hook = scriptData.hook || ''
  const body = (scriptData.body || []).map(s => s.script || '').join(' ')
  const cta = scriptData.cta || ''
  return (hook + ' ' + body + ' ' + cta).split(/\s+/).length
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
