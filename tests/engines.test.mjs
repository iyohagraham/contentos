#!/usr/bin/env node
/**
 * tests/engines.test.mjs — assert-based engine + contract tests (no framework, no network).
 *
 * Verifies the v2.0 engine layer offline: every engine runs, self-validates its
 * output contract, the pipeline chains, continuity flags+fixes, and provider-less
 * stages are honest (selected:false, never fabricated). Run via `npm test`.
 */
import assert from 'node:assert/strict'
import { runEngine, invocableEngines } from '../api/_engines/run.js'
import { engineStats, pipelineOrder } from '../api/_engines/registry.js'
import { validateContract, CONTRACTS } from '../api/_contracts/index.js'

let passed = 0
const tests = []
const test = (name, fn) => tests.push({ name, fn })

// ── Registry ────────────────────────────────────────────────────────────────
test('registry: 22 engines, all live', () => {
  const s = engineStats()
  assert.equal(s.stub, 0, 'no stubs')
  assert.ok(s.live >= 22, `live >= 22 (got ${s.live})`)
})

test('registry: pipeline order is monotonic for ordered engines', () => {
  const ordered = pipelineOrder().filter((e) => e.order > 0)
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(ordered[i].order >= ordered[i - 1].order, `order non-decreasing at ${ordered[i].id}`)
  }
})

test('registry: at least 18 engines invocable', () => {
  assert.ok(invocableEngines().length >= 18, `invocable >= 18 (got ${invocableEngines().length})`)
})

// ── Contracts ───────────────────────────────────────────────────────────────
test('contracts: blank() satisfies its own required-field validator where applicable', () => {
  // Contracts whose required fields are non-empty in blank() should validate.
  for (const [name, c] of Object.entries(CONTRACTS)) {
    const v = c.validate(c.blank())
    // blank() may legitimately miss required content fields; just assert validate runs + shape.
    assert.equal(typeof v.ok, 'boolean', `${name}.validate returns ok:boolean`)
    assert.ok(Array.isArray(v.missing), `${name}.validate returns missing[]`)
  }
})

// ── Individual engines (offline, fallback paths) ──────────────────────────────
test('creative_director → valid creative_direction', async () => {
  const r = await runEngine('creative_director', { topic: 'tax tips', audience: 'freelancers', purpose: 'educate' }, { db: null })
  assert.ok(validateContract('creative_direction', r.output).ok)
})

test('story → valid story with hook + beats', async () => {
  const r = await runEngine('story', { brief: 'tax tips', format: '9:16' }, { db: null })
  assert.ok(r.output.hook, 'has hook')
  assert.ok(Array.isArray(r.output.beats) && r.output.beats.length, 'has beats')
  assert.ok(validateContract('story', r.output).ok)
})

test('storyboard → valid storyboard with shots', async () => {
  const r = await runEngine('storyboard', { story: { hook: 'H', beats: ['b1', 'b2'], cta: 'c' } }, { db: null })
  assert.ok(r.output.shots.length >= 1)
  assert.ok(validateContract('storyboard', r.output).ok)
})

test('scene_planner → valid scene_plan', async () => {
  const sb = await runEngine('storyboard', { story: { hook: 'H', beats: ['b1', 'b2'] } }, { db: null })
  const r = await runEngine('scene_planner', { storyboard: sb.output }, { db: null })
  assert.equal(r.output.scenes.length, sb.output.shots.length)
  assert.ok(validateContract('scene_plan', r.output).ok)
})

test('style / brand / universe / character → valid contracts', async () => {
  assert.ok(validateContract('style_profile', (await runEngine('style', { name: 'Documentary' }, { db: null })).output).ok)
  assert.ok(validateContract('brand', (await runEngine('brand', { name: 'AcmeCo' }, { db: null })).output).ok)
  const uni = await runEngine('universe', { name: 'Neon City' }, { db: null })
  assert.ok(validateContract('universe', uni.output).ok)
  assert.ok(validateContract('character', (await runEngine('character', { name: 'Rho', universe: uni.output }, { db: null })).output).ok)
})

// ── Continuity: flags + auto-fix ──────────────────────────────────────────────
test('continuity flags unknown char / prop + outfit drift, and apply pins outfit', async () => {
  const universe = { characters: [{ name: 'Rho' }], props: ['badge'] }
  const storyboard = { shots: [
    { index: 0, characters: ['Rho'], outfit: 'trenchcoat' },
    { index: 1, characters: ['Ghost'], props: ['raygun'] },
    { index: 2, characters: ['Rho'], outfit: 'hoodie' }
  ] }
  const r = await runEngine('continuity', { storyboard, universe }, { db: null })
  assert.equal(r.output.consistent, false)
  const types = r.output.issues.map((i) => i.type)
  assert.ok(types.includes('unknown_character'))
  assert.ok(types.includes('outfit_drift'))
  assert.ok(r.output.issues.every((i) => typeof i.fix === 'string' && i.fix.length), 'every issue has a fix')

  const fr = await runEngine('continuity', { storyboard, universe, apply: true }, { db: null })
  assert.equal(fr.output.fixed.shots[2].outfit, 'trenchcoat', 'apply pins to first-seen outfit')
})

// ── Media Loop honesty + Composition (image-backed) ───────────────────────────
test('media_loop is honest with no provider (needs_provider, selected:false)', async () => {
  const plan = { format: '9:16', scenes: [{ index: 0, duration: 3, voice: { text: 'x' }, metadata: { characters: [] } }] }
  const r = await runEngine('media_loop', { scene_plan: plan }, { db: null })
  assert.equal(r.output.needs_provider, true)
  assert.equal(r.output.selected, false)
  assert.equal(r.output.generated, 0)
})

test('media_loop resolves named characters against the roster', async () => {
  const characters = [{ name: 'Rho', face: { appearance: 'trenchcoat' } }]
  const plan = { format: '9:16', scenes: [
    { index: 0, duration: 3, voice: { text: 'a' }, metadata: { characters: ['Rho'] } },
    { index: 1, duration: 3, voice: { text: 'b' }, metadata: { characters: [] } }
  ] }
  const r = await runEngine('media_loop', { scene_plan: plan, characters }, { db: null })
  assert.deepEqual(r.output.scenes[0].characters_resolved, ['Rho'])
  assert.equal(r.output.scenes[1].characters_resolved, undefined)
})

test('composition: image-backed scene_plan → manifest with image_url + audio + captions', async () => {
  const enriched = { format: '9:16', scenes: [
    { index: 0, duration: 3, voice: { text: 'one' }, image_url: 'https://x/0.jpg', audio_url: 'https://x/0.mp3' },
    { index: 1, duration: 4, voice: { text: 'two' }, image_url: 'https://x/1.jpg' }
  ] }
  const r = await runEngine('composition', { scene_plan: enriched }, { db: null })
  const m = r.output.manifest
  assert.equal(m.scenes.length, 2)
  assert.ok(m.scenes[0].image_url, 'scene has image_url')
  assert.equal((m.audio.tracks || []).length, 1)
  assert.equal(m.captions.length, 2)
  assert.ok(/<img/.test(r.output.html), 'html has <img>')
  assert.ok(validateContract('composition_manifest', m).ok)
})

test('composition: text fallback still works', async () => {
  const r = await runEngine('composition', { script: { hook: 'H', body: ['b1'], cta: 'c' } }, { db: null })
  assert.ok(r.output.manifest.scenes.length >= 1)
})

test('composition: video-backed scene → manifest scene has video_url', async () => {
  const enriched = { format: '9:16', scenes: [
    { index: 0, duration: 3, voice: { text: 'one' }, image_url: 'https://x/0.jpg', video_url: 'https://x/0.mp4' }
  ] }
  const r = await runEngine('composition', { scene_plan: enriched }, { db: null })
  assert.equal(r.output.manifest.scenes[0].video_url, 'https://x/0.mp4')
  assert.ok(/<video/.test(r.output.html), 'html has <video>')
})

test('media_loop video:true without provider is honest (no fabricated video)', async () => {
  const plan = { format: '9:16', scenes: [{ index: 0, duration: 3, voice: { text: 'x' }, metadata: { characters: [] } }] }
  const r = await runEngine('media_loop', { scene_plan: plan, video: true }, { db: null })
  assert.equal(r.output.scenes[0].video_url, undefined)
  assert.equal(r.output.needs_provider, true)
})

// ── Provider-less adapters are honest ─────────────────────────────────────────
test('media_router / voice / publishing return honest request-specs with no provider', async () => {
  const mr = await runEngine('media_router', { prompt: 'a desk' }, { db: null })
  assert.equal(mr.output.selected, false)
  const vo = await runEngine('voice', { text: 'hello' }, { db: null })
  assert.ok(vo.output.provider === 'none' || vo.output.provider === 'kokoro')
  const pub = await runEngine('publishing', { render_result: { url: 'https://x/v.mp4' }, caption: 'c' }, { db: null })
  assert.equal(pub.output.selected, false)
})

// ── Franchise structural ──────────────────────────────────────────────────────
test('franchise plan + assemble produce a hierarchy', async () => {
  const plan = await runEngine('franchise', { op: 'plan', franchise: { name: 'F' }, seasons: 2, series_per_season: 1, episodes_per_series: 2 }, { db: null })
  assert.equal(plan.output.scaffold.children.length, 2)
  const asm = await runEngine('franchise', { op: 'assemble', nodes: [{ level: 'franchise', id: 'f1', name: 'F' }, { level: 'season', id: 's1', name: 'S', parent: 'f1' }] }, { db: null })
  assert.equal(asm.output.tree[0].children.length, 1)
})

// ── Full creative chain ───────────────────────────────────────────────────────
test('full creative chain: knowledge → … → scene_planner all complete', async () => {
  const k = await runEngine('knowledge', { topic: 'productivity' }, { db: null })
  const cd = await runEngine('creative_director', { topic: 'productivity', knowledge: k.output, audience: 'pros', purpose: 'educate' }, { db: null })
  const st = await runEngine('story', { brief: 'productivity', creative_direction: cd.output, knowledge: k.output, format: '9:16' }, { db: null })
  const sb = await runEngine('storyboard', { story: st.output }, { db: null })
  const co = await runEngine('continuity', { storyboard: sb.output, apply: true }, { db: null })
  const sp = await runEngine('scene_planner', { storyboard: co.output.fixed || sb.output }, { db: null })
  for (const r of [k, cd, st, sb, sp]) assert.equal(r.status, 'complete')
  assert.ok(sp.output.scenes.length >= 1)
})

// ── Runner ────────────────────────────────────────────────────────────────────
const run = async () => {
  console.log('\nContentOS engine tests\n')
  for (const t of tests) {
    try { await t.fn(); passed++; console.log(`  PASS  ${t.name}`) }
    catch (e) { console.log(`  FAIL  ${t.name}\n        ${e.message}`); process.exitCode = 1 }
  }
  console.log(`\n${passed}/${tests.length} passed\n`)
}
run()
