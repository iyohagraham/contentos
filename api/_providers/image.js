/**
 * ImageProvider — Runware.ai (primary) with fal.ai FLUX fallback.
 *
 * Runware runs the same FLUX weights as fal.ai at a fraction of the cost
 * (~$0.0006/image for FLUX dev). Provider selection:
 *   RUNWARE_API_KEY present -> Runware ; else FAL_KEY -> fal.ai.
 *
 * Contract (stable): generateImage(prompt, opts) ->
 *   { url, width, height, seed?, cost?, provider }
 */
import { randomUUID } from 'node:crypto'
import * as fal from '@fal-ai/client'

const RUNWARE_ENDPOINT = 'https://api.runware.ai/v1'

// Runware built-in model AIR identifiers.
// NOTE: Runware hosts open FLUX weights (dev/schnell). FLUX.1 [pro] is closed,
// so the 'pro' tier maps to FLUX.1 [dev] — the best open FLUX on Runware.
const RUNWARE_MODELS = {
  pro:     'runware:101@1', // FLUX.1 [dev]
  dev:     'runware:101@1', // FLUX.1 [dev]
  schnell: 'runware:100@1'  // FLUX.1 [schnell]
}

const FAL_MODELS = {
  pro: 'fal-ai/flux/pro',
  dev: 'fal-ai/flux/dev',
  schnell: 'fal-ai/flux/schnell'
}

function hasRunware() { return !!process.env.RUNWARE_API_KEY }
function hasFal() { return !!(process.env.FAL_KEY || process.env.FAL_AI_API_KEY) }

export function hasImageProvider() { return hasRunware() || hasFal() }

// Runware requires dimensions to be multiples of 64, within [128, 2048].
function snap64(n, fallback) {
  const v = Number(n) || fallback
  const snapped = Math.round(v / 64) * 64
  return Math.max(128, Math.min(2048, snapped))
}

// Normalize a model hint ('pro'|'dev'|'schnell' or a fal-style string) to a tier key.
function tierOf(model) {
  if (!model) return 'dev'
  const m = String(model).toLowerCase()
  if (m.includes('schnell')) return 'schnell'
  if (m.includes('pro')) return 'pro'
  if (m.includes('dev')) return 'dev'
  return 'dev'
}

async function generateRunware(prompt, opts) {
  const tier = tierOf(opts.model)
  const model = opts.runwareModel || RUNWARE_MODELS[tier]
  const width = snap64(opts.width, 1024)
  const height = snap64(opts.height, 1024)
  const steps = opts.steps || (tier === 'schnell' ? 4 : 28)

  const task = {
    taskType: 'imageInference',
    taskUUID: randomUUID(),
    positivePrompt: prompt,
    model,
    width,
    height,
    numberResults: opts.numImages || 1,
    outputType: 'URL',
    outputFormat: opts.outputFormat || 'JPG',
    steps,
    includeCost: true
  }
  if (opts.guidance_scale != null) task.CFGScale = opts.guidance_scale
  if (opts.seed != null) task.seed = opts.seed

  const res = await fetch(RUNWARE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RUNWARE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([task])
  })

  const json = await res.json().catch(() => null)
  if (!json) throw new Error(`Runware returned non-JSON (HTTP ${res.status})`)
  if (json.errors?.length) {
    const e = json.errors[0]
    throw new Error(`Runware ${e.code || 'error'}: ${e.message || 'unknown'}`)
  }
  const out = json.data?.[0]
  if (!out?.imageURL) throw new Error('Runware returned no imageURL')
  return { url: out.imageURL, width, height, seed: out.seed, cost: out.cost, provider: 'runware' }
}

async function generateFal(prompt, opts) {
  const key = process.env.FAL_KEY || process.env.FAL_AI_API_KEY
  fal.config({ credentials: key })
  const model = FAL_MODELS[tierOf(opts.model)]
  const result = await fal.run(model, {
    input: {
      prompt,
      image_size: opts.image_size || { width: opts.width || 1024, height: opts.height || 1024 },
      num_inference_steps: opts.steps || 28,
      seed: opts.seed,
      guidance_scale: opts.guidance_scale || 3.5,
      enable_safety_checker: true
    }
  })
  const img = result.images?.[0]
  if (!img?.url) throw new Error('fal.ai returned no image URL')
  return { url: img.url, width: img.width, height: img.height, seed: result.seed, provider: 'fal' }
}

/**
 * Generate an image. Runware preferred; fal.ai fallback on failure.
 * @param {string} prompt
 * @param {object} opts - { model:'pro'|'dev'|'schnell', width, height, steps, seed, numImages, guidance_scale }
 * @returns {{ url, width, height, seed?, cost?, provider }}
 */
export async function generateImage(prompt, opts = {}) {
  if (hasRunware()) {
    try {
      return await generateRunware(prompt, opts)
    } catch (err) {
      if (hasFal()) {
        console.warn('[image] Runware failed, falling back to fal.ai:', err.message)
        return await generateFal(prompt, opts)
      }
      throw err
    }
  }
  if (hasFal()) return await generateFal(prompt, opts)
  throw new Error('No image provider configured (set RUNWARE_API_KEY or FAL_KEY)')
}
