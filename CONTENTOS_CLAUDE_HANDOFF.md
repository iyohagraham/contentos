# ContentOS - Claude Code Handoff

## Project Overview

**ContentOS** is a multi-platform video content engine for faceless channels. It enables creators to generate AI-powered video content, manage social media posting across TikTok/Instagram/YouTube/Facebook, track analytics, and sell digital products - all from a single dashboard.

**Production URL**: https://contentos-kappa.vercel.app  
**Local Dev**: http://localhost:5173 (frontend) + http://localhost:3001 (API)

## Core Requirements

### User Goals
1. **Scale multi-platform content** - Generate and post to Instagram, YouTube, TikTok, Facebook simultaneously
2. **Automate content creation** - AI generates scripts, visuals, voiceovers, captions
3. **Monetize through digital products** - Sell guides, templates, courses via content funnels
4. **Track performance** - Real-time analytics across all platforms
5. **Manage multiple channels** - Run multiple brand pages/accounts from one interface

### Technical Stack
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Express.js (local dev) + Vercel Serverless Functions (production)
- **Database**: Supabase (PostgreSQL) with localStorage fallback
- **AI Services**: 
  - Kimi k2.7 (Moonshot AI) - Script/strategy generation
  - fal.ai - Visual generation (FLUX), motion (Wan 2.1), TTS (Kokoro)
- **Social Media**: Postiz integration (open-source scheduler)
- **Video Rendering**: HyperFrames (HTML-based video compositions)

## Architecture Decisions

### 1. Dual-Mode Database (localStorage ↔ Supabase)
**Decision**: App works immediately with localStorage; transparently switches to Supabase when credentials are provided.

**Why**: Allows instant demo/testing without database setup. Production uses Supabase for persistence.

**Implementation**:
- `src/lib/db/store.js` - Unified store with adapter pattern
- `src/lib/db/supabase.js` - Supabase client wrapper
- `src/lib/db/useStore.js` - React hooks for data access
- Mode indicator in sidebar (cloud/local icon)

### 2. Serverless API Architecture
**Decision**: All API endpoints are Vercel serverless functions (`/api/*.js`), with Express wrapper for local dev.

**Why**: Single codebase for local and production. Vercel handles scaling automatically.

**Implementation**:
- `api/` directory contains all endpoints
- `server.js` - Express server that imports same handlers
- `vite.config.js` - Proxy `/api` to localhost:3001 in dev

### 3. Postiz for Social Media Integration
**Decision**: Use Postiz (self-hosted) instead of direct platform OAuth.

**Why**: Platform OAuth requires business verification, app approval (weeks/months). Postiz handles all that complexity.

**Implementation**:
- `src/lib/social/postiz.js` - Postiz API client
- `api/postiz/*.js` - Serverless proxy endpoints
- User deploys Postiz to Railway, connects accounts there, ContentOS posts through Postiz API

### 4. HyperFrames for Video Rendering
**Decision**: Generate HTML compositions that render to video via HyperFrames/OpenMontage.

**Why**: HTML-based rendering is faster, more flexible than traditional video editing. Integrates with existing OpenMontage workflow.

**Implementation**:
- `openmontage-bridge.js` - Converts scripts to HyperFrames HTML
- `api/generate-composition.js` - API endpoint
- In-app preview (iframe) + download button

### 5. Demo Mode Fallback
**Decision**: All AI endpoints return realistic demo content when API keys are missing.

**Why**: Allows full UI testing without API costs. Users can explore features before committing to API keys.

**Implementation**: Each API handler checks for key, returns demo data if missing.

## Key Files

### Frontend
- `src/App.jsx` (2151 lines) - Main app with all views
  - DashboardView, StrategyView, CreateView, ContentView, CalendarView
  - AnalyticsView, MonetizeView, ChannelsView, SettingsView
- `src/main.jsx` - Entry point with ErrorBoundary
- `src/lib/db/store.js` - Unified data store (localStorage/Supabase)
- `src/lib/db/useStore.js` - React hooks (useChannels, useVideos, etc.)
- `src/lib/format.js` - Data formatters (DB → display)
- `src/lib/postizClient.js` - Frontend Postiz API client

### Backend (API)
- `api/generate-script.js` - AI script generation (Kimi k2.7)
- `api/generate-strategy.js` - AI strategy generation
- `api/generate-ideas.js` - AI content ideas
- `api/generate-composition.js` - HyperFrames HTML generation
- `api/analytics.js` - Analytics aggregation (Postiz or local)
- `api/postiz/status.js` - Postiz connection status
- `api/postiz/channels.js` - List Postiz channels
- `api/postiz/post.js` - Create post via Postiz
- `api/health.js` - Health check endpoint
- `api/_kimi.js` - Shared Kimi client (baseURL, model, JSON parsing)

### Database
- `supabase/schema.sql` - Full PostgreSQL schema (8 tables)
  - workspaces, strategies, channels, videos, video_posts, products, sales, analytics_snapshots
  - Row Level Security (RLS) policies
  - Indexes for performance
  - Auto-update triggers

### Configuration
- `vercel.json` - Vercel deployment config
- `vite.config.js` - Vite + React + API proxy
- `server.js` - Express server for local dev
- `.env.example` - Environment variable template

## Environment Variables

### Required (Production)
```bash
# Kimi AI (Moonshot) - Script/strategy generation
KIMI_API_KEY=sk-...  # Provided by user

# Postiz (Social Media) - Real posting
POSTIZ_URL=https://your-postiz.up.railway.app
POSTIZ_API_KEY=pk_...  # From Postiz Settings → API Keys
```

### Optional
```bash
# Supabase - Cloud database (app works without it using localStorage)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# fal.ai - AI visual generation (FLUX, Wan, Kokoro TTS)
FAL_API_KEY=...

# OpenAI - Alternative to Kimi (not currently used)
OPENAI_API_KEY=...
```

### Local Development
Stored in `.env.local` (gitignored):
```bash
KIMI_API_KEY=***REMOVED-KIMI-KEY***
POSTIZ_URL=
POSTIZ_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Database Schema

### Tables
1. **workspaces** - Brand workspaces (user can have multiple)
2. **strategies** - Content strategies (brand, pillars, schedule, roadmap)
3. **channels** - Connected social accounts (TikTok, Instagram, etc.)
4. **videos** - Video projects (script, assets, status, scheduling)
5. **video_posts** - Per-platform publishing records (with analytics)
6. **products** - Digital products (guides, templates, courses)
7. **sales** - Sales tracking (product → video attribution)
8. **analytics_snapshots** - Daily aggregates (followers, views, revenue)

### Key Relationships
- workspace → strategies, channels, videos, products (1:N)
- video → video_posts (1:N, one per platform)
- product → sales (1:N)
- channel → video_posts, analytics_snapshots (1:N)

### Row Level Security
All tables have RLS enabled. Users can only access their own workspaces and child records.

## API Endpoints

### AI Generation
- `POST /api/generate-script` - Generate video script from topic
  - Input: `{topic, style, length}`
  - Output: `{hook, body[], cta, estimatedDuration, suggestedVisuals, fullScript}`
  - Uses: Kimi k2.7 (kimi-k2.7-code-highspeed)
  
- `POST /api/generate-strategy` - Generate content strategy
  - Input: `{niche, audience, product}`
  - Output: `{brand, pillars[], schedule{}, roadmap[], product{funnel}}`
  
- `POST /api/generate-ideas` - Generate content ideas
  - Input: `{niche, count}`
  - Output: `{ideas[{title, type, description, visual}]}`

### Video Production
- `POST /api/generate-composition` - Generate HyperFrames HTML
  - Input: `{script, options{brandName, primaryColor, fontFamily}}`
  - Output: `{success, composition, html, duration}`
  - Returns: Full HTML composition with clips, styles, timeline

### Social Media (Postiz Proxy)
- `GET /api/postiz/status` - Check Postiz connection
  - Output: `{configured, channelCount}`
  
- `GET /api/postiz/channels` - List connected channels
  - Output: `{channels[{id, name, platform, picture, disabled}]}`
  
- `POST /api/postiz/post` - Create post
  - Input: `{channelIds[], content, mediaUrls[], scheduledTime}`
  - Output: `{success, postId, scheduled, scheduledTime}`

### Analytics
- `GET /api/analytics?period=7d|30d|90d` - Get analytics
  - Output: `{totalViews, totalLikes, totalComments, totalShares, totalFollowers, avgEngagement, byPlatform{}}`
  - Source: Postiz (if configured) or local stats

### Health
- `GET /api/health` - Health check
  - Output: `{status, configured, timestamp}`

## Deployment

### Vercel (Production)
- **URL**: https://contentos-kappa.vercel.app
- **Build**: `vite build` → `dist/`
- **Functions**: `api/**/*.js` (30s max duration)
- **Cron**: `/api/cron/process-scheduled` daily at 9AM (processes scheduled posts)
- **Env Vars**: Set in Vercel Dashboard → Settings → Environment Variables

### Local Development
```bash
cd /Users/iyohagraham/ContentOS
npm install
npm run dev  # Starts both Express (3001) and Vite (5173)
```

### Postiz (Social Media)
Postiz must be deployed separately to Railway:
1. Deploy Postiz template: https://railway.app/template/postiz
2. Connect social accounts in Postiz UI
3. Get API key from Postiz Settings → API Keys
4. Set `POSTIZ_URL` and `POSTIZ_API_KEY` in ContentOS

See `RAILWAY_POSTIZ_DEPLOY.md` for detailed instructions.

## Known Issues

### 1. Blank Page on Production
**Status**: Investigating  
**Symptom**: https://contentos-kappa.vercel.app shows blank page  
**Cause**: Unknown - ErrorBoundary and error handlers added but no error displayed  
**Next Steps**: 
- Check browser console for errors
- Verify JS bundle loads correctly
- Test with minimal App.jsx to isolate issue

### 2. Postiz Not Connected
**Status**: Expected - User needs to deploy Postiz  
**Impact**: Social media posting disabled  
**Solution**: Follow `RAILWAY_POSTIZ_DEPLOY.md` to deploy Postiz

### 3. Supabase Not Configured
**Status**: Expected - Using localStorage fallback  
**Impact**: Data not persisted across devices  
**Solution**: Create Supabase project, run `supabase/schema.sql`, add env vars

## Performance Notes

- **Bundle Size**: ~251KB (local) vs ~465KB (Vercel build) - Vercel includes Supabase client
- **API Response Time**: Kimi generation takes 2-7s (kimi-k2.7-code-highspeed model)
- **Database**: localStorage is instant; Supabase adds network latency
- **Caching**: Vercel caches static assets; API responses are not cached

## Security Considerations

- **API Keys**: Never commit `.env.local` - only `.env.example` in git
- **Postiz API Key**: Stored server-side only (Vercel env vars), never exposed to frontend
- **Supabase RLS**: All tables have row-level security enabled
- **CORS**: Express server allows all origins (configure for production if needed)

## Testing Checklist

- [ ] Dashboard shows real stats (followers, views, revenue)
- [ ] Strategy generation works (Kimi API)
- [ ] Script generation works (Kimi API)
- [ ] Visual generation works (fal.ai - requires FAL_API_KEY)
- [ ] Voiceover generation works (fal.ai Kokoro - requires FAL_API_KEY)
- [ ] Composition export works (HyperFrames HTML)
- [ ] Calendar drag-and-drop works
- [ ] Analytics shows platform breakdown
- [ ] Postiz connection works (requires Postiz deployment)
- [ ] Social posting works (requires Postiz deployment)
- [ ] Supabase sync works (requires Supabase setup)

## Support Resources

- **Kimi API Docs**: https://platform.moonshot.ai/docs
- **Postiz Docs**: https://docs.postiz.com
- **Supabase Docs**: https://supabase.com/docs
- **HyperFrames**: https://hyperframes.io (internal tool)
- **Vercel Docs**: https://vercel.com/docs

## Contact

For questions about this project, refer to the conversation history or check the code comments.
