/**
 * Voice Engine (#14) — adapter (LIVE).
 *
 * Wraps api/_providers/voice.js (Qwen-3-TTS cloud / Kokoro local). Emits a
 * MEDIA_ASSET (type audio). Degrades honestly: returns selected:false request spec
 * when no voice provider is configured (no fabricated audio).
 *
 * input:  { text, voice?, language?, workspace_id? }
 * output: MEDIA_ASSET contract (type:'audio')
 */
import { defineEngine } from '../_base.js'
import { MediaAsset } from '../../_contracts/index.js'
import { hasVoiceProvider } from '../../_providers/voice.js'

export default defineEngine({
  id: 'voice',
  name: 'Voice Engine',
  responsibility: 'Narration/character voices/cloning/dubbing (Qwen / OmniVoice).',
  status: 'live',
  outputs: ['media_asset'],
  run: async (input = {}) => {
    const text = input.text || input.narration || ''
    if (!text) throw new Error('voice: text is required')

    const localOnly = !hasVoiceProvider()
    if (localOnly) {
      // Try local Kokoro; if unavailable, return an honest request spec.
      try {
        const { generateVoiceLocal } = await import('../../_providers/voice.js')
        const r = await generateVoiceLocal(text, input)
        return { ...MediaAsset.blank(), url: r.url || r.dataUrl || '', provider: 'kokoro', model: 'kokoro', type: 'audio' }
      } catch {
        return { ...MediaAsset.blank(), provider: 'none', model: 'voice-request', selected: false, type: 'audio', text, message: 'No voice provider configured — set FAL_KEY (Qwen-3-TTS) or install local Kokoro. Returning request spec.' }
      }
    }

    const { generateVoice } = await import('../../_providers/voice.js')
    const r = await generateVoice(text, input)
    return { ...MediaAsset.blank(), url: r.url || r.audio_url || '', provider: r.provider || 'fal', model: r.model || 'qwen-3-tts', type: 'audio', cost: r.cost ?? null }
  }
})