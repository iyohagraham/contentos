/**
 * POST /api/intelligence/adapt
 * Apply a channel's extracted DNA to a NEW niche — produce a concrete adapted
 * content blueprint (pillars, title/hook/cta formulas, starter post topics).
 *
 * This makes the Version Builder's "clone/adapt → new niche" actionable: the
 * operator picks a target niche and the source channel's proven DNA gets
 * translated into a ready-to-execute content strategy for it.
 *
 * Body: {
 *   workspace_id,                 required
 *   dna,                          required — the channel_dna/content_dna/...
 *   target_niche,                 required — the niche to adapt the DNA into
 *   version_type?,                'improved' | 'niche_transfer' | 'platform_transfer' (default 'niche_transfer')
 *   platform?,                    target platform hint (default 'youtube')
 *   post_count?                   starter posts to generate (default 5)
 * }
 *
 * Returns: { adapted_strategy, posts: [...] }
 * Degrades gracefully without Supabase (no persistence) — the plan is returned
 * for the UI to render. Returns 503 when no text AI provider is configured.
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'
import { textGenerateJSON } from '../_providers/text.js'
import { buildRAGContext } from '../knowledge/rag.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    workspace_id, dna, target_niche, version_type = 'niche_transfer',
    platform = 'youtube', post_count = 5
  } = req.body || {}

  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })
  if (!dna || typeof dna !== 'object') return res.status(400).json({ error: 'dna required (from /api/intelligence/analyze)' })
  if (!target_niche || !String(target_niche).trim()) return res.status(400).json({ error: 'target_niche required' })

  const db = getServerSupabase()
  const wsId = coerceWorkspaceId(workspace_id)

  const ragContext = await buildRAGContext(wsId, `adapting channel DNA to the ${target_niche} niche for ${platform}`)

  const framing = version_type === 'improved'
    ? `Keep the SAME niche ("${dna?.channel_dna?.niche || target_niche}") but apply every improvement the DNA implies — stronger hooks, tighter structure, the highest-performing CTA. This is the "improved" version.`
    : version_type === 'platform_transfer'
      ? `Transfer the channel's content DNA to a different platform format on "${platform}" (compress hooks, adapt CTAs to the platform's native behavior). This is the "platform transfer" version.`
      : `Adapt this channel's PROVEN content DNA into the NEW target niche "${target_niche}". Reuse its hook patterns, content structure, and CTA formulas but re-skin the topics, examples, and audience pain points for the new niche. This is the "niche transfer" version.`

  const prompt = `You are a content strategy architect. ${framing}

SOURCE CHANNEL DNA (extracted from a real channel):
${JSON.stringify(dna, null, 2)}

TARGET NICHE: ${target_niche}
TARGET PLATFORM: ${platform}

Produce a concrete, ready-to-execute adapted content blueprint. Everything must be
specific to the target niche — no generic filler.
Return JSON:
{
  "adapted_strategy": {
    "niche_angle": "the specific angle this niche takes on the source DNA",
    "audience": "who exactly this targets in the new niche",
    "content_pillars": ["3-5 pillars, each a short phrase"],
    "brand_voice": "voice/tone adapted from the source channel",
    "title_formula": "a reusable title formula distilled from the source DNA",
    "hook_formula": "a reusable 5-second hook formula",
    "cta_formula": "a reusable CTA formula",
    "positioning": "how to position vs existing creators in this niche"
  },
  "posts": [
    {
      "position": 1,
      "title": "a specific, ready-to-use title using the title formula",
      "topic": "what this post covers",
      "hook": "the opening line using the hook formula",
      "cta": "the call to action using the cta formula",
      "content_pillar": "which pillar it serves",
      "why_it_works": "one line on why this beats generic content in this niche"
    }
  ]
}

Generate exactly ${Math.min(Math.max(Number(post_count) || 5, 1), 10)} posts.`

  let plan
  try {
    plan = await textGenerateJSON(prompt, { maxTokens: 2500, systemPrompt: ragContext || undefined })
  } catch (err) {
    if (/no text AI provider/i.test(err.message)) return res.status(503).json({ error: err.message })
    console.error('[intelligence/adapt]', err)
    return res.status(500).json({ error: err.message })
  }

  return res.status(200).json({
    version_type,
    target_niche,
    platform,
    adapted_strategy: plan.adapted_strategy || null,
    posts: Array.isArray(plan.posts) ? plan.posts : []
  })
}