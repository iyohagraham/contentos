# ContentOS — STATUS

> Live status snapshot for autonomous development. AGENTS.md is the architecture
> source of truth; this file tracks what's done / in-progress / blocked **right now**.
> **Updated:** 2026-06-24

## Current State

ContentOS v2.0 — an AI Media Operating System. Fully built; runs in
localStorage/demo mode with zero keys. Cloud + media + autonomy layers activate
once external accounts are provisioned (see `ACTIVATION.md`).

- **Engines:** 22 (all live), 18 invocable through `api/_engines/run.js`.
- **Pipeline:** Knowledge → Creative Direction → Story → Storyboard → Continuity
  (auto-fix) → Scene Plan → Media Loop (per-scene image+voice, character-consistent)
  → Composition (HyperFrames) → Rendering (FFmpeg) → Publishing (Postiz).
- **Autonomy:** `api/cron/advance-projects.js` advances projects every 5 min.
- **UI:** Studio (Projects + Library tabs), resumable projects, per-stage JSON editor.
- **Schema:** base + extension incl. 7 v2.0 tables (media_projects, engine_outputs,
  style_profiles, brands, universes, characters, franchises).
- **Build/health:** `vite build` green; all `api/*.js` pass `node --check`; repo
  public; leaked KIMI key purged from all git history.

## In Progress

- ✅ **Phase C (quality/DX) complete.**
- ✅ **Phase E complete** (all unblocked items): Usage dashboard, Franchise
  navigator, stage versioning + restore, branch-from-stage, character face-lock
  inputs, per-scene Wan video, pluggable alert dispatcher.
- **No unblocked code work remains in scope.** Next progress = operator activation
  (`ACTIVATION.md`) + optional alert endpoint. Future ideas listed in TASKS.md.
- **Verify suite:** `npm run verify` → 111 files checked, 19/19 tests, build green.

## Done (recent)

See `CHANGELOG.md`. Highlights: v2.0 pivot, 21→22 engines live, autonomous
orchestrator + cron, Studio UI, Library building blocks, character consistency,
continuity auto-fix, activation runbook.

## BLOCKED (needs external credentials/accounts — NOT code)

These cannot be completed in-repo; everything around them is built and waiting.

| Item | Blocked on | What's ready |
|---|---|---|
| Live DB / projects / persistence | Supabase project + keys | schema files, all endpoints, `coerceWorkspaceId` |
| Real image/video generation | Runware/FAL funded keys | Media Router + Media Loop (honest request-specs without keys) |
| Voice generation | FAL key / local Kokoro | Voice adapter (request-spec fallback) |
| Publishing | Postiz deploy + key | Publishing adapter (request-spec fallback) |
| Music tracks | PIXABAY_API_KEY / provider | Music Engine (request-spec fallback) |
| Production deploy | Vercel env + `vercel --prod` | `vercel.json`, build green, `ACTIVATION.md` |
| KIMI key rotation | operator Moonshot account | key purged from history; rotation is account-side |
| External alert delivery | a webhook/mailer endpoint (`ALERT_WEBHOOK_URL` or `ALERT_EMAIL_WEBHOOK_URL`) | **dispatcher built + wired** (`api/monitor/dispatch.js`); no-op until a channel env var is set — then alerts deliver with zero code change |

**Resolution path:** follow `ACTIVATION.md` steps 0–3.

## Health Checks

```bash
cd /Users/iyohagraham/ContentOS
npm run build                                   # frontend builds clean
find api -name '*.js' -exec node --check {} \;  # backend syntax
npm test                                        # engine/contract self-tests (no network)
node scripts/smoke.mjs <BASE_URL>               # post-deploy smoke (needs a live deploy)
```
