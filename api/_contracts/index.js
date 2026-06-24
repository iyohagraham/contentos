/**
 * JSON Contracts — the structured-JSON vocabulary every ContentOS engine speaks.
 *
 * Engines NEVER pass ad-hoc objects to each other; they pass CONTRACTS. Each
 * contract here is documented with its shape (JSDoc typedef) + a `validate()` and
 * a `blank()` factory. This file is the single source of truth for inter-engine
 * interfaces — the "document every interface" requirement of the v2.0 pivot.
 *
 * Contracts are intentionally permissive (extra fields allowed) and forward-
 * compatible: validate() checks REQUIRED fields only, so engines can be upgraded
 * to emit richer data without breaking downstream consumers.
 *
 * The FRANCHISE HIERARCHY these contracts assemble into:
 *   Universe → Brand → Franchise → Season → Series → Episode → Storyboard → Scene → Assets
 */

/** @typedef {{ ok: boolean, missing: string[], contract: string }} ValidationResult */

/** Generic required-field validator. */
function requireFields(contract, obj, fields) {
  const missing = fields.filter((f) => obj == null || obj[f] === undefined || obj[f] === null || obj[f] === '')
  return { ok: missing.length === 0, missing, contract }
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE — output of the Knowledge Engine
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} KnowledgeContract
 * @property {string} workspace_id
 * @property {string} topic
 * @property {Array<{ title: string, summary: string, source?: string, confidence?: number }>} facts
 * @property {string[]} [sources]
 * @property {object} [rag]   { chunks: number, objects: number }
 */
export const Knowledge = {
  name: 'knowledge',
  blank: () => ({ workspace_id: null, topic: '', facts: [], sources: [], rag: { chunks: 0, objects: 0 } }),
  validate: (o) => requireFields('knowledge', o, ['topic', 'facts'])
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATIVE_DIRECTION — output of the Creative Director Engine ("what to feel")
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} CreativeDirectionContract
 * @property {string} emotional_tone        e.g. 'awe', 'cozy', 'urgent'
 * @property {string} narrative_style       e.g. 'documentary', 'first-person'
 * @property {string} audience
 * @property {string} purpose
 * @property {string} energy                'low'|'medium'|'high'
 * @property {string} pacing                'slow'|'medium'|'fast'
 * @property {string} [experience]          the intended audience experience
 */
export const CreativeDirection = {
  name: 'creative_direction',
  blank: () => ({ emotional_tone: '', narrative_style: '', audience: '', purpose: '', energy: 'medium', pacing: 'medium', experience: '' }),
  validate: (o) => requireFields('creative_direction', o, ['emotional_tone', 'audience', 'purpose'])
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY — output of the Strategy Engine (brand-level, never one video)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} StrategyContract
 * @property {string} brand
 * @property {string[]} content_pillars
 * @property {Array<{ name: string, goal: string, length?: string }>} [seasons]
 * @property {Array<{ date: string, theme: string, platforms: string[] }>} [calendar]
 * @property {object} [publishing_schedule]
 * @property {object} [growth]
 */
export const Strategy = {
  name: 'strategy',
  blank: () => ({ brand: '', content_pillars: [], seasons: [], calendar: [], publishing_schedule: {}, growth: {} }),
  validate: (o) => requireFields('strategy', o, ['brand', 'content_pillars'])
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE_PROFILE — reusable Style Engine output
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} StyleProfileContract
 * @property {string} id
 * @property {string} name                  e.g. 'Pixar-inspired', 'Documentary'
 * @property {string[]} [fonts]
 * @property {string[]} [colors]
 * @property {string} [camera_language]
 * @property {string} [editing_rhythm]
 * @property {string} [caption_style]
 * @property {string} [thumbnail_style]
 * @property {string} [animation_style]
 * @property {string} [visual_language]
 */
export const StyleProfile = {
  name: 'style_profile',
  blank: () => ({ id: null, name: '', fonts: [], colors: [], camera_language: '', editing_rhythm: '', caption_style: '', thumbnail_style: '', animation_style: '', visual_language: '' }),
  validate: (o) => requireFields('style_profile', o, ['name'])
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSE — Universe Engine output (world bible)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} UniverseContract
 * @property {string} id
 * @property {string} name
 * @property {Array<{ id: string, name: string }>} [characters]
 * @property {Array<{ id: string, name: string }>} [locations]
 * @property {string[]} [props]
 * @property {string[]} [rules]
 * @property {string} [lore]
 * @property {Array<object>} [relationships]
 * @property {Array<object>} [timelines]
 */
export const Universe = {
  name: 'universe',
  blank: () => ({ id: null, name: '', characters: [], locations: [], props: [], rules: [], lore: '', relationships: [], timelines: [] }),
  validate: (o) => requireFields('universe', o, ['name'])
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER — Character Engine output (consistency across episodes)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} CharacterContract
 * @property {string} id
 * @property {string} name
 * @property {object} [face]          reference/seed data for visual consistency
 * @property {object} [voice]         voice profile id + params
 * @property {string[]} [expressions]
 * @property {string[]} [outfits]
 * @property {string} [biography]
 * @property {string} [personality]
 * @property {Array<object>} [relationships]
 * @property {string[]} [pose_library]
 */
export const Character = {
  name: 'character',
  blank: () => ({ id: null, name: '', face: {}, voice: {}, expressions: [], outfits: [], biography: '', personality: '', relationships: [], pose_library: [] }),
  validate: (o) => requireFields('character', o, ['name'])
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND — Brand Engine output (business identity consistency)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} BrandContract
 * @property {string} id
 * @property {string} name
 * @property {string} [logo_url]
 * @property {string[]} [colors]
 * @property {string[]} [fonts]
 * @property {string} [voice]
 * @property {string} [tone]
 * @property {string[]} [marketing_rules]
 * @property {string[]} [cta_rules]
 */
export const Brand = {
  name: 'brand',
  blank: () => ({ id: null, name: '', logo_url: '', colors: [], fonts: [], voice: '', tone: '', marketing_rules: [], cta_rules: [] }),
  validate: (o) => requireFields('brand', o, ['name'])
}

// ─────────────────────────────────────────────────────────────────────────────
// STORY — Story Engine output (narrative)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} StoryContract
 * @property {string} title
 * @property {string} logline
 * @property {string} [structure]     e.g. 'three-act', 'listicle', 'hook-payoff'
 * @property {string} hook
 * @property {Array<{ beat: string, content: string }>} beats
 * @property {string} [cta]
 * @property {object} [retention]     { hook_strength?, pattern_interrupts? }
 */
export const Story = {
  name: 'story',
  blank: () => ({ title: '', logline: '', structure: '', hook: '', beats: [], cta: '', retention: {} }),
  validate: (o) => requireFields('story', o, ['hook', 'beats'])
}

// ─────────────────────────────────────────────────────────────────────────────
// STORYBOARD — Storyboard Engine output (visual plan before production)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} StoryboardShot
 * @property {number} index
 * @property {string} description
 * @property {string} [camera]        shot type / movement
 * @property {string} [lighting]
 * @property {string} [mood]
 * @property {string[]} [props]
 * @property {string[]} [characters]
 * @property {string} [outfit]
 * @property {string} [transition]
 * @property {number} [duration]
 */
/**
 * @typedef {Object} StoryboardContract
 * @property {string} project_id
 * @property {string} [style_profile_id]
 * @property {StoryboardShot[]} shots
 */
export const Storyboard = {
  name: 'storyboard',
  blank: () => ({ project_id: null, style_profile_id: null, shots: [] }),
  validate: (o) => requireFields('storyboard', o, ['shots'])
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTINUITY_REPORT — Continuity Engine output (what would break)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} ContinuityReportContract
 * @property {boolean} consistent
 * @property {Array<{ type: string, detail: string, severity: 'low'|'medium'|'high' }>} issues
 * @property {object} [tracked]   { characters, outfits, locations, props, lighting, timeline }
 */
export const ContinuityReport = {
  name: 'continuity_report',
  blank: () => ({ consistent: true, issues: [], tracked: {} }),
  validate: (o) => requireFields('continuity_report', o, ['consistent', 'issues'])
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE_PLAN — Scene Planner output (production-ready, structured JSON)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} ScenePlanScene
 * @property {number} index
 * @property {number} duration
 * @property {string[]} assets_required   asset kinds/ids needed
 * @property {object} [voice]             { text, character_id?, voice_profile? }
 * @property {object} [music]             { mood?, track_id? }
 * @property {string} [camera_movement]
 * @property {string} [motion]
 * @property {object} [captions]
 * @property {string[]} [effects]
 * @property {object} [metadata]
 */
/**
 * @typedef {Object} ScenePlanContract
 * @property {string} project_id
 * @property {string} format              '9:16' | '16:9' | '1:1'
 * @property {ScenePlanScene[]} scenes
 */
export const ScenePlan = {
  name: 'scene_plan',
  blank: () => ({ project_id: null, format: '9:16', scenes: [] }),
  validate: (o) => requireFields('scene_plan', o, ['scenes'])
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA_REQUEST / MEDIA_ASSET — Media Router contracts
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} MediaRequestContract
 * @property {string} type        'image'|'video'|'audio'|'utility'
 * @property {string} task        e.g. 'scene', 'image_to_video', 'upscale'
 * @property {string} [prompt]
 * @property {string} [imageUrl]
 * @property {string} [priority]  'cheap'|'balanced'|'quality'|'speed'
 */
export const MediaRequest = {
  name: 'media_request',
  blank: () => ({ type: 'image', task: 'scene', prompt: '', priority: 'balanced' }),
  validate: (o) => requireFields('media_request', o, ['type', 'task'])
}
/**
 * @typedef {Object} MediaAssetContract
 * @property {string} url
 * @property {string} provider
 * @property {string} model
 * @property {string} [type]
 * @property {number} [cost]
 */
export const MediaAsset = {
  name: 'media_asset',
  blank: () => ({ url: '', provider: '', model: '', type: 'image', cost: null }),
  validate: (o) => requireFields('media_asset', o, ['url', 'provider'])
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITION_MANIFEST — Composition Engine (HyperFrames) output / Render input
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} CompositionManifestContract
 * @property {string} format
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {number} duration
 * @property {Array<object>} scenes
 * @property {object} [audio]
 * @property {Array<object>} [captions]
 */
export const CompositionManifest = {
  name: 'composition_manifest',
  blank: () => ({ format: '9:16', width: 1080, height: 1920, fps: 30, duration: 0, scenes: [], audio: {}, captions: [] }),
  validate: (o) => requireFields('composition_manifest', o, ['width', 'height', 'scenes'])
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER_RESULT — Rendering Engine (FFmpeg) output
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} RenderResultContract
 * @property {string} url            final MP4 url
 * @property {string} format
 * @property {number} [durationSec]
 * @property {string} [thumbnail_url]
 */
export const RenderResult = {
  name: 'render_result',
  blank: () => ({ url: '', format: '9:16', durationSec: null, thumbnail_url: null }),
  validate: (o) => requireFields('render_result', o, ['url'])
}

/** All contracts keyed by name — for registry/doc tooling. */
export const CONTRACTS = {
  knowledge: Knowledge,
  creative_direction: CreativeDirection,
  strategy: Strategy,
  style_profile: StyleProfile,
  universe: Universe,
  character: Character,
  brand: Brand,
  story: Story,
  storyboard: Storyboard,
  continuity_report: ContinuityReport,
  scene_plan: ScenePlan,
  media_request: MediaRequest,
  media_asset: MediaAsset,
  composition_manifest: CompositionManifest,
  render_result: RenderResult
}

/**
 * Validate any object against a named contract.
 * @param {string} contractName
 * @param {object} obj
 * @returns {ValidationResult}
 */
export function validateContract(contractName, obj) {
  const c = CONTRACTS[contractName]
  if (!c) return { ok: false, missing: ['<unknown contract>'], contract: contractName }
  return c.validate(obj)
}