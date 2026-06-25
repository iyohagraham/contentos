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

## Phase E — Deeper product (future)
- Stage-output diff/versioning + branch a project from any stage
- Reference-image upload UI for characters (true face lock)
- Multi-scene video (Wan) in the Media Loop, not just stills
- Franchise navigator UI (browse Universe→…→Episode)
- External alert delivery (email/push) for Brand Mode
- Cost dashboard from `model_routing_log` + per-project spend
