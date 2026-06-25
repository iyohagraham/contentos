# ContentOS — TASKS

> Autonomous work queue. Highest priority first. Checked = done (see CHANGELOG).
> Tasks marked **[BLOCKED]** need external credentials — see STATUS.md BLOCKED.
> **Updated:** 2026-06-24

## Now (Phase C — quality / DX, all unblocked)

- [x] T1. Tracking docs: STATUS.md, ROADMAP.md, TASKS.md
- [x] T2. `scripts/smoke.mjs` — post-deploy smoke test (health, engines, create+run a
      throwaway project, assert stages). Pure Node, no deps.
- [x] T3. Test harness: `tests/engines.test.mjs` — 17 assert tests (engines run +
      contract-validate, pipeline chaining, continuity flag+fix, media-loop honesty).
      Wired `npm test`. **17/17 pass.**
- [x] T4. `package.json` scripts: `test`, `check` (scripts/check.mjs), `smoke`, `verify`.
- [ ] T5. Repo hygiene sweep:
      - mark/relocate stale root docs (CONTENTOS_STATUS/TASKS/CLAUDE_HANDOFF) as
        archived (AGENTS.md already supersedes them)
      - prune any remaining dead code / unused exports
      - add missing JSDoc on new v2.0 endpoints
- [ ] T6. `run-whole-project` polish: ensure orchestrator returns per-stage progress
      the UI can show; add a "running…" state.
- [ ] T7. Structured logging: consistent `[area]` prefixes + error shapes across
      new endpoints (projects, studio, library, franchises, cron/advance-projects).
- [ ] T8. Cost/usage: a read-only `/api/router/scores` is live; add a tiny
      `/api/usage` summarizing `model_routing_log` spend (when DB live; no-db safe).

## Blocked (do NOT attempt — credentials/accounts)

- [BLOCKED] Provision Supabase + apply schema (operator)
- [BLOCKED] Fund Runware / FAL; deploy Postiz (operator)
- [BLOCKED] `vercel --prod` deploy (operator env)
- [BLOCKED] Rotate KIMI key (operator Moonshot account)

## Backlog (Phase E)

- Reference-image upload UI for characters
- Multi-scene Wan video in Media Loop
- Franchise navigator UI
- Project stage versioning / branch-from-stage
- External alert delivery (email/push)
- Cost dashboard UI
