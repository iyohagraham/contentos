# ContentOS Deployment Guide

Deploy ContentOS to production on Vercel (frontend + serverless API).

## Prerequisites

- A [Vercel account](https://vercel.com) (free tier works)
- A [GitHub account](https://github.com) (recommended) OR Vercel CLI
- Your API keys ready (Kimi, fal.ai, Supabase)

---

## Option A: Deploy via Vercel CLI (fastest)

```bash
cd /Users/iyohagraham/ContentOS

# 1. Login to Vercel
npx vercel login

# 2. Deploy (first run links the project)
npx vercel

# 3. Deploy to production
npx vercel --prod
```

The CLI will ask a few questions:
- Set up and deploy? **Y**
- Which scope? **(your account)**
- Link to existing project? **N**
- Project name? **contentos**
- Directory? **./** (just press enter)
- Override settings? **N**

---

## Option B: Deploy via GitHub (best for ongoing updates)

```bash
cd /Users/iyohagraham/ContentOS

# 1. Initialize git (if not already)
git init
git add .
git commit -m "Initial ContentOS commit"

# 2. Create a GitHub repo and push
gh repo create contentos --private --source=. --push
# OR manually create on github.com and:
# git remote add origin https://github.com/YOU/contentos.git
# git push -u origin main
```

Then on [vercel.com](https://vercel.com):
1. Click **Add New → Project**
2. Import your `contentos` repo
3. Vercel auto-detects Vite — click **Deploy**

---

## Step 2: Set Environment Variables

In the Vercel dashboard → your project → **Settings → Environment Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `KIMI_API_KEY` | `sk-...` | For AI script/strategy generation |
| `FAL_AI_API_KEY` | `...` | For AI visuals (optional) |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Cloud database (optional) |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Public client key |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | For cron job (server-side only) |
| `CRON_SECRET` | `(random string)` | Protects the cron endpoint |

After adding variables, **redeploy** for them to take effect:
```bash
npx vercel --prod
```

---

## Step 3: Set Up the Database (optional but recommended)

Without Supabase, the app uses browser localStorage (works, but data
stays on one device). To enable cloud sync:

1. Create a project at [app.supabase.com](https://app.supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`
4. Redeploy

---

## Step 4: Verify Deployment

Once deployed, Vercel gives you a URL like `https://contentos.vercel.app`.

Test these:
- [ ] Dashboard loads with demo data
- [ ] Strategy generator works (`/api/generate-strategy`)
- [ ] Script generator works (`/api/generate-script`)
- [ ] Channels can be added/removed
- [ ] Cron job appears in **Settings → Cron Jobs**

Test the API directly:
```bash
curl -X POST https://YOUR-APP.vercel.app/api/generate-script \
  -H "Content-Type: application/json" \
  -d '{"topic":"tax tips for freelancers","style":"faceless"}'
```

---

## Architecture in Production

```
┌─────────────────────────────────────────────┐
│              Vercel Edge Network              │
│                                               │
│  ┌─────────────┐      ┌────────────────────┐  │
│  │  Vite SPA   │      │ Serverless Funcs   │  │
│  │  (dist/)    │─────▶│  /api/generate-*   │  │
│  │  React UI   │      │  /api/social/*     │  │
│  └─────────────┘      │  /api/cron/*       │  │
│         │             └────────────────────┘  │
└─────────┼──────────────────────┼──────────────┘
          │                      │
          ▼                      ▼
   ┌─────────────┐        ┌─────────────┐
   │  Supabase   │        │   Kimi AI   │
   │  (Postgres) │        │   fal.ai    │
   └─────────────┘        └─────────────┘
          ▲
          │ every 5 min
   ┌─────────────────┐
   │  Vercel Cron    │
   │ process-scheduled│
   └─────────────────┘
```

---

## Local Development

```bash
npm run dev    # runs both API server (:3001) and Vite (:5173)
```

## Troubleshooting

**API returns 500 in production**
- Check env vars are set in Vercel dashboard
- Check **Functions** logs in Vercel dashboard

**"Module not found" on deploy**
- Ensure all imports use `.js` extensions (ES modules requirement)

**Cron not running**
- Cron jobs require a Vercel Pro plan, OR trigger manually:
  `curl https://YOUR-APP.vercel.app/api/cron/process-scheduled -H "Authorization: Bearer YOUR_CRON_SECRET"`

**Scheduled posts not publishing**
- Verify Supabase is configured (cron needs DB access)
- Verify social platform credentials are connected
