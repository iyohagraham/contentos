# ContentOS Changelog

---

## [2.0.0-alpha] — 2026-06-23 (Autonomous Build Session)

### Added — Foundation (Priority 1)

**Reference Documents**
- `IMPLEMENTATION_ROADMAP.md` — build phases, task tracking, debt log
- `DATABASE_ARCHITECTURE.md` — table groups, RLS patterns, sizing estimates
- `AGENT_ARCHITECTURE.md` — all 11 agents with inputs/outputs/tools, communication protocol, mode matrix

**Database Schema Extension** (`supabase/schema_extension.sql`)
- 28 new tables covering all 12 ContentOS systems
- pgvector + pg_trgm extensions enabled
- 4 semantic search SQL functions: `match_knowledge_chunks()`, `match_knowledge_objects()`, `match_skills()`, `match_research_results()`
- Full RLS on every new table (workspace-scoped via `auth.uid()`)
- Auto-update triggers on all mutable tables

**Server Infrastructure**
- `api/_db.js` — server-side Supabase client (service key, bypasses RLS for agent operations)
- `api/_providers/text.js` — TextProvider (Kimi k2.7-code-highspeed primary, OpenAI fallback)
- `api/_providers/embed.js` — EmbeddingProvider (text-embedding-3-small, 1536-dim)
- `api/_providers/image.js` — ImageProvider (FLUX Pro/Dev via fal.ai)
- `api/_providers/video.js` — VideoProvider (Wan 2.7 image-to-video, Flash for tests)
- `api/_providers/voice.js` — VoiceProvider (Qwen-3-TTS clone-voice, Kokoro local fallback)
- `api/_queue.js` — job queue (enqueue, claimNext, complete, fail, log with exponential backoff)

**Cron Infrastructure**
- `api/cron/process-scheduled.js` — FIXED: now uses PostizClient (was dead socialMediaManager)
- `api/cron/run-agents.js` — agent dispatcher, runs every 5 minutes
- `api/cron/research-scan.js` — weekly competitor + trend scan (Sundays 08:00 UTC)
- `api/cron/learning-loop.js` — weekly optimization loop (Sundays 22:00 UTC)
- `vercel.json` — updated cron schedules + per-route maxDuration (production: 300s, agents: 120s)

**Server-Side Generation Endpoints** (security fix: keys never reach client)
- `api/generate-visual.js` — image + video generation (replaces client-side fal.js)
- `api/generate-voice.js` — Qwen-3-TTS + Kokoro voice generation

### Added — Knowledge System (Priority 2)

- `api/knowledge/_chunker.js` — paragraph-aware text chunking, transcript chunking, code chunking
- `api/knowledge/ingest.js` — full ingestion pipeline (URL/YouTube/GitHub fetch → chunk → embed → AI object extraction)
- `api/knowledge/search.js` — semantic search via pgvector + text fallback when no embed key
- `api/knowledge/assets.js` — list/delete knowledge assets
- `api/knowledge/rag.js` — RAG context builder injected into all agent system prompts

**RAG Integration** — all generation endpoints now retrieval-augmented:
- `api/generate-script.js` — updated to use TextProvider + RAG
- `api/generate-strategy.js` — updated to use TextProvider + RAG
- `api/generate-ideas.js` — updated to use TextProvider + RAG

### Added — Research Intelligence (Priority 3)

- `api/research/scan.js` — competitor URL analysis + trend/niche research trigger
- `api/research/results.js` — fetch research results and query history
- `api/cron/research-scan.js` — weekly auto-scan for Brand Mode workspaces

### Added — Channel Intelligence Engine (Priority 4)

- `api/intelligence/analyze.js` — full channel DNA extraction (channel/content/monetization/growth), 10 dimension scores, Version Builder
- `api/intelligence/playbooks.js` — list playbooks, apply formula to any topic

### Added — Content Planning (Priority 5)

- `api/planning/calendar.js` — 30-day calendar generation with 5-factor opportunity scoring
- `api/planning/campaign.js` — campaign/series/launch sequence builder with full post plan

### Added — Agents (Priority 9, 6 of 11 implemented)

- `api/agents/_base.js` — base agent runner (logging, RAG, AI calls, error handling)
- `api/agents/strategy.js` — Strategy Agent
- `api/agents/writing.js` — Writing Agent (full script + alt hooks + thumbnail concepts)
- `api/agents/research.js` — Research Agent (trends, competitors, niche opportunities)
- `api/agents/planning.js` — Planning Agent (calendar generation with learning insights applied)
- `api/agents/analytics.js` — Analytics Agent (post performance sync, platform snapshots)
- `api/agents/optimization.js` — Optimization Agent (learning loop, winner/loser analysis, strategy updates)
- `api/agents/run.js` — HTTP endpoint to trigger any agent

### Added — Workspace Config

- `api/workspace/config.js` — operating mode (creator/project/brand), autonomy settings, brand brief

### Added — Frontend Views

- `src/views/KnowledgeView.jsx` — ingest assets, semantic search, asset library
- `src/views/ResearchView.jsx` — competitor analysis, trend research, results feed
- `src/views/IntelligenceView.jsx` — channel DNA extraction, playbook apply/copy, Version Builder
- `src/views/AgentsView.jsx` — manual agent trigger with rich result display
- `src/App.jsx` — added Intelligence sidebar section (Knowledge, Research, Intelligence, Agents)

---

## [2.0.1] — 2026-06-23 (Phase 6: Content Production)

### Added — Media Production Pipeline

- `api/agents/media.js` — **Media Agent**: full asset generation pipeline
  - FLUX Pro for hook scene, FLUX Dev for body scenes (cost-optimized)
  - Qwen-3-TTS (Serena) voice narration with Kokoro local fallback
  - Wan 2.6 Flash motion tests (mode='motion_test')
  - Wan 2.7 full motion clips with up to 5 reference images (mode='full')
  - Re-uploads all fal.ai URLs to Vercel Blob for permanence
  - Updates video record with `scene_image_urls`, `voice_audio_url`, `motion_clip_urls`

- `api/production/assemble.js` — **FFmpeg Assembly**: image slideshow + narration → MP4
  - Downloads scene images + audio to /tmp
  - Builds FFmpeg concat filter with per-scene durations from script
  - H.264/AAC output, 1920×1080, letterboxed
  - Uploads final MP4 to Vercel Blob
  - Falls back to assembly manifest JSON when ffmpeg binary unavailable

- `api/_blob.js` — Vercel Blob helper (uploadBuffer, reuploadUrl, uploadText, hasBlob)

### Fixed

- `api/knowledge/ingest.js` — invalid ES module export `export { ingestHandler: handler }` → `export { handler as ingestHandler }`

### Updated

- `api/agents/run.js` — registered media agent
- `src/views/AgentsView.jsx` — Media Agent card with mode selector + result display
- `package.json` — added @vercel/blob, ffmpeg-static
- IMPLEMENTATION_ROADMAP.md — phases 2, 3, 4, 5, 6 marked complete

---

## [1.0.0] — 2026-06-23 (Initial Stabilization)

### Fixed
- Dashboard KPI aggregation (string vs number aggregation bug)
- Seed race condition in main.jsx
- Calendar/publish field names (scheduled_time, published_at, target_platforms)
- Analytics crash + NaN on null platform data
- Safari composition preview (blob URL instead of srcDoc)
- Content search guard (null title crash)
- MonetizeView operator precedence
- video_posts + sales RLS deny-all (added workspace-scoped policies)

### Added
- Supabase Auth scaffold (AuthGate + signOut, dormant until VITE_SUPABASE_* set)
- SYSTEM_AUDIT.md, AUTONOMOUS_CONTENT_OS_VISION.md (18 sections, 5,314 lines)
- MASTER_VISION.md (source of truth, 866 lines)
