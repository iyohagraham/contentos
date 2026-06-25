/**
 * Universe Engine (#5) — LIVE.
 *
 * Creates a complete world (UNIVERSE contract): characters, locations, props, rules,
 * lore, relationships, timelines — enabling channels with recurring characters and
 * world consistency.
 *
 * input:  { name, premise?, persist?, workspace_id? }
 * output: UNIVERSE contract
 */
import { randomUUID } from 'node:crypto'
import { defineEngine } from './_base.js'
import { Universe, validateContract } from '../_contracts/index.js'
import { textGenerateJSON, hasTextProvider } from '../_providers/text.js'

const idify = (s, i) => `${String(s || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}-${i}`

export default defineEngine({
  id: 'universe',
  name: 'Universe Engine',
  responsibility: 'Maintain complete universes with world consistency (characters, lore, timelines).',
  status: 'live',
  outputs: ['universe'],
  run: async (input = {}, ctx = {}) => {
    const name = input.name || ''
    if (!name) throw new Error('universe: a universe name is required')

    let body = {}
    if (hasTextProvider()) {
      const prompt = `Build a world bible for a content universe named "${name}".${input.premise ? ` Premise: ${input.premise}.` : ''}
Return JSON:
{
  "characters": [{ "name": "...", "role": "..." }],
  "locations": [{ "name": "...", "description": "..." }],
  "props": ["signature prop"],
  "rules": ["a rule that always holds in this world"],
  "lore": "2-3 sentences of backstory",
  "relationships": [{ "between": ["A","B"], "type": "..." }],
  "timelines": [{ "era": "...", "summary": "..." }]
}`
      try { body = await textGenerateJSON(prompt, { maxTokens: 1400 }) || {} } catch { body = {} }
    }

    const universe = {
      ...Universe.blank(),
      id: input.id || randomUUID(),
      name,
      characters: (Array.isArray(body.characters) ? body.characters : []).map((c, i) => ({ id: idify(c.name, i), name: c.name || `Character ${i + 1}`, role: c.role || '' })),
      locations: (Array.isArray(body.locations) ? body.locations : []).map((l, i) => ({ id: idify(l.name, i), name: l.name || `Location ${i + 1}`, description: l.description || '' })),
      props: Array.isArray(body.props) ? body.props : [],
      rules: Array.isArray(body.rules) ? body.rules : [],
      lore: body.lore || input.premise || '',
      relationships: Array.isArray(body.relationships) ? body.relationships : [],
      timelines: Array.isArray(body.timelines) ? body.timelines : []
    }

    const v = validateContract('universe', universe)
    if (!v.ok) throw new Error(`universe: output failed contract (missing: ${v.missing.join(', ')})`)

    if (input.persist && ctx.db && ctx.workspaceId) {
      try {
        const { data: cfg } = await ctx.db.from('workspace_config').select('universes').eq('workspace_id', ctx.workspaceId).maybeSingle()
        const existing = Array.isArray(cfg?.universes) ? cfg.universes : []
        await ctx.db.from('workspace_config').upsert({ workspace_id: ctx.workspaceId, universes: [...existing, universe] }, { onConflict: 'workspace_id' })
      } catch (err) { ctx.log?.(`universe persist skipped: ${err.message}`) }
    }

    return universe
  }
})