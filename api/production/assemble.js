/**
 * POST /api/production/assemble
 * Assemble a final MP4 from a video record's generated assets.
 *
 * Expects the video record to have:
 *   - scene_image_urls: string[] — one image per script section
 *   - voice_audio_url: string — full narration audio
 *   - script: object — with section durations (used to set image display time)
 *
 * Pipeline (now delegated to the shared render engine):
 *   1. Resolve scenes + audio into a COMPOSITION MANIFEST (composition.buildManifest)
 *   2. Render the manifest to MP4 via _render/ffmpeg.js::renderTimeline
 *   3. Upload to Vercel Blob + mint a poster thumbnail
 *   4. Update video record with final_video_url + thumbnail_url
 *
 * Falls back to an assembly manifest JSON when ffmpeg is unavailable at runtime
 * (same HTTP contract as before: { mode: 'manifest', manifest, manifest_url }).
 */
import { getServerSupabase } from '../_db.js'
import { uploadBuffer, hasBlob } from '../_blob.js'
import { buildManifest } from '../_render/composition.js'
import { renderTimeline, generateThumbnail, resolveFfmpeg } from '../_render/ffmpeg.js'

function parseDuration(str) {
  if (typeof str === 'number') return str
  if (!str) return 5
  const match = str.match(/(\d+\.?\d*)\s*s/)
  if (match) return parseFloat(match[1])
  const secMatch = str.match(/^(\d+\.?\d*)$/)
  if (secMatch) return parseFloat(secMatch[1])
  return 5
}

// Is a real ffmpeg binary actually runnable here? resolveFfmpeg() always returns
// a string (falling back to bare 'ffmpeg'), so probe -version to be sure before
// committing to a render vs. the manifest fallback.
async function ffmpegAvailable() {
  try {
    const ffmpeg = await resolveFfmpeg()
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    await promisify(execFile)(ffmpeg, ['-version'], { timeout: 10000 })
    return true
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { video_id, workspace_id } = req.body || {}
  if (!video_id || !workspace_id) return res.status(400).json({ error: 'video_id and workspace_id required' })

  const db = getServerSupabase()
  if (!db) return res.status(503).json({ error: 'Database not configured' })

  // Load video record
  const { data: video, error: videoErr } = await db
    .from('video_posts')
    .select('id, title, script, scene_image_urls, voice_audio_url, status')
    .eq('id', video_id)
    .single()

  if (videoErr || !video) return res.status(404).json({ error: 'Video not found' })
  if (!video.scene_image_urls?.length) return res.status(400).json({ error: 'No scene images — run Media Agent first' })
  if (!video.voice_audio_url) return res.status(400).json({ error: 'No voice audio — run Media Agent first' })

  // Update status
  await db.from('video_posts').update({ status: 'assembling' }).eq('id', video_id)

  try {
    const imageUrls = video.scene_image_urls
    const audioUrl = video.voice_audio_url
    const sections = video.script?.body || []

    // Resolve scenes (image + per-section duration) into the render manifest.
    const scenes = buildScenes(imageUrls, sections)
    const manifest = buildManifest({
      scenes,
      audioUrl,
      format: '16:9'
    })

    // No usable ffmpeg -> emit an assembly manifest for manual/worker processing.
    if (!(await ffmpegAvailable())) {
      const fallback = buildAssemblyManifest(video)
      const manifestUrl = hasBlob()
        ? await uploadBuffer(Buffer.from(JSON.stringify(fallback, null, 2)), `assembly/${video_id}/manifest.json`, { contentType: 'application/json' })
        : null
      await db.from('video_posts').update({ status: 'assembly_manifest', assembly_manifest: fallback }).eq('id', video_id)
      return res.status(200).json({ mode: 'manifest', manifest: fallback, manifest_url: manifestUrl })
    }

    // Render the manifest to MP4 via the shared engine.
    const { buffer, path, durationSec } = await renderTimeline(manifest, { keepTemp: true })

    let finalUrl = null
    let thumbnailUrl = null
    if (hasBlob()) {
      finalUrl = await uploadBuffer(buffer, `videos/${video_id}/final.mp4`, { contentType: 'video/mp4' })
      // Poster frame from the rendered video (falls back to first scene image).
      try {
        const thumbBuf = await generateThumbnail(path || imageUrls[0], { format: manifest.format })
        thumbnailUrl = await uploadBuffer(thumbBuf, `videos/${video_id}/thumbnail.jpg`, { contentType: 'image/jpeg' })
      } catch (thumbErr) {
        console.warn('[production/assemble] thumbnail failed:', thumbErr.message)
      }
    }
    // Clean up the temp render dir we asked renderTimeline to keep.
    if (path) {
      try {
        const { rm } = await import('node:fs/promises')
        const { dirname } = await import('node:path')
        await rm(dirname(path), { recursive: true, force: true })
      } catch { /* best effort */ }
    }

    // The MP4 only really "exists" for callers once it's persisted. If Blob isn't
    // configured we rendered bytes we can't hand back — report that honestly
    // rather than claiming success with a null URL.
    const persisted = !!finalUrl
    await db.from('video_posts').update({
      status: persisted ? 'assembled' : 'rendered_unpersisted',
      final_video_url: finalUrl,
      thumbnail_url: thumbnailUrl,
      assembly_completed_at: new Date().toISOString()
    }).eq('id', video_id)

    return res.status(200).json({
      video_id,
      final_video_url: finalUrl,
      thumbnail_url: thumbnailUrl,
      scenes: imageUrls.length,
      durations: manifest.scenes.map(s => s.duration),
      total_duration: durationSec ?? manifest.duration,
      ...(persisted ? {} : { warning: 'Rendered but not persisted — set BLOB_READ_WRITE_TOKEN to store the MP4.' })
    })

  } catch (err) {
    console.error('[production/assemble]', err)
    await db.from('video_posts').update({ status: 'assembly_failed', assembly_error: err.message }).eq('id', video_id)
    return res.status(500).json({ error: err.message })
  }
}

// Zip image URLs with per-section durations into the scene shape buildManifest
// expects. Sections beyond the image count are ignored; missing durations default.
function buildScenes(imageUrls, sections) {
  return imageUrls.map((url, i) => {
    const section = sections[i]
    const scene = {
      image_url: url,
      narration: section?.script || ''
    }
    if (section?.duration != null) scene.duration = parseDuration(section.duration)
    return scene
  })
}

function buildAssemblyManifest(video) {
  return {
    video_id: video.id,
    title: video.title,
    scene_image_urls: video.scene_image_urls,
    voice_audio_url: video.voice_audio_url,
    sections: video.script?.body || [],
    assembly_instructions: 'Download scene images and audio, then run ffmpeg with concat filter + audio overlay.',
    ffmpeg_template: 'ffmpeg -f concat -safe 0 -i concat.txt -i narration.mp3 -vf "scale=1920:1080" -c:v libx264 -c:a aac -shortest output.mp4'
  }
}
