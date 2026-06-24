/**
 * Format presets + cross-aspect re-export for ContentOS.
 *
 * One source render (usually 9:16) can be re-letterboxed into the other
 * platform aspects for multi-platform publishing:
 *   - 9:16  vertical shorts (TikTok / Reels / Shorts)
 *   - 16:9  horizontal (YouTube)
 *   - 1:1   square (feed / social)
 *
 * Exports (hard contract):
 *   FORMAT_PRESETS                       — per-aspect dims + scale/pad filter
 *   exportFormat(inputPath, format, opts)-> { path, buffer, format, width, height }
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { resolveFfmpeg, FORMAT_DIMS } from './ffmpeg.js'

const execFileAsync = promisify(execFile)
const EXEC_OPTS = { timeout: 9 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 }

/**
 * Per-aspect presets. `scalePad` letterboxes (fits the whole frame, pads with
 * black bars — no cropping, safe for re-export of an existing video). `scaleCrop`
 * fills the frame and crops the overflow (no bars, used when filling is preferred).
 */
export const FORMAT_PRESETS = {
  '9:16': {
    label: 'Vertical (Shorts / Reels / TikTok)',
    width: FORMAT_DIMS['9:16'].w,   // 1080
    height: FORMAT_DIMS['9:16'].h,  // 1920
    aspect: '9:16',
    scalePad:
      'scale=1080:1920:force_original_aspect_ratio=decrease,' +
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
    scaleCrop:
      'scale=1080:1920:force_original_aspect_ratio=increase,' +
      'crop=1080:1920,setsar=1'
  },
  '16:9': {
    label: 'Horizontal (YouTube)',
    width: FORMAT_DIMS['16:9'].w,   // 1920
    height: FORMAT_DIMS['16:9'].h,  // 1080
    aspect: '16:9',
    scalePad:
      'scale=1920:1080:force_original_aspect_ratio=decrease,' +
      'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
    scaleCrop:
      'scale=1920:1080:force_original_aspect_ratio=increase,' +
      'crop=1920:1080,setsar=1'
  },
  '1:1': {
    label: 'Square (Feed / Social)',
    width: FORMAT_DIMS['1:1'].w,    // 1080
    height: FORMAT_DIMS['1:1'].h,   // 1080
    aspect: '1:1',
    scalePad:
      'scale=1080:1080:force_original_aspect_ratio=decrease,' +
      'pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1',
    scaleCrop:
      'scale=1080:1080:force_original_aspect_ratio=increase,' +
      'crop=1080:1080,setsar=1'
  }
}

/**
 * Re-render an existing MP4 into another aspect ratio.
 * Default mode 'pad' letterboxes (lossless framing, black bars); mode 'crop'
 * fills and crops. Audio is copied through (re-encoded to AAC) unchanged.
 *
 * @param {string} inputPath - absolute path to a local MP4.
 * @param {'9:16'|'16:9'|'1:1'} format
 * @param {object} [opts] - { mode?: 'pad'|'crop', crf?, preset?, keepTemp? }
 * @returns {Promise<{ path:string, buffer:Buffer, format:string, width:number, height:number }>}
 */
export async function exportFormat(inputPath, format, opts = {}) {
  const preset = FORMAT_PRESETS[format]
  if (!preset) {
    throw new Error(`exportFormat: unknown format '${format}' (expected 9:16 | 16:9 | 1:1)`)
  }
  if (!inputPath) throw new Error('exportFormat: inputPath is required')

  const ffmpeg = await resolveFfmpeg()
  const mode = opts.mode === 'crop' ? 'crop' : 'pad'
  const vf = mode === 'crop' ? preset.scaleCrop : preset.scalePad
  const crf = opts.crf ?? 20
  const encPreset = opts.preset || 'medium'

  const workDir = join(tmpdir(), `contentos_export_${randomUUID()}`)
  await mkdir(workDir, { recursive: true })
  const outputPath = join(workDir, `export_${format.replace(':', 'x')}.mp4`)

  try {
    const args = [
      '-y',
      '-i', inputPath,
      '-vf', vf,
      '-c:v', 'libx264',
      '-preset', encPreset,
      '-crf', String(crf),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      // Re-encode audio to be safe across source codecs; pass through if absent.
      '-c:a', 'aac',
      '-b:a', '192k',
      outputPath
    ]
    await execFileAsync(ffmpeg, args, EXEC_OPTS)
    const buffer = await readFile(outputPath)
    return {
      path: outputPath,
      buffer,
      format,
      width: preset.width,
      height: preset.height
    }
  } catch (err) {
    const detail = err?.stderr ? `\n${String(err.stderr).slice(-2000)}` : ''
    throw new Error(`exportFormat failed: ${err.message}${detail}`)
  } finally {
    if (!opts.keepTemp) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}
