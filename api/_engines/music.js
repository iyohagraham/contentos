/**
 * Music Engine (#13) — STUB.
 * Music, ambience, SFX, audio branding, theme + background music — selected via a
 * future music provider router (keep every provider replaceable). Emits MEDIA_ASSET.
 * Implementation pending: wire a music provider (Pixabay/Lyria/MusicGen) behind a router.
 */
import { defineEngine, stubOutput } from './_base.js'
import { MediaAsset } from '../_contracts/index.js'

export default defineEngine({
  id: 'music',
  name: 'Music Engine',
  responsibility: 'Produce music/ambience/SFX/theme/background audio via a replaceable provider.',
  status: 'stub',
  outputs: ['media_asset'],
  run: async (input = {}) => stubOutput('music', { ...MediaAsset.blank(), type: 'audio', task: input.mood || 'background' })
})