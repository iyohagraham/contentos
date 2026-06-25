# ContentOS — Activation Runbook (v2.0)

Everything is **built and verified**. This is the exact, ordered path from "built" to
"producing & publishing live videos." Steps 0–3 are required; 4 is optional polish.

> Reference: **AGENTS.md** is the source of truth for architecture. This file is
> only the go-live checklist. The app runs in localStorage/demo mode with zero
> keys — these steps activate the cloud + media + autonomy layers.

---

## 0. Security first (5 min) — DO THIS BEFORE ANYTHING ELSE

The repo is **public**. A `KIMI_API_KEY` was briefly committed; it has been purged
from all git history, but assume it was scraped.

1. Go to **https://platform.moonshot.ai/** → API Keys → **delete** the old key →
   create a **new** `KIMI_API_KEY`.
2. (Optional) Make the repo private: GitHub → repo → Settings → Danger Zone →
   Change visibility → Private.

---

## 1. Provision Supabase (15 min) — unlocks projects, persistence, the pipeline

Without this, the app runs but nothing persists and the autonomous cron can't run.

1. Create a project at **https://supabase.com** → wait for it to initialize.
2. **SQL Editor** → run, **in this exact order** (idempotent — safe to re-run):
   1. paste + run `supabase/schema.sql`
   2. paste + run `supabase/schema_extension.sql`
   This creates the base 8 tables + the extension tables incl. the v2.0 pipeline
   tables (`media_projects`, `engine_outputs`, `style_profiles`, `brands`,
   `universes`, `characters`, `franchises`) with RLS, indexes, triggers, pgvector,
   and the 4 vector-search functions.
3. **Project Settings → API** → copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (SECRET — server only)

Quick check (after deploy): `curl -s -o /dev/null -w '%{http_code}' "$VITE_SUPABASE_URL/rest/v1/"`
returns `200`.

---

## 2. Set environment variables (10 min)

Set these in **Vercel → Project `contentos` → Settings → Environment Variables**
(and mirror into `.env.local` for local dev). `VITE_*` are build-time — they must
be present **before** the build.

| Var | Required for | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | DB + auth | Supabase (step 1) |
| `SUPABASE_SERVICE_KEY` | server writes / cron | Supabase (step 1) — SECRET |
| `KIMI_API_KEY` | text AI (rotated) | platform.moonshot.ai |
| `OPENAI_API_KEY` | embeddings (RAG) + fallback | platform.openai.com |
| `RUNWARE_API_KEY` | **images** (primary) | my.runware.ai/wallet (fund it) |
| `FAL_KEY` | video + voice | fal.ai/dashboard/keys |
| `BLOB_READ_WRITE_TOKEN` | asset hosting | `vercel blob create-store` (auto-set) |
| `POSTIZ_URL` / `POSTIZ_API_KEY` | publishing | step 3 |
| `CRON_SECRET` | protect crons | any long random string |

Optional: `PIXABAY_API_KEY` (free music), `YOUTUBE_API_KEY` (richer channel intel),
`CRON_MAX_PROJECTS` (default 3).

> ⚠️ Gotcha: `vercel blob create-store -y` re-pulls env and may overwrite
> `.env.local` — run it first, or re-add secrets after.

---

## 3. Deploy + activate publishing (20 min)

1. **Deploy Postiz** (publishing layer) — Railway template, see
   `RAILWAY_POSTIZ_DEPLOY.md`. Connect your social accounts in Postiz, create an
   API key, and set `POSTIZ_URL` + `POSTIZ_API_KEY` in Vercel.
2. **Fund Runware** at my.runware.ai/wallet (images return `insufficientCredits`
   until funded) and ensure `FAL_KEY` is funded for video/voice.
3. **Ship it** (git push does NOT deploy — CLI only):
   ```bash
   cd /Users/iyohagraham/ContentOS
   vercel --prod
   ```
4. **Smoke-test** the live deployment:
   ```bash
   BASE=https://contentos-kappa.vercel.app           # your prod URL
   curl -s $BASE/api/health                            # {status:ok,...}
   curl -s $BASE/api/engines | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["stats"])'
   #   → {"total":22,"live":22,"stub":0}
   ```
   Then in the UI: **Studio → Library** (generate a Style + Universe) →
   **Studio → New Project** (brief + attach them) → **Run full pipeline**.

The cron `advance-projects` (every 5 min) will then advance any `draft`/`running`
project with a brief through Knowledge → … → Render → Publish automatically.

---

## 4. Optional polish

- **Music**: set `PIXABAY_API_KEY` (free) so the Music Engine returns real tracks
  instead of a request-spec.
- **Character consistency**: in Studio → Library, generate Characters with a
  reference image URL; the Media Loop uses img2img (seedImage) to keep them
  on-model across scenes.
- **Channel intelligence**: `YOUTUBE_API_KEY` enriches ingestion; `SOCIAL_SCRAPER_URL`
  plugs in real IG/TikTok ingestion.

---

## What "live" looks like

An operator builds a brand **Library** (style/universe/characters), creates a
**Project** with a one-line brief, and the **cron** produces and publishes a
character-consistent, on-brand video with **zero further code**. Until providers
are funded, the pipeline runs the full creative chain and pauses (`blocked`) at
the first provider gate — fund Runware/FAL/Postiz to run it to a published MP4.

## Verify state at any time
```bash
cd /Users/iyohagraham/ContentOS
curl -s "$BASE/api/engines"                 # architecture + live/stub stats
curl -s "$BASE/api/projects?workspace_id=…" # projects + pipeline state
# logs: Vercel dashboard → Functions; cron runs visible there every 5 min
```
