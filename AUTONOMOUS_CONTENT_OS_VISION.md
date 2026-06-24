# ContentOS — Autonomous Content Business Operating System
## Complete End-State Architecture Vision

**Document version:** 1.0  
**Date:** 2026-06-23  
**Author:** Claude Code (Systems Architect)  
**Status:** Vision document — authoritative target for all future development

---

## Executive Summary

ContentOS is being replatformed from a content *generation dashboard* into a fully autonomous *content business operating system* (CBOS).

**The current system** generates scripts and strategies on demand, stores data locally, and requires a human to touch every step: generate idea → write script → produce media → publish → check analytics → update strategy.

**The target system** accepts a single natural-language brief from the operator — niche, audience, goal, product, platform, style — and then runs the entire brand continuously: researching competitors, generating and publishing content, tracking performance, optimizing strategy, growing revenue, and improving its own models of what works, with human involvement reduced to approvals, product creation, and high-stakes decisions.

The architecture is designed around **eleven specialized agents** coordinated by a **Orchestration Layer**, backed by a **vector knowledge base**, powered by a **provider-agnostic media stack**, and self-improving through a **closed-loop analytics and optimization engine**.

This document defines the complete end-state. The [Phased Implementation Plan](#15-phased-implementation-plan) maps the path from today's codebase to that end-state across four phases.

---

## System Principles

1. **Operator-set-and-forget.** One brief in, autonomous operation out. Human touchpoints are deliberate and minimal.
2. **Provider agnosticism.** Every AI, media, and social capability is accessed through an abstraction layer. Swapping Kimi for GPT-4o, or fal.ai for Runway, touches one config line.
3. **Closed-loop learning.** Every publish event is a data point. Performance feeds back into strategy. Strategy feeds back into content planning. The system gets better with every post.
4. **Ground truth in research.** Strategy and content decisions are grounded in actual competitor data, real hooks that performed, and verified audience signals — not hallucinated guesses.
5. **Monetization is first-class.** Revenue attribution from content view → lead → conversion is a core data model concern, not an afterthought.
6. **Composable agents, not a monolith.** Each subsystem is a discrete agent with defined inputs, outputs, and responsibilities. Agents communicate through the database and job queue, not in-memory singletons.
7. **Supabase-native.** All persistent state lives in Supabase (PostgreSQL + pgvector + Storage + Auth + Realtime). No dual-mode localStorage fallback in the end state.

---

## 1. Strategic Brain

### Responsibility

The Strategic Brain is the operator's long-term thinking partner. Given the initial business brief, it produces and maintains every layer of the content strategy — from the 12-month vision down to the weekly plan — and re-evaluates those plans whenever performance data warrants it.

### Inputs

```
business_brief {
  niche:              "financial freedom for young men"
  audience:           "18-30 male, $30-50k income, wants out of 9-5"
  business_goal:      "grow YouTube channel to 100k subscribers in 12 months"
  monetization_goal:  "sell $297 digital course on building income streams"
  product:            "Income Stack Blueprint (course)"
  platforms:          ["youtube", "instagram", "tiktok"]
  content_style:      "direct, no-BS, data-driven"
}
```

### Outputs

| Output | Cadence | Stored in |
|---|---|---|
| 12-month strategy | On brief creation; refresh quarterly | `strategies` table |
| 90-day roadmap | On brief creation; refresh monthly | `roadmaps` table |
| 30-day sprint plan | Monthly auto-generation | `sprint_plans` table |
| Weekly content plan | Weekly auto-generation | `content_plans` table |
| Daily content queue | Daily auto-generation | `content_queue` table |
| Strategy health score | After every analytics cycle | `strategies.health_score` |

### Subsystem Components

**Niche Analyzer**
- Ingests Research Intelligence output for the operator's niche
- Calculates: niche saturation score, content gap map, keyword opportunity matrix
- Identifies: underserved sub-niches, over-served topics to avoid
- Output: `niche_analysis` JSON stored in `strategies.niche_data`

**Competitor Analyzer**
- Tracks top 10-20 competitors identified at brief creation or discovered by Research Engine
- Metrics tracked: upload frequency, average views, hook patterns, thumbnail style, CTA patterns, monetization methods, growth trajectory
- Output: competitor intelligence map stored in `competitor_profiles`

**Audience Analyzer**
- Builds psychographic profile from: competitor comment sentiment, search query patterns, subreddit/forum content, social engagement signals
- Constructs: pain points matrix, aspiration map, language patterns library, objection library
- Output: `audience_profiles` table

**Market Opportunity Engine**
- Cross-references niche gaps × audience pain points × competitor weaknesses
- Scores opportunities by: estimated traffic, monetization potential, content effort, competitive difficulty
- Output: ranked opportunity list in `market_opportunities`

**Content Pillar Generator**
- Produces 4-6 content pillars (recurring themes that build the brand)
- Each pillar has: title, purpose (top-of-funnel / mid-funnel / conversion), content formats, example titles, SEO keywords
- Output: `strategy_pillars` table (FK → strategies)

**Content Calendar Generator**
- Fills a rolling 4-week calendar from the sprint plan
- Respects: platform best-post-time windows, content mix ratios, campaign themes, seasonal context
- Triggers Content Planning Engine to generate the daily queue
- Output: entries in `content_calendar`

**Growth Forecaster**
- Simple regression + ML model trained on historical channel trajectories
- Projects: followers at 30/60/90/180/365 days, estimated revenue milestones
- Recalibrates monthly against actual results
- Output: `growth_forecasts` table

**Strategy Re-evaluation Trigger**
- Listens for: analytics cycle completion, major performance deviation (>±40% vs forecast), operator override
- When triggered: runs abbreviated niche + competitor + performance analysis, flags if strategy needs update
- Output: `strategy_health_events`

---

## 2. Research Intelligence Engine

### Responsibility

The system's eyes and ears. Continuously ingests content from the operator's platforms, competitor channels, and niche communities. Everything researched becomes a structured asset in the Knowledge Base.

### Platform Coverage

| Platform | Data Collected | Method |
|---|---|---|
| YouTube | Videos, titles, descriptions, transcripts, view counts, likes, comments, subscriber counts, thumbnails | YouTube Data API v3 + `yt-dlp` for transcripts |
| TikTok | Videos, captions, sounds, hashtags, view/like/comment counts, creator profiles | Apify TikTok Scraper |
| Instagram | Reels, posts, captions, hashtags, engagement, profile metrics | Apify Instagram Scraper |
| X (Twitter) | Posts, threads, engagement, influencer profiles | X API v2 |
| Reddit | Posts, comments, upvote ratios, sentiment | Reddit API (PRAW) |
| Google | Search volume, keyword trends, People Also Ask | SerpAPI |
| Newsletters / Blogs | Articles, headlines, email subjects | Firecrawl / Playwright scraper |

### Research Job Types

```
research_job {
  type: "competitor_scan" | "niche_trending" | "keyword_research" 
      | "audience_mining" | "hook_collection" | "competitor_deep_dive"
  target: { channel_id?, username?, keyword?, subreddit? }
  depth: "surface" | "standard" | "deep"
  scheduled_at: timestamp
  workspace_id: uuid
}
```

### Research Pipeline

```
Schedule → Dispatch → Scrape → Normalize → Transcribe → Analyze → Store → Embed

1. Schedule: Cron or Strategy Brain triggers research jobs
2. Dispatch: Worker picks up job from queue (Vercel Queues)
3. Scrape: Platform-specific collector fetches raw data
4. Normalize: Raw payload normalized to unified ResearchAsset schema
5. Transcribe: Audio/video → text via Whisper (for YouTube/TikTok)
6. Analyze: AI analysis — hook extraction, sentiment, pattern tagging, virality score
7. Store: Structured data → Supabase tables
8. Embed: Text content → vector embeddings → pgvector index
```

### Research Asset Schema (unified)

```typescript
ResearchAsset {
  id: uuid
  workspace_id: uuid
  platform: Platform
  asset_type: "video" | "post" | "article" | "comment" | "profile"
  external_id: string          // platform's own ID
  url: string
  title: string
  body: string                 // raw text / transcript
  creator_name: string
  creator_id: string
  published_at: timestamp
  
  // Metrics at time of collection
  views: int
  likes: int
  comments: int
  shares: int
  followers_at_collection: int
  
  // AI-extracted
  hook: string                 // first 3-5 seconds / opening line
  hook_type: HookType          // question / statement / story / controversy / list
  emotional_trigger: string[]  // fear / aspiration / curiosity / status / belonging
  cta: string
  sentiment: "positive" | "neutral" | "negative"
  topics: string[]
  virality_score: float        // 0-1, normalized by niche baseline
  
  // Storage
  thumbnail_url: string
  media_url: string
  transcript: string
  
  // Knowledge
  embedding: vector(1536)      // pgvector
  patterns_extracted: boolean
  
  created_at: timestamp
  updated_at: timestamp
}
```

### Continuous Monitoring

- **Trending Topics Monitor**: runs every 6 hours, tags rising topics in niche
- **Competitor Alert**: flags when tracked competitor publishes new content (triggers quick analysis job)
- **Viral Signal**: flags content in niche that crosses threshold views/hour ratio
- **Keyword Rank Tracker**: weekly, tracks keyword positions for owned content

---

## 3. Knowledge Base

### Responsibility

The system's long-term memory. Everything that Research Intelligence finds gets distilled into structured, searchable, retrievable knowledge that grounds every future content decision. This is the foundation of the RAG (Retrieval-Augmented Generation) system.

### Knowledge Categories

**Hook Library**
```sql
TABLE hooks (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  text text,                   -- the hook verbatim
  hook_type text,              -- question/statement/list/story/controversy
  platform text,
  niche text,
  source_asset_id uuid,        -- FK → research_assets
  avg_views_in_context int,    -- views on original asset
  usage_count int,             -- how many times we've used this hook
  our_best_performance json,   -- views/CTR when WE used this hook
  embedding vector(1536),
  created_at timestamptz
);
```

**Pattern Library**
```sql
TABLE content_patterns (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  pattern_name text,           -- "before/after transformation"
  pattern_type text,           -- structure/narrative/visual/audio
  description text,
  example_script text,
  platform text,
  avg_performance float,       -- composite score from source assets
  sample_count int,
  embedding vector(1536)
);
```

**CTA Library**
```sql
TABLE ctas (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  text text,
  cta_type text,               -- subscribe/follow/buy/click/comment
  platform text,
  conversion_context text,     -- "end of video" / "mid-roll" / "caption"
  observed_conversion_rate float,
  source_asset_id uuid,
  embedding vector(1536)
);
```

**Audience Insights**
```sql
TABLE audience_insights (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  insight_type text,           -- pain_point/aspiration/language/objection/trigger
  content text,
  evidence_sources json[],     -- array of source_asset_ids + comment quotes
  frequency_score float,       -- how often this surfaces in research
  embedding vector(1536),
  created_at timestamptz
);
```

**Niche Intelligence**
```sql
TABLE niche_intelligence (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  topic text,
  content_gap boolean,         -- true = underserved
  search_volume int,
  competition_level text,      -- low/medium/high
  monetization_fit text,       -- how well it fits product funnel
  trending_score float,
  last_refreshed_at timestamptz,
  embedding vector(1536)
);
```

### Retrieval API

All knowledge is queryable via semantic search. The RAG pipeline sends every AI generation call through the retrieval layer first.

```typescript
// Retrieval function (called before every content generation)
async function retrieveContext(query: string, workspace_id: string, opts: {
  categories: KnowledgeCategory[],
  limit: number,           // default 5 per category
  min_similarity: number   // default 0.75
}): Promise<KnowledgeContext>

// Returns:
{
  hooks: Hook[],
  patterns: ContentPattern[],
  audience_insights: AudienceInsight[],
  ctas: CTA[],
  relevant_assets: ResearchAsset[]   // top competitor examples
}
```

### Knowledge Maintenance

- **Deduplication**: embeddings are compared on insert; near-duplicates (cosine similarity > 0.95) are merged, not stored separately
- **Decay**: items with `usage_count = 0` after 90 days and `source_asset`  views fell below niche median → archived
- **Promotion**: items that yield consistently strong performance when used → `promoted: true` flag, weighted higher in retrieval
- **Versioning**: knowledge snapshots taken monthly for trend comparison ("hooks that worked in Jan vs now")

---

## 4. Content Planning Engine

### Responsibility

Translates strategy (what we should make) and knowledge (what performs) into a concrete, prioritized, scheduled content queue. Operates daily, fully automatically.

### Planning Inputs

```
planning_context {
  strategy:        current 90-day roadmap + pillar assignments
  sprint_plan:     this month's sprint goals + campaigns
  knowledge_base:  top-performing hooks, gaps, audience pain points
  analytics:       recent performance by format/topic/platform
  calendar:        already-scheduled content
  operator_prefs:  daily volume, platforms, content mix ratios
}
```

### Planning Logic

**Step 1 — Inventory**
Count posts in calendar for next 14 days. Identify gaps by platform and pillar.

**Step 2 — Opportunity Scoring**
For each candidate idea (from Knowledge Base + AI brainstorm):
```
opportunity_score = (
  niche_gap_score * 0.25 +
  audience_resonance_score * 0.25 +
  platform_trend_score * 0.20 +
  pillar_balance_score * 0.15 +
  funnel_position_score * 0.15
)
```

**Step 3 — Content Mix Enforcement**
Enforce the configured content mix:
```
mix_ratios {
  educational:  40%   -- "how to" / explain / teach
  inspirational: 25%  -- transformation stories, wins, motivation
  entertaining:  20%  -- humor, relatable, reaction
  promotional:   15%  -- product-adjacent, soft sell, testimonial
}
```

**Step 4 — Platform Adaptation**
Each idea is scheduled with platform-specific parameters:
```
content_plan_item {
  idea_id: uuid
  primary_platform: Platform
  adaptations: [
    { platform: "youtube", format: "long-form", target_duration: 600 },
    { platform: "tiktok",  format: "short",     target_duration: 60 },
    { platform: "instagram", format: "reel",    target_duration: 30 },
  ]
  scheduled_for: timestamp
  pillar: string
  funnel_stage: "awareness" | "consideration" | "conversion"
}
```

**Step 5 — Publish Window Optimization**
Per-platform optimal publish windows calculated from:
1. Platform general best-times (from research data)
2. Our own historical performance by hour/day
3. Competitor activity (avoid direct overlap when possible)

**Step 6 — Campaign Threading**
Identify if the content fits a multi-part campaign (series, challenges, countdowns) and link accordingly in `content_campaigns` table.

### Daily Queue Output

Every day at 6:00 AM (operator timezone), the Content Planning Engine:
1. Evaluates the current 14-day calendar
2. Fills any gaps per the mix ratios
3. Creates `content_queue` entries for the next 3 days with full `content_spec`
4. Sends the Creation Engine a trigger for each queued item

---

## 5. Content Creation Engine

### Responsibility

Takes a `content_spec` (idea + format + platform + context) and produces the complete creative package: idea, script, hook, B-roll list, image prompt list, voiceover script, caption, hashtags. All generation is RAG-grounded and provider-agnostic.

### Creation Pipeline

```
content_spec
     │
     ▼
[Context Retrieval]   ─── KB semantic search for: similar hooks, audience pain points,
     │                    performing patterns, relevant CTAs
     ▼
[Script Agent]        ─── Kimi/GPT-4o generates structured script
     │                    with retrieved context injected
     ▼
[Script Critic]       ─── Second-pass AI review: hook strength, clarity,
     │                    CTA presence, platform fit, length
     ▼
[Asset Spec Generator] ── Produces: image prompts per scene, B-roll descriptors,
     │                    voice tone/style instructions
     ▼
[Caption Writer]      ─── Platform-specific caption + hashtag set
     │
     ▼
[content_draft record saved → triggers Media Production Engine]
```

### Script Structure (enforced)

```json
{
  "hook":    { "text": "...", "type": "question", "duration_s": 4 },
  "body": [
    { "scene": 1, "narration": "...", "visual": "...", "duration_s": 15 },
    { "scene": 2, "narration": "...", "visual": "...", "duration_s": 15 },
    { "scene": 3, "narration": "...", "visual": "...", "duration_s": 15 }
  ],
  "cta": { "text": "...", "type": "subscribe", "duration_s": 5 },
  "total_duration_s": 54,
  "image_prompts": [ "...", "...", "..." ],
  "voice_instructions": { "tone": "direct", "pace": "medium-fast", "emphasis": ["..."] },
  "caption": "...",
  "hashtags": [ "#financialfreedom", "#youngmen", "..." ],
  "thumbnail_concept": "..."
}
```

### Provider Abstraction Layer

Every AI capability is accessed through an interface, not a direct client:

```typescript
interface TextProvider {
  generate(prompt: string, opts: GenerateOpts): Promise<string>
}

interface ImageProvider {
  generate(prompt: string, opts: ImageOpts): Promise<{ url: string }>
}

interface VideoProvider {
  generate(image_urls: string[], prompt: string, opts: VideoOpts): Promise<{ url: string }>
}

interface VoiceProvider {
  synthesize(text: string, opts: VoiceOpts): Promise<{ audio_url: string }>
}

interface MusicProvider {
  generate(prompt: string, opts: MusicOpts): Promise<{ audio_url: string }>
}
```

**Registered providers (initial):**

| Interface | Provider | Key Env Var |
|---|---|---|
| TextProvider | Kimi k2.7 (Moonshot) | `KIMI_API_KEY` |
| TextProvider | GPT-4o (OpenAI) | `OPENAI_API_KEY` |
| TextProvider | Gemini 2.5 Pro (Google) | `GOOGLE_AI_API_KEY` |
| ImageProvider | FLUX Pro (fal.ai) | `FAL_AI_API_KEY` |
| ImageProvider | FLUX Dev (fal.ai) | `FAL_AI_API_KEY` |
| ImageProvider | Runware SDXL | `RUNWARE_API_KEY` |
| VideoProvider | Wan 2.7 (fal.ai) | `FAL_AI_API_KEY` |
| VideoProvider | Kling 2.0 (fal.ai) | `FAL_AI_API_KEY` |
| VoiceProvider | Qwen-3-TTS clone (fal.ai) | `FAL_AI_API_KEY` |
| VoiceProvider | Kokoro v1 (local) | — |
| MusicProvider | ElevenLabs Music | `ELEVENLABS_API_KEY` |
| MusicProvider | Pixabay (free) | — |

Provider selection per capability is configured in `workspace_settings.ai_providers` and can be overridden per content item.

### Content Draft States

```
idea_generated
  → script_drafted
    → script_approved        (auto or human-in-loop depending on settings)
      → assets_queued
        → assets_produced
          → composition_rendered
            → publish_ready
```

Human review gates can be inserted at any state transition via operator settings:
```
workspace_settings.review_gates {
  require_script_approval: boolean   // default false (full-auto)
  require_media_approval: boolean    // default false
  require_publish_approval: boolean  // default false
}
```

---

## 6. Media Production Engine

### Responsibility

Takes a content draft with asset specs and produces all publish-ready media: images, video clips, voiceover audio, background music, assembled final video.

### Production Pipeline

```
[content_draft: assets_queued]
          │
          ▼
  ┌───────┴──────────┐
  │                  │
[Image Jobs]    [Voice Job]          ← run in parallel
  │                  │
  ▼                  ▼
[Image URLs]   [Audio URL]
  │                  │
  └───────┬──────────┘
          ▼
  [Video Generation]      ← images + audio → Wan 2.7 (or skip for text-only)
          │
          ▼
  [Music Generation]      ← background track via Pixabay/ElevenLabs
          │
          ▼
  [FFmpeg Assembly]       ← merge video clips + voiceover + music + captions
          │
          ▼
  [Thumbnail Generation]  ← FLUX image using thumbnail_concept from script
          │
          ▼
  [Asset Upload → Storage] ← Vercel Blob (persistent URLs)
          │
          ▼
  [content_draft: composition_rendered]
```

### Production Job Schema

```sql
TABLE media_jobs (
  id uuid PRIMARY KEY,
  content_draft_id uuid,
  workspace_id uuid,
  job_type text,    -- image/video/voice/music/assembly/thumbnail
  status text,      -- queued/running/complete/failed
  provider text,
  input json,
  output json,      -- { url, duration_s, file_size_bytes, ... }
  error text,
  attempts int DEFAULT 0,
  created_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);
```

### FFmpeg Assembly

When all individual assets are ready, the Assembly Job:
1. Fetches all asset URLs from `media_jobs` outputs
2. Downloads to `/tmp` (serverless ephemeral, ~512MB limit per function)
3. Runs FFmpeg command chain:
   ```bash
   # 1. Scale images to target resolution
   ffmpeg -i scene1.png -vf "scale=1920:1080,setsar=1" scene1_scaled.mp4
   
   # 2. Concat video clips
   ffmpeg -f concat -safe 0 -i clips.txt -c copy raw_video.mp4
   
   # 3. Mix voiceover + music (music at -18dB under voice)
   ffmpeg -i raw_video.mp4 -i voice.mp3 -i music.mp3 \
     -filter_complex "[2:a]volume=0.15[music];[1:a][music]amix=inputs=2" \
     -map 0:v -map "[aout]" -c:v copy -c:a aac final.mp4
   
   # 4. Burn captions (from SRT generated from voiceover transcript)
   ffmpeg -i final.mp4 -vf "subtitles=captions.srt:force_style='FontSize=22'" \
     output.mp4
   ```
4. Uploads `output.mp4` to Vercel Blob → returns persistent URL
5. Updates `content_drafts.final_video_url`

### Asset Storage (Vercel Blob)

All generated assets are stored at:
```
blob://contentos/{workspace_id}/{content_draft_id}/
  ├── scene_1.png
  ├── scene_2.png
  ├── scene_3.png
  ├── thumbnail.png
  ├── voiceover.mp3
  ├── music.mp3
  ├── captions.srt
  ├── raw_video.mp4
  └── final_video.mp4
```

URLs are permanent (not ephemeral fal.ai presigned URLs). Stored in `content_drafts.asset_urls` JSON column.

### HyperFrames Path (current)

The current `openmontage-bridge.js` HTML composition path is preserved as a lightweight "text-video" option for operators who don't need real MP4 (e.g., for blog/newsletter content previews). The full FFmpeg path is the production video path.

---

## 7. Publishing Engine

### Responsibility

Takes a publish-ready content draft and distributes it across the configured platforms, on schedule, with platform-specific adaptations, tracking every publish event for analytics.

### Architecture

The Publishing Engine is built on Postiz as the scheduling backbone, supplemented by direct platform API connections for capabilities Postiz doesn't cover (e.g., YouTube long-form metadata, YouTube chapters, product link injection on TikTok).

```
[content_draft: publish_ready]
          │
          ▼
  [Platform Adapter Layer]
     │           │           │
  [YouTube]  [TikTok]  [Instagram]   ← adapts title/caption/tags per platform
     │           │           │
     └───────────┼───────────┘
                 ▼
         [Postiz Client]      ← schedules + dispatches
                 │
                 ▼
         [Publish Record]     ← saved to video_posts table
                 │
                 ▼
     [Analytics Event trigger]  ← queues initial analytics fetch (24h later)
```

### Platform Adapters

Each platform adapter transforms the content draft into the exact API payload that platform requires:

```typescript
interface PlatformAdapter {
  platform: Platform
  adaptContent(draft: ContentDraft): PlatformPayload
  estimateReach(draft: ContentDraft): number
  getBestPublishTime(draft: ContentDraft): Date
  supports(feature: string): boolean   // "long_form" | "chapters" | "product_link"
}
```

**YouTube Adapter**
- Generates: full SEO title (60 chars max), keyword-rich description (5000 chars), tags (500 chars), chapters (from script scene timestamps), end screen timestamp, category ID
- Sets: made-for-kids flag, visibility (public/unlisted/private), premiere timing

**TikTok Adapter**
- Enforces: 60s for standard / up to 10min for long-form
- Injects: trending sounds (if configured), product link (TikTok Shop), duet/stitch settings, branded hashtags

**Instagram Adapter**
- Splits: Reels (30-90s) vs Feed vs Stories vs Broadcast Channel
- Crops: thumbnail to 9:16 for Reels, 1:1 for Feed
- Tags: location if configured, collaborators, product tags (Meta Commerce)

**Facebook Adapter**
- Routes: Page post vs Group post vs Story
- Supports: cross-post from Instagram via Meta Business Suite

**X (Twitter) Adapter**
- Clips: 240-char caption limit enforced
- Threads: long-form content automatically split into numbered tweet threads

**LinkedIn Adapter**
- Converts: short-form to native LinkedIn video
- Adjusts: tone filter (professional register)

### Cross-Platform Campaigns

```sql
TABLE content_campaigns (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  name text,
  campaign_type text,    -- series / challenge / product_launch / evergreen
  start_date date,
  end_date date,
  goal text,
  target_platform text[],
  content_draft_ids uuid[]
);
```

### Scheduling Logic

1. Check operator's `publish_cadence` settings (e.g., "1/day YouTube, 2/day TikTok, 1/day Instagram")
2. Pull best publish windows per platform from Analytics Engine historical data
3. Stagger cross-platform posts by 2-4 hours (avoid simultaneous publish, which dilutes each platform's algorithm signal)
4. Post to Postiz API → returns `postiz_post_id` → stored in `video_posts`
5. Cron job at `*/5 * * * *` checks for due-scheduled posts and calls Postiz publish endpoint

---

## 8. Analytics Engine

### Responsibility

Collects, stores, and aggregates performance data from every platform for every piece of content. Provides the Learning & Optimization Engine with the ground truth it needs.

### Data Collection

**Collection triggers:**
- 1 hour after publish (initial baseline)
- 24 hours after publish (first-day performance)
- 7 days after publish (week-one performance)
- 30 days after publish (month-one performance)
- Monthly thereafter (evergreen tracking)

**Collection method:**
- Postiz analytics API (primary, aggregated)
- Platform native APIs (supplementary, detailed):
  - YouTube Data API: watch time, retention curve, CTR by thumbnail, revenue if monetized
  - TikTok Business API: complete views, profile clicks, follower gain
  - Instagram Graph API: reach, impressions, saves, profile visits
  - Facebook Graph API: reach, engagement, page follows

### Analytics Schema

```sql
TABLE analytics_events (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  video_post_id uuid,             -- FK → video_posts
  content_draft_id uuid,          -- FK → content_drafts
  platform text,
  event_type text,                -- hourly_snapshot / day_1 / day_7 / day_30
  collected_at timestamptz,

  -- Core metrics
  views bigint,
  unique_viewers bigint,
  likes int,
  comments int,
  shares int,
  saves int,

  -- Platform-specific
  watch_time_minutes float,       -- YouTube
  avg_view_duration_s float,      -- YouTube / TikTok
  retention_curve float[],        -- YouTube (% at each 10% interval)
  ctr_thumbnail float,            -- YouTube
  reach int,                      -- Instagram / Facebook
  impressions int,

  -- Derived
  engagement_rate float,          -- (likes+comments+shares) / views
  follower_gain int,              -- followers gained attributable to this post
  profile_visit_rate float,       -- profile visits / views
  
  -- Revenue attribution (if configured)
  attributed_clicks int,          -- link clicks → landing page
  attributed_signups int,
  attributed_revenue numeric(12,2)
);

TABLE channel_snapshots (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  channel_id uuid,
  platform text,
  snapshot_at timestamptz,
  subscribers bigint,
  total_views bigint,
  avg_views_30d float,
  engagement_rate_30d float,
  estimated_monthly_revenue numeric(12,2)
);
```

### Analytics Dashboard Views

**Content Performance**
- Views over time (line chart, by platform)
- Engagement rate by content type / pillar / format
- Best performing hooks (ranked by views/engagement)
- Retention analysis (YouTube)
- Virality coefficient (shares / views)

**Channel Health**
- Subscriber growth trajectory vs forecast
- Posting consistency score
- Platform mix performance
- Content pillar distribution

**Revenue Attribution**
- Revenue by content piece (if tracking pixel configured)
- Content-to-lead attribution
- Content-to-sale attribution
- Product conversion funnel

**Competitive Position**
- Our channel vs tracked competitors (views/subs/engagement, anonymized)
- Market share trend

---

## 9. Learning & Optimization Engine

### Responsibility

The system's self-improvement loop. Continuously compares predicted vs actual performance, extracts learnings, updates the knowledge base, and feeds recommendations back to the Strategy Brain and Content Planning Engine.

### Learning Loop (runs after every analytics cycle)

```
[New Analytics Data]
        │
        ▼
[Performance Scorer]      -- score each post 0-100 against its predicted performance
        │
        ▼
[Winner / Loser Classifier]  -- top 20% = winners, bottom 20% = losers
        │
        ├──── [Winner Analysis]    ── extract: hook, structure, topic, format, 
        │                             platform, day/time, pillar → tag as high-value
        │                             in knowledge_base
        │
        └──── [Loser Analysis]     ── extract failure patterns → tag as low-value
                                      or banned in knowledge_base
        │
        ▼
[Pattern Extraction Agent]  ── semantic clustering of winners:
        │                     "videos about compound interest do 3x better than
        │                      debt elimination content for this audience"
        ▼
[Knowledge Base Update]    ── winning hooks promoted, losing hooks demoted
        │                      new patterns added to content_patterns
        ▼
[Strategy Feedback]        ── recommendations written to strategy_insights:
        │                      "shift pillar 3 from 25% to 35% of output"
        │                      "post YouTube at 7PM not 9PM"
        ▼
[Planning Weight Update]   ── opportunity_score weights adjusted based on 
                              recent performance vs prediction accuracy
```

### Optimization Signals

| Signal | What it drives |
|---|---|
| Hook type → views | Hook type selection weights in script generation |
| Content pillar → engagement | Pillar mix ratio adjustments |
| Platform × time → reach | Publish window optimization |
| Content length → retention | Target duration recommendations |
| Thumbnail style → CTR | Thumbnail prompt guidance |
| CTA type → profile visits | CTA selection in script generation |
| Topic → follower gain | Topic prioritization in planning |

### Predicted vs Actual Framework

Every `content_plan_item` gets a performance prediction at creation time:
```sql
predicted_views int,
predicted_engagement_rate float,
predicted_follower_gain int,
actual_views int,           -- populated by Analytics Engine
actual_engagement_rate float,
actual_follower_gain int,
prediction_error float      -- (actual - predicted) / predicted
```

Prediction models are simple linear regression over the last 90 days of data per (platform, content_type, topic_category). As data accumulates, these can be promoted to gradient-boosted models.

### The Compound Effect

Month 1: Random baseline — system uses general knowledge
Month 3: Early signal — first patterns detected, hooks and topics refined
Month 6: Clear personalization — the system knows what THIS audience responds to
Month 12: Compounded advantage — planning, creation, and publishing are all tuned to the specific niche, audience, and voice. Human creators cannot replicate this speed of iteration.

---

## 10. Monetization Engine

### Responsibility

Tracks and optimizes the path from content view to revenue. Manages products, tracks attribution, and recommends the highest-leverage monetization actions.

### Product Catalog

```sql
TABLE products (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  name text,
  product_type text,       -- digital_product / affiliate / membership / 
                           -- sponsorship / consulting / ecommerce
  status text,             -- draft / active / paused / archived
  price numeric(12,2),
  currency text DEFAULT 'USD',
  url text,                -- sales page
  checkout_provider text,  -- gumroad / stripe / kajabi / lemon_squeezy
  checkout_product_id text,
  commission_rate float,   -- for affiliate products
  monthly_recurring boolean,
  trial_days int,
  created_at timestamptz
);
```

### Attribution Tracking

**Method 1 — URL parameters**  
Each content post gets a unique UTM-tagged link:
```
https://product.com/buy?utm_source=youtube&utm_medium=video&utm_campaign={content_draft_id}&utm_content={workspace_id}
```
Revenue events are imported via webhook from checkout provider (Gumroad/Stripe/Lemon Squeezy) and matched to `content_draft_id`.

**Method 2 — Platform affiliate programs**  
For TikTok Shop, YouTube Shopping, Instagram Collab: native conversion events are pulled via platform API.

**Method 3 — Correlation model (fallback)**  
When direct tracking isn't possible, statistical correlation between content publish timestamps and revenue spikes. Not causal, but useful for directional insights.

### Monetization Schema

```sql
TABLE sales (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  product_id uuid,
  content_draft_id uuid,   -- attributed content (nullable)
  video_post_id uuid,      -- attributed post (nullable)
  amount numeric(12,2),
  currency text,
  checkout_order_id text,
  attribution_method text, -- utm / platform_native / correlation
  attribution_confidence float,
  customer_email_hash text, -- hashed for privacy
  purchased_at timestamptz
);

TABLE sponsorships (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  brand_name text,
  deal_value numeric(12,2),
  content_count int,
  platforms text[],
  start_date date,
  end_date date,
  deliverables json,
  status text,
  content_draft_ids uuid[]
);

TABLE affiliate_links (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  product_id uuid,
  platform text,
  url text,
  clicks int DEFAULT 0,
  conversions int DEFAULT 0,
  commission_earned numeric(12,2) DEFAULT 0
);
```

### Revenue Intelligence

**Product-Content Fit Analysis**
- Which content types drive the most sales?
- Which platform converts best for this product?
- Which funnel stage content (awareness/consideration/conversion) closes more deals?
- What is the average content-to-sale lag (days)?

**Product Roadmap Suggestions**
- "Your audience engages most with content about side hustles. Consider adding a $97 'First $1K Online' quick-start guide as a lower-ticket entry product."
- "Sponsorship readiness: channel is approaching 10K YouTube subscribers. Prepare media kit."

**Monthly Revenue Dashboard**
```
Revenue by Source:
  Digital Products    $2,340   ████████████████ 68%
  Affiliates            $420   ████ 12%
  Sponsorships          $700   █████ 20%
  ─────────────────────────────────────────
  Total               $3,460

Revenue by Content:
  "5 ways to quit your 9-5" → $840
  "I saved $10K in 6 months" → $615
  "Why most side hustles fail" → $420
```

---

## 11. Agent Architecture

### Overview

ContentOS is built around eleven specialized agents. Each agent has a narrow responsibility, defined inputs/outputs, and communicates exclusively through the database and job queue. No agent imports another agent directly.

### Agent Directory

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                       │
│            (Vercel Cron + Supabase Realtime triggers)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    [Strategy]       [Research]         [Analysis]
    Agent            Agent              Agent
         │                 │                 │
         └────────┬────────┘                 │
                  │                          │
           [Planning]                  [Analytics]
           Agent                       Agent
                  │                          │
           [Writing]                  [Monetization]
           Agent                       Agent
                  │
        ┌────────┴────────┐
        │                 │
     [Media]         [Publishing]
     Agent            Agent
        │
   [Optimization]
   Agent
```

### Agent Specifications

---

#### 1. Strategy Agent

**Trigger:** brief creation, monthly schedule, performance health alert  
**Model:** Kimi k2.7 or Gemini 2.5 Pro (long context needed)  
**Input:** business_brief, niche_analysis, competitor_profiles, past_strategy  
**Output:** strategies record (12mo + 90d + 30d + weekly plan)

**System prompt snippet:**
> "You are a senior content strategist specializing in faceless content channels. Your job is to produce a complete, realistic, data-grounded content strategy. You have access to competitor intelligence and audience data. Be specific — name exact content series, specific posting cadences, and realistic milestone forecasts. Do not produce generic advice."

**Tools:**
- `retrieve_knowledge(query, categories)` — semantic search over KB
- `query_competitor_data(workspace_id)` — latest competitor profiles
- `get_performance_history(workspace_id, days)` — last N days analytics
- `write_strategy(strategy_data)` — persist to strategies table

---

#### 2. Research Agent

**Trigger:** research job queue, competitor publish alerts, scheduled scan  
**Model:** Kimi k2.7 (analysis pass) + platform-specific scrapers  
**Input:** research_job record  
**Output:** research_assets records + embedded knowledge

**Tools:**
- `youtube_search(query, max_results)` — YouTube Data API
- `apify_run(actor, input)` — Apify scraper for TikTok/IG/Reddit
- `transcribe_audio(audio_url)` — Whisper transcription
- `embed_text(text)` — generate embedding → pgvector
- `save_research_asset(asset)` — store normalized result
- `extract_patterns(transcript)` — hook/CTA/structure extraction AI call

---

#### 3. Analysis Agent

**Trigger:** research_asset created (Supabase Realtime), batch schedule  
**Model:** Kimi k2.7  
**Input:** research_asset(s)  
**Output:** knowledge base updates (hooks, patterns, audience_insights, niche_intelligence)

**Role:** bridges raw research data and structured knowledge. The Research Agent collects; the Analysis Agent interprets.

**Tools:**
- `extract_hooks(transcript, performance_data)` → hooks table
- `classify_pattern(script_structure)` → content_patterns table
- `mine_audience_insight(comments[])` → audience_insights table
- `update_niche_intelligence(topic, metrics)` → niche_intelligence table
- `embed_and_store(table, record)` — embedding + persist

---

#### 4. Planning Agent

**Trigger:** daily at 6 AM UTC (per workspace timezone), sprint start  
**Model:** Kimi k2.7  
**Input:** active strategy, sprint plan, analytics performance, content calendar  
**Output:** content_queue entries for next 3 days

**Tools:**
- `get_calendar_gaps(workspace_id, days)` — calendar availability
- `score_idea_opportunity(idea, context)` — opportunity scoring
- `retrieve_performing_topics(workspace_id, limit)` — KB + analytics query
- `enforce_content_mix(queue, mix_ratios)` — mix enforcement
- `get_optimal_publish_windows(workspace_id, platform)` — analytics-informed timing
- `create_content_queue_item(spec)` — persist planned item

---

#### 5. Writing Agent

**Trigger:** content_queue item created  
**Model:** Kimi k2.7 (primary) / GPT-4o (fallback)  
**Input:** content_plan_item with full spec, retrieved KB context  
**Output:** content_draft with complete script JSON

**This is the core creative agent.** It must be given explicit KB context — hooks that performed, audience pain points, CTAs that converted — via the retrieval layer before generating.

**Tools:**
- `retrieve_context(query, workspace_id, categories)` — KB semantic search
- `generate_script(spec, context)` — Kimi/GPT structured script generation
- `critique_script(script)` — second-pass quality check AI call
- `generate_captions(script, platform)` — platform-optimized captions + hashtags
- `generate_asset_specs(script)` — image prompts + voice instructions
- `save_content_draft(draft)` — persist to content_drafts

---

#### 6. Media Agent

**Trigger:** content_draft saved with status `script_approved`  
**Model:** Provider abstraction layer (no LLM — orchestrates API calls)  
**Input:** content_draft with asset specs  
**Output:** all media assets uploaded to Blob, final_video_url set

**Tools:**
- `generate_image(prompt, provider, opts)` — FLUX / Runware
- `generate_video(image_urls, prompt, provider, opts)` — Wan 2.7 / Kling
- `generate_voice(text, provider, voice_id, opts)` — Qwen-TTS / Kokoro
- `generate_music(prompt, provider, opts)` — Pixabay / ElevenLabs
- `generate_thumbnail(concept, provider, opts)` — FLUX Pro
- `assemble_video(clips, voice, music, captions)` — FFmpeg orchestration
- `upload_asset(file, path)` — Vercel Blob
- `update_media_job(id, status, output)` — job tracking

---

#### 7. Publishing Agent

**Trigger:** content_draft reaches `publish_ready` status OR scheduled time arrives  
**Model:** No LLM — API orchestration  
**Input:** content_draft + publish schedule  
**Output:** video_posts records, Postiz post IDs

**Tools:**
- `adapt_for_platform(draft, platform)` — platform adapter
- `estimate_best_time(workspace_id, platform, content_type)` — analytics-informed scheduling
- `post_via_postiz(payload)` — Postiz API
- `save_video_post(record)` — persist publish record
- `trigger_analytics_collection(video_post_id, delay_hours)` — queue analytics jobs

---

#### 8. Analytics Agent

**Trigger:** analytics collection job queue (1h / 24h / 7d / 30d after publish)  
**Model:** No LLM — data collection + derived calculations  
**Input:** video_post_id, collection_window  
**Output:** analytics_events record, channel_snapshot update

**Tools:**
- `fetch_postiz_analytics(postiz_post_id)` — aggregated platform metrics
- `fetch_youtube_analytics(video_id, date_range)` — YouTube Data API
- `fetch_tiktok_analytics(video_id)` — TikTok Business API
- `fetch_instagram_analytics(post_id)` — Instagram Graph API
- `calculate_derived_metrics(raw_data)` — engagement_rate, ctr, etc.
- `save_analytics_event(event)` — persist
- `check_attribution(video_post_id)` — match UTM revenue events

---

#### 9. Optimization Agent

**Trigger:** weekly (Sunday night, before Monday Planning Agent run)  
**Model:** Kimi k2.7  
**Input:** last 30 days of analytics_events, content_drafts, content_patterns  
**Output:** knowledge base updates, strategy_insights, planning weight adjustments

**The Optimization Agent's output is the primary mechanism by which the system improves itself over time.**

**Tools:**
- `query_performance_data(workspace_id, days)` — analytics aggregation
- `classify_winners_losers(content_drafts, threshold)` — performance segmentation
- `extract_winner_patterns(winners)` — AI pattern extraction
- `update_pattern_weights(patterns, performance_delta)` — KB updates
- `write_strategy_insight(insight)` — recommendation for Strategy Agent
- `update_planning_weights(new_weights)` — adjust Planning Agent scoring

---

#### 10. Monetization Agent

**Trigger:** weekly + on sale events + on sponsorship inquiry  
**Model:** Kimi k2.7  
**Input:** sales records, content performance, product catalog  
**Output:** attribution records, revenue insights, product recommendations

**Tools:**
- `import_sales_from_webhook(payload, provider)` — Gumroad/Stripe/Lemon Squeezy webhooks
- `attribute_sale(sale, utm_params)` — match sale to content
- `calculate_content_roi(content_draft_id)` — revenue per piece of content
- `generate_revenue_report(workspace_id, period)` — monthly summary
- `suggest_product_opportunities(workspace_id)` — AI product recommendations

---

#### 11. Notification Agent

**Trigger:** any significant system event  
**Model:** No LLM — rule-based  
**Input:** system events  
**Output:** operator notifications (email / push / dashboard alert)

**Events notified:**
- Viral post (views > 2× predicted within 24h)
- Strategy health score drops below threshold
- Monthly revenue milestone
- Competitor posted (if configured)
- Publish failure
- Media generation failure (with auto-retry status)
- Weekly performance digest (every Monday 7 AM)

---

## 12. Database Architecture

### Complete Table Catalog

**Current tables (retained, extended):**

```sql
-- WORKSPACES
workspaces (
  id, user_id, name, niche, audience_description, 
  content_style, business_goal, monetization_goal,
  workspace_settings json,   -- ai_providers, mix_ratios, review_gates, etc.
  created_at, updated_at
)

-- STRATEGIES (extended)
strategies (
  id, workspace_id, version int,
  status text,              -- draft / active / archived
  twelve_month_plan json,
  ninety_day_roadmap json,
  sprint_plans json[],      -- array of monthly sprints
  content_pillars json[],
  health_score float,
  last_evaluated_at timestamptz,
  created_at, updated_at
)

-- CHANNELS (extended)
channels (
  id, workspace_id, platform, handle, external_channel_id,
  display_name, followers, verified, auto_post_enabled,
  postiz_channel_id,
  last_synced_at, created_at
)

-- VIDEOS (renamed → content_drafts)
content_drafts (
  id, workspace_id, content_plan_item_id,
  title, platform_primary,
  status text,              -- [full state machine from §5]
  script json,              -- structured script object
  asset_specs json,         -- image_prompts, voice_instructions, etc.
  asset_urls json,          -- { scene_1: url, voice: url, final_video: url, ... }
  final_video_url text,     -- Vercel Blob URL
  target_platforms text[],
  published_at, scheduled_time,
  review_gate_status json,  -- { script: approved, media: pending, publish: approved }
  created_at, updated_at
)

-- VIDEO_POSTS (extended)
video_posts (
  id, workspace_id, content_draft_id, channel_id,
  platform, postiz_post_id, external_post_id,
  status text,              -- scheduled / published / failed / deleted
  published_at, scheduled_time,
  platform_url text,        -- link to live post
  created_at
)

-- PRODUCTS (extended)
products (
  id, workspace_id, name, product_type,
  status, price, currency, url,
  checkout_provider, checkout_product_id,
  commission_rate, monthly_recurring, trial_days,
  created_at, updated_at
)

-- SALES (extended)
sales (
  id, workspace_id, product_id,
  content_draft_id, video_post_id,   -- attribution
  amount, currency, checkout_order_id,
  attribution_method, attribution_confidence,
  customer_email_hash, purchased_at
)

-- ANALYTICS_SNAPSHOTS → replaced by analytics_events (see §8)
```

**New research tables:**

```sql
-- RESEARCH ASSETS
research_assets (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  platform text,
  asset_type text,
  external_id text,
  url text,
  title text,
  body text,
  creator_name text, creator_id text,
  published_at timestamptz,
  views bigint, likes int, comments int, shares int, followers_at_collection int,
  hook text, hook_type text, emotional_trigger text[],
  cta text, sentiment text, topics text[],
  virality_score float,
  thumbnail_url text, media_url text, transcript text,
  embedding vector(1536),
  patterns_extracted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- COMPETITOR PROFILES
competitor_profiles (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  platform text,
  handle text,
  external_channel_id text,
  display_name text,
  followers bigint,
  avg_views_30d float,
  upload_frequency_per_week float,
  content_style text,
  monetization_methods text[],
  top_performing_topics text[],
  last_scanned_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- RESEARCH JOBS
research_jobs (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  job_type text,
  target json,
  depth text,
  status text DEFAULT 'queued',
  attempts int DEFAULT 0,
  result json,
  error text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
)
```

**New knowledge base tables:**

```sql
-- HOOKS LIBRARY
hooks (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  text text,
  hook_type text,
  platform text,
  niche text,
  source_asset_id uuid REFERENCES research_assets(id),
  avg_views_in_context int,
  usage_count int DEFAULT 0,
  our_best_performance json,
  weight float DEFAULT 1.0,    -- optimization-adjusted weight
  promoted boolean DEFAULT false,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
)

-- CONTENT PATTERNS
content_patterns (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  pattern_name text,
  pattern_type text,
  description text,
  example_script text,
  platform text,
  avg_performance_score float,
  sample_count int DEFAULT 0,
  weight float DEFAULT 1.0,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
)

-- CTAS LIBRARY
ctas (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  text text,
  cta_type text,
  platform text,
  conversion_context text,
  observed_conversion_rate float,
  usage_count int DEFAULT 0,
  weight float DEFAULT 1.0,
  source_asset_id uuid,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
)

-- AUDIENCE INSIGHTS
audience_insights (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  insight_type text,
  content text,
  evidence_sources json[],
  frequency_score float,
  weight float DEFAULT 1.0,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
)

-- NICHE INTELLIGENCE
niche_intelligence (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  topic text,
  content_gap boolean DEFAULT false,
  search_volume int,
  competition_level text,
  monetization_fit text,
  trending_score float,
  last_refreshed_at timestamptz,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
)
```

**New analytics tables:**

```sql
-- ANALYTICS EVENTS (replaces analytics_snapshots)
analytics_events (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  video_post_id uuid REFERENCES video_posts(id),
  content_draft_id uuid REFERENCES content_drafts(id),
  platform text,
  event_type text,
  collected_at timestamptz,
  views bigint, unique_viewers bigint, likes int, comments int, shares int, saves int,
  watch_time_minutes float, avg_view_duration_s float,
  retention_curve float[],
  ctr_thumbnail float, reach int, impressions int,
  engagement_rate float, follower_gain int,
  profile_visit_rate float,
  attributed_clicks int, attributed_signups int, attributed_revenue numeric(12,2),
  created_at timestamptz DEFAULT now()
)

-- CHANNEL SNAPSHOTS
channel_snapshots (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  channel_id uuid REFERENCES channels(id),
  platform text,
  snapshot_at timestamptz,
  subscribers bigint,
  total_views bigint,
  avg_views_30d float,
  engagement_rate_30d float,
  estimated_monthly_revenue numeric(12,2),
  created_at timestamptz DEFAULT now()
)

-- STRATEGY INSIGHTS (from Optimization Agent)
strategy_insights (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  source text,              -- 'optimization_agent' | 'analytics_agent'
  category text,            -- 'pillar_mix' | 'timing' | 'format' | 'topic' | 'product'
  insight text,
  data_evidence json,
  recommended_action text,
  status text DEFAULT 'pending',   -- pending / applied / dismissed
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
)
```

**New content planning tables:**

```sql
-- CONTENT PLANS
content_plans (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  strategy_id uuid REFERENCES strategies(id),
  plan_type text,            -- 'weekly' | 'monthly_sprint'
  period_start date,
  period_end date,
  goals json,
  content_mix json,          -- { educational: 0.4, inspirational: 0.25, ... }
  created_at timestamptz DEFAULT now()
)

-- CONTENT QUEUE
content_queue (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  content_plan_id uuid REFERENCES content_plans(id),
  title text,
  idea_summary text,
  topic text,
  pillar text,
  funnel_stage text,
  format text,
  target_platforms text[],
  planned_publish_at timestamptz,
  opportunity_score float,
  predicted_views int,
  predicted_engagement_rate float,
  content_draft_id uuid,     -- populated when Writing Agent starts
  status text DEFAULT 'queued',   -- queued/in_progress/complete/cancelled
  created_at timestamptz DEFAULT now()
)

-- CONTENT CAMPAIGNS
content_campaigns (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  name text,
  campaign_type text,
  start_date date,
  end_date date,
  goal text,
  target_platforms text[],
  content_draft_ids uuid[],
  created_at timestamptz DEFAULT now()
)
```

**New infrastructure tables:**

```sql
-- MEDIA JOBS
media_jobs (
  id uuid PRIMARY KEY,
  content_draft_id uuid,
  workspace_id uuid,
  job_type text,
  status text DEFAULT 'queued',
  provider text,
  input json,
  output json,
  error text,
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
)

-- SPONSORSHIPS
sponsorships (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  brand_name text,
  deal_value numeric(12,2),
  content_count int,
  platforms text[],
  start_date date,
  end_date date,
  deliverables json,
  status text,
  content_draft_ids uuid[],
  created_at timestamptz DEFAULT now()
)

-- AFFILIATE LINKS
affiliate_links (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  product_id uuid REFERENCES products(id),
  platform text,
  url text,
  tracking_code text,
  clicks int DEFAULT 0,
  conversions int DEFAULT 0,
  commission_earned numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
)
```

### Supabase Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS vector;           -- pgvector: semantic search
CREATE EXTENSION IF NOT EXISTS pg_cron;          -- scheduled DB-level jobs
CREATE EXTENSION IF NOT EXISTS pg_net;           -- HTTP calls from DB functions (webhook triggers)
```

### Row Level Security (all tables)

Every new table follows the same RLS pattern established in the current schema:
```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "{table}_workspace_owner" ON {table}
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );
```

---

## 13. Infrastructure Architecture

### Compute

| Layer | Technology | Role |
|---|---|---|
| Frontend | Vercel (Vite/React, static) | Dashboard SPA |
| API | Vercel Serverless Functions (Node 24) | REST endpoints, agent triggers |
| Background Workers | Vercel Queues | Async jobs: research, media generation, analytics collection |
| Cron | Vercel Cron | Scheduled agent triggers (planning, research, optimization) |
| Long-running jobs | Vercel Fluid Compute (max 800s) | FFmpeg assembly, deep research scans |

### Database & Storage

| Service | Role |
|---|---|
| Supabase PostgreSQL | Primary relational store (all tables) |
| Supabase pgvector | Vector embeddings (knowledge base semantic search) |
| Supabase Auth | User auth, RLS enforcement |
| Supabase Realtime | Event triggers (research_asset created → Analysis Agent) |
| Supabase Storage | Long-term file storage (raw scraped media, transcripts) |
| Vercel Blob | Generated assets (video, audio, images, final MP4) — CDN-served |

### Embedding & Vector Search

```typescript
// Embedding pipeline
const EMBEDDING_MODEL = "text-embedding-3-small"  // OpenAI, 1536 dims
const EMBEDDING_PROVIDER = "openai"               // or Cohere / Gemini

// Insert with embedding
const embedding = await openai.embeddings.create({
  model: EMBEDDING_MODEL,
  input: text
})
await supabase.from('hooks').insert({
  ...hookData,
  embedding: embedding.data[0].embedding
})

// Semantic search
const { data } = await supabase.rpc('match_hooks', {
  query_embedding: queryEmbedding,
  similarity_threshold: 0.75,
  match_count: 5,
  workspace_id: workspaceId
})
```

```sql
-- Supabase vector search function
CREATE OR REPLACE FUNCTION match_hooks(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  workspace_id uuid
) RETURNS TABLE (id uuid, text text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT id, text, 1 - (embedding <=> query_embedding) AS similarity
  FROM hooks
  WHERE workspace_id = match_hooks.workspace_id
    AND 1 - (embedding <=> query_embedding) > similarity_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Job Queue (Vercel Queues)

```typescript
// Queue definitions
const queues = {
  research:     "contentos-research",    // scrape + transcribe jobs
  analysis:     "contentos-analysis",    // KB extraction jobs
  media:        "contentos-media",       // image/video/voice generation
  assembly:     "contentos-assembly",    // FFmpeg assembly (long-running)
  analytics:    "contentos-analytics",   // performance collection
  optimization: "contentos-optimize",    // weekly learning pass
  publish:      "contentos-publish",     // posting jobs
}

// Enqueueing a job (example: research)
await vercelQueues.send(queues.research, {
  jobId: research_job.id,
  workspaceId: workspace.id,
  jobType: "competitor_scan",
  target: { channel_id: "UCxxxxxx" }
})
```

### Cron Schedule

```json
{
  "crons": [
    { "path": "/api/cron/planning",      "schedule": "0 6 * * *"    },  // daily 6AM: Planning Agent
    { "path": "/api/cron/research",      "schedule": "0 */6 * * *"  },  // every 6h: Research Agent
    { "path": "/api/cron/publish-check", "schedule": "*/5 * * * *"  },  // every 5min: due posts
    { "path": "/api/cron/analytics",     "schedule": "0 */4 * * *"  },  // every 4h: analytics collection
    { "path": "/api/cron/snapshots",     "schedule": "0 0 * * *"    },  // daily midnight: channel snapshots
    { "path": "/api/cron/optimization",  "schedule": "0 22 * * 0"   },  // Sunday 10PM: Optimization Agent
    { "path": "/api/cron/strategy",      "schedule": "0 9 1 * *"    },  // monthly 1st: Strategy refresh
  ]
}
```

### Environment Variables (complete)

```bash
# AI Text
KIMI_API_KEY=           # Moonshot / Kimi k2.7 (primary text)
OPENAI_API_KEY=         # GPT-4o fallback + embeddings
GOOGLE_AI_API_KEY=      # Gemini 2.5 Pro (long context tasks)

# AI Media
FAL_AI_API_KEY=         # FLUX / Wan 2.7 / Qwen-TTS / Kling (single key)
RUNWARE_API_KEY=        # Runware image generation (fallback)
ELEVENLABS_API_KEY=     # ElevenLabs music + voice

# Social
POSTIZ_URL=             # Postiz instance URL (Railway)
POSTIZ_API_KEY=         # Postiz API key (server-side only)

# Research
YOUTUBE_API_KEY=        # YouTube Data API v3
APIFY_API_TOKEN=        # Apify (TikTok/IG/Reddit scraping)
SERPAPI_KEY=            # Google search / keyword research
FIRECRAWL_API_KEY=      # Blog/newsletter scraping

# Revenue Attribution
STRIPE_WEBHOOK_SECRET=  # Stripe webhook for sale events
GUMROAD_WEBHOOK_SECRET= # Gumroad webhook

# Supabase
VITE_SUPABASE_URL=      # Project URL (public, in browser bundle)
VITE_SUPABASE_ANON_KEY= # Anon key (public, RLS-gated)
SUPABASE_SERVICE_KEY=   # Service role key (server-side ONLY, bypasses RLS)

# Infrastructure
VERCEL_BLOB_READ_WRITE_TOKEN=  # Vercel Blob storage
CRON_SECRET=                   # Validates cron requests
PORT=3001                      # Local dev only
```

### Security Model

| Concern | Solution |
|---|---|
| User data isolation | Supabase RLS — every table policy scopes to `workspace.user_id = auth.uid()` |
| API keys in browser | NEVER. All third-party API calls go through `/api/*` Vercel functions |
| Vector data isolation | workspace_id filter on all pgvector queries before similarity sort |
| Service role key | Set only in Vercel (server) env — never in `VITE_` prefix |
| Media asset access | Vercel Blob private mode for draft assets; public mode for published |
| Webhook validation | HMAC signature verification on all incoming webhooks |
| Cron authentication | `CRON_SECRET` header checked on all `/api/cron/*` endpoints |

---

## 14. Visual Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    AUTONOMOUS CONTENT BUSINESS OS — END STATE                    ║
╚══════════════════════════════════════════════════════════════════════════════════╝

  OPERATOR INPUT
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  Business Brief: niche / audience / goal / product / platforms / style       │
  └───────────────────────────────────┬──────────────────────────────────────────┘
                                      │
  ═══════════════════════════════════════════════════════════════════════════════
                              INTELLIGENCE LAYER
  ═══════════════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────────────┐
  │                         1. STRATEGIC BRAIN                                 │
  │  Niche Analyzer → Competitor Analyzer → Audience Analyzer → Opportunity    │
  │  Content Pillars → Calendar Generator → Growth Forecaster                  │
  │  Output: 12mo strategy / 90d roadmap / 30d sprint / weekly plan            │
  └──────────┬────────────────────────────────────────────────────┬────────────┘
             │                                                    │
             ▼                                                    ▼
  ┌──────────────────────────┐                        ┌──────────────────────┐
  │  2. RESEARCH ENGINE      │                        │  3. KNOWLEDGE BASE   │
  │  YouTube Data API        │  ──→ raw assets ──→   │  Hooks Library       │
  │  Apify (TikTok/IG/Reddit)│                        │  Pattern Library     │
  │  Whisper (transcription) │  ──→ Analysis  ──→    │  CTA Library         │
  │  SerpAPI (keywords)      │      Agent            │  Audience Insights   │
  │  Firecrawl (blogs)       │                        │  Niche Intelligence  │
  │  Competitor Monitor      │                        │                      │
  │  Viral Signal Detector   │                        │  pgvector embeddings │
  └──────────────────────────┘                        │  Semantic search     │
                                                      └────────┬─────────────┘
                                                               │
  ═══════════════════════════════════════════════════════════════════════════════
                               CREATION LAYER
  ═══════════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────────────┐
        │                  4. CONTENT PLANNING ENGINE                  │
        │  Opportunity Scoring → Mix Enforcement → Platform Adaptation │
        │  Publish Window Optimization → Campaign Threading            │
        │  Output: daily content_queue (3-day rolling)                 │
        └────────────────────────────┬────────────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────────┐
        │                  5. WRITING AGENT                           │
        │  ← retrieves context from Knowledge Base (RAG)              │
        │  Kimi k2.7 → structured script JSON                         │
        │  Script Critic pass → Asset Spec Generator → Captions       │
        └────────────────────────────┬───────────────────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
        ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
        │ Image Gen     │  │ Voice Gen       │  │ Music Gen        │
        │ FLUX Pro/Dev  │  │ Qwen-3-TTS      │  │ ElevenLabs Music │
        │ Runware SDXL  │  │ Kokoro v1       │  │ Pixabay          │
        └───────┬───────┘  └────────┬────────┘  └────────┬─────────┘
                └──────────────────┬┴────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────────┐
        │               6. MEDIA PRODUCTION ENGINE                    │
        │  Wan 2.7 (image→video) → FFmpeg Assembly                   │
        │  Captions → Thumbnail (FLUX Pro) → Vercel Blob upload      │
        │  Output: final_video.mp4 at persistent CDN URL             │
        └────────────────────────────┬───────────────────────────────┘
                                     │
  ═══════════════════════════════════════════════════════════════════════════════
                            DISTRIBUTION LAYER
  ═══════════════════════════════════════════════════════════════════════════════

                                     ▼
        ┌────────────────────────────────────────────────────────────┐
        │                  7. PUBLISHING ENGINE                       │
        │  Platform Adapters (YT/TikTok/IG/FB/X/LinkedIn)           │
        │  ↓ Postiz Client (schedule + dispatch)                     │
        │  ↓ Cron */5 min → publish due posts                        │
        │  Output: video_posts records + platform_url                 │
        └──────────────────────┬─────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
           YouTube          TikTok          Instagram
           Facebook            X            LinkedIn

  ═══════════════════════════════════════════════════════════════════════════════
                            INTELLIGENCE LOOP
  ═══════════════════════════════════════════════════════════════════════════════

                               │
                               │  (analytics collection: 1h / 24h / 7d / 30d)
                               ▼
        ┌────────────────────────────────────────────────────────────┐
        │                  8. ANALYTICS ENGINE                        │
        │  Postiz Analytics → YouTube Data API → TikTok Business API │
        │  Instagram Graph API → UTM revenue attribution              │
        │  Storage: analytics_events + channel_snapshots             │
        └────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────────────────────┐
        │           9. LEARNING & OPTIMIZATION ENGINE                 │
        │  Performance Scorer → Winner/Loser Classification          │
        │  Pattern Extraction → Knowledge Base Updates               │
        │  Strategy Insights → Planning Weight Adjustment             │
        │  ← feeds back into Strategic Brain (closes the loop)       │
        └────────────────────────────────────────────────────────────┘

  ═══════════════════════════════════════════════════════════════════════════════
                            MONETIZATION LAYER
  ═══════════════════════════════════════════════════════════════════════════════

        ┌────────────────────────────────────────────────────────────┐
        │               10. MONETIZATION ENGINE                       │
        │  Products (digital / affiliate / memberships / sponsors)    │
        │  Sales Attribution (UTM + webhooks + correlation)          │
        │  Revenue Intelligence → Product Recommendations             │
        │  Sponsorship Management                                     │
        └────────────────────────────────────────────────────────────┘

  ═══════════════════════════════════════════════════════════════════════════════
                             DATA LAYER (Supabase)
  ═══════════════════════════════════════════════════════════════════════════════

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  PostgreSQL                   pgvector                   Realtime        │
  │  ─────────────                ──────────                 ────────        │
  │  workspaces       ←→         hooks.embedding    →→      research_asset  │
  │  strategies                   patterns.embedding         created event   │
  │  channels                     insights.embedding         triggers        │
  │  content_drafts               niche_intel.embedding      Analysis Agent  │
  │  content_queue                research_assets.embedding                  │
  │  video_posts                                                              │
  │  analytics_events              Supabase Auth             Supabase Storage│
  │  research_assets               ─────────────             ───────────────│
  │  competitor_profiles           email/password            raw transcripts │
  │  hooks, patterns, ctas         RLS enforcement           scraped media   │
  │  audience_insights             per-workspace             thumbnails      │
  │  niche_intelligence            data isolation                             │
  │  media_jobs                                              Vercel Blob     │
  │  products, sales               Supabase Functions        ──────────────  │
  │  sponsorships                  ──────────────            final_video.mp4 │
  │  strategy_insights             match_hooks()             scene images    │
  │  growth_forecasts              match_patterns()          voice audio     │
  └──────────────────────────────────────────────────────────────────────────┘

  ═══════════════════════════════════════════════════════════════════════════════
                          ORCHESTRATION LAYER
  ═══════════════════════════════════════════════════════════════════════════════

  Vercel Cron              Vercel Queues               Vercel Fluid Compute
  ────────────             ─────────────               ─────────────────────
  /cron/planning           contentos-research          FFmpeg assembly jobs
  /cron/research           contentos-analysis          deep research scans
  /cron/publish-check      contentos-media             long transcript runs
  /cron/analytics          contentos-assembly
  /cron/optimization       contentos-analytics
  /cron/strategy           contentos-publish

  OPERATOR DASHBOARD (React 18 / Vite / Tailwind)
  ─────────────────────────────────────────────────
  Brief Setup | Strategy View | Research View | Content Queue
  Create View | Calendar | Analytics | Monetization | Settings
  Notification Center | Agent Status Panel
```

---

## 15. Phased Implementation Plan

### Phase 0 — Foundation Repair (Current state → production-ready)
**Effort:** 1 week | **Dependency:** Supabase project created  
**Goal:** Activate all dormant systems. Nothing new, just turn on what's built.

| Task | Status | Effort |
|---|---|---|
| Create Supabase project + run schema.sql | User action | 20 min |
| Activate auth (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in Vercel) | User action | 10 min |
| Set `FAL_AI_API_KEY` in Vercel (real FLUX + voice) | User action | 5 min |
| Deploy Postiz to Railway + connect social accounts | User action | 30 min |
| Rotate exposed `KIMI_API_KEY` (git history) | User action | 10 min |
| Fix cron `process-scheduled.js` → use PostizClient | Code | 2h |
| Add `CRON_SECRET` header validation to all cron endpoints | Code | 1h |
| Fix `openmontage-bridge.js` broken GSAP CDN URL | Code | 30 min |
| Add Vercel Blob for generated assets (vs ephemeral fal.ai URLs) | Code | 4h |
| Migrate `App.jsx` monolith to per-view files | Code | 1 day |

**Milestone:** ContentOS is a real product. Auth on, Postiz posting, real visuals, data in cloud.

---

### Phase 1 — Research Intelligence + Knowledge Base
**Effort:** 3-4 weeks | **Dependency:** Phase 0 complete, Supabase active  
**Goal:** Build the system's eyes and memory. The foundation all content quality improvements rest on.

**Week 1 — Data Ingestion**
- [ ] Supabase schema migration: add `research_assets`, `competitor_profiles`, `research_jobs` tables with RLS
- [ ] YouTube Data API integration: `api/research/youtube.js` — search + video metadata + channel stats
- [ ] Apify TikTok scraper integration: `api/research/tiktok.js`
- [ ] Research job queue: Vercel Queues `contentos-research` + worker handler
- [ ] Cron trigger: `research` job every 6h per active workspace
- [ ] Research Agent (v1): runs scrape → normalize → save `research_assets`

**Week 2 — Transcription + Embeddings**
- [ ] Whisper integration: `api/research/transcribe.js` (fal.ai Whisper endpoint)
- [ ] Embedding pipeline: OpenAI `text-embedding-3-small` via `api/research/embed.js`
- [ ] pgvector extension + `match_*` SQL functions deployed to Supabase
- [ ] Auto-embed on `research_asset` insert (Supabase DB function trigger)

**Week 3 — Analysis Agent + Knowledge Tables**
- [ ] Supabase schema: `hooks`, `content_patterns`, `ctas`, `audience_insights`, `niche_intelligence`
- [ ] Analysis Agent: reads research_assets → extracts hooks/patterns/CTAs → writes KB tables
- [ ] Hook extractor: AI prompt → structured hook object
- [ ] Pattern classifier: script structure → named pattern
- [ ] Audience insight miner: comment batch → pain points / language

**Week 4 — Research UI + RAG Integration**
- [ ] New "Research" view in dashboard: competitor browser, hook library browser, trending topics
- [ ] Retrieval API: `api/kb/retrieve.js` — semantic search endpoint for internal use
- [ ] Wire retrieval into `generate-script.js`: inject KB context before Kimi call
- [ ] Wire retrieval into `generate-strategy.js`: inject audience/niche insights
- [ ] Dedup logic: embedding cosine similarity check on KB insert

**Milestone:** The system generates scripts and strategies grounded in real competitor intelligence and audience data. Hook library populates automatically. Every generation call is RAG-augmented.

---

### Phase 2 — Autonomous Content Pipeline
**Effort:** 4-5 weeks | **Dependency:** Phase 1 complete  
**Goal:** Full automation of the create → produce → publish cycle.

**Week 1-2 — Planning Engine**
- [ ] Tables: `content_plans`, `content_queue`, `content_campaigns`
- [ ] Planning Agent: daily cron → reads strategy → scores opportunities → fills queue
- [ ] Opportunity scoring model (v1 = rule-based; v2 = ML)
- [ ] Content mix enforcement logic
- [ ] Publish window optimizer (reads historical `analytics_events`)
- [ ] Content Queue UI: operator can see, edit, approve/reject queued items

**Week 2-3 — Writing Agent (grounded)**
- [ ] Writing Agent: content_queue item → retrieve context → Kimi script → Critic pass → save draft
- [ ] Script Critic: second-pass AI call scoring hook strength, CTA, platform fit
- [ ] Asset Spec Generator: image prompts + voice instructions from script
- [ ] Caption Writer: platform-specific captions + hashtag sets
- [ ] Draft state machine: full lifecycle tracking

**Week 3-4 — Media Production Engine**
- [ ] Tables: `media_jobs`
- [ ] Parallel media job dispatcher: images + voice run concurrently
- [ ] Image jobs: FLUX Pro via fal.ai → Vercel Blob
- [ ] Voice jobs: Qwen-3-TTS or Kokoro → Vercel Blob
- [ ] Music jobs: Pixabay search (free) or ElevenLabs
- [ ] Wan 2.7 video jobs: images → animated clips → Vercel Blob
- [ ] FFmpeg assembly worker (Vercel Fluid Compute, long-running): clips + voice + music + captions → final MP4
- [ ] Thumbnail generator: FLUX Pro → Vercel Blob
- [ ] Assembly queue: `contentos-assembly`

**Week 4-5 — Publishing Engine (full)**
- [ ] Platform adapters: YouTube / TikTok / Instagram / Facebook / X
- [ ] YouTube long-form uploader: direct YouTube Data API upload (Postiz doesn't handle MP4 upload)
- [ ] Publishing Agent: draft ready → adapt → schedule via Postiz → record video_post
- [ ] Cron `*/5 * * * *`: check due posts → trigger publish
- [ ] Publish failure handling: retry logic + operator alert

**Milestone:** Operator writes a brief. System generates a week of content — scripts, images, voiceover, assembled video — and schedules all of it across YouTube/TikTok/Instagram automatically. Human touching: zero (or review gates at each phase if configured).

---

### Phase 3 — Analytics + Learning Loop
**Effort:** 3-4 weeks | **Dependency:** Phase 2 complete, real published content with analytics  
**Goal:** Close the feedback loop. Make the system measurably improve over time.

**Week 1 — Analytics Engine**
- [ ] Tables: `analytics_events`, `channel_snapshots`, `strategy_insights`
- [ ] Analytics Agent: 1h/24h/7d/30d collection jobs per video_post
- [ ] YouTube Data API analytics: watch time, retention, CTR
- [ ] TikTok Business API analytics: completion rate, follower gain
- [ ] Instagram Graph API analytics: reach, saves, profile visits
- [ ] Postiz analytics passthrough (aggregate)
- [ ] Channel snapshot cron: daily subscriber/views tracking

**Week 2 — Revenue Attribution**
- [ ] Stripe webhook receiver: `api/webhooks/stripe.js`
- [ ] Gumroad webhook receiver: `api/webhooks/gumroad.js`
- [ ] UTM matching: incoming sale → match `content_draft_id` from UTM params
- [ ] `affiliate_links` tracker: clicks + conversions
- [ ] Revenue dashboard: content ROI, attribution waterfall

**Week 3 — Optimization Agent**
- [ ] Performance Scorer: predicted vs actual delta calculation
- [ ] Winner/Loser classifier: top/bottom 20% by performance score
- [ ] Pattern Extraction Agent: AI call over winner corpus → structured patterns
- [ ] KB updater: promote winning hooks, demote losing hooks, add new patterns
- [ ] Strategy Insight Writer: recommendations → `strategy_insights` table
- [ ] Optimization Agent cron: Sunday 10PM

**Week 4 — Forecasting + Health Monitoring**
- [ ] Growth Forecaster: regression model on subscriber trajectory
- [ ] Strategy health score: composite metric → dashboard widget
- [ ] Strategy re-evaluation trigger: auto-trigger when health score drops
- [ ] Notification Agent: operator alerts (viral post, revenue milestone, weekly digest)
- [ ] Strategy Insights UI: operator review + apply/dismiss interface

**Milestone:** The system visibly improves over 8-12 weeks. Hook choices shift toward what works. Planning prioritizes winning topics. Publishing adjusts timing. Operator can see the learning as it happens.

---

### Phase 4 — Multi-Brand + Scale
**Effort:** Ongoing | **Dependency:** Phase 3 complete, successful single-brand operation  
**Goal:** Operator can run multiple autonomous brands from one dashboard.

**Multi-workspace capabilities:**
- [ ] Multi-workspace UI: brand switcher, per-brand analytics
- [ ] Cross-workspace learning: patterns discovered in brand A available (opt-in) to brand B
- [ ] Workspace templates: pre-load KB from a proven niche (e.g., "financial freedom" template)
- [ ] Brand cloning: duplicate a proven workspace setup to a new niche

**Platform expansion:**
- [ ] LinkedIn adapter + long-form content support
- [ ] Pinterest adapter (evergreen content distribution)
- [ ] Newsletter engine: convert blog/script content → email newsletter (via ConvertKit/Beehiiv)
- [ ] Podcast adapter: voiceover → podcast episode → Spotify/Apple Podcasts RSS

**Advanced AI capabilities:**
- [ ] Upgrade to Claude Sonnet 4.6 or Gemini 2.5 Pro for complex strategy tasks
- [ ] Fine-tuned Writing Agent: LoRA fine-tune on the workspace's best-performing scripts
- [ ] Predictive virality scoring: ML model trained on workspace data
- [ ] A/B testing framework: two versions of a hook → split traffic → auto-pick winner

**Monetization expansion:**
- [ ] Sponsorship CRM: inbound inquiry tracking, deal pipeline, contract management
- [ ] Membership integration: Circle.so / Skool community management
- [ ] Course platform webhooks: Kajabi / Teachable / Thinkific enrollment tracking
- [ ] Consulting booking: Cal.com integration for strategy calls

**Infrastructure maturity:**
- [ ] CI/CD pipeline: GitHub Actions → lint + build + test → `vercel --prod`
- [ ] Observability: Vercel Analytics + custom event tracking + error alerting
- [ ] Cost dashboards: per-workspace AI spend tracking (generation cost per video)
- [ ] SLA monitoring: cron reliability, job failure rate, API uptime

**Milestone:** Operator runs 3-5 autonomous content brands simultaneously. System generates 2-3 videos per brand per day, cross-platform. Revenue attribution is reliable. The system has demonstrably improved its content quality metrics over 3+ months.

---

## Summary: Current vs End State

| Dimension | Today (Phase 0) | End State (Phase 4) |
|---|---|---|
| **User input required** | Every step (manual) | Initial brief only |
| **Content research** | None | Continuous, multi-platform |
| **Strategy grounding** | Hallucinated | Evidence-based (real competitor data) |
| **Script quality** | Generic AI output | RAG-grounded, hook-library-informed |
| **Media production** | HTML text compositions only | Real MP4 with AI images + voice + music |
| **Publishing** | Manual trigger | Fully automated, optimized timing |
| **Analytics** | Demo data | Real per-post performance tracking |
| **Learning** | None | Continuous closed-loop optimization |
| **Revenue attribution** | Tracked in product table | Content → lead → sale attribution chain |
| **Multi-brand** | Single workspace | N workspaces, cross-learning |
| **Self-improvement** | None | Provably better results month over month |

---

## 16. Knowledge Acquisition & Learning System (KALS)

### Purpose

The Knowledge Acquisition & Learning System is ContentOS's operator-curated intelligence layer. While the Research Intelligence Engine (§2) automatically collects knowledge *from the internet*, KALS allows operators to import knowledge *from their own libraries* — textbooks, playbooks, swipe files, course materials, SOPs, prompt collections — and transform that material into structured, searchable, agent-accessible knowledge assets.

Every document uploaded becomes a permanent part of the system's intelligence. A camera angle guide uploaded once influences every image prompt generated forever. A copywriting swipe file uploaded once makes every script sharper. A competitor's course material uploaded once informs every piece of strategy the system produces.

**The compound effect:** the more operators feed the system, the smarter it becomes. KALS is how a solo creator can give ContentOS the knowledge base of a full creative agency.

---

### Supported Source Types

| Source Type | File Formats | Extraction Method |
|---|---|---|
| PDF documents | `.pdf` | PDF text extraction (pdf-parse) + OCR fallback (Tesseract) |
| Books / Guides | `.pdf`, `.epub`, `.docx`, `.txt` | Chapter detection + hierarchical chunking |
| Playbooks / SOPs | `.pdf`, `.docx`, `.md`, `.notion` export | Process/step extraction + sequential ordering |
| Research reports | `.pdf`, `.docx` | Section detection + data/finding extraction |
| YouTube transcripts | YouTube URL | `yt-dlp --write-auto-sub` + timestamp-aligned chunking |
| Video transcripts | `.srt`, `.vtt`, `.txt` | Timestamp parsing + semantic scene chunking |
| Web articles | URL | Firecrawl/Playwright → cleaned markdown → chunking |
| Swipe files | `.pdf`, `.docx`, `.txt`, image | OCR + copy pattern extraction |
| Course materials | `.pdf`, `.zip` (SCORM), URL | Multi-file unpack + module/lesson hierarchy |
| Prompt libraries | `.txt`, `.md`, `.json`, `.csv` | Prompt pattern recognition + variable extraction |
| Notion exports | `.zip` (Notion export) | Page tree parse + block-level extraction |
| Google Docs | Shared URL | Google Docs API → markdown export |

---

### Ingestion Pipeline

```
Upload Asset
     │
     ▼
[1. Receive & Store]
     Upload to Vercel Blob (raw, persistent)
     Create knowledge_asset record (status: ingesting)
     Enqueue ingestion job → contentos-knowledge queue
     │
     ▼
[2. Extract Raw Text]
     Route by file type:
       PDF   → pdf-parse + OCR fallback
       DOCX  → mammoth → markdown
       URL   → Firecrawl → cleaned markdown
       YT URL → yt-dlp transcript → timestamped text
       SRT   → parse timestamps → scene blocks
       Image → GPT-4o Vision → text description
       ZIP   → unpack → process each file recursively
     │
     ▼
[3. Structure Detection]
     Identify: title, author, chapters/sections, lists, tables, code blocks
     Detect: document type (guide / swipe / SOP / course / research / transcript)
     Extract: TOC if present (for navigation + chunk labeling)
     │
     ▼
[4. Semantic Chunking]
     Split into knowledge_chunks:
       - Respect structural boundaries (chapter/section breaks preferred)
       - Target: 400-600 tokens per chunk
       - Overlap: 50 tokens between adjacent chunks (for retrieval continuity)
       - Each chunk carries: parent document, section title, position index, page ref
     │
     ▼
[5. Concept & Entity Extraction]
     AI analysis pass (Kimi/GPT-4o) over each chunk:
       Extract: key concepts, named entities, technical terms, statistics
       Tag: knowledge_category (Marketing / Copywriting / Video / etc.)
       Identify: knowledge_object_type (Framework / Technique / Process / etc.)
       Score: importance (1-5) + applicability (which agents benefit)
     │
     ▼
[6. Deep Extraction Pass]
     Specialized extractors run per object type detected:
       Frameworks    → extract: name, components, steps, use case, example
       Techniques    → extract: name, method, when to use, example, result
       Processes     → extract: name, trigger, sequential steps, output, tools needed
       Templates     → extract: name, structure, fill-in variables, example
       Prompts       → extract: goal, full prompt text, variables ({{placeholders}}), best for
       Checklists    → extract: name, items[], completion criteria
       Formulas      → extract: name, equation/structure, variables, example
       Case Studies  → extract: subject, context, action, result, lesson
       Patterns      → extract: name, description, where it appears, why it works
       Strategies    → extract: name, goal, components, execution, metrics
     │
     ▼
[7. Summary Generation]
     Per chunk: 1-sentence summary (for display + retrieval)
     Per document: paragraph summary + key_takeaways[] (3-5 bullets)
     Per extracted object: brief description + "how agents should use this"
     │
     ▼
[8. Embedding Generation]
     Embed each knowledge_chunk (text) → vector(1536) via text-embedding-3-small
     Embed each knowledge_object (name + description + content) → vector(1536)
     Embed document summary → vector(1536)
     Store all embeddings → pgvector columns
     │
     ▼
[9. Relationship Mapping]
     Cross-reference newly extracted objects against existing KB:
       Similarity search: find related objects (cosine similarity > 0.82)
       Tag relationships: "extends", "contradicts", "exemplifies", "is_part_of"
       Update knowledge_relationships table
     │
     ▼
[10. Activate]
     Update knowledge_asset.status → "active"
     Notify operator: "{N} frameworks, {M} techniques, {K} prompts extracted"
     Trigger: re-index workspace knowledge graph
```

---

### Knowledge Objects & Taxonomy

Every piece of extracted knowledge is typed as one of ten canonical objects. Typing determines how the object is stored, displayed, and retrieved.

```typescript
// Canonical knowledge object types
type KnowledgeObjectType =
  | "framework"    // A named multi-component model (AIDA, PAS, Story Brand, etc.)
  | "technique"    // A specific actionable method (J-cut editing, curiosity gap hook, etc.)
  | "process"      // A sequential step-by-step workflow
  | "template"     // A fill-in structure with {{variables}}
  | "prompt"       // An LLM prompt pattern (for agent use)
  | "checklist"    // A verification list (pre-publish checklist, etc.)
  | "formula"      // A repeatable structure or equation (Hook + Story + Offer = CTA)
  | "case_study"   // A real-world documented example with result
  | "pattern"      // A recurring observed behavior or structure
  | "strategy"     // A high-level plan with goal + components + execution

// Knowledge categories
type KnowledgeCategory =
  | "marketing"         // Funnels, positioning, USP, growth
  | "copywriting"       // Headlines, persuasion, emotional triggers, CTAs
  | "storytelling"      // Narrative structure, character, tension, resolution
  | "video_production"  // Scripting, pacing, formats, platform conventions
  | "cinematography"    // Camera angles, lens selection, movement, composition
  | "thumbnail_design"  // Visual hierarchy, contrast, emotion, text overlay
  | "sales"             // Objection handling, closing, offer design
  | "psychology"        // Cognitive biases, motivation, behavioral triggers
  | "business"          // Operations, pricing, positioning, systems
  | "ai_automation"     // Prompt engineering, workflow design, agent patterns
  | "social_media"      // Algorithm mechanics, engagement, virality
  | "content_creation"  // Ideation, production, batching, repurposing
  | "industry_specific" // Niche-specific knowledge (tagged with niche name)
```

---

### Database Schema

```sql
-- KNOWLEDGE ASSETS (top-level document record)
CREATE TABLE knowledge_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  
  -- Source info
  title text NOT NULL,
  source_type text NOT NULL,        -- pdf/docx/url/youtube/srt/txt/zip/image
  source_url text,                  -- original URL (if web/YouTube)
  blob_url text,                    -- Vercel Blob URL of raw file
  file_size_bytes bigint,
  
  -- Classification
  knowledge_categories text[],      -- array of KnowledgeCategory
  document_type text,               -- guide/swipe/sop/course/research/transcript/other
  author text,
  source_name text,                 -- "Gary Halbert's Boron Letters", "MrBeast's Mastermind"
  
  -- Extraction results
  status text DEFAULT 'queued',     -- queued/ingesting/extracting/embedding/active/failed
  page_count int,
  word_count int,
  chunk_count int DEFAULT 0,
  object_count int DEFAULT 0,       -- total extracted knowledge objects
  
  -- Summary
  summary text,
  key_takeaways text[],
  
  -- Embedding of the summary (for doc-level similarity)
  embedding vector(1536),
  
  -- Operator notes
  operator_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- KNOWLEDGE CHUNKS (raw text segments, the retrieval unit)
CREATE TABLE knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  asset_id uuid NOT NULL REFERENCES knowledge_assets(id) ON DELETE CASCADE,
  
  -- Position in document
  chunk_index int NOT NULL,
  section_title text,
  page_ref text,                    -- "p. 42" or "00:12:34" for transcripts
  
  -- Content
  content text NOT NULL,            -- raw chunk text
  summary text,                     -- 1-sentence summary of this chunk
  token_count int,
  
  -- Classification
  knowledge_categories text[],
  importance_score int,             -- 1-5, AI-assigned
  
  -- Vector
  embedding vector(1536),
  
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- KNOWLEDGE OBJECTS (extracted structured knowledge)
CREATE TABLE knowledge_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  asset_id uuid REFERENCES knowledge_assets(id) ON DELETE SET NULL,
  chunk_id uuid REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
  
  -- Identity
  object_type text NOT NULL,        -- KnowledgeObjectType
  category text NOT NULL,           -- KnowledgeCategory
  name text NOT NULL,               -- "AIDA Framework" / "J-cut Technique"
  description text NOT NULL,        -- 2-3 sentence summary
  
  -- Content (varies by object_type, stored as JSONB)
  content jsonb NOT NULL,
  /*
    Framework:   { components: [], steps: [], use_case: "", example: "" }
    Technique:   { method: "", when_to_use: "", example: "", result: "" }
    Process:     { trigger: "", steps: [], output: "", tools: [] }
    Template:    { structure: "", variables: [], example: "" }
    Prompt:      { goal: "", prompt_text: "", variables: [], best_for: "" }
    Checklist:   { items: [], completion_criteria: "" }
    Formula:     { equation: "", variables: {}, example: "", result: "" }
    Case_study:  { subject: "", context: "", action: "", result: "", lesson: "" }
    Pattern:     { observed_in: [], why_it_works: "", counter_examples: [] }
    Strategy:    { goal: "", components: [], execution: "", metrics: [] }
  */
  
  -- Agent applicability (which agents should retrieve this)
  agent_tags text[],                -- ["writing_agent", "media_agent", "strategy_agent"]
  
  -- Quality
  confidence_score float,           -- AI confidence in extraction quality (0-1)
  verified boolean DEFAULT false,   -- operator-verified as correct
  usage_count int DEFAULT 0,        -- times retrieved by agents
  
  -- Vector
  embedding vector(1536),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX ON knowledge_objects USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- KNOWLEDGE RELATIONSHIPS (graph edges between objects)
CREATE TABLE knowledge_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  source_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,  -- extends/contradicts/exemplifies/is_part_of/related_to
  strength float DEFAULT 0.5,       -- 0-1, derived from embedding cosine similarity
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, target_id, relationship_type)
);

-- KNOWLEDGE INGESTION JOBS (queue tracking)
CREATE TABLE knowledge_ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  asset_id uuid REFERENCES knowledge_assets(id),
  stage text DEFAULT 'queued',      -- queued/extracting/chunking/analyzing/embedding/complete/failed
  progress_pct int DEFAULT 0,
  current_step text,
  result json,
  error text,
  attempts int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- KNOWLEDGE SEARCH LOG (for retrieval optimization)
CREATE TABLE knowledge_search_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  querying_agent text,              -- which agent made the search
  query_text text,
  query_embedding vector(1536),
  results_returned int,
  result_ids uuid[],
  search_latency_ms int,
  created_at timestamptz DEFAULT now()
);
```

**RLS — all tables follow the workspace owner pattern:**
```sql
ALTER TABLE knowledge_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner" ON knowledge_assets
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
-- (same pattern for all knowledge_* tables)
```

**Supabase vector search functions:**
```sql
-- Semantic chunk search
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  workspace_id uuid,
  category_filter text DEFAULT NULL,
  match_count int DEFAULT 10,
  min_similarity float DEFAULT 0.72
) RETURNS TABLE (
  id uuid, content text, summary text, section_title text,
  asset_id uuid, importance_score int, similarity float
) LANGUAGE sql STABLE AS $$
  SELECT kc.id, kc.content, kc.summary, kc.section_title, kc.asset_id,
         kc.importance_score, 1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.workspace_id = match_knowledge_chunks.workspace_id
    AND (category_filter IS NULL OR category_filter = ANY(kc.knowledge_categories))
    AND 1 - (kc.embedding <=> query_embedding) > min_similarity
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Semantic object search
CREATE OR REPLACE FUNCTION match_knowledge_objects(
  query_embedding vector(1536),
  workspace_id uuid,
  object_types text[] DEFAULT NULL,
  agent_tag text DEFAULT NULL,
  match_count int DEFAULT 5,
  min_similarity float DEFAULT 0.75
) RETURNS TABLE (
  id uuid, object_type text, category text, name text,
  description text, content jsonb, usage_count int, similarity float
) LANGUAGE sql STABLE AS $$
  SELECT ko.id, ko.object_type, ko.category, ko.name,
         ko.description, ko.content, ko.usage_count,
         1 - (ko.embedding <=> query_embedding) AS similarity
  FROM knowledge_objects ko
  WHERE ko.workspace_id = match_knowledge_objects.workspace_id
    AND (object_types IS NULL OR ko.object_type = ANY(object_types))
    AND (agent_tag IS NULL OR agent_tag = ANY(ko.agent_tags))
    AND 1 - (ko.embedding <=> query_embedding) > min_similarity
  ORDER BY ko.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

### Processing Architecture

#### Chunking Strategy

Different source types require different chunking strategies:

```typescript
const CHUNK_STRATEGIES = {
  // Structured documents — split at logical boundaries
  guide_playbook: {
    primary_split: 'section_heading',   // H1/H2/H3 boundaries
    fallback_split: 'paragraph',
    target_tokens: 500,
    overlap_tokens: 50
  },
  // SOPs / processes — preserve step integrity
  sop_process: {
    primary_split: 'numbered_step',
    group_steps: 3,                     // group 3 steps per chunk
    preserve_context: 'process_name',   // inject process name into every chunk
    target_tokens: 400
  },
  // Transcripts — split at semantic pauses, not arbitrary tokens
  transcript: {
    primary_split: 'silence_gap',       // >2s gap in timestamps
    fallback_split: 'sentence',
    target_tokens: 350,
    include_timestamps: true
  },
  // Swipe files — each example is atomic
  swipe_file: {
    primary_split: 'example_boundary',  // blank line + heading patterns
    min_tokens: 50,
    max_tokens: 800,
    preserve_complete: true             // never split mid-example
  },
  // Long-form (books) — respect chapter + section structure
  book: {
    primary_split: 'chapter',
    secondary_split: 'section',
    target_tokens: 600,
    overlap_tokens: 75,
    include_chapter_context: true       // prepend "Chapter N: {title}" to each chunk
  }
}
```

#### Extraction Prompt System

Each extraction pass uses a typed, structured prompt:

```typescript
// Framework extraction (example)
const FRAMEWORK_EXTRACTION_PROMPT = `
You are extracting marketing/content knowledge from a document.

Extract ALL frameworks from the following text. A framework is a named, 
multi-component model or system that can be applied to achieve a result.

Examples: AIDA, PAS, StoryBrand, Hook-Story-Offer, 80/20 Rule, Hero's Journey.

For each framework found, output a JSON object:
{
  "name": "Framework name",
  "category": "marketing|copywriting|storytelling|video_production|...",
  "components": ["component 1", "component 2", ...],
  "steps": ["step 1 (optional)", ...],
  "use_case": "When/why to use this framework",
  "example": "Concrete example of applying this framework",
  "agent_tags": ["writing_agent", "strategy_agent", ...]
}

Return: { "frameworks": [...] }

TEXT:
{chunk_content}
`

// Camera angle extraction (cinematography-specific)
const CINEMATOGRAPHY_EXTRACTION_PROMPT = `
Extract all cinematography techniques, camera angles, and visual concepts.

For each technique:
{
  "name": "Technique name (e.g. Dutch Angle, J-cut, Rule of Thirds)",
  "category": "cinematography",
  "object_type": "technique",
  "method": "How to execute this technique",
  "when_to_use": "What emotional/narrative effect this creates",
  "example": "Specific example from film or content",
  "agent_tags": ["media_agent"],  // → influences image/video prompts
  "prompt_keywords": ["dutch angle", "tilted camera"]  // injected into image prompts
}

TEXT: {chunk_content}
`
```

---

### Retrieval API

The retrieval API is the interface through which all agents access KALS. It combines semantic search, object-type filtering, and agent-specific routing.

```typescript
// api/kb/retrieve-knowledge.js

interface KnowledgeRetrievalRequest {
  workspace_id: string
  query: string                        // natural-language query from the agent
  categories?: KnowledgeCategory[]    // filter by category
  object_types?: KnowledgeObjectType[] // filter by type (framework, technique, etc.)
  agent?: string                       // which agent is requesting (for agent_tag filter)
  include_chunks?: boolean             // return raw chunks (for context injection)
  include_objects?: boolean            // return structured objects (default: true)
  chunk_limit?: number                 // default 5
  object_limit?: number                // default 5
  min_similarity?: number             // default 0.72
}

interface KnowledgeRetrievalResult {
  chunks: {
    id: string
    content: string
    summary: string
    section_title: string
    asset_title: string
    similarity: number
  }[]
  objects: {
    id: string
    object_type: KnowledgeObjectType
    category: KnowledgeCategory
    name: string
    description: string
    content: object           // typed by object_type
    similarity: number
  }[]
  total_results: number
  search_latency_ms: number
}

// Example agent usage (Writing Agent retrieving copywriting frameworks)
const context = await retrieveKnowledge({
  workspace_id,
  query: "how to write a compelling hook for a financial freedom video",
  categories: ["copywriting", "storytelling"],
  object_types: ["framework", "technique", "formula", "template"],
  agent: "writing_agent",
  object_limit: 8,
  include_chunks: true,
  chunk_limit: 3
})

// Returned objects might include:
// - AIDA Framework (marketing, framework)
// - Curiosity Gap Technique (copywriting, technique)
// - PAS Formula (copywriting, formula)
// - "Before/After" Hook Template (copywriting, template)
// - Chunk: page 47 of "Breakthrough Advertising" on desire-triggering headlines
```

---

### Knowledge Graph

Beyond flat retrieval, KALS maintains a relationship graph between knowledge objects. This enables traversal queries: "give me everything related to this framework," "what contradicts this technique," "what are the components of this strategy."

```typescript
// Traverse the knowledge graph from a seed object
async function traverseKnowledgeGraph(
  seed_object_id: string,
  workspace_id: string,
  relationship_types: RelationshipType[],
  max_depth: number = 2
): Promise<KnowledgeGraphResult>

// Example: traversing from "AIDA Framework"
// → finds: PAS Formula (extends), Case Study: Dollar Shave Club (exemplifies),
//          Copywriting Checklist (is_part_of), "Hook First" Pattern (related_to)
```

**Graph visualization in dashboard:** The KALS UI includes a force-directed knowledge graph where nodes are objects and edges are relationships. Clicking a node opens the full object. This gives operators a visual map of their accumulated knowledge.

---

### Agent Integration

KALS is injected into every agent's context retrieval step. Each agent queries with a different intent.

#### Writing Agent
**Query:** "hooks and storytelling techniques for {topic} targeting {audience}"  
**Uses:** frameworks (narrative), techniques (hooks), formulas (CTA), templates (script), prompts (generation guidance)  
**Effect:** every script generated is conditioned on proven copywriting frameworks the operator uploaded

```typescript
// Writing Agent — knowledge retrieval before script generation
const kalsContext = await retrieveKnowledge({
  query: `compelling hooks and opening techniques for "${topic}" content targeting "${audience}"`,
  categories: ["copywriting", "storytelling", "video_production"],
  object_types: ["technique", "framework", "formula", "template"],
  agent: "writing_agent"
})

// Inject into Kimi prompt:
systemPrompt += `\n\nRELEVANT KNOWLEDGE BASE:\n${formatObjectsForPrompt(kalsContext.objects)}`
```

#### Media Agent
**Query:** "{visual style} cinematography and composition techniques"  
**Uses:** techniques (camera angles), patterns (visual composition), checklists (shot checklist)  
**Effect:** image prompts automatically incorporate cinematography vocabulary from uploaded guides

```typescript
// Media Agent — append KALS cinematography terms to image prompts
const cinemaContext = await retrieveKnowledge({
  query: `${visual_style} camera angles composition lighting for ${scene_description}`,
  categories: ["cinematography", "video_production"],
  object_types: ["technique", "pattern"],
  agent: "media_agent"
})

// Auto-enrich the image prompt
enrichedPrompt = `${basePrompt}, ${extractPromptKeywords(cinemaContext.objects).join(', ')}`
```

**Example:** Operator uploads "The Filmmaker's Eye" (PDF). System extracts Dutch Angle (technique: `creates unease, psychological tension`), Rule of Thirds (technique: `balanced composition`), Leading Lines (technique: `draws eye to subject`). Every FLUX image prompt now automatically receives contextually appropriate cinematography keywords — zero manual work.

#### Strategy Agent
**Query:** "content strategy frameworks for {niche} channel growth"  
**Uses:** strategies, frameworks, case studies, patterns  
**Effect:** generated strategies incorporate proven strategic frameworks from the operator's library

#### Research Agent
**Query:** "research methodologies and competitive analysis frameworks"  
**Uses:** processes (research SOPs), checklists (analysis checklists), strategies  
**Effect:** research jobs follow the operator's preferred research frameworks

#### Analytics Agent
**Query:** "performance analysis frameworks and optimization techniques"  
**Uses:** frameworks (analytics models), formulas (engagement calculation), case studies  
**Effect:** optimization recommendations reference known frameworks

#### Monetization Agent
**Query:** "digital product sales and conversion frameworks for {product_type}"  
**Uses:** strategies (sales), frameworks (funnel), techniques (objection handling), templates (sales copy)  
**Effect:** revenue recommendations grounded in the operator's uploaded sales knowledge

---

### UI Design

#### Knowledge Library View (new dashboard view)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KNOWLEDGE BASE                                    [+ Upload Document]       │
│                                                                             │
│  Search knowledge...                              Filter: All Types  ▼     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  📚 Breakthrough Advertising (Gary Halbert)           marketing       │  │
│  │  PDF · 312 pages · 47 objects extracted · Uploaded 2026-06-20        │  │
│  │  Extracted: 12 frameworks · 8 techniques · 6 formulas · 3 templates  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  🎬 MrBeast Thumbnail Masterclass (YouTube transcript)  cinematography │  │
│  │  YouTube · 2:14:32 · 28 objects extracted · Uploaded 2026-06-22      │  │
│  │  Extracted: 5 techniques · 3 checklists · 8 patterns · 2 templates   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  KNOWLEDGE OBJECTS                                                          │
│  ─────────────────                                                          │
│  [All] [Frameworks] [Techniques] [Processes] [Templates] [Prompts] [...]   │
│                                                                             │
│  ┌────────────────────────────┐  ┌────────────────────────────┐           │
│  │ FRAMEWORK                  │  │ TECHNIQUE                  │           │
│  │ AIDA                       │  │ Curiosity Gap Hook         │           │
│  │ marketing · copywriting    │  │ copywriting · video        │           │
│  │ Attention → Interest →     │  │ State a surprising fact    │           │
│  │ Desire → Action            │  │ then withhold the reveal   │           │
│  │ ✓ Verified  Used 34×       │  │ Used 18×                   │           │
│  └────────────────────────────┘  └────────────────────────────┘           │
│                                                                             │
│  KNOWLEDGE GRAPH                          [View Full Graph →]              │
│  ┌──────────────────────────────────────────────────┐                      │
│  │  AIDA ──extends──► PAS Formula                   │                      │
│  │       ──exemplified by──► Dollar Shave Club Case │                      │
│  │       ──related to──► Curiosity Gap Technique    │                      │
│  └──────────────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Upload Flow

```
[Click "+ Upload Document"]
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  ADD KNOWLEDGE ASSET                                  │
│                                                       │
│  Drag & drop file here, or paste URL                 │
│  ──────────────────────────────────────              │
│  📎  Supported: PDF, DOCX, TXT, SRT, VTT, ZIP       │
│  🔗  URLs: YouTube, web articles, Google Docs        │
│                                                       │
│  Title: ______________________________________        │
│  Source: ______________________________________       │
│  Categories: [Marketing] [Copywriting] [+ Add]       │
│  Notes: ______________________________________        │
│                                                       │
│  [Upload & Extract]                                   │
└─────────────────────────────────────────────────────┘
     │
     ▼
[Progress indicator while processing]
  ✓ File received
  ✓ Text extracted (312 pages)
  ⟳ Chunking into segments... (47/89)
  ○ Analyzing for knowledge objects
  ○ Generating embeddings
  ○ Mapping relationships
```

#### Manual Knowledge Entry

Operators can also add knowledge objects manually (without a source document):

```
[+ Add Object]
  Type: [Framework ▼]
  Name: "The Slippery Slide"
  Category: [Copywriting]
  Description: "Joseph Sugarman's principle: every word exists only to get you to read the next word"
  Content: { "goal": "maintain reader momentum", "method": "..." }
  Agent Tags: [writing_agent] [strategy_agent]
  [Save]
```

---

### Quality & Maintenance

**Verification workflow:** AI extraction is imperfect. Operators can review extracted objects and mark them `verified: true`. Verified objects receive a retrieval weight boost (×1.5) and a UI badge.

**Conflict resolution:** when two documents contain contradictory information (detected via `contradicts` relationship + low cosine similarity), the system flags it in the dashboard: "The uploaded SOP conflicts with 'Method X' from {other_document}. Which should agents prefer?" Operator picks; the other is marked lower-weight.

**Staleness tracking:** objects from older documents that haven't been retrieved in 90+ days and have `usage_count = 0` are marked `stale` and surfaced in a "Review" queue. Operator can re-verify, archive, or delete.

**Cross-workspace learning (future):** Operators who opt in can share extracted knowledge objects (anonymized, no PII) with a shared ContentOS knowledge pool. The pool pre-populates new workspaces with community-verified frameworks across all categories.

---

### Implementation Plan (KALS-specific)

KALS is built as part of **Phase 1** (alongside the Research Intelligence Engine) since both feed the same Knowledge Base tables.

**Week 1 — Infrastructure**
- [ ] Supabase schema: `knowledge_assets`, `knowledge_chunks`, `knowledge_objects`, `knowledge_relationships`, `knowledge_ingestion_jobs` tables
- [ ] Vercel Blob: upload endpoint `api/kb/upload.js` (multipart → Blob → create asset record)
- [ ] Vercel Queue: `contentos-knowledge` ingestion queue
- [ ] Basic text extraction: PDF (pdf-parse), DOCX (mammoth), TXT, URL (Firecrawl)

**Week 2 — Extraction Pipeline**
- [ ] Chunking engine: strategy routing by document type
- [ ] YouTube/SRT transcript ingestion (`yt-dlp` wrapper via shell in Fluid Compute)
- [ ] AI extraction pass: Kimi-backed typed extractors (framework, technique, process, template, prompt, pattern)
- [ ] Checklist, formula, case_study, strategy extractors
- [ ] Embedding pipeline: `text-embedding-3-small` → pgvector

**Week 3 — Retrieval & Relationships**
- [ ] `match_knowledge_chunks` + `match_knowledge_objects` Supabase functions deployed
- [ ] `api/kb/retrieve-knowledge.js` retrieval API
- [ ] Relationship mapper: similarity search → `knowledge_relationships` table
- [ ] Search log tracking
- [ ] Agent integration: inject KALS context into Writing Agent and Media Agent

**Week 4 — UI**
- [ ] Knowledge Library view: asset list, object browser, search
- [ ] Upload flow + progress indicator (Supabase Realtime for job progress)
- [ ] Object detail panel (full content display per object type)
- [ ] Manual object entry form
- [ ] Knowledge graph visualization (force-directed, D3.js or Cytoscape.js)
- [ ] Verification workflow (operator review + verify badge)

**Ongoing**
- [ ] Extend agent integrations: Strategy, Research, Analytics, Monetization agents
- [ ] Expand extractor types as new document categories are encountered
- [ ] OCR fallback for image-heavy PDFs (Tesseract via worker)
- [ ] Google Docs import (Google Docs API OAuth)
- [ ] Notion import (Notion API + zip export parser)

---

### Summary Table Update

| Dimension | Today | With KALS |
|---|---|---|
| **Knowledge source** | Hallucinated / internet research | Operator's curated library + internet research |
| **Script grounding** | Topic string → generic AI | Topic + KB frameworks + competitor hooks + operator's playbooks |
| **Image prompts** | Generic description | Enriched with cinematography vocab from uploaded guides |
| **Strategy quality** | Generic best practices | Grounded in uploaded strategies + real competitor data |
| **System learning** | None | Compounds: every upload makes every agent permanently smarter |
| **Knowledge types** | None | 10 typed objects across 13 categories, fully semantic-searchable |

---

*End of Knowledge Acquisition & Learning System specification.*

---

## Summary: Current vs End State

| Dimension | Today (Phase 0) | End State (Phase 4) |
|---|---|---|
| **User input required** | Every step (manual) | Initial brief only |
| **Content research** | None | Continuous, multi-platform |
| **Strategy grounding** | Hallucinated | Evidence-based (real competitor data + operator library) |
| **Script quality** | Generic AI output | RAG-grounded: hooks library + KB frameworks + cinematography |
| **Media production** | HTML text compositions only | Real MP4 with AI images + voice + music |
| **Image prompts** | Generic description | Enriched with cinematography vocabulary from KALS |
| **Publishing** | Manual trigger | Fully automated, optimized timing |
| **Analytics** | Demo data | Real per-post performance tracking |
| **Learning** | None | Continuous closed-loop: analytics → optimization → KB update |
| **Operator knowledge** | Unused | 10-type structured KB, semantic search, agent-accessible |
| **Revenue attribution** | Tracked in product table | Content → lead → sale attribution chain |
| **Multi-brand** | Single workspace | N workspaces, cross-learning |
| **Self-improvement** | None | Provably better results month over month |

---

*This document is the canonical architectural reference for ContentOS v2.0. All implementation decisions should be evaluated against this vision. Phase boundaries are estimates — pace them to available resources and real-world performance signals.*
