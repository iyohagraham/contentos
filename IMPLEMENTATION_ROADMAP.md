# ContentOS — Implementation Roadmap
> ⚠️ **STALE — superseded by AGENTS.md (the canonical source of truth).** As of the **v2.0 pivot** ContentOS is an **AI Media Operating System** (21 engines + JSON contracts; OpenMontage removed). This file is kept only for historical phase tracking. For current architecture, engines, status, and roadmap, read **AGENTS.md**.

**Authority:** AGENTS.md supersedes this document. This document tracks historical build progress.
**Updated:** 2026-06-23 (frozen)

---

## Current Phase: Phase 0 → Phase 1 Transition

Phase 0 (Bug-fixes + Auth scaffold) is COMPLETE. Phase 1 (Foundation Infrastructure) is IN PROGRESS.

---

## Phase 0 — Stabilization [COMPLETE]
**Exit criteria met:** All bugs fixed, deployed, verified live.

| Item | Status | Commit |
|---|---|---|
| Dashboard KPI aggregation (string vs number) | ✅ Done | d76c248 |
| Seed race condition | ✅ Done | d76c248 |
| Calendar / publish field names | ✅ Done | 2d3054d |
| Analytics crash + NaN | ✅ Done | 5ea0ce9 |
| Safari composition preview | ✅ Done | 5ea0ce9 |
| Content search guard | ✅ Done | 8bf49f1 |
| MonetizeView operator precedence | ✅ Done | 8bf49f1 |
| Supabase Auth scaffold | ✅ Done | 7fc285f |
| RLS policies (video_posts + sales) | ✅ Done | 7fc285f |

---

## Phase 1 — Foundation Infrastructure [COMPLETE]
**Goal:** Production-grade database, server-side AI layer, provider abstraction, job queue.
**Commits:** 61aee7c (backend), 7aa34ec (frontend)

### P1.1 — Reference Documents [✅ COMPLETE]
- [x] MASTER_VISION.md
- [x] AUTONOMOUS_CONTENT_OS_VISION.md
- [x] SYSTEM_AUDIT.md
- [x] IMPLEMENTATION_ROADMAP.md
- [x] DATABASE_ARCHITECTURE.md
- [x] AGENT_ARCHITECTURE.md
- [x] CHANGELOG.md

### P1.2 — Database Schema Extension [✅ COMPLETE — supabase/schema_extension.sql]
- [x] pgvector + pg_trgm extensions
- [x] Knowledge system (6 tables + 2 match functions)
- [x] Research intelligence (4 tables + match function)
- [x] Channel intelligence (5 tables)
- [x] Skill system (3 tables + match function)
- [x] Agent system (3 tables)
- [x] Job queue (2 tables)
- [x] Content planning (3 tables)
- [x] Analytics extended (4 tables)
- [x] Workspace config table
- [x] Full RLS on all 28 new tables

### P1.3 — Server-Side AI Layer [✅ COMPLETE]
- [x] `api/_db.js`
- [x] `api/_providers/text.js` (Kimi + OpenAI fallback)
- [x] `api/_providers/embed.js` (text-embedding-3-small)
- [x] `api/_providers/image.js` (FLUX Pro/Dev)
- [x] `api/_providers/video.js` (Wan 2.7 + Flash)
- [x] `api/_providers/voice.js` (Qwen-3-TTS + Kokoro)
- [x] `api/_queue.js`
- [x] `api/generate-visual.js`
- [x] `api/generate-voice.js`

### P1.4 — Cron + Scheduling Fix [✅ COMPLETE]
- [x] Fixed `api/cron/process-scheduled.js` (PostizClient)
- [x] `api/cron/run-agents.js` (every 5 min)
- [x] `api/cron/research-scan.js` (Sundays 08:00 UTC)
- [x] `api/cron/learning-loop.js` (Sundays 22:00 UTC)
- [x] `vercel.json` updated

### P1.5 — New Views [✅ COMPLETE — partial refactor]
- [x] `src/views/KnowledgeView.jsx`
- [x] `src/views/ResearchView.jsx`
- [x] `src/views/IntelligenceView.jsx`
- [x] `src/views/AgentsView.jsx`
- [ ] Split existing views into files (DashboardView, etc.) — deferred (low priority, works fine inline)
- [ ] WorkspaceContext provider — deferred

---

## Phase 2 — Knowledge System [✅ COMPLETE]
**Goal:** Every AI call retrieves relevant knowledge before generating. Operators can import PDFs, YouTube, SOPs.
**Commits:** 61aee7c

### P2.1 — Ingestion Pipeline [✅ COMPLETE]
- [x] `api/knowledge/ingest.js` — unified ingestion router (URL/YouTube/GitHub/text → chunk → embed → AI objects)
- [x] `api/knowledge/_chunker.js` — paragraph-aware chunking, transcript chunking, code chunking
- [x] `api/knowledge/assets.js` — list/delete knowledge assets
- [ ] PDF chunking — deferred (add pdf-parse dep when needed)

### P2.2 — Knowledge Engine [✅ COMPLETE]
- [x] `api/knowledge/search.js` — semantic search (pgvector) + text fallback
- [x] `api/knowledge/rag.js` — RAG context builder injected into all agent system prompts

### P2.3 — RAG Integration [✅ COMPLETE]
- [x] Wire RAG into `api/generate-script.js`
- [x] Wire RAG into `api/generate-strategy.js`
- [x] Wire RAG into `api/generate-ideas.js`
- [x] Wire RAG into all agent calls (via `_base.js`)

---

## Phase 3 — Research Intelligence [✅ COMPLETE — core pipeline]
**Goal:** System automatically researches niches, competitors, and trending topics.
**Commits:** 61aee7c

- [x] `api/research/scan.js` — competitor URL analysis + trend/niche research
- [x] `api/research/results.js` — fetch results and query history
- [x] `api/cron/research-scan.js` — weekly auto-scan
- [x] `api/agents/research.js` — Research Agent (trends, competitors, niche)
- [ ] Deep YouTube video analysis (yt-dlp/oEmbed) — next iteration
- [ ] Web scraping with structured extraction — next iteration
- [ ] `api/research/trends.js` — trending topic detection
- [ ] `api/research/niche.js` — niche opportunity scoring

---

## Phase 4 — Channel Intelligence [✅ COMPLETE]
**Goal:** Reverse-engineer any channel into DNA, playbooks, and version templates.
**Commits:** 61aee7c

- [x] `api/intelligence/analyze.js` — full pipeline: meta fetch → AI DNA extraction (4 blueprints, 10 scores) → playbooks → Version Builder
- [x] `api/intelligence/playbooks.js` — list playbooks; apply formula to any topic (3 variations)
- [ ] `api/intelligence/compare.js` — multi-channel comparison (next iteration)

---

## Phase 5 — Content Planning [✅ COMPLETE]
**Goal:** Strategy Brain + Planning Engine generate a full content calendar from a brief.
**Commits:** 61aee7c

- [x] `api/planning/calendar.js` — 30-day calendar with 5-factor opportunity scoring
- [x] `api/planning/campaign.js` — campaign/series/launch sequence builder with phase-by-phase plan
- [x] `api/agents/planning.js` — Planning Agent (calendar from strategy + learning insights)
- [ ] `api/planning/score.js` — standalone scoring endpoint (inline for now)

---

## Phase 6 — Content Production [✅ COMPLETE — core pipeline]
**Goal:** Full media pipeline — script → images → video → voice → assembled MP4.
**Commits:** (this session)

- [x] `api/agents/media.js` — Media Agent (FLUX scene images + Qwen-TTS voice + Wan 2.7 motion, 3 modes)
- [x] `api/production/assemble.js` — FFmpeg assembly (image slideshow + audio → H.264 MP4 + Vercel Blob upload)
- [x] `api/_blob.js` — Vercel Blob helper (uploadBuffer, reuploadUrl — makes ephemeral fal.ai URLs permanent)
- [x] `api/agents/run.js` — media agent registered
- [x] `package.json` — @vercel/blob + ffmpeg-static added
- [ ] `api/production/caption.js` — caption burn-in (next iteration)
- [ ] `src/views/ProductionView.jsx` — dedicated production UI (queued)

---

## Phase 7 — Publishing [✅ COMPLETE]
**Goal:** Content distributes to configured platforms on schedule, automatically.
**Commits:** (this session)

- [x] `api/agents/publishing.js` — Publishing Agent (Postiz multi-channel delivery, batch + single-video modes)
- [x] `api/cron/process-scheduled.js` — refactored to delegate to Publishing Agent per workspace
- [x] `api/agents/run.js` — publishing agent registered
- [x] AgentsView — Publishing Agent card + result display
- [ ] `api/publish/schedule.js` — schedule-post endpoint (deferred — use content_calendar flow)

---

## Phase 8 — Analytics [PLANNED]
**Goal:** All performance data tracked, attributed, and surfaced as actionable insights.
**Exit criteria:** Post performance tracked across platforms. Revenue attributed to content. Weekly insight report generated.

- [ ] `api/analytics/track.js` — performance tracking ingest
- [ ] `api/analytics/aggregate.js` — cross-platform aggregation
- [ ] `api/analytics/insights.js` — AI-powered insight generation
- [ ] `api/analytics/revenue.js` — revenue attribution (UTM → content)
- [ ] Weekly digest generation

---

## Phase 9 — Autonomous Agents [PLANNED]
**Goal:** 11 agents running autonomously in Autonomous Brand Mode.
**Exit criteria:** Brand Mode workspace operates for 7 days without human input. All agents communicate through DB/queue. No agent imports another directly.

- [ ] `api/agents/_orchestrator.js` — agent runner (reads job queue, dispatches)
- [ ] `api/agents/strategy.js` — Strategy Agent
- [ ] `api/agents/research.js` — Research Agent
- [ ] `api/agents/analysis.js` — Analysis Agent
- [ ] `api/agents/planning.js` — Planning Agent
- [ ] `api/agents/writing.js` — Writing Agent
- [ ] `api/agents/media.js` — Media Agent
- [ ] `api/agents/publishing.js` — Publishing Agent
- [ ] `api/agents/analytics.js` — Analytics Agent
- [ ] `api/agents/optimization.js` — Optimization Agent
- [ ] `api/agents/monetization.js` — Monetization Agent
- [ ] `api/agents/notification.js` — Notification Agent
- [ ] `api/cron/run-agents.js` — cron-triggered agent dispatcher

---

## Phase 10 — Autonomous Brand Mode [IN PROGRESS]
**Goal:** Operator sets brief once. System runs the brand indefinitely.
**Exit criteria:** 30-day autonomous run on test workspace with zero human input.

- [x] Workspace operating mode selector (Creator / Project / Brand) — WorkspaceConfigView
- [x] Brand brief form (niche, tone, audience, unique angle) — WorkspaceConfigView
- [x] Review gate configurator (scripts / media / publish toggles) — WorkspaceConfigView
- [x] Real workspace_id resolution from Supabase auth — useWorkspace hook
- [x] Autonomous loop closed: Planning → Writing → Media → Publishing → Analytics → Optimization
- [ ] Autonomous loop monitoring dashboard (job queue status + agent run history)
- [ ] Notification Agent (alert on failures, weekly digest, approval requests)
- [ ] 30-day brand health report
- [ ] Brand Mode test run (needs Supabase + Postiz live)

---

## Debt Tracker

| Item | Severity | Notes |
|---|---|---|
| `workspace_id: 'default'` hardcoded in publish handler | Medium | Fix when Supabase goes live |
| KIMI_API_KEY in git history | HIGH | Rotate at console.moonshot.ai |
| Dead social connectors (tiktok.js, instagram.js, etc.) | Low | Remove in P1.5 refactor |
| ~~openmontage-bridge.js broken GSAP CDN URL~~ | ✅ Resolved | OpenMontage removed in v2.0; bridge deleted → replaced by the Composition Engine `api/_engines/composition/hyperframes.js` (CDN URL fixed). |
| fal.js client-side key exposure | High | Fixed in P1.3 (server routes) |
| App.jsx 2200+ lines | Medium | Fixed in P1.5 refactor |

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-23 | localStorage as primary DB until Supabase connected | No blocking dependency; works immediately |
| 2026-06-23 | Kimi k2.7-code-highspeed as primary text AI | 13× faster than standard, same quality |
| 2026-06-23 | FAL_KEY as single key for image+video+voice | Cheapest path, least account sprawl |
| 2026-06-23 | PostizClient as social publishing layer | Operator-deployable, vendor-agnostic |
| 2026-06-23 | Vercel Blob for generated asset persistence | fal.ai URLs are ephemeral (24h) |
