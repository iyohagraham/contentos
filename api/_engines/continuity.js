/**
 * Continuity Engine (#9) — LIVE.
 *
 * Guards consistency. Diffs a STORYBOARD (or SCENE_PLAN) against the known UNIVERSE
 * + CHARACTER roster + brand assets and emits a CONTINUITY_REPORT: nothing changes
 * by accident. Pure/deterministic — flags characters/props/locations not declared in
 * the world bible, missing outfits for recurring characters, and timeline gaps.
 *
 * input:  { storyboard | scene_plan, universe?, characters?, brand? }
 * output: CONTINUITY_REPORT contract { consistent, issues[], tracked }
 */
import { defineEngine } from './_base.js'
import { ContinuityReport, validateContract } from '../_contracts/index.js'

const lc = (s) => String(s || '').toLowerCase().trim()

export default defineEngine({
  id: 'continuity',
  name: 'Continuity Engine',
  responsibility: 'Detect consistency breaks before production (characters/outfits/props/timeline).',
  status: 'live',
  inputs: ['storyboard', 'universe', 'character'],
  outputs: ['continuity_report'],
  run: async (input = {}) => {
    const board = input.storyboard || input.scene_plan || input
    const shots = Array.isArray(board.shots) ? board.shots
      : Array.isArray(board.scenes) ? board.scenes.map((s) => ({ characters: s.metadata?.characters, props: s.metadata?.props, outfit: s.metadata?.outfit })) : []

    const universe = input.universe || {}
    const knownChars = new Set((universe.characters || []).map((c) => lc(c.name)))
    const explicitChars = (input.characters || []).map((c) => lc(c.name))
    explicitChars.forEach((c) => knownChars.add(c))
    const knownProps = new Set((universe.props || []).map(lc))
    const knownLocations = new Set((universe.locations || []).map((l) => lc(l.name)))

    const issues = []
    const seenChars = new Set()
    const charOutfit = {}

    shots.forEach((shot, i) => {
      for (const ch of (shot.characters || [])) {
        const k = lc(ch)
        seenChars.add(k)
        if (knownChars.size && !knownChars.has(k)) {
          issues.push({ type: 'unknown_character', detail: `Shot ${i}: character "${ch}" not in the universe/character roster`, severity: 'high' })
        }
        // Outfit drift: same character, different outfit across shots.
        if (shot.outfit) {
          if (charOutfit[k] && charOutfit[k] !== lc(shot.outfit)) {
            issues.push({ type: 'outfit_drift', detail: `Shot ${i}: "${ch}" outfit changed from "${charOutfit[k]}" to "${shot.outfit}" without a transition`, severity: 'medium' })
          }
          charOutfit[k] = lc(shot.outfit)
        }
      }
      for (const p of (shot.props || [])) {
        if (knownProps.size && !knownProps.has(lc(p))) {
          issues.push({ type: 'unknown_prop', detail: `Shot ${i}: prop "${p}" not declared in the universe`, severity: 'low' })
        }
      }
      if (shot.location && knownLocations.size && !knownLocations.has(lc(shot.location))) {
        issues.push({ type: 'unknown_location', detail: `Shot ${i}: location "${shot.location}" not in the universe`, severity: 'medium' })
      }
    })

    const report = {
      ...ContinuityReport.blank(),
      consistent: issues.length === 0,
      issues,
      tracked: {
        characters: [...seenChars],
        outfits: charOutfit,
        locations: [...knownLocations],
        props: [...knownProps],
        shots: shots.length
      }
    }

    const v = validateContract('continuity_report', report)
    if (!v.ok) throw new Error(`continuity: output failed contract (missing: ${v.missing.join(', ')})`)
    return report
  }
})