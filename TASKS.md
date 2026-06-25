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
- [x] T5. Repo hygiene sweep: archived stale root docs to `docs/archive/`; deleted
      dead `src/lib/api.js`; updated AGENTS.md refs.
- [ ] T6. `run-whole-project` polish: orchestrator already returns `ran[]` + status;
      surface live per-stage progress in the UI (PipelineView shows the result banner).
      Remaining: a polling "running…" state for long runs.
- [x] T7. Structured logging: top-level try/catch + `[area]` error logging added to
      projects/library/franchises/usage handlers (studio/cron already logged).
- [x] T8. `/api/usage` — read-only spend/usage summary from `model_routing_log`
      (totals + byProvider/byModel/byTask; no-db safe).

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
