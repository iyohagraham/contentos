/**
 * Creative Director Engine (#2) — STUB.
 * Decides what the audience should feel. Consumes KNOWLEDGE, emits CREATIVE_DIRECTION.
 * Implementation pending: will AI-derive tone/energy/pacing from knowledge + brand.
 */
import { defineEngine, stubOutput } from './_base.js'
import { CreativeDirection } from '../_contracts/index.js'

export default defineEngine({
  id: 'creative_director',
  name: 'Creative Director Engine',
  responsibility: 'Decide the emotional tone, narrative style, energy, and pacing for a project.',
  status: 'stub',
  inputs: ['knowledge'],
  outputs: ['creative_direction'],
  run: async (input = {}) => stubOutput('creative_director', {
    ...CreativeDirection.blank(),
    audience: input.audience || '',
    purpose: input.purpose || ''
  })
})