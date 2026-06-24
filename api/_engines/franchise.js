/**
 * Franchise Engine (#21) — STUB.
 * Highest-level abstraction. Assembles the full media-ecosystem hierarchy:
 *   Universe → Brand → Franchise → Season → Series → Episode → Storyboard → Scene → Assets
 * Lets one operator run complete media ecosystems instead of isolated videos.
 * Implementation pending: persist + navigate the hierarchy; spawn seasons/series/episodes.
 */
import { defineEngine, stubOutput } from './_base.js'

export const HIERARCHY = ['universe', 'brand', 'franchise', 'season', 'series', 'episode', 'storyboard', 'scene', 'assets']

export default defineEngine({
  id: 'franchise',
  name: 'Franchise Engine',
  responsibility: 'Own the Universe→Brand→Franchise→Season→Series→Episode→Storyboard→Scene→Assets hierarchy.',
  status: 'stub',
  outputs: [],
  run: async (input = {}) => stubOutput('franchise', { hierarchy: HIERARCHY, node: input.node || null })
})