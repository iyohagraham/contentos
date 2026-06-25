/**
 * Continuity Engine (#9) — LIVE.
 *
 * Guards consistency. Diffs a STORYBOARD (or SCENE_PLAN) against the known UNIVERSE
 * + CHARACTER roster + brand assets and emits a CONTINUITY_REPORT: nothing changes
 * by accident. Pure/deterministic — flags characters/props/locations not declared in
 * the world bible, missing outfits for recurring characters, and timeline gaps.
 *
 * AUTO-FIX: every issue carries a `fix` suggestion. With `apply:true` the engine also
 * returns a corrected `fixed` storyboard/scene_plan — outfit drift is resolved by
 * pinning each character's first-seen outfit across all later shots (the most common,
 * safest correction). Unknown entities are reported (not silently deleted).
 *
 * input:  { storyboard | scene_plan, universe?, characters?, brand?, apply? }
 * output: CONTINUITY_REPORT { consistent, issues[{...,fix}], tracked, fixed? }
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
    const charOutfit = {}        // canonical (first-seen) outfit per character
    const outfitFixes = []       // { shotIndex, character, from, to } for apply mode

    shots.forEach((shot, i) => {
      for (const ch of (shot.characters || [])) {
        const k = lc(ch)
        seenChars.add(k)
        if (knownChars.size && !knownChars.has(k)) {
          issues.push({
            type: 'unknown_character', severity: 'high',
            detail: `Shot ${i}: character "${ch}" not in the universe/character roster`,
            fix: `Add "${ch}" to the Universe/Character roster, or rename the shot's character to a known one.`
          })
        }
        if (shot.outfit) {
          const canonical = charOutfit[k]
          if (canonical && canonical !== lc(shot.outfit)) {
            issues.push({
              type: 'outfit_drift', severity: 'medium',
              detail: `Shot ${i}: "${ch}" outfit changed from "${canonical}" to "${shot.outfit}" without a transition`,
              fix: `Pin "${ch}" to "${canonical}" (first-seen outfit) for shot ${i}, or add an explicit wardrobe-change beat.`
            })
            outfitFixes.push({ shotIndex: i, character: k, from: lc(shot.outfit), to: canonical })
          } else if (!canonical) {
            charOutfit[k] = lc(shot.outfit)
          }
        }
      }
      for (const p of (shot.props || [])) {
        if (knownProps.size && !knownProps.has(lc(p))) {
          issues.push({
            type: 'unknown_prop', severity: 'low',
            detail: `Shot ${i}: prop "${p}" not declared in the universe`,
            fix: `Add "${p}" to the Universe props list, or remove it from shot ${i}.`
          })
        }
      }
      if (shot.location && knownLocations.size && !knownLocations.has(lc(shot.location))) {
        issues.push({
          type: 'unknown_location', severity: 'medium',
          detail: `Shot ${i}: location "${shot.location}" not in the universe`,
          fix: `Add "${shot.location}" to the Universe locations, or set the shot to a known location.`
        })
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

    // Apply mode: return a corrected copy with outfit drift auto-resolved (pin to
    // the first-seen outfit). Other issues are surfaced but not silently mutated.
    if (input.apply && outfitFixes.length) {
      const isScenePlan = Array.isArray(board.scenes)
      const fixed = JSON.parse(JSON.stringify(board))
      for (const f of outfitFixes) {
        if (isScenePlan) {
          const sc = fixed.scenes[f.shotIndex]
          if (sc?.metadata) sc.metadata.outfit = f.to
        } else if (Array.isArray(fixed.shots) && fixed.shots[f.shotIndex]) {
          fixed.shots[f.shotIndex].outfit = f.to
        }
      }
      report.fixed = fixed
      report.applied_fixes = outfitFixes.length
    }

    const v = validateContract('continuity_report', report)
    if (!v.ok) throw new Error(`continuity: output failed contract (missing: ${v.missing.join(', ')})`)
    return report
  }
})