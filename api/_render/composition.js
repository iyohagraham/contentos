/**
 * Composition / timeline layer — OpenMontage-compatible.
 *
 * buildManifest() takes the loose asset bag a Media Agent produces
 * (scene image URLs, narration + music tracks, optional captions, branding,
 * a target aspect ratio) and resolves it into a fully-specified
 * COMPOSITION MANIFEST — the stable contract consumed by ffmpeg.js
 * (renderTimeline) and by the OpenMontage worker.
 *
 * "Resolved" means: pixel width/height/fps are concrete numbers, every scene
 * has an absolute `start` time on the timeline (derived sequentially from its
 * `duration`), and audio/music volumes carry sane defaults. The renderer should
 * never have to guess.
 *
 * Contract (stable):
 *   buildManifest({ scenes, audioUrl, musicUrl, captions, branding, format }) -> manifest
 *   FORMAT_DIMS (exported const)
 *   deriveCaptionsFromScenes(scenes, opts) -> [{ text, start, end }]
 */

/**
 * Aspect-ratio -> pixel dimensions. These are the canonical render sizes used
 * across the engine (vertical social, landscape, square).
 */
export const FORMAT_DIMS = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '1:1':  { w: 1080, h: 1080 }
}

const DEFAULT_FORMAT = '9:16'
const DEFAULT_FPS = 30
const DEFAULT_SCENE_DURATION = 5      // seconds, when a scene omits its own
const DEFAULT_MUSIC_VOLUME = 0.15     // background music sits well under narration
const DEFAULT_AUDIO_VOLUME = 1
const VALID_MOTIONS = new Set(['kenburns', 'none'])
const VALID_TRANSITIONS = new Set(['fade', 'cut'])

/**
 * Coerce a duration-ish value (number, "5", "5s", "5.5 s") to seconds.
 * Returns null when it cannot be parsed so callers can decide on a fallback.
 */
function coerceDuration(value) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null
  if (typeof value === 'string') {
    const m = value.match(/(\d+\.?\d*)/)
    if (m) {
      const n = parseFloat(m[1])
      return Number.isFinite(n) && n > 0 ? n : null
    }
  }
  return null
}

/**
 * Pull a usable image URL off a scene object, tolerating the several field
 * names that flow through the pipeline (image_url is canonical; url / imageURL
 * appear on raw provider results).
 */
function pickImageUrl(scene) {
  if (typeof scene === 'string') return scene
  return scene.image_url || scene.url || scene.imageURL || scene.imageUrl || null
}

/**
 * Pull narration text off a scene, tolerating the field-name drift between the
 * script model (`script`), the scene builder (`narration`) and ad-hoc callers.
 */
function pickNarration(scene) {
  if (!scene || typeof scene === 'string') return ''
  const n = scene.narration ?? scene.text ?? scene.script ?? scene.caption ?? ''
  return typeof n === 'string' ? n.trim() : ''
}

/**
 * Resolve format -> { format, width, height }. Accepts an explicit format key
 * or falls back to the default. Throws on an unrecognised format so a typo
 * surfaces immediately rather than silently rendering the wrong shape.
 */
function resolveFormat(format) {
  const fmt = format || DEFAULT_FORMAT
  const dims = FORMAT_DIMS[fmt]
  if (!dims) {
    throw new Error(
      `buildManifest: unsupported format "${format}". Expected one of ${Object.keys(FORMAT_DIMS).join(', ')}`
    )
  }
  return { format: fmt, width: dims.w, height: dims.h }
}

/**
 * Normalize + validate a single scene into manifest form.
 * Assigns the absolute `start` from the running cursor; the caller advances
 * the cursor by the returned `duration`.
 *
 * @throws if the scene has no image URL or a non-positive duration.
 */
function resolveScene(rawScene, index, cursor) {
  if (rawScene == null) {
    throw new Error(`buildManifest: scenes[${index}] is null/undefined`)
  }

  const image_url = pickImageUrl(rawScene)
  if (!image_url || typeof image_url !== 'string') {
    throw new Error(`buildManifest: scenes[${index}] is missing a valid image_url`)
  }

  // An *absent* duration defaults; a *provided but invalid* one is malformed
  // and must throw rather than silently masquerade as the default.
  const rawDuration = typeof rawScene === 'string' ? undefined : rawScene.duration
  let duration
  if (rawDuration == null || rawDuration === '') {
    duration = DEFAULT_SCENE_DURATION
  } else {
    duration = coerceDuration(rawDuration)
    if (duration == null) {
      throw new Error(
        `buildManifest: scenes[${index}] has an invalid duration (${JSON.stringify(rawDuration)}); expected a positive number of seconds`
      )
    }
  }

  const rawMotion = typeof rawScene === 'string' ? null : rawScene.motion
  const motion = VALID_MOTIONS.has(rawMotion) ? rawMotion : 'kenburns'

  const rawTransition = typeof rawScene === 'string' ? null : rawScene.transition
  const transition = VALID_TRANSITIONS.has(rawTransition) ? rawTransition : 'fade'

  return {
    image_url,
    start: round3(cursor),
    duration: round3(duration),
    motion,
    transition
  }
}

/** Round to 3 decimals to keep frame math clean and JSON tidy. */
function round3(n) {
  return Math.round(n * 1000) / 1000
}

/** Clamp a volume into [0, 1], falling back to `fallback` when not a number. */
function clampVolume(value, fallback) {
  const v = Number(value)
  if (!Number.isFinite(v)) return fallback
  return Math.max(0, Math.min(1, v))
}

/**
 * Derive timed caption cues from scenes that carry narration text + durations.
 *
 * Used to auto-caption when explicit captions aren't supplied. Each scene
 * becomes one cue spanning its time on the timeline. Long narration is split
 * into multiple cues within the scene's window (proportional to character
 * count) so captions don't dump a wall of text on a single frame.
 *
 * @param {Array} scenes  raw scenes (may carry narration/text/script + duration)
 * @param {object} [opts]
 * @param {number} [opts.maxCharsPerCue=90]  soft cap before a scene is split
 * @param {number} [opts.startOffset=0]      timeline offset of the first scene
 * @returns {Array<{text:string,start:number,end:number}>}
 */
export function deriveCaptionsFromScenes(scenes, opts = {}) {
  if (!Array.isArray(scenes)) return []
  const maxCharsPerCue = opts.maxCharsPerCue || 90
  const cues = []
  let cursor = Number(opts.startOffset) || 0

  for (const scene of scenes) {
    const duration = coerceDuration(typeof scene === 'string' ? null : scene?.duration) ?? DEFAULT_SCENE_DURATION
    const start = cursor
    const end = cursor + duration
    cursor = end

    const text = pickNarration(scene)
    if (!text) continue

    if (text.length <= maxCharsPerCue) {
      cues.push({ text, start: round3(start), end: round3(end) })
      continue
    }

    // Split long narration into balanced chunks across the scene's window.
    const chunks = chunkText(text, maxCharsPerCue)
    const totalChars = chunks.reduce((a, c) => a + c.length, 0) || 1
    let sub = start
    for (let i = 0; i < chunks.length; i++) {
      const share = (chunks[i].length / totalChars) * duration
      const cueEnd = i === chunks.length - 1 ? end : sub + share
      cues.push({ text: chunks[i], start: round3(sub), end: round3(cueEnd) })
      sub = cueEnd
    }
  }

  return cues
}

/**
 * Split text into chunks no longer than `maxChars`, breaking on word
 * boundaries so words are never cut mid-token.
 */
function chunkText(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
    } else if ((current.length + 1 + word.length) <= maxChars) {
      current += ' ' + word
    } else {
      chunks.push(current)
      current = word
    }
  }
  if (current) chunks.push(current)
  return chunks.length ? chunks : [text]
}

/**
 * Validate + normalize externally-supplied caption cues into manifest form.
 * Drops empties; throws on structurally malformed cues so bad timing data
 * doesn't reach the renderer.
 */
function resolveCaptions(captions) {
  if (captions == null) return null
  if (!Array.isArray(captions)) {
    throw new Error('buildManifest: captions must be an array of { text, start, end }')
  }
  const out = []
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i]
    if (c == null) continue
    const text = typeof c.text === 'string' ? c.text.trim() : ''
    if (!text) continue
    const start = Number(c.start)
    const end = Number(c.end)
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`buildManifest: captions[${i}] has non-numeric start/end`)
    }
    if (end <= start) {
      throw new Error(`buildManifest: captions[${i}] end (${end}) must be greater than start (${start})`)
    }
    out.push({ text, start: round3(start), end: round3(end) })
  }
  return out.length ? out : null
}

/**
 * Normalize a branding bag, keeping only the known optional asset URLs.
 * Returns null when nothing usable is present.
 */
function resolveBranding(branding) {
  if (!branding || typeof branding !== 'object') return null
  const out = {}
  if (typeof branding.watermark_url === 'string' && branding.watermark_url) out.watermark_url = branding.watermark_url
  if (typeof branding.intro_url === 'string' && branding.intro_url) out.intro_url = branding.intro_url
  if (typeof branding.outro_url === 'string' && branding.outro_url) out.outro_url = branding.outro_url
  return Object.keys(out).length ? out : null
}

/**
 * Build a fully-resolved composition manifest.
 *
 * @param {object} args
 * @param {Array}  args.scenes      required, non-empty. Each: string URL or
 *                                  { image_url, duration?, motion?, transition?, narration? }
 * @param {string} [args.audioUrl]  narration track URL
 * @param {string} [args.musicUrl]  background music track URL
 * @param {Array}  [args.captions]  explicit cues [{ text, start, end }]; when
 *                                  omitted, auto-derived from scene narration
 * @param {object} [args.branding]  { watermark_url?, intro_url?, outro_url? }
 * @param {string} [args.format]    "9:16" | "16:9" | "1:1" (default "9:16")
 * @param {number} [args.fps]       frames per second (default 30)
 * @param {number} [args.audioVolume]  0..1 (default 1)
 * @param {number} [args.musicVolume]  0..1 (default 0.15)
 * @returns {object} the COMPOSITION MANIFEST
 * @throws {Error} on malformed scenes / unsupported format
 */
export function buildManifest({
  scenes,
  audioUrl,
  musicUrl,
  captions,
  branding,
  format,
  fps,
  audioVolume,
  musicVolume
} = {}) {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('buildManifest: scenes must be a non-empty array')
  }

  const { format: resolvedFormat, width, height } = resolveFormat(format)

  const resolvedFps = Number.isFinite(Number(fps)) && Number(fps) > 0
    ? Math.round(Number(fps))
    : DEFAULT_FPS

  // Assign sequential start times from each scene's duration.
  const resolvedScenes = []
  let cursor = 0
  for (let i = 0; i < scenes.length; i++) {
    const scene = resolveScene(scenes[i], i, cursor)
    resolvedScenes.push(scene)
    cursor = round3(cursor + scene.duration)
  }
  const totalDuration = cursor

  // Captions: explicit cues take priority; otherwise auto-derive from narration.
  let resolvedCaptions = resolveCaptions(captions)
  if (!resolvedCaptions) {
    const derived = deriveCaptionsFromScenes(scenes)
    resolvedCaptions = derived.length ? derived : null
  }

  const manifest = {
    format: resolvedFormat,
    width,
    height,
    fps: resolvedFps,
    duration: totalDuration,
    scenes: resolvedScenes
  }

  if (typeof audioUrl === 'string' && audioUrl) {
    manifest.audio = { url: audioUrl, volume: clampVolume(audioVolume, DEFAULT_AUDIO_VOLUME) }
  }
  if (typeof musicUrl === 'string' && musicUrl) {
    manifest.music = { url: musicUrl, volume: clampVolume(musicVolume, DEFAULT_MUSIC_VOLUME) }
  }
  if (resolvedCaptions) manifest.captions = resolvedCaptions

  const resolvedBranding = resolveBranding(branding)
  if (resolvedBranding) manifest.branding = resolvedBranding

  return manifest
}
