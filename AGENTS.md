# AGENTS.md — ContentOS Single Source of Truth

> **This file is the canonical handoff doc for any coding agent** (Claude Code, OpenCode, Goose, Gemini CLI, Codex, etc.). Read it first. It supersedes the older, partly-stale docs (`CONTENTOS_STATUS.md`, `CONTENTOS_TASKS.md`, `CONTENTOS_CLAUDE_HANDOFF.md`) — trust this file and the codebase over those.
>
> **Maintenance rule:** whenever you make a significant code change or architectural decision, update the relevant sections here AND append an entry to **Agent Memory**. Treat AGENTS.md as part of "done."
>
> **Working mode:** **autonomous.** Continue the next highest-priority unfinished task without asking permission for low-stakes local actions — committing work, deleting dead code, splitting files, running builds/checks, continuing dev tasks. Default to acting. Do NOT, however:
> - **push to `origin/main`** without an explicit go-ahead — the repo is **public**. (The leaked `KIMI_API_KEY` has been purged from all git history via `git filter-repo` + force-push, but the operator must still rotate it at console.moonshot.ai — it was publicly visible for a window.)
> - make **paid generation / external-billable calls** (Runware/fal/OpenAI/Kimi/scraper) without confirmation.
> - change **architecture** or **DB schema** without first recording the decision here.
>
> **Last updated:** 2026-06-24

---

## Project Overview

**ContentOS is an AI Media Operating System** — not a video generator. It plans, creates, manages, publishes, analyzes, and continuously improves media production across every content platform. It is **modular, provider-agnostic, and scalable**: the platform itself is the orchestration layer.

> **v2.0 pivot (2026-06-24):** ContentOS is now an **AI Media OS** built from 21 single-responsibility **engines** that communicate ONLY through structured JSON **contracts**. **OpenMontage is fully removed** — the platform owns every layer (composition = HyperFrames, rendering = FFmpeg, owned in-house). See **System Architecture — The 21 Engines** below.

**Core design principles (non-negotiable):**
- Everything is modular; every engine has ONE responsibility.
- Engines communicate ONLY through structured JSON contracts (`api/_contracts/`).
- Every provider is replaceable; no business logic depends on one AI provider.
- No workflow is hardcoded. Every project is resumable. Every engine is independently upgradeable.

It operates in two modes:
- **Mode A — One-off:** make a single video / image / post / script / campaign without a long-term strategy.
- **Mode B — Autonomous Brand:** define niche/audience/goals/products, and ContentOS plans and produces content continuously with minimal human input (Creator → Project → Brand → **Franchise** autonomy ladder).

## Business Goal

Let one operator run many content channels at near-zero marginal cost by automating the parts that normally need a team (researcher, strategist, scriptwriter, designer, editor, publisher, analyst). Cost discipline is a first-class constraint: **Runware** is the primary media provider (FLUX images at ~$0.0006/image), local/cheap tools are preferred, and the **Model Router** always picks the cheapest model that meets the quality bar.

---

## Architecture

```
React 18 + Vite SPA (src/)                Vercel Serverless Functions (api/*.js, plain ESM)
  views/ + lib/ (store, router, auth)  ──▶  ENGINES (api/_engines/*) + agents + endpoints
        │                                          │   speak JSON CONTRACTS (api/_contracts/*)
        │  localStorage  ⇄  Supabase               ▼
        └────────────────────────────────▶  Supabase (Postgres + pgvector + RLS + Auth)
                                                   │
   Cron (vercel.json) ──▶ Job Queue (jobs table) ──▶ Agents ──▶ Providers via Routers (Media/Voice/Music)
```

**Engine contract (`api/_engines/_base.js`):** every engine is `defineEngine({ id, responsibility, status, inputs, outputs, run(input, ctx) })`. `run` takes a structured JSON contract in, returns a structured JSON contract out, and is injected services via `ctx` (db, workspaceId, routers). Engines NEVER import each other's internals — they exchange **contracts** (`api/_contracts/index.js`, 15 documented contracts + `validateContract()`). Stubs return `{ _stub: true, ... }`. The full catalog + pipeline order + live/stub stats live in `api/_engines/registry.js` and are introspectable at **`GET /api/engines`** (`?run=<id>` invokes one engine).

**Request path for media (must always hold):**
`Engine → Media Router → Provider Adapter → Provider`. No engine calls a provider directly. **Runware is the primary media provider.**

**Agent communication:** agents never import each other. They coordinate through the `jobs` table and write audit rows to `agent_runs`. Cron (`/api/cron/run-agents`, every 5 min) claims pending jobs atomically and dispatches.

**RAG + Skills:** every agent generation retrieves Knowledge (pgvector) via `buildRAGContext` AND learned Skills via `buildSkillContext` (both injected into the system prompt by `api/agents/_base.js`). Both degrade to empty string on failure — they never block an agent.

## System Architecture — The 21 Engines

Single-responsibility engines, communicating via JSON contracts. **21/21 live** — every engine takes a JSON contract in, returns a validated contract out, self-checks its output, and never hard-fails (AI-first with deterministic fallback where applicable). The pipeline order IS the production pipeline.

| # | Engine | Responsibility | Status | Implementation |
|---|---|---|---|---|
| 1 | **Knowledge** | Research/ingest/verify → structured knowledge (RAG) | live | `api/knowledge/*` |
| 2 | **Creative Director** | Decide what the audience should FEEL (tone/energy/pacing) | live | `api/_engines/creative-director.js` |
| 3 | **Strategy** | Brand-level strategy: seasons, calendars, schedules, growth | live | `api/agents/strategy.js` + `api/planning/*` |
| 4 | **Style** | Reusable style profiles (fonts/colors/camera/rhythm/captions) | live | `api/_engines/style.js` |
| 5 | **Universe** | World bible: characters/locations/props/rules/lore/timelines | live | `api/_engines/universe.js` |
| 6 | **Character** | Character consistency: faces/voices/expressions/outfits/poses | live | `api/_engines/character.js` |
| 7 | **Brand** | Business identity: logo/colors/fonts/voice/tone/CTA rules | live | `api/_engines/brand.js` |
| 8 | **Story** | Narrative: structure/hooks/retention/arcs/series/episodes | live | `api/agents/writing.js` + `generate-script.js` |
| 9 | **Storyboard** | Visual plan: shots/camera/lighting/mood/props/transitions | live | `api/_engines/storyboard.js` |
| 10 | **Continuity** | Guard consistency; emit a continuity report before production | live | `api/_engines/continuity.js` |
| 11 | **Scene Planner** | Storyboard → production scenes (structured JSON) | live | `api/_engines/scene-planner.js` |
| 12 | **Media Router** | Pick the best provider per media request (Runware primary) | live | `src/lib/router/*` + `api/media/engine.js` |
| 13 | **Asset Manager** | Store + version assets + metadata | live | `api/_blob.js` + `api/knowledge/assets.js` |
| 14 | **Voice** | Narration/character voices/cloning/dubbing (Qwen / OmniVoice) | live | `api/_providers/voice.js` |
| 15 | **Music** | Music/ambience/SFX/theme/background (replaceable provider) | live | `api/_engines/music.js` |
| 16 | **Composition (HyperFrames)** | Timeline/animation/captions/motion/transitions | live | `api/_engines/composition/hyperframes.js` |
| 17 | **Rendering (FFmpeg)** | Encode/compress/export all formats + watermark + audio mix | live | `api/_render/*` |
| 18 | **Publishing** | Schedule + publish to YT/IG/TikTok/FB/LinkedIn/X | live | `api/agents/publishing.js` + `api/postiz/*` |
| 19 | **Analytics** | CTR/watch-time/retention/revenue/views/shares/subs | live | `api/analytics/*` |
| 20 | **Learning** | Feed winning patterns back into strategy/story/style/direction | live | `api/agents/optimization.js` + router auto-learn |
| 21 | **Franchise** | Universe→Brand→Franchise→Season→Series→Episode→Storyboard→Scene→Assets | live | `api/_engines/franchise.js` |

**Production pipeline (order):**
`Knowledge → Creative Direction → Strategy → Style → Universe → Characters → Story → Storyboard → Continuity → Scene Planning → Media Router → Voice → Music → Composition (HyperFrames) → Rendering (FFmpeg) → Publishing → Analytics → Learning`
(Brand, Asset Manager, Franchise are cross-cutting/structural.)

**Provider policy:** Runware = primary media. Qwen-3-TTS + OmniVoice Studio = primary voice. HyperFrames = composition. FFmpeg = rendering. **Every provider stays replaceable**; routers make the selection.

## Technology Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, Tailwind 3, lucide-react, recharts |
| Backend | Vercel serverless functions — **plain JavaScript ESM, Node 24** (no TypeScript build step) |
| Local dev server | `server.js` (Express 5) mirrors the serverless routes |
| DB / Auth | Supabase (Postgres + pgvector + pg_trgm + RLS + Supabase Auth) |
| Text AI | Kimi `kimi-k2.7-code-highspeed` (Moonshot, `temperature:1` required) → OpenAI `gpt-4o-mini` fallback |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) |
| Images | **Runware** (FLUX dev/schnell, upscale, bg-removal, edit) → fal.ai fallback |
| Video | Wan 2.7 / 2.6-flash via fal.ai (optional/future) |
| Voice | Qwen-3-TTS (fal) / Kokoro (local) |
| Render | FFmpeg via `ffmpeg-static` + `ffprobe-static` (cloud), system ffmpeg fallback |
| Asset storage | Vercel Blob (`@vercel/blob`) |
| Publishing | Postiz (self-hosted, vendor-agnostic) |
| PDF parsing | `unpdf` |

> **Why plain JS, not TS:** the api/ functions run directly under Node on Vercel with no transpile step. `.ts` files would not execute. Use JSDoc typedefs for interface documentation.

---

## Repository Structure

```
api/                       Vercel serverless functions (plain ESM)
  _db.js                   Supabase server client (service key) + rpc() + coerceWorkspaceId()
  _blob.js                 Vercel Blob helpers (uploadBuffer, reuploadUrl)
  _queue.js                Job queue (enqueue/claimNext/complete/fail)
  _kimi.js                 [LEGACY — superseded by _providers/text.js]
  _providers/
    text.js                TextProvider (Kimi → OpenAI), parseJSON (array-aware)
    embed.js               EmbeddingProvider (OpenAI 1536-dim)
    image.js               Image entry (delegates to runware.js; fal fallback)
    runware.js             Runware client: generateImage/editImage/upscaleImage/removeBackground
    video.js               Wan via fal (imageToVideo/motionTest)
    voice.js               Qwen-3-TTS (fal) + Kokoro (local)
    router-adapters.js     SERVER bootstrap: injects router adapters + DB logger (ensureRouterReady)
  _engines/                ENGINE SPINE (v2.0) — defineEngine base + registry + per-engine modules
    _base.js               defineEngine() universal engine interface + stubOutput()
    registry.js            catalog of all 21 engines (id/responsibility/status/contracts/impl)
    composition/hyperframes.js   Composition Engine (#16) — replaces the OpenMontage bridge
    {creative-director,style,universe,character,brand,storyboard,continuity,
     scene-planner,music,franchise}.js   the 10 new-engine stubs (contract-shaped)
  _contracts/
    index.js               15 documented JSON contracts engines exchange + validateContract()
  _render/
    ffmpeg.js              Rendering Engine backbone (renderTimeline, generateSRT, generateThumbnail)
    formats.js             9:16 / 16:9 / 1:1 presets + exportFormat()
    composition.js         COMPOSITION_MANIFEST builder
    index.js               RenderProvider selector (ffmpeg default; openmontage stub)
  agents/                  9 agents: strategy, writing, research, planning, analytics,
                           optimization, media, publishing, notification (+ _base.js, run.js)
  monitor/                 status.js (Brand Mode health) + notifications.js (ack/resolve)
  knowledge/               ingest, search, rag, assets, _chunker (pgvector RAG)
  skills/                  ingest, _extract, search, _context, apply, list, blob-upload
  media/                   engine.js (orchestrator) + Mode-A endpoints
                           (generate-image, edit-image, upscale, remove-bg, render-video)
  intelligence/            analyze.js (channel DNA), playbooks.js
  research/                scan.js, results.js
  planning/                calendar.js, campaign.js
  production/              assemble.js (delegates to _render)
  postiz/                  channels, post, status, analytics (Postiz proxy)
  cron/                    process-scheduled, run-agents, research-scan, learning-loop
  workspace/               config.js (operating mode + brand brief)
  generate-*.js            legacy/simple generation endpoints (script/strategy/ideas/visual/voice)
  social.js, social/[...action].js   social proxy (Postiz-backed)
src/
  App.jsx                  Main shell + sidebar nav + view dispatch (~126 lines after split)
  AuthGate.jsx             Supabase auth gate (dormant until VITE_SUPABASE_* set)
  views/                   ONE FILE PER VIEW — 16 total:
                           Knowledge, Research, Intelligence, Agents, Skills,
                           WorkspaceConfig, Monitor (agent-era views) +
                           Dashboard, Strategy, Create, Content, Calendar,
                           Analytics, Monetize, Channels, Settings (split from App.jsx)
  lib/
    ui.jsx                 Shared view primitives: StatCard, QuickActionCard, PLATFORMS
    router/                Model Router (PURE — see Critical Decisions)
    router/                Model Router (PURE — see Critical Decisions)
    db/                    store.js (localStorage⇄Supabase adapter), supabase.js, useStore.js, seed.js
    useWorkspace.js        resolves workspace UUID from Supabase auth (defaults to 'default')
    auth.js, postizClient.js, format.js
    social/                [DEAD connectors — see Tech Debt]
supabase/
  schema.sql               8 base tables
  schema_extension.sql     29 extension tables + model_routing_log + pgvector + 4 match functions + RLS
vercel.json                routes, per-path maxDuration, cron schedules
server.js                  Express mirror for local dev
```

---

## Database Design

- **Base (`schema.sql`, 8 tables):** `workspaces`, `video_posts`, `sales`, channels, products, strategies, etc. RLS workspace-scoped via `auth.uid()`.
- **Extension (`schema_extension.sql`, ~30 tables):** grouped by system —
  - Knowledge: `knowledge_assets`, `knowledge_chunks` (vector), `knowledge_objects` (vector), `knowledge_relationships`, `knowledge_search_log`
  - Research: `research_queries`, `research_results` (vector), `competitor_analyses`, `market_signals`
  - Channel Intelligence: `channel_analyses`, `channel_content_samples`, `channel_playbooks` (vector), `channel_versions`
  - Skills: `skill_manifests` (vector), `skill_invocations`, `skill_compositions`
  - Agents: `agent_runs`, `agent_messages`, `agent_tools`
  - Jobs: `jobs`, `job_logs`
  - Planning: `campaigns`, `campaign_posts`, `content_calendar`
  - Analytics: `post_analytics`, `platform_snapshots`, `revenue_events`, `learning_insights`
  - Config: `workspace_config`
  - Router: `model_routing_log`
- **Vector search RPCs:** `match_knowledge_chunks`, `match_knowledge_objects`, `match_skills`, `match_research_results` — all take `(query_embedding, match_threshold, match_count, p_workspace_id)`.
- **RLS pattern:** `workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())`. Server functions use the service key and bypass RLS.
- **Apply order:** `schema.sql` first, then `schema_extension.sql`.

---

## APIs and Integrations

| Service | Use | Env | Notes |
|---|---|---|---|
| Supabase | DB/Auth/pgvector | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` | service key server-only |
| Moonshot (Kimi) | primary text AI | `KIMI_API_KEY` | `temperature:1` required; base `api.moonshot.ai/v1` |
| OpenAI | embeddings + text fallback | `OPENAI_API_KEY` | `text-embedding-3-small`; `gpt-4o-mini` |
| Runware | images (primary) | `RUNWARE_API_KEY` | `api.runware.ai/v1`, Bearer, JSON-array tasks, dims ×64 |
| fal.ai | video + voice + image fallback | `FAL_KEY` | Wan, Qwen-3-TTS |
| Vercel Blob | asset persistence | `BLOB_READ_WRITE_TOKEN` | store `contentos-media` |
| Postiz | publishing | `POSTIZ_URL`, `POSTIZ_API_KEY` | self-hosted; not yet deployed |

**Gotchas:** Qwen-3-TTS endpoint uses hyphens (`fal-ai/qwen-3-tts/clone-voice/1.7b`), voices are a closed enum (Serena default), language wants full names ("English"). Runware dims must be multiples of 64. `ffmpeg-static` ships NO ffprobe → `ffprobe-static` is required.

---

## Current Status

Built and committed (localStorage mode works today; cloud features activate once Supabase is live):

### Completed Features
- **Foundation:** provider abstraction, job queue, server-side AI layer, cron infra
- **Knowledge System (RAG):** ingest URL/YouTube/GitHub/text/PDF → chunk → embed → pgvector search; injected into all agents
- **Skill System:** ingest PDFs/SOPs/playbooks → extract reusable skills (hooks/frameworks/patterns) → search/apply; injected into all agents
- **Research Intelligence:** competitor/trend/niche scan (AI-synthesized) + weekly cron
- **Channel Intelligence:** **real YouTube ingestion** (keyless Atom RSS → actual recent videos + view/like counts → `channel_content_samples` with performance tiers → DNA grounded in real data) + playbooks + version builder. IG/TikTok use best-effort oEmbed, else honest AI-estimate (`data_confidence: low`)
- **Content Planning:** calendar + campaign generation with 5-factor opportunity scoring
- **Media Engine (Priority 1):** Runware assets → voice → composition manifest → **FFmpeg render** → multi-format export (9:16/16:9/1:1); live-tested end-to-end
- **Model Router:** provider/model-agnostic routing (registry/scoring/rules), candidate fallback, decision logging; 10/10 selection tests pass
- **10 Agents:** strategy, writing, research, planning, analytics, optimization, media, publishing, notification, **monetization** (the full planned agent set is now complete)
- **Publishing:** Postiz multi-channel (single + batch)
- **Brand Monitoring (Phase 10):** Notification Agent (pure-DB scan for failures + approval-gate items, de-duped) + `/api/monitor/status` aggregation + `MonitorView` dashboard (job queue, agent activity, content pipeline, routing mix, alerts w/ ack/resolve, insights)
- **Analytics (Phase 8):** `api/analytics/{track,aggregate,insights,revenue}.js` — per-post performance ingest (idempotent upsert), cross-platform aggregation, AI-powered learning insights (grounded in real metrics → `learning_insights`), revenue attribution (UTM-match → video). `AnalyticsView` upgraded to merge Postiz + new DB data + revenue panel + insight generation
- **Frontend:** Knowledge, Research, Intelligence, Agents, Skills, WorkspaceConfig (Brand Mode) views
- **Auth scaffold:** dormant until `VITE_SUPABASE_*` set

### In Progress
- **Channel Intelligence (Priority 5):** YouTube real ingestion ✅ (keyless RSS). IG/TikTok ✅ via pluggable scraper provider (`SOCIAL_SCRAPER_URL`) + operator paste (`samples` in analyze body) + best-effort TikTok scrape. **"Clone/adapt/improve → new niche" now actionable in the UI ✅** — Version Builder cards have an "Adapt to my niche" panel that calls `POST /api/intelligence/adapt` (channel DNA + target niche → adapted strategy + starter posts). Remaining: optionally ship a default IG/TikTok scraper integration.
- **Autonomous Brand Mode (Phase 10):** operating-mode UI ✅, Notification Agent ✅, monitoring dashboard ✅. Remaining: a 30-day unattended test run, and external alert delivery (email/push) — alerts are currently in-app only.

### Planned / Not Started
- ✅ Monetization agent now built — the planned agent set is complete.
- Implement the 10 stub engines (Creative Director, Style, Universe, Character, Brand, Storyboard, Continuity, Scene Planner, Music, Franchise) — interfaces + contracts already defined in `api/_engines/` + `api/_contracts/`
- ✅ Auto-learning routing (read `model_routing_log` to adjust scores) — table exists, learning now implemented
- Real OpenAI/DALL·E image adapter (currently a stub that falls through to Runware)

---

## Technical Debt

| Item | Severity | Notes |
|---|---|---|
| `workspace_id: 'default'` sentinel vs UUID columns | ✅ Resolved | `coerceWorkspaceId()` now guards ALL server endpoints (skills + knowledge/research/intelligence/planning). 'default' → `NULL` (globally-scoped) on every UUID column + match RPC (`p_workspace_id IS NULL OR …`). Verified: all touched `workspace_id` cols are nullable, so null inserts cleanly. Optional follow-up: `useWorkspace` create-or-get a real workspace row on login so writes are properly owned once Supabase+Auth go live. |
| Dead social connectors | ✅ Resolved | Deleted the dead manager-based stack: `api/social.js` + `src/lib/social/{manager,scheduler,tiktok,instagram,youtube,facebook}.js`. Verified the frontend only ever calls `/api/postiz/*`; nothing reaches `/api/social`. **Kept** `src/lib/social/postiz.js` (7 importers: publishing agent + postiz routes + social catch-all + analytics) and `api/social/[...action].js` (live Postiz catch-all). |
| Legacy `api/_kimi.js` | ✅ Resolved | Deleted — superseded by `_providers/text.js`; zero importers. |
| Client-side `src/lib/fal.js` | ✅ Resolved | Deleted — superseded by server routes, key-exposure risk eliminated; zero importers. |
| `src/App.jsx` ~2300 lines | ✅ Resolved | Split into 16 per-view files (`src/views/*.jsx`) + shared `src/lib/ui.jsx` (StatCard/QuickActionCard/PLATFORMS). App.jsx is now the slim sidebar+dispatch shell (~126 lines). `NavItem` kept in App.jsx (sidebar-only). Extraction was verbatim (sed line-ranges) preserving exact prop interfaces — `vite build` green, bundle unchanged. No behavior change (no code-splitting yet — views are still statically imported). Follow-up: WorkspaceContext to drop prop-drilling + `React.lazy` code-splitting to shrink the ~586 KB bundle. |
| Frontend bundle | ✅ Resolved | `React.lazy` + `Suspense` code-splitting: all 16 views are dynamic-imported, each its own chunk (45 chunks total). Initial bundle **586 KB → 387 KB** (gzip 152 → 110 KB, ~34% smaller); only the shell + landed view (dashboard) load up front. Remaining ~387 KB is React + recharts + shell — split recharts out next if it matters. |
| Stale root docs | Low | `CONTENTOS_STATUS/TASKS/CLAUDE_HANDOFF.md` are outdated — this file supersedes them |
| `apply.js` invocation counter | Low | read-modify-write race; fine for single-user |

## Known Issues
- **Supabase not provisioned** → all cloud features (RAG, skills search, agents persisting, routing log) are inert until the project exists and schema is applied. App still runs in localStorage mode.
- **Runware account has no balance** → image generation returns `insufficientCredits` until topped up at my.runware.ai/wallet.
- **OpenAI image (DALL·E) adapter is a stub** — intentionally throws so the router falls through to Runware (which always outranks it anyway).

---

## Deployment Instructions

**Platform:** Vercel (project `contentos`, already linked: `prj_9IVJ7hBMPkUPudAkP2DKuy3od4No`). Account `iyohagraham-8983`.

> ⚠️ `git push` does NOT auto-deploy. Production ships via the CLI only.

1. Ensure all env vars are set in Vercel (see below) — `VITE_*` are build-time and must be set **before** build.
2. Provision Supabase (CLI with `SUPABASE_ACCESS_TOKEN`, or dashboard) and apply `supabase/schema.sql` then `supabase/schema_extension.sql` (psql or SQL editor).
3. `vercel --prod` from the repo root.
4. Smoke-test: `/api/health`, then the media/skill/agent endpoints.

Crons (in `vercel.json`): `process-scheduled` + `run-agents` every 5 min; `research-scan` Sun 08:00 UTC; `learning-loop` Sun 22:00 UTC.

## Environment Variables

Put secrets in gitignored `.env.local` (never commit; never paste secret/service keys in chat — only the Supabase URL + anon key are public-safe).

```
# Supabase
VITE_SUPABASE_URL=            # public-safe
VITE_SUPABASE_ANON_KEY=       # public-safe (eyJ...)
SUPABASE_SERVICE_KEY=         # SECRET, server-only, bypasses RLS
SUPABASE_ACCESS_TOKEN=        # SECRET, CLI provisioning only (sbp_...)
# Text AI
KIMI_API_KEY=                 # SECRET (Moonshot)  [also reads MOONSHOT_API_KEY]
OPENAI_API_KEY=               # SECRET (embeddings + text fallback)
# Media
RUNWARE_API_KEY=              # SECRET (images)
FAL_KEY=                      # SECRET (video + voice)  [also reads FAL_AI_API_KEY]
BLOB_READ_WRITE_TOKEN=        # SECRET (Vercel Blob — auto-set by `vercel blob create-store`)
# Publishing (optional, when Postiz is deployed)
POSTIZ_URL=
POSTIZ_API_KEY=
# Channel Intelligence (optional — YouTube ingestion works KEYLESS via RSS; this only
# enriches with subscriber/total-view counts)
YOUTUBE_API_KEY=
# Real IG/TikTok ingestion (optional) — plug in any scraper (Apify/RapidAPI/self-hosted).
# Endpoint receives { platform, url, max } and returns { samples: [...] }.
# Without it: TikTok best-effort page scrape + single-post oEmbed; or operator pastes
# samples directly (analyze body `samples: [...]`) — always reliable.
SOCIAL_SCRAPER_URL=
SOCIAL_SCRAPER_KEY=
# Cron (optional)
CRON_SECRET=                  # protects cron endpoints
CRON_MAX_JOBS=                # default 5
```

> Gotcha: `vercel blob create-store -y` runs an env-pull that REWRITES `.env.local`. Run it before populating secrets, or re-add them after.

---

## Current Roadmap

**v2.0 (AI Media OS) — status:** pivot complete. Engine + contract spine live, OpenMontage removed, and **all 21 engines are now implemented (live)**. The full pipeline chains end-to-end (story → storyboard → scene_plan → composition manifest), every engine self-validates its output contract, and all degrade gracefully without a text provider.

**Next (depth, not breadth):**
1. **Frontend** — a v2.0 UI surface for the engine pipeline (a "Studio" view over `GET /api/engines` + `?run=<id>`), and Storyboard/Scene-Plan editors.
2. **Persistence + schema** — dedicated tables for style_profiles / brands / universes / characters / franchises (currently optionally folded into `workspace_config`); a `projects` table tying a run through the pipeline (resumable projects).
3. **Wire engines into the autonomous loop** — have agents/cron drive the Knowledge→…→Learning pipeline via the engine registry.
4. **Music provider** — wire a default (Pixabay `PIXABAY_API_KEY` or a `MUSIC_PROVIDER_URL`).
5. **Deeper engines** — real reference-image character consistency (Media Router seeds), Continuity auto-fix suggestions, Franchise persistence/navigation.

**v1 foundation (done, mapped onto engines):** Media Router (Runware+FFmpeg) ✅, Knowledge ✅, Skills ✅, Channel Intelligence ✅, Phase 8 Analytics ✅, 10 agents ✅, auto-learning router ✅, Autonomous Brand Mode monitoring ✅ (remaining: 30-day unattended run + external alert delivery).

## Critical Decisions

(See **Agent Memory** for the full dated log.)
- **Plain JS, not TS** — Vercel functions run Node directly, no transpile.
- **Runware primary for images** — project override of the global FLUX-via-fal default; ~$0.0006/image.
- **Model Router purity** — `src/lib/router/*` has zero secrets / zero `api/` imports; adapters + DB logger injected server-side via `api/_providers/router-adapters.js`. Keep it pure so the frontend bundle stays clean.
- **OpenMontage REMOVED (v2.0)** — the platform owns every layer itself. **HyperFrames is THE Composition Engine** (`api/_engines/composition/hyperframes.js`); **FFmpeg is THE Rendering Engine** (`api/_render/*`). Nothing depends on OpenMontage. A future GPU/worker renderer can slot in behind the same `composition_manifest` contract — every provider stays replaceable.
- **Engines + JSON contracts** — the platform is 21 single-responsibility engines (`api/_engines/registry.js`) that exchange documented JSON contracts (`api/_contracts/`). No engine imports another; no business logic depends on one provider.
- **Kimi primary, `temperature:1` mandatory** — required by `kimi-k2.7-code-highspeed`.
- **config-driven model registry** — no model IDs hardcoded in business logic.

## Handoff Notes
- The build was done largely by Claude Code across several directives; commits are descriptive (`git log`).
- Subagent **workflows hit the account weekly usage limit** during the Model Router build (resets ~10pm America/Edmonton) — recent work was done solo. Expect parallel subagent fan-out to fail until the limit resets; build solo if so.
- A `KIMI_API_KEY` was once committed in `CONTENTOS_CLAUDE_HANDOFF.md`. It has been **purged from ALL git history** (`git filter-repo --replace-text` + force-push, 0 occurrences remain). Still **rotate it at console.moonshot.ai** — the repo is public and the key was exposed for a window (assume compromised).
- localStorage mode is the default and fully functional for demoing the UI without any keys.

## Next Recommended Tasks
1. **Priority 5 — real Channel Intelligence ingestion**: fetch real channel data (YouTube Data API / oEmbed / yt-dlp metadata / public scrape) → store `channel_content_samples` → run DNA extraction on REAL videos, not just the URL. Then "clone/adapt/improve strategy → new niche". *(YouTube keyless RSS ✅; clone/adapt → new niche ✅ actionable via `POST /api/intelligence/adapt` + Version Builder panel; optional default IG/TikTok scraper remains.)*
2. ✅ **DONE** — `coerceWorkspaceId()` applied across the older endpoints (knowledge/research/intelligence/planning). Optional follow-up: `useWorkspace` create-or-get a real workspace row on login.
3. Deploy: provision Supabase, apply schema, push env, `vercel --prod`, smoke-test. *(Blocked: needs your Supabase project + secrets — rotate the exposed KIMI key first, then push the 21 unpushed commits.)*
4. Delete dead code (social connectors, `_kimi.js`, `fal.js`); split `App.jsx`.

---

## Agent Memory

> Append a new entry here whenever you make a major architectural decision or significant change. Newest first. Format: **What / Why / Date / Impact**.

### 2026-06-24 — All 21 engines implemented (stub → live)
- **What:** Implemented all 10 remaining stub engines, taking the registry to **21/21 live**: Storyboard (story→shot list, AI + deterministic fallback), Scene Planner (storyboard→scene_plan, pure), Style (name→style_profile, AI + presets), Creative Director (brief→creative_direction), Brand (name→brand kit), Universe (premise→world bible), Character (name→consistency profile), Continuity (diff storyboard vs roster→issues, pure), Music (provider-routed; honest request-spec when no provider — never fabricates audio), Franchise (assemble/scaffold the Universe→…→Assets hierarchy, pure). Each validates its output against its contract and never hard-fails.
- **Why:** Complete the v2.0 architecture — the platform now owns every engine in the pipeline, end-to-end.
- **Impact:** Full pipeline chains verified (story → storyboard → scene_plan; continuity flags unknown character/prop + outfit drift; franchise scaffolds Season→Series→Episode). `node --check` all green; `vite build` green; committed + pushed. Engines persist optionally into `workspace_config.*` (no schema change yet — dedicated tables are the next step). Secret hygiene: the leaked KIMI key was purged from ALL git history via `git filter-repo` + force-push (rotate at Moonshot regardless — public exposure window happened).

### 2026-06-24 — ContentOS v2.0 PIVOT: AI Media OS, OpenMontage removed, 21-engine spine
- **What:** Re-architected ContentOS from "AI video generator" to **AI Media Operating System**. (1) **Removed OpenMontage entirely** — deleted `openmontage-bridge.js`; new Composition Engine `api/_engines/composition/hyperframes.js` (HyperFrames is THE composition framework, fixed its broken GSAP CDN URL); `generate-composition.js` repointed; `_render/index.js` dropped the `renderWithOpenMontage` stub (FFmpeg is the sole renderer); de-OpenMontaged `_render/composition.js` comments; `voice.js` Kokoro path now `KOKORO_TTS_SCRIPT`-configurable (defaults `~/.kokoro`, no OpenMontage tree); fixed `server.js` broken `api/social.js` import. (2) **Engine + contract spine:** `api/_engines/_base.js` (`defineEngine` universal interface), `api/_contracts/index.js` (15 documented JSON contracts + `validateContract`), `api/_engines/registry.js` (all 21 engines, pipeline order, 11 live/10 stub), 10 new-engine stubs, `api/engines.js` (GET introspection + `?run=<id>`).
- **Why:** Per the v2.0 vision directive — own every layer, modular single-responsibility engines, JSON contracts, every provider replaceable, no hardcoded workflows. Stop feature-adding; refactor into this architecture.
- **Impact:** 21 engines load (11 live by mapping existing impls, 10 contract stubs). Composition Engine emits a valid `composition_manifest` + clean HyperFrames HTML (zero OpenMontage). `node --check` all green; `vite build` green. Chosen scope: **contracts + stubs first** (per operator) — implement the 10 stubs fully in follow-up passes. Next: build out Storyboard / Scene Planner / Style first (highest leverage), then the rest.

### 2026-06-24 — React.lazy code-splitting
- **What:** Converted all 16 view imports in `App.jsx` from static to `React.lazy(() => import(...))` and wrapped the view-dispatch in `<Suspense fallback={<ViewFallback/>}>` (a small spinner). Each view + the shared `ui.jsx` now emit separate chunks.
- **Why:** After the App.jsx split, all 16 views were still statically imported into one ~586 KB bundle. Dynamic import defers per-view code until the user navigates there.
- **Impact:** Initial bundle **586 KB → 387 KB** (gzip 152 → 110 KB, ~34% smaller); 45 chunks total (largest view chunk: CreateView 24 KB). Only shell + dashboard load on first paint. `vite build` green. No behavior change (Suspense fallback covers the load gap). Resolves the frontend-bundle debt item.

### 2026-06-24 — Auto-learning Model Router
- **What:** Added `api/_providers/learned-routing.js` (reads `model_routing_log` over 14-day window, computes per-model success rate → maps to learned `reliabilityScore` 10/9/8/7/6/4), `api/_providers/router-adapters.js` applies learned overrides at bootstrap via `model-registry.setModelOverride()` (runtime-overrides map in pure registry), `scoring-engine.js` reads overrides via `model-registry.getModelOverride()` (scoring engine now merges static + learned scores). `api/router/learn.js` exposes POST `/api/router/learn` (manual re-learn) + GET `/api/router/scores` (read-only visibility). Weekly `cron/learning-loop.js` runs `computeAndApplyLearnedRouting()` alongside the optimization enqueue.
- **Why:** The Model Router was static-scored; real-world reliability varies (provider flakiness, key rotation, model degradation). Auto-learning closes the loop so the router down-ranks flaky models and favors steady ones without hardcoding.
- **Impact:** Router is now self-improving. `node --check` + `vite build` green. Pure router stays pure — overrides injected server-side at bootstrap + cron, just like adapters. No schema change. Manual endpoint + cron dual-path for control.

### 2026-06-24 — Monetization Agent (10th agent — planned set complete)
- **What:** Added `api/agents/monetization.js` (10th agent) + registered in `run.js`. Uses workspace products + revenue_events + post_analytics to build a revenue-by-video leaderboard and funnel-health snapshot (total/attributed revenue, attribution rate, revenue-per-view), then asks the AI for evidence-grounded recommendations (pricing/CTA/lead-magnet/product-fit/funnel/bundling), pricing suggestions, and which top content should get a direct product CTA. Two modes: `focus=strategy` (build the funnel) and `focus=optimize` (tighten existing). Grounded via base agent RAG+skills.
- **Why:** Monetization was the only genuinely-missing planned agent. The autonomous loop now spans the full content→revenue lifecycle, and the Optimization Agent can eventually consume monetization recommendations too.
- **Impact:** The planned agent set is **complete (10/10)**. `node --check` + `vite build` green. No schema change. AgentsView will surface it via the existing `run.js` registry automatically.

### 2026-06-24 — Phase 8 Analytics (track / aggregate / insights / revenue)
- **What:** Added `api/analytics/{track,aggregate,insights,revenue}.js`. `track.js` ingests per-post performance (idempotent `upsert` on `video_post_id,snapshot_date`, auto-computes engagement_rate + performance_score, optional revenue_event side-write); `aggregate.js` does cross-platform aggregation over `post_analytics`+`revenue_events`+`platform_snapshots` (totals, byPlatform, byDate, topPosts, followerTrend); `insights.js` runs the analytics base agent to surface evidence-grounded optimization insights → persists `learning_insights`; `revenue.js` records + reports revenue events with UTM-match attribution. `AnalyticsView` upgraded to merge Postiz data + the new DB aggregation + a revenue attribution panel + a "Generate insights" button. All endpoints `coerceWorkspaceId`.
- **Why:** Phase 8 was the last PLANNED roadmap phase needed to close the autonomous loop (Planning → Writing → Media → Publishing → **Analytics** → Optimization). Without persisted analytics + insight generation, the Optimization Agent had nothing concrete to learn from.
- **Impact:** Closes Phase 8. `node --check` + `vite build` green. No schema change (uses existing `post_analytics`/`revenue_events`/`learning_insights`/`platform_snapshots` tables). Revenue + insights surface in the existing Analytics view alongside Postiz data. Groundwork for the Optimization Agent to consume `learning_insights`.

### 2026-06-24 — App.jsx split into per-view files
- **What:** Split the ~2227-line `src/App.jsx` into 16 per-view files under `src/views/` (Dashboard, Strategy, Create, Content, Calendar, Analytics, Monetize, Channels, Settings — newly extracted; + the 7 existing agent-era views) + a shared `src/lib/ui.jsx` exporting `StatCard`, `QuickActionCard`, `PLATFORMS`. App.jsx is now the slim sidebar-nav + view-dispatch shell (~126 lines) and imports the 16 views. `NavItem` stayed in App.jsx (sidebar-only). Extraction was done verbatim by copying exact `sed` line-ranges (no transcription) and giving each a uniform preamble (React hooks + App.jsx's full lucide icon block — unused icons tree-shaken — + the shared ui import) + conditional `postiz`/`auth`+`seed` imports where the view used them; `export default <Name>View` appended.
- **Why:** The "App.jsx ~2300 lines" tech-debt item was the largest maintainability blocker. Split is pure file reorganization — exact prop interfaces preserved, no behavior change — so it's low-risk and unblocks future per-view work + code-splitting.
- **Impact:** `vite build` green (1478 modules, bundle unchanged at ~586 KB — this was reorg, NOT dynamic import/code-splitting). Hit + fixed two snags during extraction: (a) `../lib/ui.js` path didn't resolve the `.jsx` file → import without extension; (b) the last view's range over-captured the original `export default App` → removed the stray line and re-added `export default App` to the new shell. No architecture/schema change. Follow-ups deferred: `WorkspaceContext` (drop prop-drilling) + `React.lazy` code-splitting to actually shrink the bundle.

### 2026-06-24 — Channel Intelligence "adapt → new niche" (Priority 5, actionable)
- **What:** Added `api/intelligence/adapt.js` (POST — takes `dna` + `target_niche` + `version_type` → `textGenerateJSON` produces an adapted content blueprint: pillars, title/hook/cta formulas, + N starter posts; grounded via `buildRAGContext`; `coerceWorkspaceId` on wsId; 503 on no text-AI-provider). Wired `src/views/IntelligenceView.jsx` Version Builder cards with an "Adapt to my niche" collapsible panel (Wand2 icon) that calls it and renders the adapted strategy + post list with copy buttons. Handles `improved`/`niche_transfer`/`platform_transfer` framings.
- **Why:** P5's remaining gap was that the Version Builder only *described* clone/adapt/improve — it was inert. This closes the loop: an operator analyzes a proven channel, picks a target niche, and gets a ready-to-execute content plan distilled from the source DNA. Endpoint takes `dna` directly (versions aren't returned with ids from `analyze`), so it's stateless and works whether or not the analysis is persisted.
- **Impact:** Channel Intelligence is now an actionable research→strategy tool, not just a viewer. `node --check` + `vite build` green. No schema change. Frontend still uses only existing router/postiz patterns.

### 2026-06-24 — Dead-code removal (social manager stack + fal.js + _kimi.js)
- **What:** Deleted 9 files: `api/social.js`, `src/lib/social/{manager,scheduler,tiktok,instagram,youtube,facebook}.js`, `src/lib/fal.js`, `api/_kimi.js`. Kept `src/lib/social/postiz.js` (7 importers) + `api/social/[...action].js` (live Postiz catch-all).
- **Why:** The old manager/scheduler/4-connector stack was the pre-Postiz direct-connect layer. The frontend exclusively uses `/api/postiz/*` (verified via `grep` on `src/`); nothing calls `/api/social`. `fal.js` was a client-side FAL wrapper (superseded by server routes — key-exposure risk); `_kimi.js` was superseded by `_providers/text.js`. **Note:** AGENTS.md's prior "social connectors safe to delete" was misleading — they were chained as `api/social.js → scheduler → manager → {4 platforms}`, so the whole cluster had to go as a unit; deleting only the 4 platform files would have broken `api/social.js`'s import.
- **Impact:** Removes the dead direct-connect routing surface (`/api/social` now 404s — no caller), eliminates the `fal.js` key-exposure risk, cuts source noise. `vite build` + `node --check` on all postiz/social catch-all files green. Bundle size unchanged (fal.js was already tree-shaken from the bundle as unused). Did NOT touch Postiz routing. Next debt target: split `App.jsx` (~2300 lines).

### 2026-06-24 — coerceWorkspaceId rolled out across all older endpoints
- **What:** Applied `coerceWorkspaceId()` to the 10 remaining endpoints that passed the raw `'default'` sentinel into UUID columns: `knowledge/{ingest,search,rag,assets}`, `research/{scan,results}`, `intelligence/{analyze,playbooks}`, `planning/{calendar,campaign}`. Each now computes `wsId = coerceWorkspaceId(workspace_id)` after the presence check and uses it for every DB column write, `.eq()` filter, match-RPC `p_workspace_id`, and `enqueue()`. Imported `coerceWorkspaceId` from `_db.js` in each.
- **Why:** These would throw `invalid input syntax for type uuid` the moment Supabase went live with a pre-auth/'default' workspace (the documented next major step). The match RPCs are already null-tolerant (`p_workspace_id IS NULL OR ka.workspace_id = p_workspace_id`), and all touched `workspace_id` columns are **nullable**, so `coerce→null` inserts/filters cleanly with no behavior change in localStorage mode (db is null there) and no tradeoff for real UUID workspaces.
- **Impact:** The Medium tech-debt item is resolved — the sentinel crash is eliminately across the whole server surface (skills were already guarded). `node --check` green on all 10 files; grep confirms no raw sentinel reaches a DB write. Optional complementary work remains: `useWorkspace` create-or-get a real workspace row on login so writes are owner-scoped under auth.

### 2026-06-24 — Brand Monitoring (Phase 10)
- **What:** `api/agents/notification.js` (Notification Agent — pure DB scan, no AI keys: detects failed jobs/agent_runs/content + review-gate approval items, de-dupes via `dedupe_key`, writes `notifications`), `api/monitor/{status,notifications}.js` (health aggregation + ack/resolve), `notifications` table, `src/views/MonitorView.jsx` + nav. Registered notification in `run.js` (cron `agent:notification` now resolves).
- **Why:** Autonomous Brand Mode needs operator visibility — what's failing, what's waiting at a gate, loop health — without babysitting logs.
- **Impact:** The monitoring dashboard is the human window into the autonomous loop. Notification Agent runs on the same queue/cron path as other agents. Remaining Phase-10 work: 30-day unattended run + external alert delivery (email/push).

### 2026-06-24 — IG/TikTok real ingestion (pluggable + manual)
- **What:** Extended `_sources.js` with a provider-agnostic scraper hook (`SOCIAL_SCRAPER_URL`/`SOCIAL_SCRAPER_KEY` — receives `{platform,url,max}`, returns `{samples}`), best-effort keyless TikTok page scrape (SIGI/universal-data JSON), and `normalizeSamples()` (tolerates any field convention). `analyze.js` now accepts operator-pasted `samples` directly (reliable real data for IG/TikTok).
- **Why:** IG/TikTok have no keyless channel feed and block datacenter scraping; the honest design is a pluggable real source + a paste fallback that always works, never fabricated stats.
- **Impact:** Any scraper (Apify/RapidAPI/self-hosted) plugs in with one env var; without it, operators paste posts. Same DNA pipeline as YouTube. `normalizeSamples` verified against mixed TikTok/generic/string inputs.

### 2026-06-24 — Channel Intelligence: real ingestion (Priority 5)
- **What:** Added `api/intelligence/_sources.js` (provider-agnostic channel source layer) and rewired `analyze.js` to ingest REAL recent videos. YouTube uses the public Atom RSS feed (`feeds/videos.xml?channel_id=`) — keyless, serverless-friendly — to get actual titles, descriptions, view + like counts; samples are stored in `channel_content_samples` with a median-relative `performance_tier`, and DNA extraction is now grounded in the real data (`data_confidence` high/low). IG/TikTok do best-effort oEmbed.
- **Why:** The old analyzer asked the model to recall a channel from memory (hallucination-prone). Real data → real, defensible DNA.
- **Impact:** Channel analysis is now evidence-based for YouTube without any API key (optional `YOUTUBE_API_KEY` only adds subscriber counts). IG/TikTok still need a real source (API/scraping) — that's the remaining P5 gap. Live-verified against @mkbhd (parsed real videos with real view counts).

### 2026-06-24 — Model Router subsystem
- **What:** Added a provider/model-agnostic Model Router (`src/lib/router/*`) + server adapter bootstrap (`api/_providers/router-adapters.js`) + `model_routing_log` table. Media Engine now routes all asset generation through it.
- **Why:** Eliminate vendor lock-in and hardcoded model choices; pick the best model per task by cost/quality/speed/reliability; lay the foundation for auto-learning.
- **Impact:** New media providers/models are added by editing the registry config + an adapter — no business-logic changes. Router core is pure (frontend-safe). `generate()` auto-falls-through to the next-best model on failure. Future: read `model_routing_log` to tune scores.

### 2026-06-24 — Skill System
- **What:** `api/skills/*` + `SkillsView` — ingest material, extract reusable content skills into `skill_manifests`, search/apply, inject into agents via `buildSkillContext`.
- **Why:** Turn uploaded playbooks/SOPs/courses into reusable techniques the generators apply.
- **Impact:** Reuses existing tables (no migration). `parseJSON` was made array-aware (was corrupting AI array responses). Added `coerceWorkspaceId()` to prevent the `'default'` sentinel from crashing UUID columns.

### 2026-06-23 — Media Engine (Runware + FFmpeg)
- **What:** `api/_render/*` + `api/media/*`; Runware as primary image provider; FFmpeg render backbone with multi-format export; OpenMontage demoted to a future RenderProvider.
- **Why:** Ship a working cloud-renderable pipeline; OpenMontage (local Python) can't run on Vercel.
- **Impact:** End-to-end short-form video production is possible server-side. Composition is a JSON manifest, so a heavier OpenMontage worker can be slotted in later unchanged.

### 2026-06-23 — Autonomous build foundation
- **What:** Provider abstraction, pgvector RAG knowledge system, job queue, 8 agents, 28-table schema extension.
- **Why:** Turn the dashboard into an autonomous content business OS.
- **Impact:** Established the agents-via-queue pattern and the RAG-before-generate convention used everywhere since.

---

## Resume Work Instructions

A future agent picking up ContentOS should:

**1. Understand the project**
- Read this file top to bottom. Then skim `IMPLEMENTATION_ROADMAP.md` and `CHANGELOG.md` for finer detail. Ignore `CONTENTOS_STATUS/TASKS/CLAUDE_HANDOFF.md` (stale).
- Read `MASTER_VISION.md` only for direction/intent — it is aspirational, not current state.
- The codebase is the source of truth for *how things work*; this file is the source of truth for *status and decisions*.

**2. Verify the current state**
```bash
git log --oneline -15            # recent work
git status                       # uncommitted changes?
npm install                      # deps
npm run build                    # frontend must build clean
node --check api/**/*.js         # (loop) backend syntax
```
- Check which env vars are present (names only — never print secret values): `grep -oE '^[A-Z_]+=' .env.local`.
- Is Supabase live? `curl -s -o /dev/null -w '%{http_code}' "$VITE_SUPABASE_URL/rest/v1/"`. If not, cloud features are inert (expected).
- For any provider work, make ONE tiny validation call before wiring broadly (e.g. Runware returns `insufficientCredits` if the key is valid but unfunded — that still confirms the request shape).

**3. Continue development safely**
- **Match the codebase:** plain JS ESM, JSDoc typedefs, the existing module patterns (provider modules export named fns + `has*Provider()`; endpoints `export default async function handler(req,res)`).
- **Never hardcode a model** in business logic — add it to `src/lib/router/model-registry.js`.
- **Media must route** — go through `api/media/engine.js` / the Model Router, never call a provider directly.
- **RAG/Skills must never throw** — `buildRAGContext` / `buildSkillContext` return `''` on failure.
- **Secrets:** server-only env, never in the client bundle, never committed, never pasted in chat. Keep `src/lib/router/*` pure.
- **Verify before committing:** `node --check` changed files, run the relevant local test (e.g. the render/router test patterns), `npm run build`. Scan new files for hardcoded secrets.
- **Commit style:** descriptive messages; one feature per commit; end with the Co-Authored-By trailer.
- **After a significant change:** update **Current Status**, the relevant section here, and append an **Agent Memory** entry.
- **Deploy** only when asked: `vercel --prod` (git push does not deploy).
```
