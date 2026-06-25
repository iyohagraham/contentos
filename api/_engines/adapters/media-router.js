/**
 * Media Router Engine (#12) — adapter (LIVE).
 *
 * Wraps the Media Engine + Model Router (api/media/engine.js → src/lib/router) so a
 * pipeline scene can request a generated image and get back a MEDIA_ASSET contract.
 * Provider-agnostic (Runware primary). Does NOT fabricate: when no media provider
 * is configured (or persist disabled) it returns a request spec with selected:false.
 *
 * input:  { prompt, task?, type?='image', priority?, workspace_id? }
 * output: MEDIA_ASSET contract
 */
import { defineEngine } from '../_base.js'
import { MediaAsset, validateContract } from '../../_contracts/index.js'

function hasMediaProvider() {
  return !!(process.env.RUNWARE_API_KEY || process.env.FAL_KEY || process.env.FAL_AI_API_KEY || process.env.OPENAI_API_KEY)
}

export default defineEngine({
  id: 'media_router',
  name: 'Media Router',
  responsibility: 'Pick the best provider per media request (Runware primary); never lock to one.',
  status: 'live',
  inputs: ['media_request'],
  outputs: ['media_asset'],
  run: async (input = {}, ctx = {}) => {
    const prompt = input.prompt || ''
    if (!prompt && input.type !== 'utility') throw new Error('media_router: prompt required for generation')

    if (!hasMediaProvider()) {
      // Honest request spec — nothing fabricated.
      return {
        ...MediaAsset.blank(),
        provider: 'none', model: 'media-request', selected: false,
        type: input.type || 'image', task: input.task || 'scene', prompt,
        message: 'No media provider configured — set RUNWARE_API_KEY (or FAL_KEY). Returning request spec.'
      }
    }

    // A provider exists → route through the Media Engine.
    const engine = await import('../../media/engine.js')
    const wsOpts = {
      priority: input.priority || 'balanced',
      workspaceId: ctx.workspaceId || input.workspace_id || null,
      persist: input.persist !== false
    }
    let result
    if (input.type === 'utility' && input.task === 'image_edit' && input.imageUrl) {
      // img2img / character-locked generation (seedImage + strength).
      result = await engine.editAsset(input.imageUrl, prompt, { ...wsOpts, strength: input.strength ?? 0.65 })
    } else {
      result = await engine.produceImage(prompt, { ...wsOpts, task: input.task || 'scene' })
    }

    const asset = {
      ...MediaAsset.blank(),
      url: result.url || '',
      provider: result.provider || 'runware',
      model: result.model || '',
      type: 'image',
      cost: result.cost ?? null
    }
    const v = validateContract('media_asset', asset)
    if (!v.ok) throw new Error(`media_router: output failed contract (missing: ${v.missing.join(', ')})`)
    return asset
  }
})

export { hasMediaProvider }