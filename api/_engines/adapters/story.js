/**
 * Story Engine (#8) — adapter (LIVE).
 *
 * The Story responsibility is also served by api/agents/writing.js (the heavy,
 * DB-bound Writing Agent used inside the autonomous job loop). This adapter is the
 * lightweight, self-contained ENGINE surface used by the Studio pipeline: brief +
 * creative_direction → STORY contract, no DB dependency.
 *
 * input:  { brief|topic, creative_direction?, knowledge?, format? }
 * output: STORY contract { title, logline, structure, hook, beats[], cta, retention }
 */
import { defineEngine } from '../_base.js'
import { Story, validateContract } from '../../_contracts/index.js'
import { textGenerateJSON, hasTextProvider } from '../../_providers/text.js'

export default defineEngine({
  id: 'story',
  name: 'Story Engine',
  responsibility: 'Generate narrative: structure, hooks, retention, arcs, series, episodes.',
  status: 'live',
  inputs: ['creative_direction', 'knowledge'],
  outputs: ['story'],
  run: async (input = {}) => {
    const topic = input.brief || input.topic || input.knowledge?.topic || ''
    if (!topic) throw new Error('story: a brief/topic is required')
    const dir = input.creative_direction || {}
    const shortForm = ['9:16', '1:1'].includes(input.format)

    let body = null
    if (hasTextProvider()) {
      const facts = Array.isArray(input.knowledge?.facts)
        ? input.knowledge.facts.slice(0, 6).map((f) => `- ${f.title || f.summary || f}`).join('\n') : ''
      const prompt = `Write a ${shortForm ? 'short-form (45-90s)' : 'long-form (8-12min)'} video STORY for: "${topic}".
${dir.emotional_tone ? `Emotional tone: ${dir.emotional_tone}. ` : ''}${dir.narrative_style ? `Narrative style: ${dir.narrative_style}. ` : ''}${dir.pacing ? `Pacing: ${dir.pacing}. ` : ''}${dir.audience ? `Audience: ${dir.audience}.` : ''}
${facts ? `Ground it in these facts:\n${facts}` : ''}
Return JSON:
{
  "title": "a click-worthy title",
  "logline": "one sentence",
  "structure": "three-act | hook-payoff | listicle | tutorial | story-driven",
  "hook": "the exact first-line hook (pattern interrupt)",
  "beats": [{ "beat": "PROBLEM|SOLUTION|PROOF|...", "content": "the narration for this beat" }],
  "cta": "the closing call to action",
  "retention": { "hook_strength": "why it stops the scroll", "pattern_interrupts": ["..."] }
}`
      try { body = await textGenerateJSON(prompt, { maxTokens: 2000 }) } catch { body = null }
    }

    if (!body || typeof body !== 'object') {
      body = {
        title: topic, logline: topic, structure: 'hook-payoff',
        hook: `Here's what nobody tells you about ${topic}.`,
        beats: [
          { beat: 'PROBLEM', content: `Most people get ${topic} wrong because they skip the basics.` },
          { beat: 'SOLUTION', content: `Here's the approach that actually works.` },
          { beat: 'PROOF', content: `And here's the proof it works.` }
        ],
        cta: 'Follow for more.', retention: {}
      }
    }

    const story = {
      ...Story.blank(),
      title: body.title || topic,
      logline: body.logline || '',
      structure: body.structure || 'hook-payoff',
      hook: body.hook || '',
      beats: (Array.isArray(body.beats) ? body.beats : []).map((b) => (typeof b === 'string' ? { beat: 'BEAT', content: b } : { beat: b.beat || 'BEAT', content: b.content || b.script || '' })),
      cta: body.cta || '',
      retention: body.retention || {}
    }

    const v = validateContract('story', story)
    if (!v.ok) throw new Error(`story: output failed contract (missing: ${v.missing.join(', ')})`)
    return story
  }
})