# ContentOS — Project Handoff

> Single-page handoff for any engineer or AI agent taking over **ContentOS**.
> Generated 2026-06-24. Source of truth for architecture is **AGENTS.md**;
> this page is the orientation + go-live map.

---

## 1. What ContentOS is

An **AI Media Operating System** — not just a video generator. An operator builds a
brand **Library** (style / universe / characters), creates a **Project** from a
one-line brief, and the system autonomously runs a 22-engine pipeline to produce
and publish character-consistent, on-brand videos.

**Pipeline:** Knowledge → Creative Direction → Story → Storyboard → Continuity
(auto-fix) → Scene Plan → **Media Loop** (per-scene image/video + voice,
character-consistent) → Composition (HyperFrames) → Render (FFmpeg) → Publish (Postiz).

---

## 2. Links

| | |
|---|---|
| **Live app** | https://contentos-kappa.vercel.app |
| **Health** | https://contentos-kappa.vercel.app/api/health |
| **Engine introspection** | https://contentos-kappa.vercel.app/api/engines |
| **Source (public repo)** | https://github.com/iyohagraham/contentos |
| **Local checkout** | `/Users/iyohagraham/ContentOS` |
| **Hosting** | Vercel — project `contentos` (`prj_9IVJ7hBMPkUPudAkP2DKuy3od4No`) |

> ⚠️ **The live URL is likely an OLDER build.** The current v2.0 work is on
> `origin/main` but **not deployed** — `git push` does NOT deploy; only
> `vercel --prod` does. Confirm with the smoke test (§6) before trusting the live site.

---

## 3. Read these, in order

1. **AGENTS.md** — canonical architecture, the 21+1 engines, JSON contracts, decisions, Agent Memory log
2. **STATUS.md** — current state + **BLOCKED** items + health checks
3. **ACTIVATION.md** — exact go-live runbook (the path from "built" to "producing videos")
4. **ROADMAP.md** / **TASKS.md** — direction + work queue
5. **CHANGELOG.md** — release history
6. `.env.example` — every environment variable the code reads
7. `docs/archive/` — stale pre-v2.0 docs (ignore; kept for history)

---

## 4. Architecture at a glance

- **Frontend:** React 18 + Vite + Tailwind (code-split per view). Main UI is `src/views/StudioView.jsx` (Projects / Library / Franchises / Usage tabs).
- **Backend:** Vercel serverless functions — **plain JS ESM, Node 24** (no TS build step).
- **Engines:** `api/_engines/` — `defineEngine()` base, `registry.js` (catalog), `run.js` (invoker). Standalone engines + `adapters/` wrapping existing impls. **22 engines, all live, 18 invocable.**
- **Contracts:** `api/_contracts/index.js` — 15 documented JSON contracts every engine speaks + `validateContract()`.
- **Orchestration:** `api/studio/pipeline.js` (run a project end-to-end, resumable) + `api/cron/advance-projects.js` (autonomous, every 5 min).
- **DB/Auth:** Supabase (Postgres + pgvector + RLS). Schema: `supabase/schema.sql` then `supabase/schema_extension.sql` (apply in that order; idempotent).
- **Providers (all replaceable via routers):** Runware (images, primary), fal.ai (video/voice), HyperFrames (composition), FFmpeg (render), Postiz (publishing), Kimi/OpenAI (text/embeddings).
- **Crons (vercel.json):** process-scheduled, run-agents, advance-projects, research-scan, learning-loop.

---

## 5. Repo state

- Branch `main`, in sync with `origin/main`. ~86 commits.
- `npm run verify` → **111 files checked (0 failed) · 19/19 tests · build green.**
- Git history is clean: a previously-leaked `KIMI_API_KEY` was **purged from all
  history** (`git filter-repo` + force-push). The key must still be **rotated**
  (the repo is public; assume the old key is compromised).

---

## 6. Verify it yourself

```bash
cd /Users/iyohagraham/ContentOS
npm install
npm run verify                                          # check + test + build (offline)
node scripts/smoke.mjs https://contentos-kappa.vercel.app   # what's actually LIVE
```

`npm run verify` runs: `scripts/check.mjs` (node --check all api), `tests/engines.test.mjs`
(19 offline engine/contract tests), and `vite build`. The smoke test hits the live
deployment and reports its engine stats — if it shows fewer than 22 engines, the
live site is an old build and needs a redeploy.

---

## 7. ⚠️ BLOCKED — operator actions only (all code is built & waiting)

These require external accounts/services and are **not** done autonomously. Each has
everything-else implemented; do them in order (full detail in **ACTIVATION.md**):

| # | Action | Where |
|---|---|---|
| 0 | **Rotate the KIMI key** (repo public; was exposed) | platform.moonshot.ai |
| 1 | **Provision Supabase**, run `schema.sql` then `schema_extension.sql` | supabase.com |
| 2 | **Set env vars** (Supabase, Runware, FAL, Kimi, OpenAI, Postiz, CRON_SECRET) | Vercel + `.env.local` |
| 3 | **Fund Runware/FAL + deploy Postiz** (Railway) | providers |
| 4 | **Deploy:** `vercel --prod`, then smoke-test | CLI |
| 5 | *(optional)* alert webhook/mailer endpoint (`ALERT_WEBHOOK_URL`) | your choice |

Until funded, the pipeline runs the full creative chain and pauses (`blocked`) at
the first provider gate — by design, never fabricating assets.

---

## 8. Where to pick up next (unblocked, optional)

From TASKS.md "Future ideas": project timeline/Gantt view, A/B branch compare,
per-workspace provider-key UI, async provider webhook receiver (Runware/FAL job
callbacks). All planned in-scope work is already complete.

---

## 9. House rules for whoever continues

- Plain JS ESM + JSDoc (no TypeScript). Match existing module patterns.
- Engines exchange **contracts** only; never call a provider directly — go through a router. Keep `src/lib/router/*` pure (no secrets).
- Engines must self-validate output + never hard-fail; provider-less paths return honest `selected:false` specs.
- After any significant change: update **AGENTS.md** (Current Status + Agent Memory) and the tracking docs; run `npm run verify`; commit per feature.
- Secrets: server-only env, never client bundle, never committed.
- `vercel --prod` only when explicitly asked.
