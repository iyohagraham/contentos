/**
 * Runware media-operations client — consolidated image provider for ContentOS.
 *
 * Single endpoint (https://api.runware.ai/v1) covers the full image toolchain:
 *   - generateImage     -> imageInference (txt2img)
 *   - editImage         -> imageInference (img2img via seedImage+strength,
 *                          inpaint via seedImage+maskImage)
 *   - upscaleImage      -> imageUpscale (inputImage + upscaleFactor 2|3|4)
 *   - removeBackground  -> imageBackgroundRemoval (inputImage)
 *
 * Runware runs the same open FLUX weights as fal.ai at a fraction of the cost
 * (~$0.0006/image for FLUX dev). Auth is Bearer RUNWARE_API_KEY.
 *
 * Request body is always a JSON ARRAY of task objects; each task carries a
 * taskType + a fresh taskUUID. Success -> { data: [ { imageURL, cost, seed } ] };
 * failure -> { errors: [ { code, message, taskUUID } ] }. Every function returns
 * { url, ... } or throws Error('Runware <code>: <message>').
 *
 * Schema confirmed against https://runware.ai/docs (llms.txt), 2026-06-23.
 */
import { randomUUID } from 'node:crypto'

const RUNWARE_ENDPOINT = 'https://api.runware.ai/v1'

// Runware built-in model AIR identifiers.
// NOTE: Runware hosts open FLUX weights (dev/schnell). FLUX.1 [pro] is closed,
// so the 'pro' tier maps to FLUX.1 [dev] — the best open FLUX on Runware.
// runware:102@1 is FLUX.1 Fill, the inpaint/img2img specialist.
const RUNWARE_MODELS = {
  pro:     'runware:101@1', // FLUX.1 [dev]
  dev:     'runware:101@1', // FLUX.1 [dev]
  schnell: 'runware:100@1', // FLUX.1 [schnell]
  fill:    'runware:102@1'  // FLUX.1 Fill — inpainting / context-aware edits
}

export function hasRunware() { return !!process.env.RUNWARE_API_KEY }

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

/**
 * POST a single task to Runware and return the first result object.
 * Throws Error('Runware <code>: <message>') on API errors, or a descriptive
 * Error for transport / shape failures.
 * @param {object} task - a single task object (taskType already set; taskUUID added here if absent)
 * @returns {object} the first element of response.data
 */
async function runTask(task) {
  if (!hasRunware()) throw new Error('Runware not configured (set RUNWARE_API_KEY)')
  if (!task.taskUUID) task.taskUUID = randomUUID()

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
  if (!out) {
    // Surface HTTP-level failures that didn't populate the errors array.
    if (!res.ok) throw new Error(`Runware HTTP ${res.status}: ${task.taskType} returned no data`)
    throw new Error(`Runware ${task.taskType}: response contained no data`)
  }
  return out
}

/**
 * Generate an image from a text prompt (imageInference, txt2img).
 * @param {string} prompt
 * @param {object} opts - { model:'pro'|'dev'|'schnell', runwareModel, width, height,
 *                          steps, seed, numImages, guidance_scale, outputFormat }
 * @returns {{ url, width, height, seed, cost, provider }}
 */
export async function generateImage(prompt, opts = {}) {
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

  const out = await runTask(task)
  if (!out.imageURL) throw new Error('Runware returned no imageURL')
  return { url: out.imageURL, width, height, seed: out.seed, cost: out.cost, provider: 'runware' }
}

/**
 * Edit an existing image (imageInference). img2img when only opts.strength is set;
 * inpaint when opts.maskUrl is provided (white pixels = regenerate, black = preserve).
 *
 * seedImage / maskImage accept a UUID, a public URL, or a base64 data string.
 *
 * @param {string} imageUrl - source image (URL/UUID/base64)
 * @param {string} prompt
 * @param {object} opts - { maskUrl (inpaint), strength (0.1..1.0, default 0.75),
 *                          model:'pro'|'dev'|'schnell'|'fill', runwareModel,
 *                          width, height, steps, seed, guidance_scale, outputFormat }
 * @returns {{ url, width, height, seed, cost, provider }}
 */
export async function editImage(imageUrl, prompt, opts = {}) {
  if (!imageUrl) throw new Error('editImage requires a source imageUrl')
  const isInpaint = !!opts.maskUrl
  // FLUX.1 Fill is the inpaint specialist; honor an explicit model hint otherwise.
  const model = opts.runwareModel ||
    (isInpaint ? RUNWARE_MODELS.fill : RUNWARE_MODELS[tierOf(opts.model)])
  const width = snap64(opts.width, 1024)
  const height = snap64(opts.height, 1024)

  const task = {
    taskType: 'imageInference',
    taskUUID: randomUUID(),
    positivePrompt: prompt,
    model,
    seedImage: imageUrl,
    width,
    height,
    numberResults: 1,
    outputType: 'URL',
    outputFormat: opts.outputFormat || 'JPG',
    steps: opts.steps || 28,
    includeCost: true
  }
  if (isInpaint) task.maskImage = opts.maskUrl
  // strength controls how far the result departs from the source (img2img denoise).
  if (opts.strength != null) task.strength = opts.strength
  else if (!isInpaint) task.strength = 0.75
  if (opts.guidance_scale != null) task.CFGScale = opts.guidance_scale
  if (opts.seed != null) task.seed = opts.seed

  const out = await runTask(task)
  if (!out.imageURL) throw new Error('Runware returned no imageURL')
  return { url: out.imageURL, width, height, seed: out.seed, cost: out.cost, provider: 'runware' }
}

/**
 * Upscale an image (imageUpscale). upscaleFactor must be 2, 3, or 4.
 * @param {string} imageUrl - source image (URL/UUID/base64)
 * @param {object} opts - { upscaleFactor:2|3|4 (default 2), factor (alias), outputFormat }
 * @returns {{ url, cost, provider }}
 */
export async function upscaleImage(imageUrl, opts = {}) {
  if (!imageUrl) throw new Error('upscaleImage requires a source imageUrl')
  let factor = Number(opts.upscaleFactor ?? opts.factor ?? 2)
  if (![2, 3, 4].includes(factor)) factor = Math.max(2, Math.min(4, Math.round(factor) || 2))

  const task = {
    taskType: 'imageUpscale',
    taskUUID: randomUUID(),
    inputImage: imageUrl,
    upscaleFactor: factor,
    outputType: 'URL',
    outputFormat: opts.outputFormat || 'JPG',
    includeCost: true
  }

  const out = await runTask(task)
  if (!out.imageURL) throw new Error('Runware returned no imageURL')
  return { url: out.imageURL, cost: out.cost, provider: 'runware' }
}

/**
 * Remove an image background (imageBackgroundRemoval). Outputs PNG to preserve
 * the alpha channel.
 * @param {string} imageUrl - source image (URL/UUID/base64)
 * @param {object} opts - { outputFormat (default 'PNG') }
 * @returns {{ url, cost, provider }}
 */
export async function removeBackground(imageUrl, opts = {}) {
  if (!imageUrl) throw new Error('removeBackground requires a source imageUrl')

  const task = {
    taskType: 'imageBackgroundRemoval',
    taskUUID: randomUUID(),
    inputImage: imageUrl,
    outputType: 'URL',
    outputFormat: opts.outputFormat || 'PNG',
    includeCost: true
  }

  const out = await runTask(task)
  if (!out.imageURL) throw new Error('Runware returned no imageURL')
  return { url: out.imageURL, cost: out.cost, provider: 'runware' }
}
