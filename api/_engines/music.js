/**
 * Music Engine (#13) — LIVE (provider-routed; no-provider returns a request spec).
 *
 * Produces music / ambience / SFX / theme / background audio via a REPLACEABLE
 * provider. Like the Media Router, the Music Engine never hardcodes a provider:
 *   - PIXABAY_API_KEY set    -> search Pixabay music for a matching track (free).
 *   - MUSIC_PROVIDER_URL set -> POST { mood, duration, prompt } -> { url } (any provider).
 *   - neither                -> return a structured MEDIA_ASSET *request spec* with
 *                               selected:false (honest: nothing is fabricated).
 *
 * input:  { mood?, prompt?, duration?, type? = 'music'|'ambience'|'sfx' }
 * output: MEDIA_ASSET contract (url filled when a provider resolved; else a spec)
 */
import { defineEngine } from './_base.js'
import { MediaAsset } from '../_contracts/index.js'

async function fromPixabay(mood, prompt) {
  const key = process.env.PIXABAY_API_KEY
  if (!key) return null
  const q = encodeURIComponent(prompt || mood || 'background')
  try {
    const res = await fetch(`https://pixabay.com/api/music/?key=${key}&q=${q}&per_page=3`)
    if (!res.ok) return null
    const data = await res.json()
    const hit = (data.hits || [])[0]
    if (!hit) return null
    return { url: hit.audio || hit.url || '', provider: 'pixabay', model: 'pixabay-music', cost: 0, license: hit.license || 'pixabay' }
  } catch { return null }
}

async function fromCustomProvider(mood, prompt, duration) {
  const url = process.env.MUSIC_PROVIDER_URL
  if (!url) return null
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.MUSIC_PROVIDER_KEY ? { Authorization: `Bearer ${process.env.MUSIC_PROVIDER_KEY}` } : {}) },
      body: JSON.stringify({ mood, prompt, duration })
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.url) return null
    return { url: data.url, provider: 'custom', model: data.model || 'music-provider', cost: data.cost ?? null }
  } catch { return null }
}

export default defineEngine({
  id: 'music',
  name: 'Music Engine',
  responsibility: 'Produce music/ambience/SFX/theme/background audio via a replaceable provider.',
  status: 'live',
  outputs: ['media_asset'],
  run: async (input = {}) => {
    const mood = input.mood || 'neutral'
    const prompt = input.prompt || ''
    const duration = Number(input.duration) || 30
    const kind = input.type || 'music'

    // Try providers in order; every provider is replaceable.
    const resolved = (await fromCustomProvider(mood, prompt, duration)) || (await fromPixabay(mood, prompt))

    if (resolved && resolved.url) {
      return { ...MediaAsset.blank(), ...resolved, type: 'audio', mood, kind, duration }
    }

    // No provider configured: return an honest request spec (selected:false). The
    // caller can wire PIXABAY_API_KEY / MUSIC_PROVIDER_URL to fulfill it.
    return {
      ...MediaAsset.blank(),
      url: '',
      provider: 'none',
      model: 'music-request',
      type: 'audio',
      selected: false,
      kind, mood, duration, prompt,
      message: 'No music provider configured — set PIXABAY_API_KEY or MUSIC_PROVIDER_URL. Returning request spec.'
    }
  }
})

export { fromPixabay, fromCustomProvider }