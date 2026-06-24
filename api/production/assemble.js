/**
 * POST /api/production/assemble
 * Assemble a final MP4 from a video record's generated assets.
 *
 * Expects the video record to have:
 *   - scene_image_urls: string[] — one image per script section
 *   - voice_audio_url: string — full narration audio
 *   - script: object — with section durations (used to set image display time)
 *
 * Pipeline:
 *   1. Download images + audio to /tmp
 *   2. Build FFmpeg concat filter (images → video track, duration from script)
 *   3. Overlay audio
 *   4. Output MP4 (H.264 + AAC)
 *   5. Upload to Vercel Blob
 *   6. Update video record with final_video_url
 *
 * Falls back to a manifest JSON if ffmpeg-static is unavailable at runtime.
 */
import { exec } from 'child_process'
import { promisify } from 'util'
import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { pipeline as streamPipeline } from 'stream/promises'
import { getServerSupabase } from '../_db.js'
import { uploadBuffer, hasBlob } from '../_blob.js'

const execAsync = promisify(exec)

async function getFfmpegPath() {
  try {
    const { default: ffmpegPath } = await import('ffmpeg-static')
    return ffmpegPath
  } catch {
    // On some deployments ffmpeg-static doesn't include a binary — check PATH
    try {
      await execAsync('ffmpeg -version')
      return 'ffmpeg'
    } catch {
      return null
    }
  }
}

async function downloadFile(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed for ${url}: ${res.status}`)
  const ws = createWriteStream(dest)
  await streamPipeline(res.body, ws)
}

function parseDuration(str) {
  if (typeof str === 'number') return str
  if (!str) return 5
  const match = str.match(/(\d+\.?\d*)\s*s/)
  if (match) return parseFloat(match[1])
  const secMatch = str.match(/^(\d+\.?\d*)$/)
  if (secMatch) return parseFloat(secMatch[1])
  return 5
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { video_id, workspace_id } = req.body
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
    const ffmpegPath = await getFfmpegPath()
    if (!ffmpegPath) {
      // Fallback: produce an assembly manifest for manual processing
      const manifest = buildManifest(video)
      const manifestUrl = hasBlob()
        ? await uploadBuffer(Buffer.from(JSON.stringify(manifest, null, 2)), `assembly/${video_id}/manifest.json`, { contentType: 'application/json' })
        : null
      await db.from('video_posts').update({ status: 'assembly_manifest', assembly_manifest: manifest }).eq('id', video_id)
      return res.status(200).json({ mode: 'manifest', manifest, manifest_url: manifestUrl })
    }

    // Build work dir
    const workDir = join(tmpdir(), `contentos_assembly_${video_id}_${Date.now()}`)
    mkdirSync(workDir, { recursive: true })

    const imageUrls = video.scene_image_urls
    const audioUrl = video.voice_audio_url
    const sections = video.script?.body || []

    // Compute per-image durations
    const durations = computeDurations(imageUrls, sections, audioUrl)

    // Download all assets in parallel
    const imagePaths = imageUrls.map((_, i) => join(workDir, `scene_${String(i).padStart(3, '0')}.jpg`))
    const audioPath = join(workDir, 'narration.mp3')

    await Promise.all([
      ...imageUrls.map((url, i) => downloadFile(url, imagePaths[i])),
      downloadFile(audioUrl, audioPath)
    ])

    // Build FFmpeg concat input file
    const concatContent = imagePaths.map((p, i) => `file '${p}'\nduration ${durations[i]}`).join('\n')
    // Add last image again (FFmpeg concat requires a trailing entry for duration)
    if (imagePaths.length > 0) {
      concatContent + `\nfile '${imagePaths[imagePaths.length - 1]}'`
    }
    const concatPath = join(workDir, 'concat.txt')
    const { writeFileSync } = await import('fs')
    writeFileSync(concatPath, concatContent + `\nfile '${imagePaths[imagePaths.length - 1] || imagePaths[0]}'`)

    const outputPath = join(workDir, 'final.mp4')

    // Run FFmpeg: image slideshow + audio overlay → H.264 MP4
    const ffmpegCmd = [
      `"${ffmpegPath}"`,
      `-f concat -safe 0 -i "${concatPath}"`,
      `-i "${audioPath}"`,
      `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black"`,
      `-c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p`,
      `-c:a aac -b:a 192k`,
      `-shortest`,
      `-y "${outputPath}"`
    ].join(' ')

    await execAsync(ffmpegCmd, { timeout: 240000, maxBuffer: 10 * 1024 * 1024 })

    // Upload to Vercel Blob
    const { readFileSync } = await import('fs')
    const videoBuffer = readFileSync(outputPath)
    let finalUrl

    if (hasBlob()) {
      finalUrl = await uploadBuffer(videoBuffer, `videos/${video_id}/final.mp4`, { contentType: 'video/mp4' })
    } else {
      // Return as data URL for dev/testing (will be large — only for small videos)
      finalUrl = `data:video/mp4;base64,${videoBuffer.toString('base64').slice(0, 100)}...`
      finalUrl = null // Can't embed full video as data URL in DB — flag for manual retrieval
    }

    // Update video record
    await db.from('video_posts').update({
      status: 'assembled',
      final_video_url: finalUrl,
      assembly_completed_at: new Date().toISOString()
    }).eq('id', video_id)

    // Cleanup tmp
    await execAsync(`rm -rf "${workDir}"`).catch(() => {})

    return res.status(200).json({
      video_id,
      final_video_url: finalUrl,
      scenes: imageUrls.length,
      durations,
      total_duration: durations.reduce((a, b) => a + b, 0)
    })

  } catch (err) {
    console.error('[production/assemble]', err)
    await db.from('video_posts').update({ status: 'assembly_failed', assembly_error: err.message }).eq('id', video_id)
    return res.status(500).json({ error: err.message })
  }
}

function computeDurations(imageUrls, sections, audioUrl) {
  // Map script sections to durations; pad if more images than sections
  const durations = imageUrls.map((_, i) => {
    const section = sections[i]
    if (section?.duration) return parseDuration(section.duration)
    return 5 // default 5s per scene
  })
  return durations
}

function buildManifest(video) {
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
