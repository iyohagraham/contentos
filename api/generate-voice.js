/**
 * POST /api/generate-voice
 * Server-side voice generation via Qwen-3-TTS (fal.ai) or Kokoro (local).
 *
 * Body: { text, voice?, language?, audio_url?, provider? }
 * provider: 'qwen' (default, cloud clone) | 'kokoro' (local, offline)
 */
import { generateVoice, generateVoiceLocal, QWEN_VOICES } from './_providers/voice.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, voice, language, audio_url, provider = 'qwen', speed } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  try {
    if (provider === 'kokoro') {
      const result = await generateVoiceLocal(text, { voice })
      return res.status(200).json(result)
    }

    const result = await generateVoice(text, { voice, language, audio_url, speed })
    return res.status(200).json(result)
  } catch (err) {
    console.error('[generate-voice]', err)
    const msg = err.message || 'Voice generation failed'
    if (msg.includes('FAL_KEY')) return res.status(503).json({ error: 'Voice generation not configured (FAL_KEY missing)' })
    return res.status(500).json({ error: msg, available_voices: QWEN_VOICES })
  }
}
