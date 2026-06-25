# ContentOS — ROADMAP

> Forward direction. AGENTS.md "Current Roadmap" holds the canonical engine-level
> plan; this is the higher-level phase view. **Updated:** 2026-06-24

## ✅ Phase A — v1 foundation (done)
Provider abstraction, Model Router (auto-learning), Knowledge/RAG, Skills,
Research + Channel Intelligence, Content Planning, Media Engine (Runware+FFmpeg),
10 agents, Postiz publishing, Phase 8 Analytics, Autonomous Brand Mode monitoring.

## ✅ Phase B — v2.0 AI Media OS pivot (done)
OpenMontage removed; 22 single-responsibility engines + JSON contracts; resumable
projects (media_projects/engine_outputs); Studio UI; autonomous full-pipeline
orchestrator + cron; Library building blocks; character reference-image
consistency; continuity auto-fix; per-scene media loop; activation runbook.

## ▶ Phase C — Quality, testability, DX (current)
- [x] Tracking docs (STATUS/ROADMAP/TASKS)
- [ ] Smoke-test script (`scripts/smoke.mjs`)
- [ ] Assert-based test harness (engines, contracts, pipeline) + `npm test`
- [ ] Lint script + basic checks
- [ ] Repo hygiene: prune stale docs, dead code, add missing JSDoc
- [ ] Per-engine error surfaces + structured logging consistency
- [ ] `run-whole-project` UX (one-click end-to-end with progress)

## Phase D — Activation (blocked on accounts; see ACTIVATION.md)
Supabase provision, fund Runware/FAL, deploy Postiz, `vercel --prod`, 30-day
unattended Brand-Mode run.

## Phase E — Deeper product (in progress)
- [x] Cost dashboard from `model_routing_log` (Studio → Usage)
- [x] Franchise navigator UI (browse Universe→…→Episode; spawn episode-projects)
- [x] Stage-output versioning (history on re-run/edit + restore)
- [x] Branch-from-stage (fork a project + its outputs up to a chosen stage)
- [x] Reference-image / appearance fields for characters in the Library (face lock)
- [x] Per-scene Wan video in the Media Loop (opt-in `video:true`; stills default)
- [x] External alert delivery: pluggable dispatcher built + wired (webhook/email);
      activates on `ALERT_WEBHOOK_URL`/`ALERT_EMAIL_WEBHOOK_URL` (operator provides endpoint)
