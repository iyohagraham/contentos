/**
 * Creative Director Engine (#2) — LIVE.
 *
 * Decides what the audience should FEEL. Consumes a brief / KNOWLEDGE and emits a
 * CREATIVE_DIRECTION contract (emotional tone, narrative style, audience, purpose,
 * energy, pacing, experience). This sits upstream of Strategy and Story so every
 * downstream engine inherits a coherent intent.
 *
 * input:  { topic|brief, audience?, purpose?, knowledge? }
 * output: CREATIVE_DIRECTION contract
 */
import { defineEngine } from './_base.js'
import { CreativeDirection, validateContract } from '../_contracts/index.js'
import { textGenerateJSON, hasTextProvider } from '../_providers/text.js'

const ENERGY = ['low', 'medium', 'high']
const PACING = ['slow', 'medium', 'fast']

export default defineEngine({
  id: 'creative_director',
  name: 'Creative Director Engine',
  responsibility: 'Decide the emotional tone, narrative style, energy, and pacing for a project.',
  status: 'live',
  inputs: ['knowledge'],
  outputs: ['creative_direction'],
  run: async (input = {}) => {
    const topic = input.topic || input.brief || input.knowledge?.topic || ''
    const audience = input.audience || ''
    const purpose = input.purpose || ''
    if (!topic && !audience && !purpose) {
      throw new Error('creative_director: a topic/brief (or audience+purpose) is required')
    }

    let body = null
    if (hasTextProvider()) {
      const facts = Array.isArray(input.knowledge?.facts)
        ? input.knowledge.facts.slice(0, 6).map((f) => `- ${f.title || f.summary || f}`).join('\n')
        : ''
      const prompt = `You are a creative director. Decide what the audience should FEEL for this project.
Topic/brief: ${topic || '(none)'}
Audience: ${audience || '(infer)'}
Purpose: ${purpose || '(infer)'}
${facts ? `Known facts:\n${facts}` : ''}

Return JSON:
{
  "emotional_tone": "the dominant feeling (e.g. awe, cozy, urgent, triumphant)",
  "narrative_style": "e.g. documentary, first-person, listicle, story-driven",
  "audience": "who exactly this is for",
  "purpose": "what it should achieve",
  "energy": "low|medium|high",
  "pacing": "slow|medium|fast",
  "experience": "one line describing the intended audience experience"
}`
      try { body = await textGenerateJSON(prompt, { maxTokens: 600 }) } catch { body = null }
    }

    if (!body || typeof body !== 'object') {
      body = { emotional_tone: 'engaging', narrative_style: 'story-driven', audience: audience || 'general', purpose: purpose || 'inform + retain', energy: 'medium', pacing: 'medium', experience: 'clear, satisfying, shareable' }
    }

    const direction = {
      ...CreativeDirection.blank(),
      emotional_tone: body.emotional_tone || 'engaging',
      narrative_style: body.narrative_style || 'story-driven',
      audience: body.audience || audience || 'general',
      purpose: body.purpose || purpose || 'inform + retain',
      energy: ENERGY.includes(body.energy) ? body.energy : 'medium',
      pacing: PACING.includes(body.pacing) ? body.pacing : 'medium',
      experience: body.experience || ''
    }

    const v = validateContract('creative_direction', direction)
    if (!v.ok) throw new Error(`creative_director: output failed contract (missing: ${v.missing.join(', ')})`)
    return direction
  }
})