/**
 * Composition Engine (#16) — HyperFrames.
 *
 * THE composition framework for ContentOS v2.0. Takes a Story/ScenePlan (or a
 * loose script) and produces a HyperFrames HTML composition + a structured
 * COMPOSITION_MANIFEST contract the Rendering Engine (FFmpeg) consumes.
 *
 * Responsibilities: timeline, scene sequencing, animations, captions, motion,
 * camera movement, layering, text animation, transitions.
 *
 * (Replaces the former OpenMontage bridge — OpenMontage is removed from the
 * architecture; the platform owns the composition layer itself.)
 */
import { defineEngine } from '../_base.js'

const COMPOSITION_TEMPLATE = {
  id: 'contentos-composition',
  name: 'ContentOS Video',
  duration: 30,
  width: 1080,
  height: 1920,
  backgroundColor: '#0f172a',
  clips: []
}

/** Estimate duration (seconds) from script word count at ~2.5 words/sec + intro/outro. */
function estimateDuration(text = '') {
  const words = String(text).split(/\s+/).filter(Boolean).length
  return Math.ceil(words / 2.5) + 2
}

/** Build the clip timeline from a {hook, body[], cta} script. */
function buildClips(script, options = {}) {
  const clips = []
  let t = 0
  const { primaryColor = '#06b6d4', fontFamily = 'Inter', brandName = 'ContentOS' } = options

  clips.push({ id: 'intro', type: 'text', start: 0, duration: 2, track: 0, content: brandName,
    style: { fontSize: 72, fontWeight: 'bold', color: primaryColor, fontFamily, textAlign: 'center' } })
  t = 2

  if (script.hook) {
    clips.push({ id: 'hook', type: 'text', start: t, duration: 3, track: 0, content: script.hook,
      style: { fontSize: 48, fontWeight: 'bold', color: '#ffffff', fontFamily, textAlign: 'center' } })
    t += 3
  }
  if (Array.isArray(script.body)) {
    script.body.forEach((point, i) => {
      clips.push({ id: `body-${i}`, type: 'text', start: t, duration: 4, track: 0, content: point,
        style: { fontSize: 42, fontWeight: '500', color: '#ffffff', fontFamily, textAlign: 'center' } })
      t += 4
    })
  }
  if (script.cta) {
    clips.push({ id: 'cta', type: 'text', start: t, duration: 3, track: 0, content: script.cta,
      style: { fontSize: 48, fontWeight: 'bold', color: primaryColor, fontFamily, textAlign: 'center' } })
    t += 3
  }
  return clips
}

/** Build the HyperFrames composition object from a script. */
export function createComposition(script, options = {}) {
  const { brandName = 'ContentOS' } = options
  return {
    ...COMPOSITION_TEMPLATE,
    name: `${brandName} - ${(script.hook || 'Video').toString().substring(0, 30)}`,
    duration: estimateDuration(script.fullScript || [script.hook, ...(script.body || []), script.cta].filter(Boolean).join(' ')),
    clips: buildClips(script, options)
  }
}

/** Format → pixel dims. */
function dimsFor(format) {
  if (format === '16:9') return { width: 1920, height: 1080 }
  if (format === '1:1') return { width: 1080, height: 1080 }
  return { width: 1080, height: 1920 } // 9:16 default
}

/**
 * Build a composition from an ENRICHED scene_plan (scenes carry image_url/audio_url
 * from the Media Loop). Each scene becomes an image layer (track 0) + caption text
 * overlay (track 1); per-scene audio is collected into the manifest audio track.
 */
export function createCompositionFromScenes(plan, options = {}) {
  const { brandName = 'ContentOS', primaryColor = '#06b6d4', fontFamily = 'Inter' } = options
  const { width, height } = dimsFor(plan.format)
  const scenes = Array.isArray(plan.scenes) ? plan.scenes : []
  const clips = []
  const audio = []
  const captions = []
  let t = 0

  scenes.forEach((s, i) => {
    const dur = Number(s.duration) || 4
    // Prefer a motion clip (Media Loop video) over the still when present.
    if (s.video_url) {
      clips.push({ id: `vid-${i}`, type: 'video', start: t, duration: dur, track: 0, src: s.video_url,
        poster: s.image_url || null, transition: (s.effects || [])[0] || 'cut' })
    } else if (s.image_url) {
      clips.push({ id: `img-${i}`, type: 'image', start: t, duration: dur, track: 0, src: s.image_url,
        motion: s.motion || 'none', transition: (s.effects || [])[0] || 'cut' })
    }
    const text = s.voice?.text || ''
    if (text) {
      clips.push({ id: `cap-${i}`, type: 'text', start: t, duration: dur, track: 1, content: text,
        style: { fontSize: 42, fontWeight: '600', color: '#ffffff', fontFamily, textAlign: 'center' } })
      captions.push({ text, start: t, end: t + dur })
    }
    if (s.audio_url) audio.push({ url: s.audio_url, start: t, duration: dur })
    t += dur
  })

  return {
    ...COMPOSITION_TEMPLATE,
    name: `${brandName} - scene plan (${scenes.length} scenes)`,
    width, height, duration: t, clips,
    _audio: audio, _captions: captions, _sceneBacked: true,
    _primaryColor: primaryColor
  }
}

/** Render the composition object to HyperFrames HTML. */
export function generateHyperFramesHTML(comp) {
  const clipsHTML = (comp.clips || []).map((clip) => {
    if (clip.type === 'video' && clip.src) {
      return `
    <div class="clip" data-start="${clip.start}" data-duration="${clip.duration}" data-track-index="${clip.track || 0}">
      <video src="${clip.src}"${clip.poster ? ` poster="${clip.poster}"` : ''} muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>
    </div>`
    }
    if (clip.type === 'image' && clip.src) {
      return `
    <div class="clip" data-start="${clip.start}" data-duration="${clip.duration}" data-track-index="${clip.track || 0}">
      <img src="${clip.src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />
    </div>`
    }
    return `
    <div class="clip" data-start="${clip.start}" data-duration="${clip.duration}" data-track-index="${clip.track || 0}">
      <div style="position:absolute;bottom:12%;left:50%;transform:translateX(-50%);font-size:${clip.style.fontSize}px;font-weight:${clip.style.fontWeight};color:${clip.style.color};font-family:${clip.style.fontFamily};text-align:${clip.style.textAlign};padding:20px;max-width:90%;text-shadow:0 2px 8px rgba(0,0,0,.6);">${clip.content}</div>
    </div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${comp.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body class="bg-slate-950">
  <div id="composition" class="composition" data-id="${comp.id}" data-duration="${comp.duration}"
       style="width:${comp.width}px;height:${comp.height}px;background:${comp.backgroundColor};">
    ${clipsHTML}
  </div>
  <script>
    window.__timelines = window.__timelines || {}
    window.__timelines["${comp.id}"] = gsap.timeline({ paused: true })
  </script>
</body>
</html>`
}

/** Map a HyperFrames composition object → COMPOSITION_MANIFEST contract. */
export function toManifest(comp) {
  // For scene-backed comps, expose image scenes (so the ffmpeg renderer gets
  // image_url + duration per scene) + the collected audio/captions.
  const scenes = comp._sceneBacked
    ? (comp.clips || []).filter((c) => c.type === 'image' || c.type === 'video').map((c) => ({
        id: c.id, start: c.start, duration: c.duration,
        ...(c.type === 'video' ? { video_url: c.src, image_url: c.poster || null } : { image_url: c.src }),
        motion: c.motion, transition: c.transition
      }))
    : (comp.clips || []).map((c) => ({ id: c.id, start: c.start, duration: c.duration, type: c.type, content: c.content, style: c.style }))

  return {
    format: comp.width >= comp.height ? (comp.width === comp.height ? '1:1' : '16:9') : '9:16',
    width: comp.width,
    height: comp.height,
    fps: 30,
    duration: comp.duration,
    scenes,
    audio: comp._audio?.length ? { tracks: comp._audio } : {},
    captions: comp._captions || []
  }
}

/**
 * Composition Engine — engine-interface entry point.
 * input: { script | story, options? }  →  output: { composition, html, manifest, duration }
 */
export default defineEngine({
  id: 'composition',
  name: 'Composition Engine (HyperFrames)',
  responsibility: 'Sequence a story/scene-plan into a HyperFrames timeline + render manifest.',
  status: 'live',
  inputs: ['story', 'scene_plan'],
  outputs: ['composition_manifest'],
  run: async (input = {}) => {
    const options = input.options || {}
    // Prefer an enriched scene_plan (image-backed scenes from the Media Loop);
    // fall back to the text-only script/story path.
    const plan = input.scene_plan || (Array.isArray(input.scenes) ? { scenes: input.scenes, format: input.format } : null)
    const composition = (plan && Array.isArray(plan.scenes) && plan.scenes.length)
      ? createCompositionFromScenes(plan, options)
      : createComposition(input.script || input.story || {}, options)
    const html = generateHyperFramesHTML(composition)
    return { composition, html, manifest: toManifest(composition), duration: composition.duration }
  }
})