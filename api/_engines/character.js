/**
 * Character Engine (#6) — STUB.
 * Maintains character consistency: faces, voices, expressions, outfits, bio, poses.
 * Implementation pending: persist character profiles + reference seeds for the Media Router.
 */
import { defineEngine, stubOutput } from './_base.js'
import { Character } from '../_contracts/index.js'

export default defineEngine({
  id: 'character',
  name: 'Character Engine',
  responsibility: 'Keep characters consistent across every episode (visual + voice + personality).',
  status: 'stub',
  inputs: ['universe'],
  outputs: ['character'],
  run: async (input = {}) => stubOutput('character', { ...Character.blank(), name: input.name || '' })
})