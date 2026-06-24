/**
 * VoiceProvider — Qwen-3-TTS (clone-voice) via fal.ai, Kokoro local fallback.
 * Qwen for voice cloning, Kokoro for generic narration.
 *
 * Verified gotchas:
 *   - Endpoint uses hyphens: fal-ai/qwen-3-tts/...  NOT qwen3-tts
 *   - Voices are closed enum: Vivian, Serena, Uncle_Fu, Dylan, Eric, Ryan, Aiden, Ono_Anna, Sohee
 *   - Language wants full names: English, Chinese, Japanese (NOT en, zh, ja)
 *   - Clone field is audio_url (NOT voice_audio_url)
 */
import * as fal from '@fal-ai/client'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execFileAsync = promisify(execFile)

const QWEN_ENDPOINT = 'fal-ai/qwen-3-tts/clone-voice/1.7b'
const QWEN_VOICES = ['Vivian', 'Serena', 'Uncle_Fu', 'Dylan', 'Eric', 'Ryan', 'Aiden', 'Ono_Anna', 'Sohee']
const DEFAULT_VOICE = 'Serena'

function configureFal() {
  const key = process.env.FAL_KEY || process.env.FAL_AI_API_KEY
  if (!key) return false
  fal.config({ credentials: key })
  return true
}

/**
 * Generate speech with Qwen-3-TTS (voice cloning).
 * @param {string} text
 * @param {object} opts - { voice, language, audio_url (for cloning), speed }
 * @returns {{ url: string, duration_seconds: number }}
 */
export async function generateVoice(text, opts = {}) {
  if (!configureFal()) throw new Error('FAL_KEY not configured for voice generation')

  const voice = QWEN_VOICES.includes(opts.voice) ? opts.voice : DEFAULT_VOICE
  const language = opts.language || 'English'

  const input = { text, voice, language }
  if (opts.audio_url) input.audio_url = opts.audio_url // voice cloning reference
  if (opts.speed) input.speed = opts.speed

  const result = await fal.run(QWEN_ENDPOINT, { input })
  const audio = result.audio || result.audio_url
  if (!audio) throw new Error('fal.ai Qwen-TTS returned no audio')
  const url = typeof audio === 'string' ? audio : audio.url
  return { url, provider: 'qwen-3-tts', voice }
}

/**
 * Generate speech with local Kokoro TTS (offline, free).
 * Uses the ~/.kokoro-venv Python environment.
 */
export async function generateVoiceLocal(text, opts = {}) {
  const voiceId = opts.voice || 'af_heart'
  const outFile = path.join(os.tmpdir(), `voice_${Date.now()}.wav`)
  const scriptPath = path.join(process.env.HOME, '.kokoro-venv', 'bin', 'python3')

  // Try Kokoro via the contentos kokoro_tts tool path
  const kokoroScript = '/Users/iyohagraham/OpenMontage/tools/audio/kokoro_tts.py'
  if (!fs.existsSync(kokoroScript)) {
    throw new Error('Kokoro not available; FAL_KEY required for cloud TTS')
  }

  await execFileAsync(scriptPath, [kokoroScript, '--text', text, '--voice', voiceId, '--out', outFile])
  if (!fs.existsSync(outFile)) throw new Error('Kokoro produced no output file')
  const buffer = fs.readFileSync(outFile)
  fs.unlinkSync(outFile)
  // Return base64 data URL for small files; caller handles blob upload for large
  const b64 = buffer.toString('base64')
  return { dataUrl: `data:audio/wav;base64,${b64}`, provider: 'kokoro', voice: voiceId }
}

export function hasVoiceProvider() {
  return !!(process.env.FAL_KEY || process.env.FAL_AI_API_KEY)
}

export { QWEN_VOICES, DEFAULT_VOICE }
