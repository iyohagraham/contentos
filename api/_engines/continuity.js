/**
 * Continuity Engine (#9) — STUB.
 * Guards consistency across characters, outfits, locations, props, lighting, timeline,
 * brand assets, and universe rules. Emits a CONTINUITY_REPORT (nothing changes by accident).
 * Implementation pending: diff storyboard/scene-plan against universe + character state.
 */
import { defineEngine, stubOutput } from './_base.js'
import { ContinuityReport } from '../_contracts/index.js'

export default defineEngine({
  id: 'continuity',
  name: 'Continuity Engine',
  responsibility: 'Detect consistency breaks before production (characters/outfits/props/timeline).',
  status: 'stub',
  inputs: ['storyboard', 'universe', 'character'],
  outputs: ['continuity_report'],
  run: async () => stubOutput('continuity', { ...ContinuityReport.blank() })
})