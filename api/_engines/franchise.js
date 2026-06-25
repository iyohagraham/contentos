/**
 * Franchise Engine (#21) — LIVE (structural).
 *
 * Highest-level abstraction. Owns the media-ecosystem hierarchy:
 *   Universe → Brand → Franchise → Season → Series → Episode → Storyboard → Scene → Assets
 * Lets one operator run complete ecosystems instead of isolated videos.
 *
 * Two operations (input.op):
 *   'assemble' (default) — fold a flat set of nodes into a nested hierarchy tree.
 *   'plan'               — given a franchise + counts, scaffold empty
 *                          Season/Series/Episode nodes ready to be filled.
 *
 * input:  { op?, nodes?[{ level, id, name, parent? }], franchise?, seasons?, series_per_season?, episodes_per_series? }
 * output: { hierarchy: [...levels], tree | scaffold }
 */
import { randomUUID } from 'node:crypto'
import { defineEngine } from './_base.js'

export const HIERARCHY = ['universe', 'brand', 'franchise', 'season', 'series', 'episode', 'storyboard', 'scene', 'assets']
const LEVEL_INDEX = Object.fromEntries(HIERARCHY.map((l, i) => [l, i]))

/** Fold flat nodes into a nested tree by parent id (or by level order when no parent given). */
function assemble(nodes = []) {
  const byId = new Map()
  for (const n of nodes) byId.set(n.id, { ...n, children: [] })
  const roots = []
  // Sort by hierarchy depth so parents are processed before children.
  const sorted = [...byId.values()].sort((a, b) => (LEVEL_INDEX[a.level] ?? 99) - (LEVEL_INDEX[b.level] ?? 99))
  for (const node of sorted) {
    if (node.parent && byId.has(node.parent)) byId.get(node.parent).children.push(node)
    else roots.push(node)
  }
  return roots
}

/** Scaffold empty Season→Series→Episode nodes under a franchise. */
function plan({ franchise, seasons = 1, series_per_season = 1, episodes_per_series = 3 }) {
  const fid = franchise?.id || randomUUID()
  const out = { level: 'franchise', id: fid, name: franchise?.name || 'Franchise', children: [] }
  for (let s = 1; s <= seasons; s++) {
    const season = { level: 'season', id: `${fid}-s${s}`, name: `Season ${s}`, children: [] }
    for (let r = 1; r <= series_per_season; r++) {
      const series = { level: 'series', id: `${season.id}-r${r}`, name: `Series ${r}`, children: [] }
      for (let e = 1; e <= episodes_per_series; e++) {
        series.children.push({ level: 'episode', id: `${series.id}-e${e}`, name: `Episode ${e}`, status: 'empty', children: [] })
      }
      season.children.push(series)
    }
    out.children.push(season)
  }
  return out
}

export default defineEngine({
  id: 'franchise',
  name: 'Franchise Engine',
  responsibility: 'Own the Universe→Brand→Franchise→Season→Series→Episode→Storyboard→Scene→Assets hierarchy.',
  status: 'live',
  outputs: [],
  run: async (input = {}) => {
    const op = input.op || 'assemble'
    if (op === 'plan') {
      return { hierarchy: HIERARCHY, scaffold: plan(input) }
    }
    // default: assemble
    const tree = assemble(Array.isArray(input.nodes) ? input.nodes : [])
    return { hierarchy: HIERARCHY, tree, node_count: (input.nodes || []).length }
  }
})

export { assemble, plan }