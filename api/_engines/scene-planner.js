/**
 * Scene Planner (#10) — LIVE.
 *
 * Breaks a STORYBOARD into a production SCENE_PLAN: one production scene per shot,
 * each with duration, the assets it requires, voice (narration text), music mood,
 * camera movement, motion, captions, effects, and metadata. Pure/deterministic —
 * no AI call needed; it's a structured decomposition of the storyboard the Media
 * Router / Composition Engine can execute directly.
 *
 * input:  { storyboard (STORYBOARD contract), format?, project_id? }
 * output: SCENE_PLAN contract { project_id, format, scenes: [...] }
 */
import { defineEngine } from './_base.js'
import { ScenePlan, validateContract } from '../_contracts/index.js'

const VALID_FORMATS = ['9:16', '16:9', '1:1']

/** Derive the asset kinds a shot needs from its content. */
function assetsForShot(shot) {
  const assets = ['image']                                  // every scene needs a base visual
  if (shot.motion || /track|pan|zoom|move/i.test(shot.camera || '')) assets.push('motion_clip')
  if ((shot.characters || []).length) assets.push('character_render')
  if ((shot.props || []).length) assets.push('prop')
  return [...new Set(assets)]
}

export default defineEngine({
  id: 'scene_planner',
  name: 'Scene Planner',
  responsibility: 'Decompose a storyboard into production-ready scenes (structured JSON).',
  status: 'live',
  inputs: ['storyboard'],
  outputs: ['scene_plan'],
  run: async (input = {}) => {
    const storyboard = input.storyboard || input
    const shots = Array.isArray(storyboard.shots) ? storyboard.shots : []
    if (!shots.length) throw new Error('scene_planner: storyboard.shots[] is required')

    const format = VALID_FORMATS.includes(input.format) ? input.format
      : VALID_FORMATS.includes(storyboard.format) ? storyboard.format : '9:16'
    const projectId = input.project_id || storyboard.project_id || null

    const scenes = shots.map((shot, i) => ({
      index: Number.isInteger(shot.index) ? shot.index : i,
      duration: Number(shot.duration) || 4,
      assets_required: assetsForShot(shot),
      voice: {
        text: shot.description || '',
        character_id: (shot.characters || [])[0] || null,
        voice_profile: null
      },
      music: { mood: shot.mood || 'neutral', track_id: null },
      camera_movement: shot.camera || 'static',
      motion: shot.motion || (/(track|pan|zoom|move)/i.test(shot.camera || '') ? 'subtle parallax' : 'none'),
      captions: { enabled: true, style: 'word-highlight', source: 'voice' },
      effects: shot.transition && shot.transition !== 'cut' ? [shot.transition] : [],
      metadata: {
        lighting: shot.lighting || null,
        mood: shot.mood || null,
        props: shot.props || [],
        characters: shot.characters || [],
        outfit: shot.outfit || null,
        transition: shot.transition || 'cut',
        style_profile_id: storyboard.style_profile_id || null
      }
    }))

    const plan = { ...ScenePlan.blank(), project_id: projectId, format, scenes }

    const v = validateContract('scene_plan', plan)
    if (!v.ok) throw new Error(`scene_planner: output failed contract (missing: ${v.missing.join(', ')})`)
    return plan
  }
})

export { assetsForShot }