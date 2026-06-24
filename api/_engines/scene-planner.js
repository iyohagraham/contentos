/**
 * Scene Planner (#10) — STUB.
 * Breaks a STORYBOARD into production SCENE_PLAN scenes with structured JSON:
 * duration, assets required, voice, music, camera movement, motion, captions, effects.
 * Implementation pending: deterministic storyboard→scene decomposition + asset resolution.
 */
import { defineEngine, stubOutput } from './_base.js'
import { ScenePlan } from '../_contracts/index.js'

export default defineEngine({
  id: 'scene_planner',
  name: 'Scene Planner',
  responsibility: 'Decompose a storyboard into production-ready scenes (structured JSON).',
  status: 'stub',
  inputs: ['storyboard'],
  outputs: ['scene_plan'],
  run: async (input = {}) => stubOutput('scene_planner', {
    ...ScenePlan.blank(),
    project_id: input.project_id || null,
    format: input.format || '9:16'
  })
})