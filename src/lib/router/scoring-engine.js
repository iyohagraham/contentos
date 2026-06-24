/**
 * Scoring Engine — pure weighted scoring over model metadata.
 *
 * PURE module: no imports from api/, no process.env, no node-only APIs.
 *
 * FinalScore = qualityWeight*qualityScore
 *            + speedWeight*speedScore
 *            + costWeight*costScore
 *            + reliabilityWeight*reliabilityScore
 * Highest score wins. All *Score are 1..10 (cost score: 10 = cheapest).
 */

/**
 * @typedef {Object} Weights
 * @property {number} quality
 * @property {number} speed
 * @property {number} cost
 * @property {number} reliability
 */

/**
 * Score a single model against a set of priority weights.
 * @param {import('./model-registry.js').ModelRecord} model
 * @param {Weights} weights
 * @returns {number}
 */
import { getModelOverride } from './model-registry.js'

/**
 * Resolve the effective score for a field, applying any auto-learned override.
 * @param {object} model
 * @param {string} field
 */
function effectiveScore(model, field) {
  const ov = getModelOverride(model.id)
  if (ov && ov[field] != null) return Number(ov[field])
  return Number(model[field]) || 0
}

export function scoreModel(model, weights = {}) {
  if (!model) return 0
  const w = {
    quality: Number(weights.quality) || 0,
    speed: Number(weights.speed) || 0,
    cost: Number(weights.cost) || 0,
    reliability: Number(weights.reliability) || 0
  }
  const s = {
    quality: effectiveScore(model, 'qualityScore'),
    speed: effectiveScore(model, 'speedScore'),
    cost: effectiveScore(model, 'costScore'),
    reliability: effectiveScore(model, 'reliabilityScore')
  }
  return w.quality * s.quality + w.speed * s.speed + w.cost * s.cost + w.reliability * s.reliability
}

/**
 * Rank models by score, descending. Stable: ties keep their original order.
 * @param {import('./model-registry.js').ModelRecord[]} models
 * @param {Weights} weights
 * @returns {{ model: import('./model-registry.js').ModelRecord, score: number }[]}
 */
export function rankModels(models = [], weights = {}) {
  return models
    .map((model, i) => ({ model, score: scoreModel(model, weights), _i: i }))
    .sort((a, b) => (b.score - a.score) || (a._i - b._i))
    .map(({ model, score }) => ({ model, score }))
}
