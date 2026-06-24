/**
 * ImageProvider — FLUX via fal.ai (server-side only).
 * Pro model for finals, Dev for iteration/tests.
 */
import * as fal from '@fal-ai/client'

function configure() {
  const key = process.env.FAL_KEY || process.env.FAL_AI_API_KEY
  if (!key) return false
  fal.config({ credentials: key })
  return true
}

const MODELS = {
  pro: 'fal-ai/flux/pro',
  dev: 'fal-ai/flux/dev',
  schnell: 'fal-ai/flux/schnell'
}

/**
 * Generate an image with FLUX.
 * @param {string} prompt
 * @param {object} opts - { model: 'pro'|'dev'|'schnell', width, height, steps, seed }
 * @returns {{ url: string, width: number, height: number }}
 */
export async function generateImage(prompt, opts = {}) {
  if (!configure()) throw new Error('FAL_KEY not configured')
  const model = MODELS[opts.model || 'dev']
  const result = await fal.run(model, {
    input: {
      prompt,
      image_size: opts.image_size || { width: opts.width || 1080, height: opts.height || 1920 },
      num_inference_steps: opts.steps || 28,
      seed: opts.seed,
      guidance_scale: opts.guidance_scale || 3.5,
      enable_safety_checker: true
    }
  })
  const img = result.images?.[0]
  if (!img?.url) throw new Error('fal.ai returned no image URL')
  return { url: img.url, width: img.width, height: img.height, seed: result.seed }
}

export function hasImageProvider() {
  return !!(process.env.FAL_KEY || process.env.FAL_AI_API_KEY)
}
