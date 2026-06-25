/**
 * Rendering Engine (#17) — adapter (LIVE).
 *
 * Wraps api/_render (buildManifest + renderComposition / ffmpeg). Takes a
 * COMPOSITION_MANIFEST (or a composition from the Composition Engine) and renders
 * + persists an MP4, returning a RENDER_RESULT contract.
 *
 * input:  { manifest | composition, format?, workspace_id? }
 * output: RENDER_RESULT contract { url, format, durationSec, thumbnail_url }
 *
 * Requires ffmpeg (bundled via ffmpeg-static) + Vercel Blob for a hosted URL; in
 * local/no-blob mode it returns a file:// path. Never fabricates a result.
 */
import { defineEngine } from '../_base.js'
import { RenderResult } from '../../_contracts/index.js'
import { renderComposition } from '../../_render/index.js'

export default defineEngine({
  id: 'rendering',
  name: 'Rendering Engine (FFmpeg)',
  responsibility: 'Encode/compress/export final video across all formats + watermark + audio mix.',
  status: 'live',
  inputs: ['composition_manifest'],
  outputs: ['render_result'],
  run: async (input = {}, ctx = {}) => {
    const manifest = input.manifest || input.composition?.manifest || input.composition || null
    if (!manifest || !Array.isArray(manifest.scenes)) {
      throw new Error('rendering: a composition_manifest (with scenes[]) is required')
    }

    const render = await renderComposition(manifest, {
      provider: 'ffmpeg',
      id: input.project_id || undefined
    })

    const result = {
      ...RenderResult.blank(),
      url: render.url || '',
      format: render.format || manifest.format || '9:16',
      durationSec: render.durationSec ?? manifest.duration ?? null,
      thumbnail_url: input.thumbnail_url || null
    }
    // RENDER_RESULT requires a url; ffmpeg returns file:// in no-blob mode, which is
    // a valid runnable url. Only a true failure leaves it empty.
    if (!result.url) throw new Error('rendering: renderer produced no output url')
    return result
  }
})