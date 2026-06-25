/**
 * Style Engine (#4) — LIVE.
 *
 * Creates reusable STYLE_PROFILE objects (Documentary, Pixar-inspired, Apple-minimal,
 * Anime, Luxury commercial, …). A style profile is the visual language a project
 * references: fonts, colors, camera language, editing rhythm, caption style,
 * thumbnail style, animation style, overall visual language.
 *
 * input:  { name | brief, references?, persist?, workspace_id? }
 * output: STYLE_PROFILE contract
 *
 * AI-first (textGenerateJSON) from the name/brief; deterministic preset fallback
 * for a handful of well-known styles when no text provider. Optionally persists
 * the profile JSON to workspace_config.style_profiles[] when persist=true + db.
 */
import { randomUUID } from 'node:crypto'
import { defineEngine } from './_base.js'
import { StyleProfile, validateContract } from '../_contracts/index.js'
import { textGenerateJSON, hasTextProvider } from '../_providers/text.js'

const PRESETS = {
  documentary: { fonts: ['Georgia', 'Inter'], colors: ['#1a1a1a', '#e8e8e8', '#c0392b'], camera_language: 'steady, observational, slow push-ins', editing_rhythm: 'measured, long takes', caption_style: 'lower-third serif', thumbnail_style: 'photographic, high-contrast subject', animation_style: 'minimal, archival pans', visual_language: 'grounded, natural light, cinematic realism' },
  minimal: { fonts: ['Inter', 'Helvetica Neue'], colors: ['#ffffff', '#0a0a0a', '#06b6d4'], camera_language: 'locked-off, centered, generous negative space', editing_rhythm: 'calm, deliberate cuts', caption_style: 'clean sans, centered', thumbnail_style: 'single object on flat background', animation_style: 'smooth fades, subtle scale', visual_language: 'Apple-inspired clarity, restraint, premium' },
  cinematic: { fonts: ['Cinzel', 'Inter'], colors: ['#0d0d0f', '#d4af37', '#1f3a5f'], camera_language: 'anamorphic, dramatic movement, shallow depth', editing_rhythm: 'rhythmic, tension-building', caption_style: 'minimal, dramatic reveal', thumbnail_style: 'moody, teal-orange grade', animation_style: 'parallax, light leaks', visual_language: 'epic, high production value, film grain' }
}

function presetFor(name) {
  const key = String(name || '').toLowerCase()
  for (const k of Object.keys(PRESETS)) if (key.includes(k)) return PRESETS[k]
  return PRESETS.minimal
}

export default defineEngine({
  id: 'style',
  name: 'Style Engine',
  responsibility: 'Create reusable style profiles (fonts, colors, camera language, rhythm, captions).',
  status: 'live',
  outputs: ['style_profile'],
  run: async (input = {}, ctx = {}) => {
    const name = input.name || input.brief || 'Untitled Style'
    let body = null

    if (hasTextProvider()) {
      const prompt = `You are an art director. Define a complete, reusable STYLE PROFILE for: "${name}".
${input.references ? `References / inspiration: ${input.references}` : ''}
Return JSON with concrete, production-usable choices:
{
  "name": "${name}",
  "fonts": ["primary font", "secondary font"],
  "colors": ["#hex", "#hex", "#hex"],
  "camera_language": "how the camera behaves",
  "editing_rhythm": "pacing + cut style",
  "caption_style": "caption/subtitle treatment",
  "thumbnail_style": "thumbnail design pattern",
  "animation_style": "motion/animation treatment",
  "visual_language": "one-line summary of the overall look & feel"
}`
      try { body = await textGenerateJSON(prompt, { maxTokens: 900 }) } catch { body = null }
    }

    if (!body || typeof body !== 'object') body = { name, ...presetFor(name) }

    const profile = {
      ...StyleProfile.blank(),
      id: input.id || randomUUID(),
      name: body.name || name,
      fonts: Array.isArray(body.fonts) ? body.fonts : [],
      colors: Array.isArray(body.colors) ? body.colors : [],
      camera_language: body.camera_language || '',
      editing_rhythm: body.editing_rhythm || '',
      caption_style: body.caption_style || '',
      thumbnail_style: body.thumbnail_style || '',
      animation_style: body.animation_style || '',
      visual_language: body.visual_language || ''
    }

    const v = validateContract('style_profile', profile)
    if (!v.ok) throw new Error(`style: output failed contract (missing: ${v.missing.join(', ')})`)

    // Optional persistence into workspace_config.style_profiles[] (no schema change).
    if (input.persist && ctx.db && ctx.workspaceId) {
      try {
        const { data: cfg } = await ctx.db.from('workspace_config')
          .select('style_profiles').eq('workspace_id', ctx.workspaceId).maybeSingle()
        const existing = Array.isArray(cfg?.style_profiles) ? cfg.style_profiles : []
        await ctx.db.from('workspace_config')
          .upsert({ workspace_id: ctx.workspaceId, style_profiles: [...existing, profile] }, { onConflict: 'workspace_id' })
      } catch (err) { ctx.log?.(`style persist skipped: ${err.message}`) }
    }

    return profile
  }
})

export { presetFor }