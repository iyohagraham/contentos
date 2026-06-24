/**
 * Storyboard Engine (#8) — LIVE.
 *
 * Turns a STORY (hook + beats) into a STORYBOARD: an ordered shot list where each
 * shot carries camera, lighting, mood, props, characters, outfit, transition, and
 * duration. One of the most important systems — every project becomes a storyboard
 * before production.
 *
 * input:  { story (STORY contract) | script, style_profile?, project_id?, shots_per_beat? }
 * output: STORYBOARD contract { project_id, style_profile_id, shots: [...] }
 *
 * Grounded in the story beats + the (optional) STYLE_PROFILE so the visual
 * language is consistent. AI-first (textGenerateJSON); falls back to a
 * deterministic 1-shot-per-beat plan when no text provider / on parse failure —
 * engines never hard-fail.
 */
import { defineEngine } from './_base.js'
import { Storyboard, Story, validateContract } from '../_contracts/index.js'
import { textGenerateJSON, hasTextProvider } from '../_providers/text.js'

const CAMERAS = ['wide establishing', 'medium', 'close-up', 'over-the-shoulder', 'tracking', 'top-down']
const TRANSITIONS = ['cut', 'crossfade', 'whip-pan', 'match-cut', 'fade']

/** Normalize a story-ish input into { hook, beats[], cta }. */
function normalizeStory(input = {}) {
  const s = input.story || input.script || input
  const beats = Array.isArray(s.beats)
    ? s.beats.map((b) => (typeof b === 'string' ? b : (b.content || b.beat || ''))).filter(Boolean)
    : (Array.isArray(s.body) ? s.body.filter(Boolean) : [])
  return { hook: s.hook || '', beats, cta: s.cta || '', title: s.title || '' }
}

/** Deterministic fallback: one shot per beat (+ hook + cta), styled if a profile is given. */
function fallbackShots(story, style) {
  const segs = []
  if (story.hook) segs.push({ kind: 'hook', text: story.hook })
  story.beats.forEach((b) => segs.push({ kind: 'beat', text: b }))
  if (story.cta) segs.push({ kind: 'cta', text: story.cta })

  return segs.map((seg, i) => ({
    index: i,
    description: seg.text,
    camera: i === 0 ? 'wide establishing' : CAMERAS[i % CAMERAS.length],
    lighting: style?.visual_language ? style.visual_language : 'natural, balanced',
    mood: seg.kind === 'hook' ? 'attention-grabbing' : seg.kind === 'cta' ? 'motivating' : 'engaging',
    props: [],
    characters: [],
    outfit: '',
    transition: i === segs.length - 1 ? 'fade' : TRANSITIONS[i % TRANSITIONS.length],
    duration: seg.kind === 'hook' ? 3 : seg.kind === 'cta' ? 3 : 4
  }))
}

export default defineEngine({
  id: 'storyboard',
  name: 'Storyboard Engine',
  responsibility: 'Plan visuals, scenes, camera, shots, lighting, mood, props, and transitions from a story.',
  status: 'live',
  inputs: ['story', 'style_profile'],
  outputs: ['storyboard'],
  run: async (input = {}) => {
    const story = normalizeStory(input)
    const style = input.style_profile || null
    const projectId = input.project_id || null
    const styleProfileId = input.style_profile_id || style?.id || null

    if (!story.hook && story.beats.length === 0) {
      throw new Error('storyboard: a story with a hook and/or beats is required')
    }

    let shots = null

    if (hasTextProvider()) {
      const styleBlock = style
        ? `STYLE PROFILE (keep every shot visually consistent with this):
- name: ${style.name || 'n/a'}
- camera language: ${style.camera_language || 'n/a'}
- editing rhythm: ${style.editing_rhythm || 'n/a'}
- visual language: ${style.visual_language || 'n/a'}
- animation style: ${style.animation_style || 'n/a'}
- colors: ${(style.colors || []).join(', ') || 'n/a'}`
        : 'No style profile provided — choose a coherent visual language and keep it consistent.'

      const prompt = `You are a storyboard artist. Turn this story into an ordered shot list.

STORY:
- title: ${story.title || 'Untitled'}
- hook: ${story.hook || '(none)'}
- beats:
${story.beats.map((b, i) => `  ${i + 1}. ${b}`).join('\n') || '  (none)'}
- cta: ${story.cta || '(none)'}

${styleBlock}

Produce one or more shots that together tell the story with strong retention.
The FIRST shot must visualize the hook. The LAST shot must land the CTA (if any).
Return JSON:
{
  "shots": [
    {
      "index": 0,
      "description": "what is on screen, concretely",
      "camera": "shot type / movement",
      "lighting": "lighting setup",
      "mood": "emotional mood of the shot",
      "props": ["prop1"],
      "characters": ["character name if any"],
      "outfit": "outfit note if relevant",
      "transition": "cut|crossfade|whip-pan|match-cut|fade",
      "duration": 4
    }
  ]
}
Keep descriptions concrete and shootable. Index shots from 0 in order.`

      try {
        const out = await textGenerateJSON(prompt, { maxTokens: 2200 })
        const arr = Array.isArray(out) ? out : out?.shots
        if (Array.isArray(arr) && arr.length) {
          shots = arr.map((s, i) => ({
            index: Number.isInteger(s.index) ? s.index : i,
            description: s.description || '',
            camera: s.camera || CAMERAS[i % CAMERAS.length],
            lighting: s.lighting || 'natural, balanced',
            mood: s.mood || 'engaging',
            props: Array.isArray(s.props) ? s.props : [],
            characters: Array.isArray(s.characters) ? s.characters : [],
            outfit: s.outfit || '',
            transition: s.transition || 'cut',
            duration: Number(s.duration) || 4
          }))
        }
      } catch {
        // fall through to deterministic plan
      }
    }

    if (!shots) shots = fallbackShots(story, style)

    const storyboard = {
      ...Storyboard.blank(),
      project_id: projectId,
      style_profile_id: styleProfileId,
      shots
    }

    // Self-check: the output must satisfy its own contract.
    const v = validateContract('storyboard', storyboard)
    if (!v.ok) throw new Error(`storyboard: output failed contract (missing: ${v.missing.join(', ')})`)

    return storyboard
  }
})

export { normalizeStory, fallbackShots }