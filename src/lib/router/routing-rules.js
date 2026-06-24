/**
 * Routing Rules — priority weight presets + task→type mapping.
 *
 * PURE module: no imports from api/, no process.env, no node-only APIs.
 * This is config, not logic — change weights here to retune routing behavior
 * without touching the router or scoring engine.
 */

/**
 * Priority presets over { quality, speed, cost, reliability }. Values are 0..1
 * and need not sum to 1 (scoring is a weighted sum, ranking is relative).
 */
export const PRIORITY_WEIGHTS = {
  cheap:    { quality: 0.15, speed: 0.20, cost: 0.55, reliability: 0.10 },
  speed:    { quality: 0.15, speed: 0.55, cost: 0.15, reliability: 0.15 },
  quality:  { quality: 0.55, speed: 0.10, cost: 0.15, reliability: 0.20 },
  balanced: { quality: 0.30, speed: 0.25, cost: 0.25, reliability: 0.20 }
}

/**
 * Every task → its media type. Keep in sync with model-registry's taxonomy.
 */
export const TASK_TYPES = {
  // image
  thumbnail: 'image',
  social_image: 'image',
  blog_image: 'image',
  hero_image: 'image',
  concept_art: 'image',
  scene: 'image',
  // video
  short_clip: 'video',
  cinematic_clip: 'video',
  image_to_video: 'video',
  b_roll: 'video',
  // audio
  narration: 'audio',
  voiceover: 'audio',
  podcast_voice: 'audio',
  // utility
  upscale: 'utility',
  background_removal: 'utility',
  image_edit: 'utility'
}

/**
 * Resolve a task to its media type. Unknown tasks default to 'image'.
 * @param {string} task
 * @returns {'image'|'video'|'audio'|'utility'}
 */
export function taskToType(task) {
  return TASK_TYPES[task] || 'image'
}

/**
 * Resolve the scoring weights for a (priority, quality) pair.
 * `quality` nudges the preset: 'high' favors quality, 'draft' favors cost+speed.
 * @param {'cheap'|'balanced'|'quality'|'speed'} [priority='balanced']
 * @param {'standard'|'high'|'draft'} [quality='standard']
 * @returns {import('./scoring-engine.js').Weights}
 */
export function resolveWeights(priority = 'balanced', quality = 'standard') {
  const base = { ...(PRIORITY_WEIGHTS[priority] || PRIORITY_WEIGHTS.balanced) }
  if (quality === 'high') {
    base.quality *= 1.5
    base.cost *= 0.7
  } else if (quality === 'draft') {
    base.cost *= 1.3
    base.speed *= 1.3
    base.quality *= 0.7
  }
  return base
}
