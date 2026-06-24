/**
 * Model Registry — the config-driven SOURCE OF TRUTH for ContentOS routing.
 *
 * This is a PURE module. It declares WHAT models exist, what they cost, how
 * good/fast/reliable they are, and which tasks they serve. It does NOT know how
 * to call a provider, read a secret, or touch the database — that wiring is
 * injected at runtime by the server bootstrap (api/_providers/router-adapters.js).
 *
 * Rules this file obeys:
 *   - NO imports from api/, NO process.env, NO node-only APIs.
 *   - Scores are 1..10 (higher = better). cost score: 10 = cheapest.
 *   - providerModelId is the EXACT id the matching provider adapter expects:
 *       runware -> AIR identifier ('runware:101@1') or op name for utilities
 *       fal     -> fal endpoint slug ('fal-ai/wan/v2.7/image-to-video')
 *       openai  -> model name ('dall-e-3')
 *
 * TASK TAXONOMY (task -> media type):
 *   image:   thumbnail, social_image, blog_image, hero_image, concept_art, scene
 *   video:   short_clip, cinematic_clip, image_to_video, b_roll
 *   audio:   narration, voiceover, podcast_voice
 *   utility: upscale, background_removal, image_edit
 *
 * MODEL RECORD shape:
 * {
 *   id, provider, type:'image'|'video'|'audio'|'utility', label,
 *   providerModelId,
 *   qualityScore, speedScore, costScore, reliabilityScore,   // 1..10
 *   supportedTasks: [ ...task strings... ], enabled, capabilities?:{}
 * }
 */

/**
 * @typedef {'image'|'video'|'audio'|'utility'} MediaType
 */

/**
 * @typedef {Object} ModelRecord
 * @property {string} id                Stable unique id for this model entry.
 * @property {string} provider          Provider id ('runware'|'fal'|'openai').
 * @property {MediaType} type           Media type this model produces/operates on.
 * @property {string} label             Human-readable label.
 * @property {string} providerModelId   Exact id the provider adapter expects.
 * @property {number} qualityScore      1..10 output quality.
 * @property {number} speedScore        1..10 (higher = faster).
 * @property {number} costScore         1..10 (higher = cheaper).
 * @property {number} reliabilityScore  1..10 (higher = more reliable).
 * @property {string[]} supportedTasks  Task strings this model serves.
 * @property {boolean} enabled          Registry-level enable flag.
 * @property {Object} [capabilities]    Optional capability hints (free-form).
 */

/**
 * @typedef {Object} ProviderDescriptor
 * @property {string} id
 * @property {string} name
 * @property {boolean} enabled
 */

/**
 * Provider descriptors (static metadata only). Runtime adapters + the actual
 * enabled/disabled decision (e.g. "OpenAI has no key right now") are layered on
 * top by the provider-registry; this list just declares which providers the
 * registry knows about and their default enabled state.
 * @type {ProviderDescriptor[]}
 */
export const PROVIDERS = [
  { id: 'runware', name: 'Runware', enabled: true },
  { id: 'fal', name: 'Fal', enabled: true },
  { id: 'openai', name: 'OpenAI', enabled: true }
]

/**
 * The model catalog. Runware-primary across the image + utility lanes; fal for
 * video + cloud voice; OpenAI as a premium image fallback (kept enabled here —
 * the router drops it at runtime when no provider adapter / key is present).
 * @type {ModelRecord[]}
 */
export const MODELS = [
  // ---------------------------------------------------------------------------
  // IMAGE — Runware-hosted open FLUX weights (primary), OpenAI DALL·E 3 fallback
  // ---------------------------------------------------------------------------
  {
    id: 'flux-dev',
    provider: 'runware',
    type: 'image',
    label: 'FLUX.1 [dev] (Runware)',
    providerModelId: 'runware:101@1',
    qualityScore: 7,
    speedScore: 8,
    costScore: 9,
    reliabilityScore: 9,
    supportedTasks: ['thumbnail', 'social_image', 'blog_image', 'hero_image', 'concept_art', 'scene'],
    enabled: true,
    capabilities: { maxWidth: 2048, maxHeight: 2048, referenceImages: false }
  },
  {
    id: 'flux-schnell',
    provider: 'runware',
    type: 'image',
    label: 'FLUX.1 [schnell] (Runware)',
    providerModelId: 'runware:100@1',
    qualityScore: 6,
    speedScore: 10,
    costScore: 10,
    reliabilityScore: 9,
    supportedTasks: ['thumbnail', 'social_image', 'scene', 'concept_art'],
    enabled: true,
    capabilities: { maxWidth: 2048, maxHeight: 2048, fastSteps: 4 }
  },
  {
    id: 'dalle-3',
    provider: 'openai',
    type: 'image',
    label: 'DALL·E 3 (OpenAI)',
    providerModelId: 'dall-e-3',
    qualityScore: 8,
    speedScore: 6,
    costScore: 3,
    reliabilityScore: 8,
    supportedTasks: ['hero_image', 'concept_art', 'social_image'],
    // Kept enabled in the registry; the router filters OpenAI out at runtime
    // when the provider is disabled (e.g. no OPENAI_API_KEY injected).
    enabled: true,
    capabilities: { referenceImages: false, sizes: ['1024x1024', '1792x1024', '1024x1792'] }
  },

  // ---------------------------------------------------------------------------
  // UTILITY — Runware image-ops (edit / upscale / background removal)
  // ---------------------------------------------------------------------------
  {
    id: 'flux-fill',
    provider: 'runware',
    type: 'utility',
    label: 'FLUX.1 Fill (Runware)',
    providerModelId: 'runware:102@1',
    qualityScore: 7,
    speedScore: 7,
    costScore: 8,
    reliabilityScore: 8,
    supportedTasks: ['image_edit'],
    enabled: true,
    capabilities: { inpaint: true, img2img: true }
  },
  {
    id: 'runware-upscale',
    provider: 'runware',
    type: 'utility',
    label: 'Runware Upscale',
    // Utility op, not an AIR model — the adapter routes on this op name.
    providerModelId: 'imageUpscale',
    qualityScore: 8,
    speedScore: 8,
    costScore: 9,
    reliabilityScore: 9,
    supportedTasks: ['upscale'],
    enabled: true,
    capabilities: { factors: [2, 3, 4] }
  },
  {
    id: 'runware-bg-removal',
    provider: 'runware',
    type: 'utility',
    label: 'Runware Background Removal',
    providerModelId: 'imageBackgroundRemoval',
    qualityScore: 8,
    speedScore: 9,
    costScore: 9,
    reliabilityScore: 9,
    supportedTasks: ['background_removal'],
    enabled: true,
    capabilities: { alpha: true, outputFormat: 'PNG' }
  },

  // ---------------------------------------------------------------------------
  // VIDEO — Wan via fal.ai (2.7 finals, 2.6 Flash for fast/cheap motion)
  // ---------------------------------------------------------------------------
  {
    id: 'wan-2.7',
    provider: 'fal',
    type: 'video',
    label: 'Wan 2.7 image-to-video (fal)',
    providerModelId: 'fal-ai/wan/v2.7/image-to-video',
    qualityScore: 8,
    speedScore: 5,
    costScore: 5,
    reliabilityScore: 7,
    supportedTasks: ['cinematic_clip', 'image_to_video', 'b_roll'],
    enabled: true,
    capabilities: { referenceImages: 5, resolutions: ['480p', '720p'] }
  },
  {
    id: 'wan-2.6-flash',
    provider: 'fal',
    type: 'video',
    label: 'Wan 2.6 Flash image-to-video (fal)',
    providerModelId: 'fal-ai/wan/v2.6/image-to-video/turbo',
    qualityScore: 6,
    speedScore: 8,
    costScore: 7,
    reliabilityScore: 8,
    supportedTasks: ['short_clip', 'image_to_video', 'b_roll'],
    enabled: true,
    capabilities: { referenceImages: 5, turbo: true }
  },

  // ---------------------------------------------------------------------------
  // AUDIO — Qwen-3-TTS clone (fal) primary, Kokoro local fallback
  // ---------------------------------------------------------------------------
  {
    id: 'qwen-3-tts',
    provider: 'fal',
    type: 'audio',
    label: 'Qwen-3-TTS clone-voice (fal)',
    providerModelId: 'fal-ai/qwen-3-tts/clone-voice/1.7b',
    qualityScore: 8,
    speedScore: 7,
    costScore: 6,
    reliabilityScore: 7,
    supportedTasks: ['narration', 'voiceover', 'podcast_voice'],
    enabled: true,
    capabilities: { voiceClone: true, voices: ['Vivian', 'Serena', 'Uncle_Fu', 'Dylan', 'Eric', 'Ryan', 'Aiden', 'Ono_Anna', 'Sohee'] }
  },
  {
    id: 'kokoro',
    provider: 'fal',
    type: 'audio',
    label: 'Kokoro v1.0 (local/fal)',
    // Local-first generic narration; adapter resolves the concrete engine.
    providerModelId: 'kokoro',
    qualityScore: 6,
    speedScore: 8,
    costScore: 10,
    reliabilityScore: 6,
    supportedTasks: ['narration', 'voiceover'],
    enabled: true,
    capabilities: { local: true, voices: ['af_heart', 'am_michael', 'bf_emma'] }
  }
]

/**
 * Runtime score overrides — a pure-mutable Map the SERVER bootstrap populates
 * from `model_routing_log` (auto-learning). Keys are model ids; values are the
 * numeric score to substitute for the static registry value. The scoring engine
 * reads these via getModelOverride(). Keeping this PURE (no env/api imports)
 * so the frontend bundle stays clean — overrides simply aren't set there.
 * @type {Map<string, { reliabilityScore?: number, speedScore?: number, qualityScore?: number, costScore?: number }>}
 */
const _overrides = new Map()

/**
 * Apply a learned score override for a model (server bootstrap / cron only).
 * Only fields present in the patch are overridden; others keep the static
 * registry value. Values are clamped to the 1..10 scoring range.
 * @param {string} id
 * @param {{ reliabilityScore?: number, speedScore?: number, qualityScore?: number, costScore?: number }} patch
 */
export function setModelOverride(id, patch = {}) {
  if (!id) return
  const clamp = (v) => (Number.isFinite(v) ? Math.max(1, Math.min(10, v)) : undefined)
  const cur = _overrides.get(id) || {}
  const next = { ...cur }
  for (const k of ['reliabilityScore', 'speedScore', 'qualityScore', 'costScore']) {
    if (patch[k] != null && Number.isFinite(Number(patch[k]))) next[k] = clamp(Number(patch[k]))
  }
  _overrides.set(id, next)
}

/** Clear all learned overrides (e.g. before recomputing). */
export function clearModelOverrides() { _overrides.clear() }

/**
 * Get the override patch for a model, if any (server-populated).
 * @param {string} id
 */
export function getModelOverride(id) {
  return _overrides.get(id) || null
}

/**
 * @returns {ModelRecord[]} a shallow copy of every registered model.
 */
export function getAllModels() {
  return MODELS.slice()
}

/**
 * @param {string} id
 * @returns {ModelRecord|undefined} the model with this id, if any.
 */
export function getModelById(id) {
  if (!id) return undefined
  return MODELS.find((m) => m.id === id)
}

/**
 * Models that declare support for a given task.
 * @param {string} task
 * @returns {ModelRecord[]}
 */
export function getModelsForTask(task) {
  if (!task) return []
  return MODELS.filter((m) => Array.isArray(m.supportedTasks) && m.supportedTasks.includes(task))
}

/**
 * Models of a given media type.
 * @param {MediaType} type
 * @returns {ModelRecord[]}
 */
export function getModelsByType(type) {
  if (!type) return []
  return MODELS.filter((m) => m.type === type)
}
