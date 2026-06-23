# ContentOS - Task List

**Last Updated**: 2026-06-22  
**Project**: ContentOS - Multi-Platform Video Content Engine  
**Status**: Production deployed but blank page issue

---

## 🔴 CRITICAL TASKS (Fix Immediately)

### 1. Fix Production Blank Page — ✅ RESOLVED (2026-06-23)
**Priority**: ~~CRITICAL~~ DONE
**Status**: Verified rendering in production via headless render. The
error-boundary / async-seed-catch / mount-detector commits fixed the mount
failure. While confirming, three related data bugs were also fixed (dashboard
KPI string-vs-number aggregation, first-paint seed race, and the calendar
drag-drop persistence bug #3). See CONTENTOS_STATUS.md "Recently Fixed".
**Remaining action**: deploy current working tree (push to `main` or
`vercel --prod`) so production picks up the KPI/calendar fixes.

<details><summary>Original (stale) task description</summary>

**Priority**: CRITICAL  
**Status**: Blocked - Need debugging  
**Impact**: Production site (https://contentos-kappa.vercel.app) is completely unusable

**Symptoms**:
- Page loads but shows blank screen
- ErrorBoundary added but no errors displayed
- Local dev works perfectly
- Vercel build succeeds (465KB bundle)

**Debug Steps**:
1. Open production site in browser
2. Open DevTools Console (F12)
3. Check for JavaScript errors
4. Check Network tab for failed requests
5. Look for CORS errors
6. Check if all environment variables are set in Vercel
7. Verify Vercel function logs for errors
8. Test with minimal App.jsx (just "Hello World")

**Possible Causes**:
- Missing environment variable (KIMI_API_KEY not set in Vercel?)
- Import error in production build
- React mount failure
- Vercel build cache issue
- CORS blocking API calls

**Resolution**:
- Add console.log statements to main.jsx
- Deploy with verbose error logging
- Check Vercel deployment logs
- Clear Vercel build cache and redeploy

**Estimated Time**: 1-2 hours

</details>

---

## 🟠 HIGH PRIORITY TASKS

### 2. Deploy Postiz to Railway
**Priority**: HIGH  
**Status**: Ready to execute  
**Impact**: Enables real social media posting to TikTok/Instagram/YouTube/Facebook

**What is Postiz?**
Open-source social media scheduler that handles OAuth for all platforms. We've built the integration, just need to deploy it.

**Steps**:
1. Go to https://railway.app
2. Sign up/login with GitHub
3. Deploy Postiz template: https://railway.app/template/postiz
4. Wait for deployment (~2-3 minutes)
5. Get Postiz URL (e.g., https://postiz-xxx.up.railway.app)
6. Create API key in Postiz dashboard
7. Add to Vercel env vars:
   - `POSTIZ_URL` = your Postiz URL
   - `POSTIZ_API_KEY` = your API key
8. Redeploy ContentOS to Vercel
9. Test posting from ContentOS

**Documentation**: See `RAILWAY_POSTIZ_DEPLOY.md`

**Estimated Time**: 30 minutes

### 3. Configure Supabase Database
**Priority**: HIGH  
**Status**: Ready to execute  
**Impact**: Enables cloud sync, data persistence across devices

**Steps**:
1. Go to https://supabase.com
2. Create new project
3. Wait for database to initialize (~2 minutes)
4. Go to SQL Editor
5. Copy contents of `supabase/schema.sql`
6. Run the SQL to create all tables
7. Go to Settings → API
8. Copy `Project URL` and `anon public key`
9. Add to Vercel env vars:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
10. Redeploy ContentOS to Vercel
11. Test data sync

**Schema Details**:
- 8 tables: workspaces, strategies, channels, videos, video_posts, products, sales, analytics_snapshots
- Row Level Security (RLS) enabled
- Auto-updated timestamps
- Foreign key relationships

**Estimated Time**: 20 minutes

### 4. Test End-to-End Workflow
**Priority**: HIGH  
**Status**: Blocked by Task #1  
**Impact**: Verify entire pipeline works

**Test Flow**:
1. Generate strategy (Strategy view)
2. Create video (Create view)
   - Generate script
   - Generate visuals (requires FAL_API_KEY)
   - Generate voiceover (requires FAL_API_KEY)
   - Export composition
3. Publish to channels (requires Postiz deployment)
4. View in calendar
5. Check analytics

**Estimated Time**: 30 minutes

---

## 🟡 MEDIUM PRIORITY TASKS

### 5. Implement User Authentication
**Priority**: MEDIUM  
**Status**: Not started  
**Impact**: Multi-user support, data isolation

**Requirements**:
- Use Supabase Auth (email/password or OAuth)
- Add login/signup UI
- Protect routes (redirect to login if not authenticated)
- Update database queries to filter by user_id
- Update RLS policies (already in schema)

**Implementation**:
1. Create `src/lib/auth.js` with Supabase auth helpers
2. Add `AuthProvider` context wrapper
3. Create Login/Signup components
4. Add auth check to App.jsx
5. Update all database queries to include user_id
6. Test with multiple users

**Estimated Time**: 3-4 hours

### 6. Add Video Thumbnail Previews
**Priority**: MEDIUM  
**Status**: Not started  
**Impact**: Better visual feedback in calendar and content views

**Requirements**:
- Generate thumbnail when video is created
- Display in calendar cards
- Display in content list
- Allow custom thumbnail upload

**Implementation**:
1. Add `thumbnail_url` field to videos table (already in schema)
2. Generate thumbnail from first frame of composition
3. Update CalendarView to show thumbnails
4. Update ContentView to show thumbnails
5. Add upload button for custom thumbnails

**Estimated Time**: 2-3 hours

### 7. Enhance Analytics Visualizations
**Priority**: MEDIUM  
**Status**: Partially done  
**Impact**: Better insights into content performance

**Current State**:
- Basic charts working
- Platform breakdown working
- Period selector working

**Enhancements Needed**:
- Add line charts for trend analysis
- Add engagement rate over time
- Add follower growth chart
- Add revenue attribution (which videos drove sales)
- Add export to CSV/PDF

**Implementation**:
1. Install chart library (recharts or chart.js)
2. Create reusable chart components
3. Add trend analysis to AnalyticsView
4. Add engagement metrics
5. Add revenue attribution logic
6. Add export functionality

**Estimated Time**: 4-5 hours

### 8. Add Bulk Operations
**Priority**: MEDIUM  
**Status**: Not started  
**Impact**: Better workflow efficiency

**Requirements**:
- Select multiple videos
- Bulk delete
- Bulk schedule
- Bulk publish
- Bulk export

**Implementation**:
1. Add checkbox selection to ContentView
2. Add bulk action toolbar
3. Implement bulk delete
4. Implement bulk schedule (open calendar picker)
5. Implement bulk publish (requires Postiz)
6. Implement bulk export (JSON/CSV)

**Estimated Time**: 3-4 hours

---

## 🟢 LOW PRIORITY TASKS

### 9. Add Content Templates
**Priority**: LOW  
**Status**: Not started  
**Impact**: Faster content creation

**Requirements**:
- Pre-built templates for common content types
- Tutorial template
- Product showcase template
- Behind-the-scenes template
- Testimonial template

**Implementation**:
1. Create templates data structure
2. Add template selector to Create view
3. Pre-fill script/visuals based on template
4. Allow saving custom templates

**Estimated Time**: 3-4 hours

### 10. Add AI Content Suggestions
**Priority**: LOW  
**Status**: Not started  
**Impact**: Content ideas based on trends

**Requirements**:
- Analyze trending topics in niche
- Suggest content ideas
- Score ideas by potential virality
- One-click create from suggestion

**Implementation**:
1. Create AI endpoint for trend analysis
2. Add suggestions panel to Dashboard
3. Score ideas based on engagement patterns
4. Add "Create from suggestion" button

**Estimated Time**: 4-5 hours

### 11. Add Video Editing Capabilities
**Priority**: LOW  
**Status**: Not started  
**Impact**: More control over final output

**Requirements**:
- Trim video
- Add text overlays
- Add transitions
- Adjust timing
- Preview before export

**Implementation**:
1. Integrate video editing library (ffmpeg.wasm)
2. Create editor UI
3. Add timeline scrubber
4. Add overlay editor
5. Add preview player
6. Export edited video

**Estimated Time**: 8-10 hours

### 12. Add Multi-Language Support
**Priority**: LOW  
**Status**: Not started  
**Impact**: Reach global audience

**Requirements**:
- Auto-translate scripts
- Generate voiceovers in multiple languages
- Add subtitles
- Language selector

**Implementation**:
1. Integrate translation API (DeepL or Google Translate)
2. Add language selector to Create view
3. Auto-translate script
4. Generate voiceover in target language
5. Add subtitle generation
6. Store language preference per video

**Estimated Time**: 5-6 hours

---

## 🔵 FUTURE ENHANCEMENTS (Nice to Have)

### 13. Add A/B Testing
- Create multiple versions of same video
- Test different hooks/thumbnails
- Track performance
- Auto-select winner

### 14. Add Collaboration Features
- Invite team members
- Assign roles (admin, editor, viewer)
- Comment on videos
- Approval workflow

### 15. Add AI Analytics Insights
- Analyze what content performs best
- Suggest optimal posting times
- Predict viral potential
- Recommend content strategy changes

### 16. Add Mobile App
- React Native app
- Push notifications
- Quick posting from mobile
- View analytics on the go

### 17. Add Marketplace
- Sell video templates
- Buy/sell content ideas
- Commission custom videos
- Affiliate program

---

## 🐛 KNOWN BUGS

### Bug #1: Production Blank Page
**Severity**: CRITICAL  
**Status**: Investigating  
**See**: Task #1

### Bug #2: No Error Messages Displayed
**Severity**: HIGH  
**Status**: Investigating  
**Description**: ErrorBoundary added but no errors shown on production  
**Impact**: Hard to debug production issues

### Bug #3: Calendar Drag-and-Drop Not Persisting — ✅ FIXED (2026-06-23)
**Severity**: MEDIUM  
**Status**: Fixed (pending deploy)  
**Root cause**: Calendar bucketed videos by `new Date(v.postedAt)`, but
`postedAt` is a humanized display string (`"2 hours ago"`) → `Invalid Date`.
Drops also wrote a `postedAt` field the display layer never reads (it derives
from `published_at`/`scheduled_time`).  
**Fix**: Bucket by the raw ISO date and persist drops to `scheduled_time`
(or `published_at` for published videos). See `CalendarView` in `src/App.jsx`.

### Bug #4: Analytics Not Updating After Post
**Severity**: MEDIUM  
**Status**: Not fixed  
**Description**: Analytics don't refresh after posting  
**Impact**: Users see stale data  
**Fix**: Add refresh button, auto-refresh after post

### Bug #5: Composition Preview Not Working in Some Browsers
**Severity**: LOW  
**Status**: Not fixed  
**Description**: iframe preview doesn't render in Safari  
**Impact**: Safari users can't preview compositions  
**Fix**: Add fallback rendering method

---

## 📋 COMPLETED TASKS

### ✅ Publish Step → Postiz Integration
- Connected step 5 "Publish" to Postiz API
- Show connected channels as publish targets
- Add "Post Now" and "Schedule" buttons
- Save video record to DB after publish

### ✅ Database Integration
- Save generated scripts as video records
- Save strategies to DB
- Wire ContentView to show generated videos
- Add video status tracking (draft → rendered → published)

### ✅ Content Calendar View
- Monthly/weekly calendar grid
- Show scheduled posts across all platforms
- Color-coded by platform
- Drag-and-drop rescheduling (UI only, persistence bug)

### ✅ HyperFrames Composition Export
- Wire OpenMontage bridge into the UI
- Generate downloadable HTML compositions
- Preview compositions in-app (iframe with live preview)
- Export as HyperFrames-ready files (Download HTML button)
- API endpoint verified working in production

### ✅ Analytics Integration
- Add /api/analytics endpoint with period filtering (7d/30d/90d)
- Add Postiz analytics methods
- Wire AnalyticsView to fetch real analytics data
- Add period selector UI
- Show Postiz connection status
- Dynamic platform breakdown
- Fallback to local stats when Postiz not configured

### ✅ AI Generation Pipeline
- Script generation (Kimi k2.7)
- Strategy generation (Kimi k2.7)
- Content ideas generation (Kimi k2.7)
- Visual generation (fal.ai FLUX)
- Voiceover generation (fal.ai Kokoro)
- Composition export (HyperFrames)

### ✅ UI/UX Features
- Dashboard with real-time stats
- Strategy view with AI generation
- Create view with full pipeline
- Content management view
- Calendar view with drag-and-drop
- Analytics view with charts
- Monetization view
- Channels view with Postiz sync
- Settings view with DB mode indicator

### ✅ Infrastructure
- Vercel deployment configured
- Express server for local dev
- Supabase schema designed
- Postiz integration built
- Environment variables documented
- Error handling added

---

## 🎯 NEXT ACTIONS (In Order)

1. **Fix production blank page** (Task #1)
   - Debug React mount failure
   - Check browser console
   - Verify environment variables
   - Test with minimal App.jsx

2. **Deploy Postiz** (Task #2)
   - Follow RAILWAY_POSTIZ_DEPLOY.md
   - Connect social accounts
   - Test posting

3. **Configure Supabase** (Task #3)
   - Create project
   - Run schema.sql
   - Add env vars
   - Test sync

4. **Test end-to-end** (Task #4)
   - Generate strategy
   - Create video
   - Publish to channels
   - View in calendar
   - Check analytics

5. **Add user authentication** (Task #5)
   - Implement Supabase Auth
   - Add login/signup UI
   - Protect routes

---

## 📊 PROJECT METRICS

### Code Stats
- **Total Files**: ~50
- **Total Lines**: ~10,000+
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Express + Vercel Serverless
- **Database**: Supabase (PostgreSQL) + localStorage
- **APIs**: 10 endpoints
- **Views**: 9 main views

### Deployment
- **Production**: Vercel (contentos-kappa.vercel.app)
- **Local**: localhost:5173 (frontend) + localhost:3001 (API)
- **Postiz**: Not deployed yet (Railway)
- **Supabase**: Not configured yet

### Performance
- **Bundle Size**: 251KB (local) / 465KB (Vercel)
- **API Response**: 2-7s (AI generation)
- **Database**: <1ms (localStorage) / ~200-500ms (Supabase)

---

## 📚 DOCUMENTATION

### For Developers
- `CONTENTOS_CLAUDE_HANDOFF.md` - Full architecture and technical details
- `CONTENTOS_STATUS.md` - Current status and known issues
- `CONTENTOS_TASKS.md` - This file (task list)
- `RAILWAY_POSTIZ_DEPLOY.md` - Postiz deployment guide
- `README.md` - Project overview

### For Users
- In-app help (not implemented yet)
- Video tutorials (not created yet)
- API documentation (not created yet)

---

## 🤝 CONTRIBUTION GUIDELINES

### Code Style
- Use functional React components
- Use hooks for state management
- Use TailwindCSS for styling
- Follow existing naming conventions
- Add comments for complex logic

### Git Workflow
- Create feature branch for each task
- Commit frequently with clear messages
- Test locally before pushing
- Update documentation when adding features

### Testing
- Test in local dev before deploying
- Test all affected views
- Test API endpoints
- Test database operations
- Test error handling

---

## 📞 SUPPORT

For questions about tasks:
1. Check relevant documentation files
2. Review code comments
3. Check conversation history
4. Ask for clarification

For bugs:
1. Reproduce in local dev
2. Check browser console
3. Check Vercel logs
4. Document steps to reproduce
5. Create fix in feature branch

---

**Ready to start? Begin with Task #1: Fix Production Blank Page**
