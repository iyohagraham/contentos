/**
 * Engine Registry — the catalog of all 21 ContentOS engines (AI Media OS v2.0).
 *
 * Each entry declares the engine's id, name, single responsibility, status
 * ('live' = implemented, 'stub' = contract defined / implementation pending), the
 * JSON contracts it consumes/produces, and where its implementation lives.
 *
 * This is the machine-readable map of the architecture. The pipeline order here
 * IS the production pipeline:
 *   Knowledge → Creative Direction → Strategy → Style → Universe → Characters →
 *   Story → Storyboard → Continuity → Scene Planning → Media Router →
 *   Voice → Music → Composition → Rendering → Publishing → Analytics → Learning
 * with Brand, Asset Manager, and Franchise as cross-cutting/structural engines.
 *
 * "live (existing)" means the responsibility is already served by existing code
 * (agents/endpoints) — the engine entry points to that implementation; a thin
 * engine wrapper can be added incrementally without changing behavior.
 */

export const ENGINES = [
  {
    id: 'knowledge', name: 'Knowledge Engine', order: 1,
    responsibility: 'Research, ingest, and verify knowledge into structured project knowledge (RAG).',
    status: 'live', impl: 'api/knowledge/*', outputs: ['knowledge']
  },
  {
    id: 'creative_director', name: 'Creative Director Engine', order: 2,
    responsibility: 'Decide what the audience should feel: tone, narrative, energy, pacing, purpose.',
    status: 'stub', impl: 'api/_engines/creative-director.js', inputs: ['knowledge'], outputs: ['creative_direction']
  },
  {
    id: 'strategy', name: 'Strategy Engine', order: 3,
    responsibility: 'Build brand-level long-term strategy: seasons, calendars, schedules, growth.',
    status: 'live', impl: 'api/agents/strategy.js + api/planning/*', inputs: ['creative_direction'], outputs: ['strategy']
  },
  {
    id: 'style', name: 'Style Engine', order: 4,
    responsibility: 'Create reusable style profiles (fonts/colors/camera/rhythm/captions/visual language).',
    status: 'stub', impl: 'api/_engines/style.js', outputs: ['style_profile']
  },
  {
    id: 'universe', name: 'Universe Engine', order: 5,
    responsibility: 'Maintain complete worlds: characters, locations, props, rules, lore, timelines.',
    status: 'stub', impl: 'api/_engines/universe.js', outputs: ['universe']
  },
  {
    id: 'character', name: 'Character Engine', order: 6,
    responsibility: 'Keep characters consistent: faces, voices, expressions, outfits, bio, poses.',
    status: 'stub', impl: 'api/_engines/character.js', inputs: ['universe'], outputs: ['character']
  },
  {
    id: 'brand', name: 'Brand Engine', order: 0,
    responsibility: 'Hold business identity: logo, colors, fonts, voice, tone, CTA + marketing rules.',
    status: 'stub', impl: 'api/_engines/brand.js', outputs: ['brand']
  },
  {
    id: 'story', name: 'Story Engine', order: 7,
    responsibility: 'Generate narrative: structure, hooks, retention, arcs, series, episodes.',
    status: 'live', impl: 'api/agents/writing.js + api/generate-script.js', inputs: ['creative_direction', 'knowledge'], outputs: ['story']
  },
  {
    id: 'storyboard', name: 'Storyboard Engine', order: 8,
    responsibility: 'Turn a story into a visual plan: shots, camera, lighting, mood, props, transitions.',
    status: 'stub', impl: 'api/_engines/storyboard.js', inputs: ['story', 'style_profile'], outputs: ['storyboard']
  },
  {
    id: 'continuity', name: 'Continuity Engine', order: 9,
    responsibility: 'Guard consistency across characters, outfits, locations, props, lighting, timeline.',
    status: 'stub', impl: 'api/_engines/continuity.js', inputs: ['storyboard', 'universe', 'character'], outputs: ['continuity_report']
  },
  {
    id: 'scene_planner', name: 'Scene Planner', order: 10,
    responsibility: 'Break the storyboard into production scenes with structured JSON metadata.',
    status: 'stub', impl: 'api/_engines/scene-planner.js', inputs: ['storyboard'], outputs: ['scene_plan']
  },
  {
    id: 'media_router', name: 'Media Router', order: 11,
    responsibility: 'Pick the best provider per media request (Runware primary); never lock to one.',
    status: 'live', impl: 'src/lib/router/* + api/media/engine.js', inputs: ['media_request'], outputs: ['media_asset']
  },
  {
    id: 'asset_manager', name: 'Asset Manager', order: 0,
    responsibility: 'Store + version assets (images/video/voices/music/templates/props) + metadata.',
    status: 'live', impl: 'api/_blob.js + api/knowledge/assets.js', outputs: ['media_asset']
  },
  {
    id: 'voice', name: 'Voice Engine', order: 12,
    responsibility: 'Narration, character voices, cloning, emotion, languages, dubbing (Qwen/OmniVoice).',
    status: 'live', impl: 'api/_providers/voice.js', outputs: ['media_asset']
  },
  {
    id: 'music', name: 'Music Engine', order: 13,
    responsibility: 'Music, ambience, SFX, audio branding, theme + background music (router-provided).',
    status: 'stub', impl: 'api/_engines/music.js', outputs: ['media_asset']
  },
  {
    id: 'composition', name: 'Composition Engine (HyperFrames)', order: 14,
    responsibility: 'Sequence scenes into a HyperFrames timeline: animation, captions, motion, transitions.',
    status: 'live', impl: 'api/_engines/composition/hyperframes.js', inputs: ['scene_plan', 'story'], outputs: ['composition_manifest']
  },
  {
    id: 'rendering', name: 'Rendering Engine (FFmpeg)', order: 15,
    responsibility: 'Encode/compress/export final video across all formats + watermarks + audio mix.',
    status: 'live', impl: 'api/_render/*', inputs: ['composition_manifest'], outputs: ['render_result']
  },
  {
    id: 'publishing', name: 'Publishing Engine', order: 16,
    responsibility: 'Schedule + publish to YT/IG/TikTok/FB/LinkedIn/X with metadata, tags, descriptions.',
    status: 'live', impl: 'api/agents/publishing.js + api/postiz/*', inputs: ['render_result'], outputs: []
  },
  {
    id: 'analytics', name: 'Analytics Engine', order: 17,
    responsibility: 'Track CTR, watch time, retention, revenue, views, shares, comments, subscribers.',
    status: 'live', impl: 'api/analytics/* + api/agents/analytics.js', outputs: []
  },
  {
    id: 'learning', name: 'Learning Engine', order: 18,
    responsibility: 'Improve the platform: feed winning patterns back into strategy/story/style/direction.',
    status: 'live', impl: 'api/agents/optimization.js + api/analytics/insights.js + router auto-learn', outputs: []
  },
  {
    id: 'franchise', name: 'Franchise Engine', order: 0,
    responsibility: 'Top-level hierarchy: Universe → Brand → Franchise → Season → Series → Episode → ...',
    status: 'stub', impl: 'api/_engines/franchise.js', outputs: []
  }
]

/** @param {string} id */
export function getEngine(id) {
  return ENGINES.find((e) => e.id === id) || null
}

/** Engines in production-pipeline order (order 0 = structural/cross-cutting, listed last). */
export function pipelineOrder() {
  return [...ENGINES].sort((a, b) => (a.order || 99) - (b.order || 99))
}

/** @returns {{ total: number, live: number, stub: number }} */
export function engineStats() {
  const live = ENGINES.filter((e) => e.status === 'live').length
  return { total: ENGINES.length, live, stub: ENGINES.length - live }
}