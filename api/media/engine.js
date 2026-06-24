/**
 * Media Engine — the ContentOS orchestrator that ties the leaf modules together.
 *
 * Two surfaces:
 *
 *   produceVideo()  — the full timeline path. Takes the loose asset bag a Media
 *                     Agent produces (scene images, narration, music, captions,
 *                     branding, a target format), resolves it into a COMPOSITION
 *                     MANIFEST via composition.buildManifest, renders + persists
 *                     it via index.renderComposition, then mints a poster
 *                     thumbnail. Returns { video_url, thumbnail_url, format,
 *                     durationSec, manifest }.
 *
 *   single-asset    — produceImage / editAsset / upscaleAsset / removeBgAsset
 *   helpers           wrap the Runware image ops and make the resulting (ephemeral)
 *                     provider URL permanent in Vercel Blob.
 *
 * Leaf modules are imported by their EXACT exported names — this file owns the
 * wiring, it does not reach inside them:
 *   _providers/runware.js  : generateImage, upscaleImage, removeBackground, editImage, hasRunware
 *   _render/composition.js : buildManifest, FORMAT_DIMS
 *   _render/index.js       : renderComposition
 *   _render/ffmpeg.js      : generateThumbnail
 *   _blob.js               : reuploadUrl, uploadBuffer, hasBlob
 */
import { randomUUID } from 'node:crypto'
import {
  generateImage as runwareGenerateImage,
  upscaleImage as runwareUpscaleImage,
  removeBackground as runwareRemoveBackground,
  editImage as runwareEditImage,
  hasRunware
} from '../_providers/runware.js'
import { buildManifest, FORMAT_DIMS } from '../_render/composition.js'
import { renderComposition } from '../_render/index.js'
import { generateThumbnail } from '../_render/ffmpeg.js'
import { reuploadUrl, uploadBuffer, hasBlob } from '../_blob.js'

export { FORMAT_DIMS, hasRunware }

/**
 * Coerce a `script` object (hook + body[] + cta) into the scene list the
 * manifest builder expects. Used when produceVideo is handed a `script` instead
 * of pre-resolved `scenes`. Scene images must already be attached on each
 * section (image_url / url); sections without an image are skipped so the
 * renderer never receives a dangling scene.
 */
function scenesFromScript(script) {
  if (!script || typeof script !== 'object') return []
  const out = []
  const push = (raw, narration) => {
    if (!raw) return
    const image_url = raw.image_url || raw.url || raw.imageURL || raw.imageUrl
    if (!image_url) return
    out.push({
      image_url,
      duration: raw.duration,
      motion: raw.motion,
      transition: raw.transition,
      narration: narration ?? raw.narration ?? raw.script ?? ''
    })
  }
  if (script.hook) push(script.hook, typeof script.hook === 'string' ? script.hook : script.hook.narration)
  if (Array.isArray(script.body)) for (const s of script.body) push(s, s.script || s.narration)
  if (script.cta) push(script.cta, typeof script.cta === 'string' ? script.cta : script.cta.narration)
  return out
}

/**
 * Produce a finished video from a bag of assets.
 *
 * @param {object} args
 * @param {Array}  [args.scenes]    pre-resolved scenes (string URL or
 *                                  { image_url, duration?, motion?, transition?, narration? }).
 *                                  Either scenes or script is required.
 * @param {object} [args.script]    a script object whose sections carry image_url —
 *                                  converted to scenes when `scenes` is absent.
 * @param {string} [args.audioUrl]  narration track URL
 * @param {string} [args.musicUrl]  background music track URL
 * @param {Array}  [args.captions]  explicit cues [{ text, start, end }]
 * @param {object} [args.branding]  { watermark_url?, intro_url?, outro_url? }
 * @param {string} [args.format]    "9:16" | "16:9" | "1:1" (default "9:16")
 * @param {string} [args.workspaceId] used only to namespace persisted assets
 * @param {object} [args.opts]      passed through to renderComposition
 *                                  ({ provider?, id?, renderOpts? })
 * @returns {Promise<{ video_url, thumbnail_url, format, durationSec, manifest }>}
 */
export async function produceVideo({
  scenes,
  script,
  audioUrl,
  musicUrl,
  captions,
  branding,
  format,
  workspaceId,
  opts = {}
} = {}) {
  const resolvedScenes = Array.isArray(scenes) && scenes.length ? scenes : scenesFromScript(script)
  if (!Array.isArray(resolvedScenes) || resolvedScenes.length === 0) {
    throw new Error('produceVideo: provide scenes[] (or a script whose sections carry image_url)')
  }

  // 1. Resolve the loose asset bag into a fully-specified manifest.
  const manifest = buildManifest({
    scenes: resolvedScenes,
    audioUrl,
    musicUrl,
    captions,
    branding,
    format
  })

  // 2. Render + persist via the RenderProvider selector (default ffmpeg -> blob).
  const id = opts.id || randomUUID()
  const render = await renderComposition(manifest, { ...opts, id })

  // 3. Mint a poster thumbnail. Prefer pulling a frame from the rendered video
  //    (true poster); fall back to the first scene image if the local path is
  //    gone or thumbnailing fails. Persist it next to the video.
  let thumbnail_url = null
  try {
    // Prefer the (always-available) hook image as the poster — render.path is a
    // temp file already cleaned up by renderTimeline, so it can't be relied on.
    const thumbSrc = manifest.scenes[0]?.image_url || render.url
    if (thumbSrc) {
      const thumbBuf = await generateThumbnail(thumbSrc, { format: manifest.format })
      thumbnail_url = await persistThumbnail(thumbBuf, id, workspaceId)
    }
  } catch (err) {
    console.error('[media/engine] thumbnail generation failed:', err.message)
    // Last resort: reuse the first scene image as the poster.
    const firstImg = manifest.scenes[0]?.image_url
    if (firstImg) {
      thumbnail_url = hasBlob()
        ? await reuploadUrl(firstImg, blobPath(workspaceId, id, 'thumbnail.jpg'), { contentType: 'image/jpeg' }).catch(() => firstImg)
        : firstImg
    }
  }

  return {
    video_url: render.url,
    thumbnail_url,
    format: render.format || manifest.format,
    durationSec: render.durationSec ?? manifest.duration ?? null,
    manifest
  }
}

// ---------------------------------------------------------------------------
// single-asset helpers — Runware op + blob persistence
// ---------------------------------------------------------------------------

/**
 * Generate an image from a text prompt and persist it.
 * @param {string} prompt
 * @param {object} [opts] - Runware generateImage opts + { workspaceId, persist }
 * @returns {Promise<{ url, width?, height?, seed?, cost?, provider }>}
 */
export async function produceImage(prompt, opts = {}) {
  if (!prompt) throw new Error('produceImage: prompt is required')
  const result = await runwareGenerateImage(prompt, opts)
  const url = await persistAsset(result.url, opts, 'jpg', 'image/jpeg')
  return { ...result, url }
}

/**
 * Edit an existing image (img2img / inpaint) and persist the result.
 * @param {string} imageUrl
 * @param {string} prompt
 * @param {object} [opts] - Runware editImage opts (maskUrl, strength, ...) + { workspaceId }
 * @returns {Promise<{ url, ... }>}
 */
export async function editAsset(imageUrl, prompt, opts = {}) {
  if (!imageUrl) throw new Error('editAsset: imageUrl is required')
  const result = await runwareEditImage(imageUrl, prompt, opts)
  const url = await persistAsset(result.url, opts, 'jpg', 'image/jpeg')
  return { ...result, url }
}

/**
 * Upscale an image (2x|3x|4x) and persist the result.
 * @param {string} imageUrl
 * @param {object} [opts] - Runware upscaleImage opts (upscaleFactor, ...) + { workspaceId }
 * @returns {Promise<{ url, ... }>}
 */
export async function upscaleAsset(imageUrl, opts = {}) {
  if (!imageUrl) throw new Error('upscaleAsset: imageUrl is required')
  const result = await runwareUpscaleImage(imageUrl, opts)
  const url = await persistAsset(result.url, opts, 'jpg', 'image/jpeg')
  return { ...result, url }
}

/**
 * Remove an image background (transparent PNG) and persist the result.
 * @param {string} imageUrl
 * @param {object} [opts] - Runware removeBackground opts + { workspaceId }
 * @returns {Promise<{ url, ... }>}
 */
export async function removeBgAsset(imageUrl, opts = {}) {
  if (!imageUrl) throw new Error('removeBgAsset: imageUrl is required')
  const result = await runwareRemoveBackground(imageUrl, opts)
  // background removal yields a PNG (alpha preserved).
  const url = await persistAsset(result.url, opts, 'png', 'image/png')
  return { ...result, url }
}

// ---------------------------------------------------------------------------
// persistence helpers
// ---------------------------------------------------------------------------

/** Build a stable, namespaced blob path for a generated asset. */
function blobPath(workspaceId, id, filename) {
  const ns = workspaceId ? `media/${workspaceId}` : 'media'
  return `${ns}/${id}/${filename}`
}

/**
 * Make an ephemeral provider image URL permanent in Vercel Blob.
 * When persistence is disabled (opts.persist === false) or blob isn't
 * configured, the original URL is returned unchanged.
 */
async function persistAsset(providerUrl, opts, ext, contentType) {
  if (!providerUrl) throw new Error('persistAsset: provider returned no url')
  if (opts.persist === false || !hasBlob()) return providerUrl
  const id = opts.id || randomUUID()
  const path = blobPath(opts.workspaceId, id, `asset-${randomUUID().slice(0, 8)}.${ext}`)
  return reuploadUrl(providerUrl, path, { contentType }).catch(() => providerUrl)
}

/** Upload a thumbnail buffer; null when blob isn't configured. */
async function persistThumbnail(buffer, id, workspaceId) {
  if (!buffer || !hasBlob()) return null
  return uploadBuffer(buffer, blobPath(workspaceId, id, 'thumbnail.jpg'), { contentType: 'image/jpeg' })
}
