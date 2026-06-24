/**
 * POST /api/media/render-video
 * One-off composition render — assemble scenes + audio into a finished MP4 via
 * the Media Engine (composition.buildManifest -> renderComposition -> thumbnail).
 *
 * Body: {
 *   scenes?:    Array (string URL or { image_url, duration?, motion?, transition?, narration? }),
 *   script?:    object (sections carrying image_url; used when scenes is absent),
 *   audioUrl?:  string, musicUrl?: string,
 *   captions?:  [{ text, start, end }],
 *   branding?:  { watermark_url?, intro_url?, outro_url? },
 *   format?:    "9:16" | "16:9" | "1:1",
 *   workspaceId?: string,
 *   opts?:      { provider?, id?, renderOpts? }
 * }
 * Returns: { video_url, thumbnail_url, format, durationSec }
 */
import { produceVideo } from './engine.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    scenes,
    script,
    audioUrl,
    musicUrl,
    captions,
    branding,
    format,
    workspaceId,
    opts = {}
  } = req.body || {}

  const hasScenes = Array.isArray(scenes) && scenes.length > 0
  if (!hasScenes && !script) {
    return res.status(400).json({ error: 'scenes[] or script required' })
  }

  try {
    const result = await produceVideo({
      scenes,
      script,
      audioUrl,
      musicUrl,
      captions,
      branding,
      format,
      workspaceId,
      opts
    })
    // Surface the render result, not the (potentially large) manifest.
    return res.status(200).json({
      video_url: result.video_url,
      thumbnail_url: result.thumbnail_url,
      format: result.format,
      durationSec: result.durationSec
    })
  } catch (err) {
    console.error('[media/render-video]', err)
    return res.status(500).json({ error: err.message || 'Render failed' })
  }
}
