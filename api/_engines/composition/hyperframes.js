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

/** Render the composition object to HyperFrames HTML. */
export function generateHyperFramesHTML(comp) {
  const clipsHTML = (comp.clips || []).map((clip) => `
    <div class="clip"
         data-start="${clip.start}"
         data-duration="${clip.duration}"
         data-track-index="${clip.track || 0}"
         data-composition-src="">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:${clip.style.fontSize}px;font-weight:${clip.style.fontWeight};color:${clip.style.color};font-family:${clip.style.fontFamily};text-align:${clip.style.textAlign};padding:20px;max-width:90%;">${clip.content}</div>
    </div>`).join('\n')

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
  return {
    format: comp.width >= comp.height ? (comp.width === comp.height ? '1:1' : '16:9') : '9:16',
    width: comp.width,
    height: comp.height,
    fps: 30,
    duration: comp.duration,
    scenes: (comp.clips || []).map((c) => ({ id: c.id, start: c.start, duration: c.duration, type: c.type, content: c.content, style: c.style })),
    audio: {},
    captions: []
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
    const script = input.script || input.story || {}
    const options = input.options || {}
    const composition = createComposition(script, options)
    const html = generateHyperFramesHTML(composition)
    return { composition, html, manifest: toManifest(composition), duration: composition.duration }
  }
})