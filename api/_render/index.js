/**
 * RenderProvider selector — turns a resolved COMPOSITION MANIFEST into a
 * persisted video URL.
 *
 * Providers:
 *   'ffmpeg'      (default) — render locally with ffmpeg.js::renderTimeline,
 *                             then persist the MP4 buffer to Vercel Blob.
 *   'openmontage' — documented stub for the OpenMontage worker path. Not yet
 *                   wired; throws so callers fall back to ffmpeg.
 *
 * Contract (stable):
 *   renderComposition(manifest, opts) -> { url, path, durationSec, format }
 */
import { randomUUID } from 'node:crypto'
import { renderTimeline } from './ffmpeg.js'
import { uploadBuffer, reuploadUrl, hasBlob } from '../_blob.js'

const DEFAULT_PROVIDER = 'ffmpeg'

/**
 * Render a composition manifest with the selected provider and persist it.
 *
 * @param {object} manifest  a fully-resolved manifest from composition.buildManifest
 * @param {object} [opts]
 * @param {string} [opts.provider='ffmpeg']  'ffmpeg' | 'openmontage'
 * @param {string} [opts.id]                 stable id used in the blob path
 *                                           (defaults to a fresh UUID)
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
    case 'openmontage':
      return renderWithOpenMontage(manifest, opts)
    default:
      throw new Error(`renderComposition: unknown provider "${provider}" (expected 'ffmpeg' or 'openmontage')`)
  }
}

/**
 * Default path: render the timeline with ffmpeg, then make the result
 * permanent in Vercel Blob.
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
    // caller still gets something runnable. reuploadUrl is the persistence helper
    // for already-remote assets — not applicable here — so we surface the path.
    url = path ? `file://${path}` : null
  }

  return {
    url,
    path: path || null,
    durationSec: durationSec ?? manifest.duration ?? null,
    format
  }
}

/**
 * OpenMontage worker render — documented stub.
 *
 * The intended design: hand the resolved manifest to the OpenMontage pipeline
 * (manifest-driven, per Rule Zero) running on the worker, which composes via
 * Remotion/HyperFrames and returns a finished MP4 URL we then persist with
 * reuploadUrl(). That worker handshake is not implemented yet, so this throws
 * to keep callers on the working ffmpeg path.
 *
 * @throws {Error} always — not yet wired.
 */
async function renderWithOpenMontage(/* manifest, opts */) {
  // When wired, this will POST the manifest to the OpenMontage worker, await the
  // rendered MP4 URL, then: return { url: await reuploadUrl(remoteUrl, filename),
  // path: null, durationSec, format }. reuploadUrl/hasBlob are imported above for
  // that future path.
  void reuploadUrl
  throw new Error('OpenMontage worker render not yet wired — use ffmpeg')
}
