/**
 * FFmpeg render engine — the render backbone of ContentOS.
 *
 * Turns a COMPOSITION MANIFEST (see shared contract) into a finished MP4:
 *   - download every scene image + narration audio + background music to os.tmpdir()
 *   - build a per-scene video graph (scale+pad to format, optional ken-burns zoompan)
 *   - cross/fade transitions between scenes, concatenated to one video track
 *   - mix narration + background music (low volume) via amix
 *   - burn captions (SRT subtitles) when present
 *   - encode H.264 yuv420p + AAC MP4
 *
 * Exports (hard contract — integrator imports these names):
 *   renderTimeline(manifest, opts) -> { path, buffer, durationSec, format }
 *   generateSRT(captions)          -> string
 *   generateThumbnail(src, opts)   -> Buffer (JPG)
 *   resolveFfmpeg()                -> string (ffmpeg-static | /usr/local/bin/ffmpeg | 'ffmpeg')
 *
 * Everything runs in os.tmpdir(); temp dirs are always cleaned up, even on error.
 */
import { exec, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createWriteStream } from 'node:fs'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { pipeline as streamPipeline } from 'node:stream/promises'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

// Generous limits — encoding a multi-scene video can take a while and emit a lot of stderr.
const EXEC_OPTS = { timeout: 9 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 }

// Map manifest aspect string -> resolved pixels (mirrors FORMAT_DIMS in the contract).
const FORMAT_DIMS = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '1:1':  { w: 1080, h: 1080 }
}

let _ffmpegPath = null

/**
 * Resolve an ffmpeg binary path. Order: ffmpeg-static export, then a known local
 * static binary, then bare 'ffmpeg' on PATH. Result is memoized.
 * @returns {Promise<string>}
 */
export async function resolveFfmpeg() {
  if (_ffmpegPath) return _ffmpegPath
  // 1) ffmpeg-static — its default export is the absolute path to a bundled binary.
  try {
    const mod = await import('ffmpeg-static')
    const p = mod?.default || mod
    if (p && typeof p === 'string') {
      _ffmpegPath = p
      return _ffmpegPath
    }
  } catch {
    // not installed — fall through
  }
  // 2) Known local static binary (this machine / typical Linux container path).
  for (const candidate of ['/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']) {
    try {
      await execFileAsync(candidate, ['-version'], { timeout: 10000 })
      _ffmpegPath = candidate
      return _ffmpegPath
    } catch {
      // not here — keep looking
    }
  }
  // 3) Bare command on PATH.
  _ffmpegPath = 'ffmpeg'
  return _ffmpegPath
}

// Resolve an ffprobe binary. ffmpeg-static ships ffmpeg ONLY (no ffprobe), so on
// Vercel we rely on ffprobe-static; then a sibling of a local static ffmpeg; then
// bare 'ffprobe' on PATH. Memoized.
let _ffprobePath = null
async function resolveFfprobe(ffmpegPath) {
  if (_ffprobePath) return _ffprobePath
  // 1) ffprobe-static — bundled ffprobe binary (its default export is { path }).
  try {
    const mod = await import('ffprobe-static')
    const p = mod?.default?.path || mod?.path || (typeof mod?.default === 'string' ? mod.default : null)
    if (p) {
      await execFileAsync(p, ['-version'], { timeout: 10000 })
      _ffprobePath = p
      return _ffprobePath
    }
  } catch { /* not installed / not runnable — fall through */ }
  // 2) Sibling of a local static ffmpeg build.
  if (ffmpegPath && ffmpegPath.endsWith('/ffmpeg')) {
    const probe = ffmpegPath.slice(0, -'/ffmpeg'.length) + '/ffprobe'
    try {
      await execFileAsync(probe, ['-version'], { timeout: 10000 })
      _ffprobePath = probe
      return _ffprobePath
    } catch { /* fall through */ }
  }
  // 3) Bare command on PATH.
  _ffprobePath = 'ffprobe'
  return _ffprobePath
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function downloadFile(url, dest) {
  if (!url) throw new Error('downloadFile: missing url')
  // Support data: URLs and file paths transparently.
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',')
    const meta = url.slice(5, comma)
    const data = url.slice(comma + 1)
    const buf = meta.includes('base64') ? Buffer.from(data, 'base64') : Buffer.from(decodeURIComponent(data))
    await writeFile(dest, buf)
    return dest
  }
  if (url.startsWith('/') || url.startsWith('file:')) {
    const src = url.startsWith('file:') ? new URL(url) : url
    const buf = await readFile(src)
    await writeFile(dest, buf)
    return dest
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed for ${url}: ${res.status}`)
  const ws = createWriteStream(dest)
  await streamPipeline(res.body, ws)
  return dest
}

// Pick a file extension from a URL (default .jpg for images, .mp3 for audio).
function extFromUrl(url, fallback) {
  try {
    const clean = String(url).split('?')[0].split('#')[0]
    const m = clean.match(/\.([a-zA-Z0-9]{2,4})$/)
    return m ? `.${m[1].toLowerCase()}` : fallback
  } catch {
    return fallback
  }
}

// Resolve the output pixel dims from the manifest (explicit width/height win).
function resolveDims(manifest) {
  const fmt = manifest.format || '9:16'
  const base = FORMAT_DIMS[fmt] || FORMAT_DIMS['9:16']
  const w = Number(manifest.width) || base.w
  const h = Number(manifest.height) || base.h
  // H.264 yuv420p needs even dimensions.
  return { w: w - (w % 2), h: h - (h % 2), fmt }
}

// ffprobe a media file's duration (seconds); null if unavailable.
async function probeDuration(ffprobe, filePath) {
  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', filePath],
      { timeout: 30000, maxBuffer: 1024 * 1024 }
    )
    const d = parseFloat(String(stdout).trim())
    return Number.isFinite(d) && d > 0 ? d : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// SRT
// ---------------------------------------------------------------------------

function srtTime(sec) {
  const s = Math.max(0, Number(sec) || 0)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  const ms = Math.round((s - Math.floor(s)) * 1000)
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  return `${pad(hh)}:${pad(mm)}:${pad(ss)},${pad(ms, 3)}`
}

/**
 * Produce a valid SRT document from caption cues.
 * @param {Array<{text:string,start:number,end:number}>} captions
 * @returns {string}
 */
export function generateSRT(captions = []) {
  if (!Array.isArray(captions) || captions.length === 0) return ''
  const cues = captions
    .filter((c) => c && c.text != null)
    .map((c, i) => {
      const start = Number(c.start) || 0
      let end = Number(c.end)
      if (!Number.isFinite(end) || end <= start) end = start + 2 // sane fallback
      return { idx: i + 1, start, end, text: String(c.text).trim() }
    })
  return cues
    .map((c) => `${c.idx}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join('\n')
}

// Escape a filesystem path for use inside an ffmpeg filter argument
// (the subtitles= filter is picky about ':' and '\' and '[' etc).
function escapeFilterPath(p) {
  return p
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
}

// ---------------------------------------------------------------------------
// filter graph
// ---------------------------------------------------------------------------

/**
 * Build the per-scene video filter chain for one input image.
 * Produces a normalized clip of exactly `frames` frames at WxH, optionally
 * with a slow ken-burns zoom (zoompan). Returns the filter string ending at
 * label [vN].
 */
function sceneVideoFilter(i, dims, frames, motion, fps) {
  const { w, h } = dims
  // Upscale source so zoompan has headroom and pad never shows letterbox seams.
  const pre =
    `[${i}:v]` +
    `scale=${w}:${h}:force_original_aspect_ratio=increase,` +
    `crop=${w}:${h},setsar=1`

  if (motion === 'kenburns') {
    // Gentle zoom from 1.0 -> ~1.12 across the scene. d = total frames.
    const zoom = `zoompan=z='min(zoom+0.0008,1.12)':d=${frames}:s=${w}x${h}:fps=${fps}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
    return `${pre},${zoom},format=yuv420p,setsar=1[v${i}]`
  }
  // Static: hold the frame for the scene's duration.
  return `${pre},loop=loop=${frames}:size=1:start=0,fps=${fps},trim=end_frame=${frames},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[v${i}]`
}

// ---------------------------------------------------------------------------
// renderTimeline
// ---------------------------------------------------------------------------

/**
 * Render a composition manifest to an MP4.
 * @param {object} manifest - see COMPOSITION MANIFEST contract.
 * @param {object} [opts]   - { crf?, preset?, keepTemp?, fps? }
 * @returns {Promise<{ path:string, buffer:Buffer, durationSec:number, format:string }>}
 */
export async function renderTimeline(manifest, opts = {}) {
  if (!manifest || !Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
    throw new Error('renderTimeline: manifest.scenes is required and must be non-empty')
  }

  const ffmpeg = await resolveFfmpeg()
  const ffprobe = await resolveFfprobe(ffmpeg)
  const dims = resolveDims(manifest)
  const fps = Number(manifest.fps) || Number(opts.fps) || 30
  const crf = opts.crf ?? 20
  const preset = opts.preset || 'medium'

  const workDir = join(tmpdir(), `contentos_render_${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  try {
    // --- 1. Download all scene images (+ audio/music) in parallel ---
    const scenes = manifest.scenes
    const imagePaths = scenes.map((s, i) =>
      join(workDir, `scene_${String(i).padStart(3, '0')}${extFromUrl(s.image_url, '.jpg')}`)
    )

    const audioUrl = manifest.audio?.url
    const musicUrl = manifest.music?.url
    const audioPath = audioUrl ? join(workDir, `narration${extFromUrl(audioUrl, '.mp3')}`) : null
    const musicPath = musicUrl ? join(workDir, `music${extFromUrl(musicUrl, '.mp3')}`) : null

    const downloads = [
      ...scenes.map((s, i) => downloadFile(s.image_url, imagePaths[i]))
    ]
    if (audioPath) downloads.push(downloadFile(audioUrl, audioPath))
    if (musicPath) downloads.push(downloadFile(musicUrl, musicPath))
    await Promise.all(downloads)

    // --- 2. Per-scene durations (manifest is the source of truth) ---
    // Prefer explicit `duration`; else derive from consecutive `start` values;
    // else fall back to 4s. Total may be re-anchored to narration length below.
    const durations = scenes.map((s, i) => {
      if (Number(s.duration) > 0) return Number(s.duration)
      const next = scenes[i + 1]
      if (next && Number(next.start) > Number(s.start)) return Number(next.start) - Number(s.start)
      return 4
    })

    // Transitions first — xfade overlaps shrink the timeline by XFADE per fade
    // boundary, so we must account for that when stretching to narration length.
    const transition = scenes.map((s) => (s.transition === 'fade' ? 'fade' : 'cut'))
    const XFADE = 0.5 // seconds of cross-fade overlap when transition === 'fade'
    const fadeCount = transition.slice(1).filter((t) => t === 'fade').length

    // If narration is present, stretch the last scene so the POST-fade video
    // covers the full narration (avoids audio cut-off). Target a pre-fade total of
    // narrationDur + fadeCount*XFADE so that, after the overlaps, length == narration.
    let narrationDur = null
    if (audioPath) narrationDur = await probeDuration(ffprobe, audioPath)
    const scenesTotal = durations.reduce((a, b) => a + b, 0)
    const targetPreFade = narrationDur != null ? narrationDur + fadeCount * XFADE : 0
    if (narrationDur && targetPreFade > scenesTotal + 0.1) {
      durations[durations.length - 1] += targetPreFade - scenesTotal
    }

    // --- 3. Build the filter_complex graph ---
    const inputArgs = []
    for (const p of imagePaths) inputArgs.push('-loop', '1', '-t', '3600', '-i', p)

    const audioInputIndexes = {}
    let inputCursor = imagePaths.length
    if (audioPath) {
      inputArgs.push('-i', audioPath)
      audioInputIndexes.narration = inputCursor++
    }
    if (musicPath) {
      // Loop-extend the music at the demuxer so short tracks fill the whole
      // narration; amix duration=first (or the final -t) trims it back down.
      inputArgs.push('-stream_loop', '-1', '-i', musicPath)
      audioInputIndexes.music = inputCursor++
    }

    const filters = []

    // Each scene -> normalized clip [vN].
    scenes.forEach((s, i) => {
      const frames = Math.max(1, Math.round(durations[i] * fps))
      const motion = s.motion === 'kenburns' ? 'kenburns' : 'none'
      filters.push(sceneVideoFilter(i, dims, frames, motion, fps))
    })

    // Concatenate scenes — with xfade where a scene declares transition:'fade'.
    let lastLabel
    if (scenes.length === 1) {
      lastLabel = '[v0]'
    } else {
      // Chain xfade/concat pairwise. xfade overlaps clips, so total shrinks by
      // XFADE per fade boundary; we account for that in the final duration.
      let acc = '[v0]'
      let offset = durations[0]
      for (let i = 1; i < scenes.length; i++) {
        const out = `[vc${i}]`
        if (transition[i] === 'fade') {
          const off = Math.max(0, offset - XFADE)
          filters.push(`${acc}[v${i}]xfade=transition=fade:duration=${XFADE}:offset=${off}${out}`)
          offset = off + durations[i]
        } else {
          filters.push(`${acc}[v${i}]concat=n=2:v=1:a=0${out}`)
          offset = offset + durations[i]
        }
        acc = out
      }
      lastLabel = acc
    }

    // --- 4. Captions (burn-in via SRT subtitles filter) ---
    let videoOutLabel = lastLabel
    if (Array.isArray(manifest.captions) && manifest.captions.length > 0) {
      const srt = generateSRT(manifest.captions)
      const srtPath = join(workDir, 'captions.srt')
      await writeFile(srtPath, srt, 'utf8')
      const styled =
        `subtitles='${escapeFilterPath(srtPath)}':force_style='` +
        `FontSize=${Math.round(dims.h * 0.028)},` +
        'PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,' +
        "Outline=2,Shadow=1,Alignment=2,MarginV=80'"
      filters.push(`${videoOutLabel}${styled}[vout]`)
      videoOutLabel = '[vout]'
    }

    // --- 5. Audio mix (narration + low-volume background music via amix) ---
    let audioOutLabel = null
    if (audioPath && musicPath) {
      const narrVol = manifest.audio?.volume ?? 1.0
      const musicVol = manifest.music?.volume ?? 0.15
      filters.push(`[${audioInputIndexes.narration}:a]volume=${narrVol},aresample=44100[narr]`)
      filters.push(`[${audioInputIndexes.music}:a]volume=${musicVol},aresample=44100[bg]`)
      // Music was loop-extended at the demuxer (-stream_loop -1); amix
      // duration=first trims it to narration length. dropout_transition avoids
      // volume pumping when one track ends.
      filters.push('[narr][bg]amix=inputs=2:duration=first:dropout_transition=2,dynaudnorm[aout]')
      audioOutLabel = '[aout]'
    } else if (audioPath) {
      const narrVol = manifest.audio?.volume ?? 1.0
      filters.push(`[${audioInputIndexes.narration}:a]volume=${narrVol},aresample=44100[aout]`)
      audioOutLabel = '[aout]'
    } else if (musicPath) {
      const musicVol = manifest.music?.volume ?? 0.15
      filters.push(`[${audioInputIndexes.music}:a]volume=${musicVol},aresample=44100[aout]`)
      audioOutLabel = '[aout]'
    }

    // Total video duration: sum of scenes minus xfade overlaps (== narrationDur
    // when we stretched the last scene above).
    const durationSec = Math.max(0.1, durations.reduce((a, b) => a + b, 0) - fadeCount * XFADE)

    const outputPath = join(workDir, 'final.mp4')

    // --- 6. Assemble + run ffmpeg ---
    const args = [
      '-y',
      ...inputArgs,
      '-filter_complex', filters.join(';'),
      '-map', videoOutLabel
    ]
    if (audioOutLabel) args.push('-map', audioOutLabel)

    args.push(
      '-c:v', 'libx264',
      '-preset', preset,
      '-crf', String(crf),
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-movflags', '+faststart'
    )
    if (audioOutLabel) {
      args.push('-c:a', 'aac', '-b:a', '192k', '-ar', '44100')
    }
    // Pin the output duration so trailing looped images/music don't overrun.
    args.push('-t', durationSec.toFixed(3), outputPath)

    await execFileAsync(ffmpeg, args, EXEC_OPTS)

    const buffer = await readFile(outputPath)
    return {
      path: outputPath,
      buffer,
      durationSec,
      format: dims.fmt
    }
  } catch (err) {
    // Surface ffmpeg stderr when present — it's the actionable part.
    const detail = err?.stderr ? `\n${String(err.stderr).slice(-2000)}` : ''
    throw new Error(`renderTimeline failed: ${err.message}${detail}`)
  } finally {
    if (!opts.keepTemp) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

// ---------------------------------------------------------------------------
// generateThumbnail
// ---------------------------------------------------------------------------

/**
 * Produce a JPG thumbnail Buffer at the target format dimensions.
 * `src` may be an image URL / data URL / local path, or a local video file
 * (a frame is extracted at opts.atSec, default 1s).
 * @param {string} src
 * @param {object} [opts] - { format?, width?, height?, atSec?, quality? }
 * @returns {Promise<Buffer>}
 */
export async function generateThumbnail(src, opts = {}) {
  if (!src) throw new Error('generateThumbnail: src is required')
  const ffmpeg = await resolveFfmpeg()

  const fmt = opts.format || '9:16'
  const base = FORMAT_DIMS[fmt] || FORMAT_DIMS['9:16']
  const w = (Number(opts.width) || base.w)
  const h = (Number(opts.height) || base.h)
  const W = w - (w % 2)
  const H = h - (h % 2)
  const q = opts.quality ?? 3 // ffmpeg -q:v 2..5 is high quality

  const workDir = join(tmpdir(), `contentos_thumb_${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  try {
    const isVideo = /\.(mp4|mov|webm|mkv|m4v)$/i.test(String(src).split('?')[0])
    const inPath = join(workDir, `src${isVideo ? '.mp4' : extFromUrl(src, '.jpg')}`)
    await downloadFile(src, inPath)

    const outPath = join(workDir, 'thumb.jpg')
    const vf =
      `scale=${W}:${H}:force_original_aspect_ratio=increase,` +
      `crop=${W}:${H},setsar=1`

    const args = ['-y']
    if (isVideo) args.push('-ss', String(opts.atSec ?? 1))
    args.push('-i', inPath, '-frames:v', '1', '-vf', vf, '-q:v', String(q), outPath)

    await execFileAsync(ffmpeg, args, { ...EXEC_OPTS, timeout: 60000 })
    return await readFile(outPath)
  } catch (err) {
    const detail = err?.stderr ? `\n${String(err.stderr).slice(-1000)}` : ''
    throw new Error(`generateThumbnail failed: ${err.message}${detail}`)
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

export { FORMAT_DIMS }
