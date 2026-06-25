#!/usr/bin/env node
/**
 * scripts/smoke.mjs — post-deploy smoke test for a live ContentOS deployment.
 *
 * Usage:
 *   node scripts/smoke.mjs https://contentos-kappa.vercel.app
 *   BASE=https://… node scripts/smoke.mjs
 *
 * Pure Node (no deps). Exits non-zero on any hard failure. Soft-skips checks that
 * require a provisioned backend (Supabase) — reports them as SKIP, not FAIL, so it
 * is meaningful both before and after the cloud layer is activated.
 */
const BASE = (process.argv[2] || process.env.BASE || '').replace(/\/+$/, '')
if (!BASE) {
  console.error('usage: node scripts/smoke.mjs <BASE_URL>   (or BASE=… node scripts/smoke.mjs)')
  process.exit(2)
}

let pass = 0, fail = 0, skip = 0
const ok = (m) => { pass++; console.log(`  PASS  ${m}`) }
const bad = (m) => { fail++; console.log(`  FAIL  ${m}`) }
const skp = (m) => { skip++; console.log(`  SKIP  ${m}`) }

async function getJSON(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-json */ }
  return { status: res.status, ok: res.ok, json, text }
}

async function main() {
  console.log(`\nContentOS smoke test → ${BASE}\n`)

  // 1. Health
  try {
    const r = await getJSON('/api/health')
    r.status === 200 ? ok('/api/health 200') : bad(`/api/health ${r.status}`)
  } catch (e) { bad(`/api/health threw: ${e.message}`) }

  // 2. Engines architecture — must report 22 live, 0 stub
  let workspaceId = 'default'
  try {
    const r = await getJSON('/api/engines')
    if (r.status === 200 && r.json?.stats) {
      const { total, live, stub } = r.json.stats
      ok(`/api/engines stats total=${total} live=${live} stub=${stub}`)
      if (live >= 22 && stub === 0) { ok('engine count: all live') } else { bad(`engine count off (live=${live} stub=${stub})`) }
      if (Array.isArray(r.json.pipeline) && r.json.pipeline.length >= 18) { ok(`pipeline has ${r.json.pipeline.length} stages`) } else { bad('pipeline too short') }
    } else bad(`/api/engines ${r.status}`)
  } catch (e) { bad(`/api/engines threw: ${e.message}`) }

  // 3. Invoke a pure engine via ?run= (no provider needed) — storyboard
  try {
    const body = JSON.stringify({ story: { hook: 'Smoke hook', beats: ['b1', 'b2'], cta: 'cta' } })
    const r = await getJSON('/api/engines?run=storyboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    if (r.status === 200 && Array.isArray(r.json?.output?.shots) && r.json.output.shots.length) ok(`engine run storyboard → ${r.json.output.shots.length} shots`)
    else bad(`engine run storyboard failed (${r.status})`)
  } catch (e) { bad(`engine run threw: ${e.message}`) }

  // 4. Projects list — SKIP if no DB (503/no-db), else PASS
  let dbLive = false
  try {
    const r = await getJSON(`/api/projects?workspace_id=${workspaceId}`)
    if (r.status === 200 && Array.isArray(r.json?.projects)) {
      if (r.json.mode === 'no-db') skp('/api/projects (Supabase not provisioned)')
      else { dbLive = true; ok(`/api/projects 200 (${r.json.projects.length} projects)`) }
    } else bad(`/api/projects ${r.status}`)
  } catch (e) { bad(`/api/projects threw: ${e.message}`) }

  // 5. End-to-end (only when DB live): create a throwaway project + run creative pipeline.
  if (dbLive) {
    let projectId = null
    try {
      const r = await getJSON('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: workspaceId, title: `smoke-${Date.now()}`, brief: 'smoke test brief about productivity', format: '9:16' }) })
      if (r.status === 200 && r.json?.project?.id) { projectId = r.json.project.id; ok('created throwaway project') }
      else bad(`create project ${r.status}`)
    } catch (e) { bad(`create project threw: ${e.message}`) }

    if (projectId) {
      try {
        const r = await getJSON('/api/studio/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: workspaceId, project_id: projectId, to: 'storyboard' }) })
        if (r.status === 200 && Array.isArray(r.json?.ran)) ok(`pipeline ran ${r.json.ran.length} stages → ${r.json.status}`)
        else bad(`pipeline run ${r.status}: ${r.json?.error || ''}`)
      } catch (e) { bad(`pipeline run threw: ${e.message}`) }
      // cleanup
      try { await getJSON(`/api/projects?id=${projectId}`, { method: 'DELETE' }); ok('cleaned up throwaway project') } catch { skp('cleanup failed (non-fatal)') }
    }
  } else {
    skp('end-to-end project run (needs Supabase)')
  }

  console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped\n`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('smoke runner crashed:', e); process.exit(1) })
