/**
 * Brand Engine (#7) — LIVE.
 *
 * Holds business identity: logo, brand colors, fonts, voice, tone, marketing rules,
 * CTA rules. Lets businesses stay perfectly consistent across every asset.
 *
 * input:  { name, brief?, logo_url?, colors?, fonts?, persist?, workspace_id? }
 * output: BRAND contract
 *
 * AI-fills the soft fields (voice/tone/marketing_rules/cta_rules) from the name +
 * brief when a text provider is available; otherwise returns sensible defaults.
 * Optional persistence into workspace_config.brand (no schema change).
 */
import { randomUUID } from 'node:crypto'
import { defineEngine } from './_base.js'
import { Brand, validateContract } from '../_contracts/index.js'
import { textGenerateJSON, hasTextProvider } from '../_providers/text.js'

export default defineEngine({
  id: 'brand',
  name: 'Brand Engine',
  responsibility: 'Hold business visual identity + voice/tone + marketing/CTA rules.',
  status: 'live',
  outputs: ['brand'],
  run: async (input = {}, ctx = {}) => {
    const name = input.name || input.brief || ''
    if (!name) throw new Error('brand: a brand name (or brief) is required')

    let body = null
    if (hasTextProvider()) {
      const prompt = `Define a brand identity kit for "${name}".${input.brief ? ` Context: ${input.brief}.` : ''}
Return JSON:
{
  "voice": "the brand's voice in a few words",
  "tone": "the brand's tone",
  "colors": ["#hex", "#hex"],
  "fonts": ["primary", "secondary"],
  "marketing_rules": ["rule the brand always follows"],
  "cta_rules": ["how the brand asks for action"]
}`
      try { body = await textGenerateJSON(prompt, { maxTokens: 700 }) } catch { body = null }
    }
    body = body && typeof body === 'object' ? body : {}

    const brand = {
      ...Brand.blank(),
      id: input.id || randomUUID(),
      name,
      logo_url: input.logo_url || '',
      colors: input.colors?.length ? input.colors : (Array.isArray(body.colors) ? body.colors : []),
      fonts: input.fonts?.length ? input.fonts : (Array.isArray(body.fonts) ? body.fonts : []),
      voice: body.voice || input.voice || '',
      tone: body.tone || input.tone || '',
      marketing_rules: Array.isArray(body.marketing_rules) ? body.marketing_rules : [],
      cta_rules: Array.isArray(body.cta_rules) ? body.cta_rules : []
    }

    const v = validateContract('brand', brand)
    if (!v.ok) throw new Error(`brand: output failed contract (missing: ${v.missing.join(', ')})`)

    if (input.persist && ctx.db && ctx.workspaceId) {
      try {
        await ctx.db.from('workspace_config')
          .upsert({ workspace_id: ctx.workspaceId, brand }, { onConflict: 'workspace_id' })
      } catch (err) { ctx.log?.(`brand persist skipped: ${err.message}`) }
    }

    return brand
  }
})