/**
 * Router adapters — the SERVER bootstrap that wires the pure Model Router to the
 * real providers. This is the ONLY place secrets + provider SDKs meet the router.
 *
 * It injects:
 *   - a generate adapter per provider (runware / fal / openai)
 *   - the enabled flag per provider (based on key presence)
 *   - the DB decision-logger (writes to model_routing_log)
 *
 * Call ensureRouterReady() before invoking the router's generate() server-side.
 */
import {
  registerAdapter,
  setProviderEnabled
} from '../../src/lib/router/provider-registry.js'
import { setRoutingLogger } from '../../src/lib/router/model-router.js'
import {
  generateImage,
  editImage,
  upscaleImage,
  removeBackground,
  hasRunware
} from './runware.js'
import { imageToVideo, hasVideoProvider } from './video.js'
import { generateVoice, generateVoiceLocal, hasVoiceProvider } from './voice.js'
import { getServerSupabase } from '../_db.js'
import { computeAndApplyLearnedRouting } from './learned-routing.js'

let _ready = false
let _learnApplied = false

/** Map a registry model id to the tier runware.js generateImage expects. */
function runwareTier(modelId) {
  if (modelId === 'flux-schnell') return 'schnell'
  return 'dev' // flux-dev (and any future default)
}

/**
 * Runware adapter — images + image utilities.
 * @param {object} req - { type, task, model, prompt, imageUrl, width, height, ... }
 */
async function runwareAdapter(req) {
  if (req.type === 'utility') {
    if (req.task === 'upscale') return upscaleImage(req.imageUrl, req)
    if (req.task === 'background_removal') return removeBackground(req.imageUrl, req)
    if (req.task === 'image_edit') return editImage(req.imageUrl, req.prompt, req)
    throw new Error(`runware adapter: unsupported utility task "${req.task}"`)
  }
  // image tasks (thumbnail/social_image/scene/hero_image/...)
  return generateImage(req.prompt, {
    model: runwareTier(req.model),
    width: req.width,
    height: req.height,
    numImages: req.numImages,
    seed: req.seed,
    steps: req.steps,
    guidance_scale: req.guidance_scale
  })
}

/**
 * Fal adapter — video (Wan) + cloud/local voice.
 * @param {object} req
 */
async function falAdapter(req) {
  if (req.type === 'video') {
    return imageToVideo(req.imageUrl, {
      prompt: req.prompt,
      reference_images: req.referenceImages || req.reference_images,
      duration: req.duration,
      model: req.model === 'wan-2.6-flash' ? 'wan-2.6-flash' : 'wan-2.7'
    })
  }
  if (req.type === 'audio') {
    const text = req.text || req.prompt
    if (req.model === 'kokoro') {
      const r = await generateVoiceLocal(text, req)
      return { url: r.url || r.dataUrl || null, dataUrl: r.dataUrl, provider: 'fal', ...r }
    }
    return generateVoice(text, req)
  }
  throw new Error(`fal adapter: unsupported type "${req.type}"`)
}

/**
 * OpenAI adapter — image generation not wired yet. Throws so the router falls
 * through to the next candidate (Runware FLUX, which always outranks it anyway).
 */
async function openaiAdapter() {
  throw new Error('openai image adapter not yet wired — falling through to next candidate')
}

/**
 * Idempotently register adapters, provider availability, and the decision logger.
 * Safe to call on every request.
 */
export function ensureRouterReady() {
  if (_ready) return
  _ready = true

  // Availability is key-presence: runware (RUNWARE_API_KEY/fal fallback), fal
  // (FAL_KEY gates both video + voice), openai (OPENAI_API_KEY).
  setProviderEnabled('runware', hasRunware() || !!(process.env.FAL_KEY || process.env.FAL_AI_API_KEY))
  setProviderEnabled('fal', hasVideoProvider() || hasVoiceProvider())
  setProviderEnabled('openai', !!process.env.OPENAI_API_KEY)

  registerAdapter('runware', runwareAdapter)
  registerAdapter('fal', falAdapter)
  registerAdapter('openai', openaiAdapter)

  setRoutingLogger(async (decision) => {
    const db = getServerSupabase()
    if (!db) return
    await db
      .from('model_routing_log')
      .insert({
        task: decision.task,
        task_type: decision.task_type,
        priority: decision.priority,
        quality: decision.quality,
        provider: decision.provider,
        model: decision.model,
        candidates: decision.candidates || [],
        selected_score: decision.selected_score ?? null,
        cost_usd: decision.cost_usd ?? null,
        duration_ms: decision.duration_ms ?? null,
        success: decision.success,
        error: decision.error || null,
        workspace_id: decision.workspace_id || null
      })
      .catch(() => {}) // logging is best-effort
  })

  // Apply any previously-learned reliability overrides from model_routing_log so
  // the router starts warm after a cold start (fire-and-forget; never blocks).
  if (!_learnApplied) {
    _learnApplied = true
    computeAndApplyLearnedRouting({ lookbackDays: 14 }).catch(() => {})
  }
}

export default ensureRouterReady
