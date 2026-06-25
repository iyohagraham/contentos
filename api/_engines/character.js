/**
 * Character Engine (#6) — LIVE.
 *
 * Maintains a character's consistency across every episode: face (reference seed),
 * voice profile, expressions, outfits, biography, personality, relationships, and a
 * pose library. Emits a CHARACTER contract the Media Router/Continuity Engine use to
 * keep the character identical shot-to-shot.
 *
 * input:  { name, universe?, brief?, voice_profile?, persist?, workspace_id? }
 * output: CHARACTER contract
 */
import { randomUUID } from 'node:crypto'
import { defineEngine } from './_base.js'
import { Character, validateContract } from '../_contracts/index.js'
import { textGenerateJSON, hasTextProvider } from '../_providers/text.js'

export default defineEngine({
  id: 'character',
  name: 'Character Engine',
  responsibility: 'Keep characters consistent across every episode (visual + voice + personality).',
  status: 'live',
  inputs: ['universe'],
  outputs: ['character'],
  run: async (input = {}, ctx = {}) => {
    const name = input.name || ''
    if (!name) throw new Error('character: a character name is required')
    const universeName = input.universe?.name || input.universe_name || ''

    let body = {}
    if (hasTextProvider()) {
      const prompt = `Create a consistent character profile for "${name}".${universeName ? ` Universe: ${universeName}.` : ''}${input.brief ? ` Brief: ${input.brief}.` : ''}
Return JSON:
{
  "appearance": "concrete visual description used as the consistency anchor (used as an image prompt seed)",
  "expressions": ["signature expression"],
  "outfits": ["default outfit"],
  "biography": "2-3 sentences",
  "personality": "a few traits",
  "relationships": [{ "with": "name", "type": "..." }],
  "pose_library": ["common pose"]
}`
      try { body = await textGenerateJSON(prompt, { maxTokens: 900 }) || {} } catch { body = {} }
    }

    const character = {
      ...Character.blank(),
      id: input.id || randomUUID(),
      name,
      // The face anchor is the textual appearance seed (image-prompt seed for the
      // Media Router) until a real reference image is attached.
      face: { appearance: body.appearance || input.appearance || '', reference_image_url: input.reference_image_url || null },
      voice: input.voice_profile ? { profile: input.voice_profile } : (body.voice || {}),
      expressions: Array.isArray(body.expressions) ? body.expressions : [],
      outfits: Array.isArray(body.outfits) ? body.outfits : [],
      biography: body.biography || '',
      personality: body.personality || '',
      relationships: Array.isArray(body.relationships) ? body.relationships : [],
      pose_library: Array.isArray(body.pose_library) ? body.pose_library : []
    }

    const v = validateContract('character', character)
    if (!v.ok) throw new Error(`character: output failed contract (missing: ${v.missing.join(', ')})`)

    if (input.persist && ctx.db && ctx.workspaceId) {
      try {
        const { data: cfg } = await ctx.db.from('workspace_config').select('characters').eq('workspace_id', ctx.workspaceId).maybeSingle()
        const existing = Array.isArray(cfg?.characters) ? cfg.characters : []
        await ctx.db.from('workspace_config').upsert({ workspace_id: ctx.workspaceId, characters: [...existing, character] }, { onConflict: 'workspace_id' })
      } catch (err) { ctx.log?.(`character persist skipped: ${err.message}`) }
    }

    return character
  }
})