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
- [x] T6. `run-whole-project` polish: PipelineView result banner now lists each
      ran stage with status + duration (green=complete, amber=blocked). (Orchestrator
      is synchronous; a future async/polling mode is in Phase E backlog.)
- [x] T7. Structured logging: top-level try/catch + `[area]` error logging added to
      projects/library/franchises/usage handlers (studio/cron already logged).
- [x] T8. `/api/usage` — read-only spend/usage summary from `model_routing_log`
      (totals + byProvider/byModel/byTask; no-db safe).

## Blocked (do NOT attempt — credentials/accounts)

- [BLOCKED] Provision Supabase + apply schema (operator)
- [BLOCKED] Fund Runware / FAL; deploy Postiz (operator)
- [BLOCKED] `vercel --prod` deploy (operator env)
- [BLOCKED] Rotate KIMI key (operator Moonshot account)

## Phase E — DONE (all unblocked items shipped)

- [x] Cost/usage dashboard (`/api/usage` + Studio Usage tab)
- [x] Franchise navigator UI (scaffold + browse + spawn episode-projects)
- [x] Stage-output versioning (history + restore)
- [x] Branch-from-stage (`/api/studio/branch`)
- [x] Character ref-image / appearance fields (face lock)
- [x] Per-scene Wan video in Media Loop (`video:true`)
- [x] External alert dispatcher (`api/monitor/dispatch.js`; activates on env)

## Remaining = BLOCKED only (external accounts/services — see STATUS.md)

No further unblocked code work remains in the planned scope. Next meaningful
progress requires the operator to execute `ACTIVATION.md` (Supabase, Runware/FAL,
Postiz, deploy) and optionally provide an alert webhook/mailer endpoint.

## Future ideas (not yet specced — open for prioritization)

- Project timeline/Gantt view of stage runs
- A/B compare two project branches side-by-side
- Per-workspace provider key management UI
- Webhook receiver for provider async callbacks (Runware/FAL job webhooks)
