/**
 * Media Loop Engine — per-scene asset generation (LIVE).
 *
 * Bridges SCENE_PLAN → finished per-scene assets. Iterates every scene, asks the
 * Media Router for an image (using the scene's description/metadata as the prompt)
 * and the Voice Engine for narration audio, then attaches the resulting urls back
 * onto each scene. Output is an ENRICHED scene_plan the Composition Engine turns
 * into a real (image + voice) video instead of text-only clips.
 *
 * Provider-agnostic + honest: if media/voice providers aren't configured the loop
 * still runs but marks scenes `needs_provider` (selected:false from the sub-engines)
 * — nothing is fabricated. The orchestrator treats that as a provider gate.
 *
 * input:  { scene_plan | scenes, style_profile?, workspace_id?, max_scenes? }
 * output: { project_id, format, scenes: [...enriched], generated, needs_provider }
 */
import { defineEngine } from './_base.js'
import { ScenePlan, validateContract } from '../_contracts/index.js'
import { runEngine } from './run.js'

export default defineEngine({
  id: 'media_loop',
  name: 'Media Loop',
  responsibility: 'Generate per-scene image + narration assets for a scene plan and attach them back.',
  status: 'live',
  inputs: ['scene_plan'],
  outputs: ['scene_plan'],
  run: async (input = {}, ctx = {}) => {
    const plan = input.scene_plan || input
    const scenes = Array.isArray(plan.scenes) ? plan.scenes : []
    if (!scenes.length) throw new Error('media_loop: a scene_plan with scenes[] is required')

    const style = input.style_profile || null
    const styleHint = style?.visual_language ? `, ${style.visual_language}` : ''
    const max = Math.min(scenes.length, Number(input.max_scenes) || scenes.length)

    let generated = 0
    let needsProvider = false
    const enriched = []

    for (let i = 0; i < scenes.length; i++) {
      const scene = { ...scenes[i] }
      if (i < max) {
        // Image for the scene.
        const prompt = `${scene.voice?.text || scene.metadata?.mood || 'scene'}${styleHint}`.slice(0, 400)
        try {
          const img = await runEngine('media_router', { prompt, task: 'scene', workspace_id: ctx.workspaceId }, { workspaceId: ctx.workspaceId, db: ctx.db })
          if (img.output?.url) { scene.image_url = img.output.url; scene.image_provider = img.output.provider; generated++ }
          else { needsProvider = true; scene.image_status = 'needs_provider' }
        } catch (err) { scene.image_status = `error: ${err.message}` }

        // Narration audio for the scene.
        const narration = scene.voice?.text || ''
        if (narration) {
          try {
            const vo = await runEngine('voice', { text: narration, workspace_id: ctx.workspaceId }, { workspaceId: ctx.workspaceId, db: ctx.db })
            if (vo.output?.url) { scene.audio_url = vo.output.url; scene.audio_provider = vo.output.provider }
            else { needsProvider = true; scene.audio_status = 'needs_provider' }
          } catch (err) { scene.audio_status = `error: ${err.message}` }
        }
      }
      enriched.push(scene)
    }

    const out = {
      ...ScenePlan.blank(),
      project_id: plan.project_id || input.project_id || null,
      format: plan.format || input.format || '9:16',
      scenes: enriched,
      generated,
      needs_provider: needsProvider,
      // The orchestrator pauses when a stage couldn't fulfil (no media/voice provider).
      selected: needsProvider ? false : undefined
    }

    const v = validateContract('scene_plan', out)
    if (!v.ok) throw new Error(`media_loop: output failed contract (missing: ${v.missing.join(', ')})`)
    return out
  }
})
