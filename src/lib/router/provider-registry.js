/**
 * Provider Registry — provider metadata + runtime adapter injection.
 *
 * PURE module: no imports from api/, no process.env, no secrets. It holds:
 *   - static provider descriptors ({ id, name, enabled }), seeded from the
 *     model-registry's PROVIDERS list
 *   - a Map of providerId → injected generate adapter (attached at runtime by the
 *     server bootstrap api/_providers/router-adapters.js)
 *
 * The frontend can import this safely — no adapter is registered there, so no
 * server code/secrets leak into the bundle.
 */
import { PROVIDERS } from './model-registry.js'

/** @type {Map<string, { id: string, name: string, enabled: boolean }>} */
const _providers = new Map()
/** @type {Map<string, (request: object) => Promise<object>>} */
const _adapters = new Map()

// Seed static descriptors.
for (const p of PROVIDERS) _providers.set(p.id, { id: p.id, name: p.name, enabled: p.enabled !== false })

/**
 * Upsert a provider descriptor.
 * @param {{ id: string, name?: string, enabled?: boolean }} desc
 */
export function registerProvider({ id, name, enabled = true } = {}) {
  if (!id) return
  const existing = _providers.get(id) || {}
  _providers.set(id, { id, name: name || existing.name || id, enabled: enabled !== false })
}

/**
 * Flip a provider's enabled flag (e.g. server sets enabled = key-present).
 * @param {string} id
 * @param {boolean} enabled
 */
export function setProviderEnabled(id, enabled) {
  const p = _providers.get(id)
  if (p) p.enabled = !!enabled
  else _providers.set(id, { id, name: id, enabled: !!enabled })
}

/** @param {string} id @returns {boolean} */
export function isProviderEnabled(id) {
  const p = _providers.get(id)
  return !!(p && p.enabled)
}

/** @returns {{ id: string, name: string, enabled: boolean }[]} */
export function listProviders() {
  return Array.from(_providers.values()).map((p) => ({ ...p }))
}

/**
 * Attach the runtime generate adapter for a provider.
 * @param {string} providerId
 * @param {(request: object) => Promise<object>} generateFn
 */
export function registerAdapter(providerId, generateFn) {
  if (!providerId || typeof generateFn !== 'function') return
  _adapters.set(providerId, generateFn)
}

/** @param {string} providerId @returns {((request: object) => Promise<object>)|null} */
export function getAdapter(providerId) {
  return _adapters.get(providerId) || null
}

/** @param {string} providerId @returns {boolean} */
export function hasAdapter(providerId) {
  return _adapters.has(providerId)
}
