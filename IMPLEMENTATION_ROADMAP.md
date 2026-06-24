# ContentOS — Implementation Roadmap
**Authority:** MASTER_VISION.md supersedes this document on direction. This document tracks build progress.
**Updated:** 2026-06-23

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

## Phase 1 — Foundation Infrastructure [IN PROGRESS]
**Goal:** Production-grade database, server-side AI layer, provider abstraction, job queue.
**Exit criteria:** Every API call goes server-side. DB schema covers all 12 systems. Queue handles long-running jobs. No client-side API keys.

### P1.1 — Reference Documents [IN PROGRESS]
- [x] MASTER_VISION.md
- [x] AUTONOMOUS_CONTENT_OS_VISION.md
- [x] SYSTEM_AUDIT.md
- [ ] IMPLEMENTATION_ROADMAP.md ← this file
- [ ] DATABASE_ARCHITECTURE.md
- [ ] AGENT_ARCHITECTURE.md
- [ ] CHANGELOG.md

### P1.2 — Database Schema Extension
- [ ] Enable pgvector extension
- [ ] Knowledge system tables (6 tables: assets, chunks, objects, relationships, jobs, search_log)
- [ ] Research intelligence tables (4 tables: research_queries, research_results, competitor_analyses, market_signals)
- [ ] Channel intelligence tables (5 tables: channel_analyses, content_samples, playbooks, versions, jobs)
- [ ] Skill system tables (6 tables: manifests, versions, sources, assignments, invocations, compositions)
- [ ] Agent system tables (3 tables: agent_runs, agent_messages, agent_tools)
- [ ] Job queue tables (2 tables: jobs, job_logs)
- [ ] Content planning tables (3 tables: campaigns, campaign_posts, content_calendar)
- [ ] Analytics tables (4 tables: post_analytics, platform_snapshots, revenue_events, learning_insights)
- [ ] Workspace config table (operating mode, autonomy settings)

### P1.3 — Server-Side AI Layer
- [ ] `api/_db.js` — server-side Supabase (service key)
- [ ] `api/_providers/text.js` — TextProvider (Kimi primary, OpenAI fallback)
- [ ] `api/_providers/image.js` — ImageProvider (FLUX via fal.ai)
- [ ] `api/_providers/video.js` — VideoProvider (Wan 2.7 via fal.ai)
- [ ] `api/_providers/voice.js` — VoiceProvider (Qwen-TTS / Kokoro)
- [ ] `api/_queue.js` — Job queue abstraction
- [ ] `api/generate-visual.js` — server-side image/video endpoint (replaces client fal.js)
- [ ] `api/generate-voice.js` — server-side voice endpoint

### P1.4 — Cron + Scheduling Fix
- [ ] Fix `api/cron/process-scheduled.js` — use PostizClient, raise to */5 * * * *
- [ ] Add `api/cron/run-agents.js` — autonomous brand mode agent runner
- [ ] Add `api/cron/research-scan.js` — weekly research refresh
- [ ] Add `api/cron/learning-loop.js` — Sunday learning loop
- [ ] Update `vercel.json` with new cron schedules

### P1.5 — App.jsx Refactor
- [ ] Split into per-view components (DashboardView, CalendarView, etc.)
- [ ] Add WorkspaceContext provider
- [ ] Add KnowledgeView
- [ ] Add ResearchView
- [ ] Add AgentsView

---

## Phase 2 — Knowledge System [PLANNED]
**Goal:** Every AI call retrieves relevant knowledge before generating. Operators can import PDFs, YouTube, SOPs.
**Exit criteria:** Knowledge base searchable. RAG active in all generation endpoints. Ingestion pipeline working for PDF + URL.

### P2.1 — Ingestion Pipeline
- [ ] `api/knowledge/ingest.js` — document ingestion router
- [ ] `api/knowledge/ingest-pdf.js` — PDF chunking + embedding
- [ ] `api/knowledge/ingest-url.js` — URL scrape + chunk + embed
- [ ] `api/knowledge/ingest-youtube.js` — YouTube transcript + embed
- [ ] `api/knowledge/ingest-github.js` — GitHub repo → skill manifest

### P2.2 — Knowledge Engine
- [ ] `api/knowledge/search.js` — semantic search (pgvector)
- [ ] `api/knowledge/retrieve.js` — structured object retrieval
- [ ] `api/knowledge/rag.js` — RAG context builder for agent calls

### P2.3 — RAG Integration
- [ ] Wire RAG into `api/generate-script.js`
- [ ] Wire RAG into `api/generate-strategy.js`
- [ ] Wire RAG into `api/generate-ideas.js`
- [ ] Wire RAG into all agent calls

---

## Phase 3 — Research Intelligence [PLANNED]
**Goal:** System automatically researches niches, competitors, and trending topics.
**Exit criteria:** Research can be triggered manually or on schedule. Results stored and searchable.

- [ ] `api/research/youtube.js` — YouTube channel + video research (yt-dlp / oEmbed)
- [ ] `api/research/web.js` — web content research (scraping + AI extraction)
- [ ] `api/research/competitor.js` — competitor analysis pipeline
- [ ] `api/research/trends.js` — trending topic detection
- [ ] `api/research/niche.js` — niche opportunity scoring

---

## Phase 4 — Channel Intelligence [PLANNED]
**Goal:** Reverse-engineer any channel into DNA, playbooks, and version templates.
**Exit criteria:** Can analyze any YouTube/TikTok channel URL and produce a complete DNA blueprint + 5 playbook types.

- [ ] `api/intelligence/analyze.js` — full channel analysis
- [ ] `api/intelligence/dna.js` — DNA blueprint extraction
- [ ] `api/intelligence/playbooks.js` — playbook generation (title / hook / CTA / thumbnail / structure)
- [ ] `api/intelligence/versions.js` — version builder (similar/improved/niche_transfer/etc.)
- [ ] `api/intelligence/compare.js` — multi-channel comparison

---

## Phase 5 — Content Planning [PLANNED]
**Goal:** Strategy Brain + Planning Engine generate a full content calendar from a brief.
**Exit criteria:** Operator sets a brief → system generates 30-day calendar with scored, prioritized content queue.

- [ ] `api/planning/strategy.js` — enhanced strategy engine with RAG
- [ ] `api/planning/calendar.js` — content calendar generation
- [ ] `api/planning/campaign.js` — campaign engine (type: series / launch / campaign)
- [ ] `api/planning/score.js` — opportunity scoring (5-factor formula)
- [ ] `api/planning/queue.js` — priority queue management

---

## Phase 6 — Content Production [PLANNED]
**Goal:** Full media pipeline — script → images → video → voice → assembled MP4.
**Exit criteria:** Can produce a complete short-form video from a brief, fully server-side.

- [ ] `api/production/script.js` — enhanced script generation (RAG + playbook-aware)
- [ ] `api/production/images.js` — FLUX image generation (server-side)
- [ ] `api/production/video.js` — Wan 2.7 video generation (server-side)
- [ ] `api/production/voice.js` — Qwen-TTS / Kokoro voice (server-side)
- [ ] `api/production/assemble.js` — FFmpeg assembly pipeline
- [ ] `api/production/caption.js` — caption generation + burn-in
- [ ] Vercel Blob integration for asset persistence

---

## Phase 7 — Publishing [PLANNED]
**Goal:** Content distributes to configured platforms on schedule, automatically.
**Exit criteria:** Scheduled posts publish automatically. Postiz integration live. Multi-platform delivery working.

- [ ] Fix cron endpoint (P1.4 above)
- [ ] `api/publish/schedule.js` — schedule a post
- [ ] `api/publish/distribute.js` — multi-platform delivery
- [ ] `api/publish/status.js` — delivery status tracking

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

## Phase 10 — Autonomous Brand Mode [PLANNED]
**Goal:** Operator sets brief once. System runs the brand indefinitely.
**Exit criteria:** 30-day autonomous run on test workspace with zero human input. Learning loop improves content quality measurably over time.

- [ ] Workspace operating mode selector (Creator / Project / Brand)
- [ ] Brand brief wizard
- [ ] Autonomous loop monitoring dashboard
- [ ] Human approval gate configurator (what triggers notification)
- [ ] 30-day brand health report

---

## Debt Tracker

| Item | Severity | Notes |
|---|---|---|
| `workspace_id: 'default'` hardcoded in publish handler | Medium | Fix when Supabase goes live |
| KIMI_API_KEY in git history | HIGH | Rotate at console.moonshot.ai |
| Dead social connectors (tiktok.js, instagram.js, etc.) | Low | Remove in P1.5 refactor |
| openmontage-bridge.js broken GSAP CDN URL | Medium | Fix when video export needed |
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
