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
import * as fal from '@fal-ai/client'
import {
  generateImage as runwareGenerateImage,
  upscaleImage as runwareUpscaleImage,
  removeBackground as runwareRemoveBackground,
  editImage as runwareEditImage,
  hasRunware
} from './runware.js'

// Re-export the full Runware media-operations surface so callers can reach the
// extended toolchain (upscale / background removal / edit) through this module too.
export const upscaleImage = runwareUpscaleImage
export const removeBackground = runwareRemoveBackground
export const editImage = runwareEditImage
export { hasRunware }

const FAL_MODELS = {
  pro: 'fal-ai/flux/pro',
  dev: 'fal-ai/flux/dev',
  schnell: 'fal-ai/flux/schnell'
}

function hasFal() { return !!(process.env.FAL_KEY || process.env.FAL_AI_API_KEY) }

export function hasImageProvider() { return hasRunware() || hasFal() }

// Normalize a model hint ('pro'|'dev'|'schnell' or a fal-style string) to a tier key.
function tierOf(model) {
  if (!model) return 'dev'
  const m = String(model).toLowerCase()
  if (m.includes('schnell')) return 'schnell'
  if (m.includes('pro')) return 'pro'
  if (m.includes('dev')) return 'dev'
  return 'dev'
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
      return await runwareGenerateImage(prompt, opts)
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
