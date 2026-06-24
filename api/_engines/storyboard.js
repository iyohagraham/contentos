/**
 * Storyboard Engine (#8) — STUB.
 * Turns a STORY into a STORYBOARD: shot list, camera, lighting, mood, props, transitions.
 * One of the most important systems — every project becomes a storyboard before production.
 * Implementation pending: AI shot-planning grounded in story beats + style profile.
 */
import { defineEngine, stubOutput } from './_base.js'
import { Storyboard } from '../_contracts/index.js'

export default defineEngine({
  id: 'storyboard',
  name: 'Storyboard Engine',
  responsibility: 'Plan visuals, scenes, camera, shots, lighting, mood, props, and transitions.',
  status: 'stub',
  inputs: ['story', 'style_profile'],
  outputs: ['storyboard'],
  run: async (input = {}) => stubOutput('storyboard', {
    ...Storyboard.blank(),
    project_id: input.project_id || null,
    style_profile_id: input.style_profile_id || null
  })
})