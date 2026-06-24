/**
 * Rendering Engine (#17) selector — turns a resolved COMPOSITION MANIFEST into a
 * persisted video URL.
 *
 * Renderer:
 *   'ffmpeg' (default + only) — render locally with ffmpeg.js::renderTimeline,
 *                               then persist the MP4 buffer to Vercel Blob.
 *
 * FFmpeg is THE rendering engine for ContentOS v2.0. The selector keeps a
 * provider seam so a future renderer (e.g. a GPU worker) can be added behind the
 * same manifest contract — every provider stays replaceable.
 *
 * Contract (stable):
 *   renderComposition(manifest, opts) -> { url, path, durationSec, format }   (RENDER_RESULT)
 */
import { randomUUID } from 'node:crypto'
import { renderTimeline } from './ffmpeg.js'
import { uploadBuffer, hasBlob } from '../_blob.js'

const DEFAULT_PROVIDER = 'ffmpeg'

/**
 * Render a composition manifest with the selected provider and persist it.
 *
 * @param {object} manifest  a fully-resolved manifest from composition.buildManifest
 * @param {object} [opts]
 * @param {string} [opts.provider='ffmpeg']  'ffmpeg'
 * @param {string} [opts.id]                 stable id used in the blob path
 * @param {object} [opts.renderOpts]         passed through to renderTimeline
 * @returns {Promise<{ url, path, durationSec, format }>}
 */
export async function renderComposition(manifest, opts = {}) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('renderComposition: manifest is required')
  }

  const provider = opts.provider || DEFAULT_PROVIDER

  switch (provider) {
    case 'ffmpeg':
      return renderWithFfmpeg(manifest, opts)
    default:
      throw new Error(`renderComposition: unknown renderer "${provider}" (only 'ffmpeg' is wired)`)
  }
}

/**
 * Render the timeline with ffmpeg, then make the result permanent in Vercel Blob.
 */
async function renderWithFfmpeg(manifest, opts) {
  const id = opts.id || randomUUID()
  const format = manifest.format || 'unknown'
  const formatSlug = String(format).replace(/[^a-z0-9]+/gi, '-')  // "9:16" -> "9-16"

  const { path, buffer, durationSec } = await renderTimeline(manifest, opts.renderOpts || {})

  const filename = `videos/${id}/render-${formatSlug}.mp4`

  let url
  if (hasBlob()) {
    if (buffer) {
      url = await uploadBuffer(buffer, filename, { contentType: 'video/mp4' })
    } else if (path) {
      // ffmpeg may hand back a path without an in-memory buffer; read + upload.
      const { readFile } = await import('node:fs/promises')
      const fileBuf = await readFile(path)
      url = await uploadBuffer(fileBuf, filename, { contentType: 'video/mp4' })
    } else {
      throw new Error('renderWithFfmpeg: renderTimeline returned neither buffer nor path')
    }
  } else {
    // No blob token (local/dev): expose the on-disk path as a file URL so the
    // caller still gets something runnable.
    url = path ? `file://${path}` : null
  }

  return {
    url,
    path: path || null,
    durationSec: durationSec ?? manifest.duration ?? null,
    format
  }
}