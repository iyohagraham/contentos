#!/usr/bin/env node
/**
 * scripts/check.mjs — syntax-check every backend file (api/**\/*.js) with `node --check`.
 * Cross-platform (no find/-exec). Exits non-zero on the first failure. `npm run check`.
 */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (name.endsWith('.js')) out.push(p)
  }
  return out
}

const files = walk('api')
let failed = 0
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }) }
  catch (e) { failed++; console.error(`FAIL  ${f}\n${e.stderr?.toString() || e.message}`) }
}
console.log(`\nchecked ${files.length} files, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
