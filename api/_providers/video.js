/**
 * VideoProvider — Wan 2.7 via fal.ai (server-side only).
 * Up to 5 reference images for character consistency.
 * Wan 2.6 Flash for motion tests, 2.7 for finals.
 */
import * as fal from '@fal-ai/client'

function configure() {
  const key = process.env.FAL_KEY || process.env.FAL_AI_API_KEY
  if (!key) return false
  fal.config({ credentials: key })
  return true
}

const MODELS = {
  'wan-2.7': 'fal-ai/wan/v2.7/image-to-video',
  'wan-2.6-flash': 'fal-ai/wan/v2.6/image-to-video/turbo',
  'wan-2.7-text': 'fal-ai/wan/v2.7/text-to-video'
}

/**
 * Generate video from an image (image-to-video).
 * @param {string} imageUrl - Source image URL
 * @param {object} opts - { prompt, duration, model, reference_images, motion_strength }
 * @returns {{ url: string, duration: number }}
 */
export async function imageToVideo(imageUrl, opts = {}) {
  if (!configure()) throw new Error('FAL_KEY not configured')
  const model = MODELS[opts.model || 'wan-2.7']

  const input = {
    image_url: imageUrl,
    prompt: opts.prompt || 'Smooth cinematic motion, professional quality',
    num_frames: opts.duration === 3 ? 49 : 81, // 3s or 5s at 16fps
    resolution: opts.resolution || '720p',
    motion_strength: opts.motion_strength || 0.5
  }

  // Up to 5 reference images for character consistency
  if (opts.reference_images?.length) {
    input.reference_images = opts.reference_images.slice(0, 5)
  }

  const result = await fal.run(model, { input })
  const video = result.video || result.videos?.[0]
  if (!video?.url) throw new Error('fal.ai returned no video URL')
  return { url: video.url, duration: opts.duration || 5 }
}

/**
 * Quick motion test using Wan 2.6 Flash (cheaper).
 */
export async function motionTest(imageUrl, prompt) {
  return imageToVideo(imageUrl, { prompt, model: 'wan-2.6-flash', duration: 3 })
}

export function hasVideoProvider() {
  return !!(process.env.FAL_KEY || process.env.FAL_AI_API_KEY)
}
