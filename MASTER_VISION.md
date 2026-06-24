# ContentOS — Master Vision
## Autonomous Content Business Operating System

**Document type:** Source of Truth  
**Authority:** This document supersedes all other product, architecture, and roadmap documents.  
**Date:** 2026-06-23  
**Version:** 1.0

> All future architecture decisions, feature additions, database changes, and agent behaviors  
> must be evaluated against this document. When in doubt, this document wins.

---

## The Mission

**ContentOS transforms a single business brief into a fully operating content brand.**

The operator states a niche, an audience, a monetization goal, and a preferred style. ContentOS researches the landscape, builds the strategy, creates the content, produces the media, distributes it across platforms, tracks performance, learns from results, and continuously improves — with as little or as much human involvement as the operator chooses.

The platform is not a tool. It is an operating system. The difference: a tool does what you tell it, then waits. An operating system runs the business continuously whether or not the operator is present.

---

## What ContentOS Is Not

- Not a scriptwriter. Not a scheduler. Not a dashboard.
- Not a point solution for any single step in the content workflow.
- Not dependent on any single AI provider, media provider, or social platform.
- Not a system that requires human input to function from day to day.

ContentOS is the orchestration layer that coordinates research, intelligence, creation, distribution, analytics, and monetization into a single autonomous loop.

---

## Three Operating Modes

ContentOS operates in three modes. The operator selects the mode per workspace. Modes determine which systems are active, how much autonomy the platform has, and what the operator's role is.

```
CREATOR MODE          PROJECT MODE          AUTONOMOUS BRAND MODE
─────────────         ────────────          ─────────────────────
One-off pieces        Campaigns             Ongoing brand operation
Human drives          Human defines         Human sets brief once
System assists        System executes       System runs continuously
Ad hoc                Time-bounded          Perpetual
```

### Creator Mode

The operator creates individual pieces of content with AI assistance. The system provides intelligence (knowledge retrieval, channel playbooks, skill invocation) on demand but takes no autonomous action. Everything requires a human trigger.

**Use case:** A creator wants to produce a single video script, generate images for a post, or draft a newsletter. They are not running an automated brand — they are using ContentOS as a powerful AI-assisted production studio.

**Systems active:** Knowledge Engine (retrieval only), Content Creation Engine, Media Production Engine, Skill Library (manual invocation).

**Operator role:** Full control. Every step is human-initiated. Nothing publishes, schedules, or learns without explicit action.

**Human involvement:** 100%. System never acts without prompt.

---

### Project Mode

The operator defines a bounded content initiative — a product launch, a content series, a seasonal campaign, a multi-week narrative arc — with a defined scope, timeline, and goals. The system executes the project autonomously within those constraints, but does not operate beyond the project boundary.

**Sub-types:**

| Sub-type | Description | Example |
|---|---|---|
| **Content Campaign** | Coordinated multi-platform content around a theme or event | "Black Friday product launch — 3 weeks, 15 pieces, 3 platforms" |
| **Content Series** | Episodic content with consistent format, recurring publishing | "10-part YouTube series on income stacks, 1 video/week" |
| **Launch Sequence** | Time-sensitive content funnel from awareness to conversion | "Course launch: 2-week warm-up → launch day → post-launch follow-up" |

**Systems active:** All systems except autonomous Research Intelligence (research can be manually triggered per project). Strategy Brain generates a project-scoped plan. Content Planning generates the project queue. Creation, Media, Publishing, Analytics, and Learning all run within project scope.

**Operator role:** Define the project parameters. Review content before publishing (configurable). Review results at project completion.

**Human involvement:** Defined at project creation. Default: approve scripts before production, approve media before publishing. Can be set to fully autonomous within project scope.

---

### Autonomous Brand Mode

The operator provides a business brief once. The system operates the brand continuously: researching competitors and audience, maintaining and updating strategy, generating and publishing content on schedule, tracking all performance, learning from results, and improving every output over time. The system runs 24/7. The operator reviews insights and approvals on their own schedule.

**Use case:** A solo operator wants to run a YouTube + TikTok + Instagram brand that generates digital product revenue without daily involvement. They define the brand once. ContentOS runs it.

**Systems active:** All twelve systems, fully autonomous, continuously running.

**Operator role:** Set the brief. Review weekly performance digest. Approve major strategy changes (configurable). Upload new knowledge assets. Manage monetization products. Handle exceptions flagged by the Notification Agent.

**Human involvement:** Configurable from ~2 hours/week (review-only) to zero (full autonomy). Review gates can be inserted at any stage: script approval, media approval, publish approval.

**The compound effect:** the longer Autonomous Brand Mode runs, the smarter it becomes. Research accumulates patterns. Analytics refine strategy. Optimization improves content quality. After 90 days the system knows what works for *this specific audience on this specific niche* better than any human analyst could manually determine.

---

## The Twelve Systems

Each system has a single, precise responsibility. Systems communicate through the database and job queue. No system imports another system directly.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE LAYER                                │
│  Research · Knowledge Acquisition · Knowledge · Channel · Skill     │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│                    CREATION LAYER                                    │
│  Content Planning · Content Creation · Media Production             │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTION LAYER                                │
│  Publishing                                                          │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE LOOP                                 │
│  Analytics · Learning                                               │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│                    REVENUE LAYER                                     │
│  Monetization                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 1. Research Intelligence Engine

**Purpose:** The system's eyes and ears. Continuously collects content from the operator's niche across every major platform and transforms it into structured research data.

**Responsibility:** Ingest → normalize → store. Raw collection only. Does not interpret — interpretation is the Knowledge Engine's job.

**What it collects:** Videos, posts, articles, transcripts, thumbnails, engagement metrics, creator profiles, comment sentiment, trending topics, keyword signals.

**Platforms:** YouTube, TikTok, Instagram, X, Reddit, Google Search, Blogs, Newsletters.

**Collection methods:** YouTube Data API v3, Apify scrapers, X API v2, Firecrawl, SerpAPI.

**Key output:** `research_assets` table rows — normalized, transcribed, scored by virality.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Manual only | Manual + project-scoped | Continuous, scheduled |

---

### 2. Knowledge Acquisition Engine

**Purpose:** Converts operator-owned materials — PDFs, books, guides, SOPs, YouTube videos, prompt libraries, course materials, swipe files — into structured knowledge objects the system can retrieve and act on.

**Responsibility:** Receive source → extract text → chunk → analyze → extract typed knowledge objects → embed → store in Knowledge Engine.

**What it accepts:** PDF, DOCX, TXT, SRT, VTT, YouTube URLs, web articles, Notion exports, Google Docs, ZIP archives, images.

**Extraction output (10 typed knowledge object types):** Framework, Technique, Process, Template, Prompt, Checklist, Formula, Case Study, Pattern, Strategy.

**Knowledge categories (13):** Marketing, Copywriting, Storytelling, Video Production, Cinematography, Thumbnail Design, Sales, Psychology, Business, AI & Automation, Social Media, Content Creation, Industry-Specific.

**Key output:** Populated `knowledge_objects` and `knowledge_chunks` tables with embeddings.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Manual upload | Manual upload | Manual upload (always operator-initiated) |

> The Knowledge Acquisition Engine is always operator-initiated regardless of mode. The operator decides what knowledge to add. The system decides how to use it.

---

### 3. Knowledge Engine

**Purpose:** The system's long-term memory. Stores all structured knowledge — from operator uploads (via Knowledge Acquisition Engine) and from research analysis (via Research Intelligence + Channel Intelligence) — and makes it retrievable via semantic search for every agent.

**Responsibility:** Store, index, deduplicate, maintain, and serve knowledge. Power the RAG (Retrieval-Augmented Generation) layer that every agent uses before generating content.

**What it stores:**
- Knowledge objects extracted from operator materials (§ KAE)
- Hooks, patterns, CTAs, audience insights, niche intelligence from Research Intelligence
- Channel playbooks and DNA from Channel Intelligence Engine
- Skill manifests and prompt templates from Skill Intelligence Engine

**Core capability:** Semantic search over all knowledge via pgvector embeddings. Any agent can query: "find me the best hooks for financial freedom content targeting young men" and receive ranked, relevant results from everything the system has learned.

**Key tables:** `knowledge_objects`, `knowledge_chunks`, `hooks`, `content_patterns`, `ctas`, `audience_insights`, `niche_intelligence`.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Manual query | Injected into creation | Auto-injected into all agent calls |

---

### 4. Channel Intelligence Engine

**Purpose:** Reverse-engineers successful channels into reusable blueprints, playbooks, and formulas. Transforms competitive intelligence into directly applicable strategy and creative assets.

**Responsibility:** Analyze channels → extract DNA → generate playbooks → enable Version Builder transformations.

**Analysis dimensions (10):** Content pillars, posting patterns, format/length distribution, title structure formulas, hook structure formulas, storytelling patterns, thumbnail style (via Vision AI), monetization signals, audience targeting, engagement velocity.

**Four DNA blueprints per channel:** Channel Blueprint (identity, positioning, moat), Content Blueprint (pillars, mix, cadence), Monetization Blueprint (revenue streams, funnel, thresholds), Growth Blueprint (mechanism, SEO, virality, inflection point).

**Five playbook types:** Title formulas, Hook formulas, CTA formulas, Thumbnail formulas (with ready image-generation prompts), Content Structure formulas.

**Version Builder (7 types):** Similar, Improved, Niche Transfer, Audience Transfer, Platform Transfer, Style Transfer, Hybrid. Enables: "Turn this finance channel into a business channel," "Turn this YouTube strategy into a TikTok strategy."

**Key output:** `channel_analyses`, `channel_blueprints`, `channel_playbooks`, `channel_versions` tables.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Manual analysis | Manual + project scope | Continuous competitor monitoring |

---

### 5. Skill Intelligence Engine

**Purpose:** Converts GitHub repositories, documents, workflows, automations, and prompt libraries into registered, callable, versioned AI skills that agents can invoke at runtime.

**Responsibility:** Import source → extract skill manifest → validate interface → register → track performance → version.

**The key distinction:** The Knowledge Engine stores what the system *knows*. The Skill Engine stores what the system *can do*.

**Supported sources:** GitHub repositories (SKILL.md / plugin.json / README-based extraction), PDFs (process chunks → workflow skills), YouTube tutorials (demonstrated process → skill), Prompt libraries (typed prompt skills), Notion/Google Docs (SOP → workflow skill).

**Skill types (6):** Tool (single API/CLI call), Workflow (multi-step process), Prompt Chain (LLM sequence → structured output), Agent Loop (iterative agentic reasoning), Transformation (deterministic conversion), Integration (external service lifecycle).

**Registered first:** `video-analysis` skill from `github.com/bradautomates/claude-video` — lets any agent watch any video URL, extract frames + transcript, analyze hook/CTA/storytelling structure.

**Key output:** `skill_manifests`, `skill_versions`, `skill_invocations` tables.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Manual skill invocation | Agents use skill set | All agents invoke skills continuously |

---

### 6. Content Planning Engine

**Purpose:** Translates strategy (what to make) + intelligence (what performs) into a concrete, prioritized, scheduled content queue.

**Responsibility:** Run daily. Evaluate the rolling 14-day calendar. Score content opportunities. Enforce the content mix. Optimize publish timing. Fill the queue. Trigger the Content Creation Engine.

**Opportunity scoring formula:**
```
score = (niche_gap × 0.25) + (audience_resonance × 0.25)
      + (platform_trend × 0.20) + (pillar_balance × 0.15)
      + (funnel_position × 0.15)
```

**Content mix enforcement (default):**
```
Educational:   40%   ("how to" / teach / explain)
Inspirational: 25%   (transformation / motivation / wins)
Entertaining:  20%   (humor / relatable / reaction)
Promotional:   15%   (product-adjacent / soft sell)
```

**Platform adaptation:** Each queued idea is adapted per platform — format, duration, caption style, publish window — before entering the creation queue.

**Key output:** `content_queue` rows with full `content_spec` (title formula, hook type, format, platforms, predicted performance, publish window).

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Not used | Project-scoped queue | Continuous daily operation |

---

### 7. Content Creation Engine

**Purpose:** Takes a `content_spec` and produces the complete creative package — script, captions, hashtags, image prompts, voice instructions, asset specs — grounded in Knowledge Engine retrieval.

**Responsibility:** Every generation call is RAG-augmented. The engine retrieves relevant hooks, frameworks, audience insights, and channel playbooks from the Knowledge Engine *before* calling any AI model.

**Creation pipeline:**
```
content_spec
  → Knowledge Engine retrieval (hooks + patterns + audience insights)
  → Writing Agent: Kimi/GPT-4o generates structured script JSON
  → Script Critic: second-pass AI quality review
  → Asset Spec Generator: image prompts + voice instructions per scene
  → Caption Writer: platform-specific captions + hashtags
  → content_draft saved → triggers Media Production Engine
```

**Provider abstraction:** All AI calls go through provider interfaces. Swapping Kimi for GPT-4o or Gemini touches one config line, not the engine.

**Human review gates (configurable):**
```
require_script_approval:   true | false   (default: false in Autonomous Mode)
require_media_approval:    true | false   (default: false in Autonomous Mode)
require_publish_approval:  true | false   (default: false in Autonomous Mode)
```

**Key output:** `content_drafts` table rows with full script JSON, asset specs, platform captions.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| On demand | Executes project queue | Executes daily content queue |

---

### 8. Media Production Engine

**Purpose:** Takes a content draft with asset specs and produces all publish-ready media: images, video clips, voiceover audio, background music, assembled final video, thumbnail.

**Responsibility:** Dispatch parallel jobs → assemble with FFmpeg → upload to persistent storage → return final video URL.

**Production pipeline:**
```
content_draft (script_approved)
  ↓                    ↓
[Image Jobs]      [Voice Job]        ← parallel
  ↓                    ↓
[Video Generation (Wan 2.7)]
  ↓
[Music Generation]
  ↓
[FFmpeg Assembly: clips + voice + music + captions → final.mp4]
  ↓
[Thumbnail Generation (FLUX Pro)]
  ↓
[Upload all assets → Vercel Blob (persistent CDN URLs)]
  ↓
content_draft.status = "publish_ready"
```

**Provider abstraction layer (image/video/voice/music):** FLUX Pro/Dev, Runware, Wan 2.7, Kling, Qwen-3-TTS, Kokoro, ElevenLabs, Pixabay — all behind typed interfaces. Operators configure preferred providers per capability.

**Key output:** Final `output.mp4` at persistent Vercel Blob URL. All intermediate assets (scene images, voice audio, music, thumbnail) also stored.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| On demand (manual trigger) | Executes automatically | Executes automatically |

---

### 9. Publishing Engine

**Purpose:** Distributes publish-ready content across configured platforms, on schedule, with platform-specific adaptations, tracking every publish event.

**Responsibility:** Adapt → schedule via Postiz → dispatch on time → record result → trigger analytics collection.

**Platform adapters (6):** YouTube (full metadata, chapters, end screens), TikTok (sounds, product links, hashtags), Instagram (Reels/Feed/Stories routing, product tags), Facebook (page/group), X (thread splitting for long-form), LinkedIn (professional register filter).

**Publishing backbone:** Postiz (self-hosted, Railway) as the scheduling and dispatch layer. Direct platform API connections handle capabilities Postiz doesn't cover.

**Publish timing optimization:** Best publish windows calculated from workspace's own historical analytics + platform general signals. Cross-platform stagger: 2-4 hours between platforms to avoid simultaneous publish diluting each platform's algorithm signal.

**Key output:** `video_posts` rows with `platform_url`, `postiz_post_id`, `published_at`.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Manual trigger | Auto on project schedule | Fully automated |

---

### 10. Analytics Engine

**Purpose:** Collects, stores, and aggregates performance data for every published piece of content on every platform.

**Responsibility:** Collect at 1h / 24h / 7d / 30d intervals. Store structured analytics events. Provide ground truth to the Learning Engine and operator dashboard.

**Data collected:** Views, unique viewers, likes, comments, shares, saves, watch time, avg view duration, retention curve (YouTube), thumbnail CTR, reach, impressions, follower gain, profile visits, attributed revenue.

**Collection methods:** Postiz analytics (aggregate), YouTube Data API (watch time, retention, CTR), TikTok Business API (completion rate, follower gain), Instagram Graph API (reach, saves).

**Revenue attribution:** UTM-tagged content links → checkout webhook (Stripe/Gumroad) → sale attributed to `content_draft_id`. Correlation model as fallback.

**Key output:** `analytics_events` and `channel_snapshots` tables. Feeds directly into Learning Engine and Strategy Brain health scoring.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Not used | Project analytics | Continuous, per-post tracking |

---

### 11. Learning Engine

**Purpose:** Closes the feedback loop. Analyzes performance data, identifies what works and what doesn't, updates the Knowledge Engine, and feeds improvements back to the Strategy Brain and Content Planning Engine.

**Responsibility:** Compare predicted vs actual → classify winners/losers → extract patterns → update KB weights → write strategy insights → adjust planning weights.

**The learning cycle (runs weekly, Sunday night):**
```
Analytics data (last 30 days)
  ↓
Performance Scorer: actual vs predicted delta per content piece
  ↓
Winner/Loser Classifier: top 20% = winners, bottom 20% = losers
  ↓
Pattern Extraction: "videos with curiosity-gap hooks in week 1-3 outperform by 3.2×"
  ↓
Knowledge Engine update: promote winning hooks, demote losing ones, add new patterns
  ↓
Strategy Insight Writer: "Shift pillar 3 from 25% to 35% of output"
  ↓
Planning Engine weight update: adjust opportunity scores based on real performance
```

**The compound effect:**
- Month 1: general knowledge baseline
- Month 3: niche-specific patterns detected, hook/topic mix refined
- Month 6: deep personalization — system knows this exact audience
- Month 12: the system's output quality is demonstrably better than month 1, measurable

**Key output:** Updated `knowledge_objects` weights, `strategy_insights` rows, `content_plans` weight adjustments.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Not used | End-of-project analysis | Continuous weekly optimization |

---

### 12. Monetization Engine

**Purpose:** Tracks and optimizes the path from content view to revenue. Manages products, tracks attribution, and recommends the highest-leverage monetization actions.

**Responsibility:** Maintain product catalog → track sales via webhooks → attribute revenue to content → surface revenue intelligence → recommend product opportunities.

**Supported revenue types:** Digital products (courses, guides, templates), Affiliate products, Memberships, Sponsorships, Consulting, E-commerce.

**Attribution methods (priority order):**
1. UTM parameter matching (content draft ID in campaign parameter → webhook sale event)
2. Platform-native conversion (TikTok Shop, YouTube Shopping, Instagram Collab)
3. Statistical correlation (publish timestamp vs revenue spike — directional only)

**Revenue intelligence:** Which content type drives the most sales? Which platform converts best? What is the content-to-sale lag? Which funnel stage content closes more deals? What product should be created next?

**Key output:** `sales` rows with attribution, `affiliate_links` conversion tracking, monthly revenue reports, product recommendations.

**Mode availability:**

| Creator | Project | Autonomous Brand |
|:---:|:---:|:---:|
| Manual tracking only | Project revenue tracking | Continuous attribution + optimization |

---

## System Interaction Architecture

```
OPERATOR INPUT (brief / upload / trigger)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          INTELLIGENCE LAYER                              │
│                                                                         │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐ │
│  │ 1. RESEARCH     │    │ 2. KNOWLEDGE     │    │ 4. CHANNEL         │ │
│  │ INTELLIGENCE    │───▶│ ACQUISITION      │    │ INTELLIGENCE       │ │
│  │ ENGINE          │    │ ENGINE           │    │ ENGINE             │ │
│  │                 │    │                  │    │                    │ │
│  │ Scrape → norm  │    │ Upload → extract │    │ Analyze → DNA     │ │
│  │ → transcribe   │    │ → chunk → embed  │    │ → playbooks        │ │
│  │ → store        │    │ → store          │    │ → versions         │ │
│  └────────┬────────┘    └────────┬─────────┘    └────────┬───────────┘ │
│           │                      │                        │             │
│           └──────────────┬───────┘                        │             │
│                          ▼                                ▼             │
│                ┌────────────────────┐          ┌─────────────────────┐ │
│                │ 3. KNOWLEDGE       │◀─────────│ 5. SKILL            │ │
│                │ ENGINE             │          │ INTELLIGENCE        │ │
│                │                   │          │ ENGINE              │ │
│                │ Hooks · Patterns  │          │                     │ │
│                │ CTAs · Insights   │          │ Skills · Tools      │ │
│                │ pgvector / RAG    │          │ Workflows · Prompts │ │
│                └────────┬──────────┘          └────────┬────────────┘ │
│                         │                               │              │
└─────────────────────────┼───────────────────────────────┼──────────────┘
                          │ (KB retrieval on every call)  │ (skill invocation)
                          ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CREATION LAYER                                  │
│                                                                         │
│  ┌──────────────────┐   ┌──────────────────┐   ┌────────────────────┐ │
│  │ 6. CONTENT       │──▶│ 7. CONTENT       │──▶│ 8. MEDIA           │ │
│  │ PLANNING ENGINE  │   │ CREATION ENGINE  │   │ PRODUCTION ENGINE  │ │
│  │                  │   │                  │   │                    │ │
│  │ Score → queue   │   │ RAG-grounded     │   │ Images + Voice     │ │
│  │ mix enforce     │   │ script gen       │   │ + Video + Music    │ │
│  │ timing optimize │   │ critic pass      │   │ + FFmpeg → MP4     │ │
│  └──────────────────┘   └──────────────────┘   └────────┬───────────┘ │
│                                                          │              │
└──────────────────────────────────────────────────────────┼──────────────┘
                                                           │ publish_ready
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DISTRIBUTION LAYER                              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 9. PUBLISHING ENGINE                                              │  │
│  │ Platform adapters → Postiz → YouTube / TikTok / Instagram / X   │  │
│  └────────────────────────────────────────────┬─────────────────────┘  │
│                                               │                         │
└───────────────────────────────────────────────┼─────────────────────────┘
                                                │ analytics trigger
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          INTELLIGENCE LOOP                               │
│                                                                         │
│  ┌───────────────────┐              ┌──────────────────────────────┐   │
│  │ 10. ANALYTICS     │─────────────▶│ 11. LEARNING ENGINE          │   │
│  │ ENGINE            │              │                              │   │
│  │                   │              │ Pattern extract → KB update  │   │
│  │ 1h/24h/7d/30d    │              │ → strategy insights          │   │
│  │ per post         │              │ → planning weights           │   │
│  │ + revenue attr.   │              │                              │   │
│  └───────────────────┘              └──────────┬───────────────────┘   │
│                                                │                        │
│                                                └──▶ feeds back into     │
│                                                    Strategic Brain      │
│                                                    + Planning Engine    │
└─────────────────────────────────────────────────────────────────────────┘
                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          REVENUE LAYER                                   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 12. MONETIZATION ENGINE                                           │  │
│  │ Products → Attribution (UTM + webhooks) → Revenue intelligence   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Architecture

Eleven specialized agents execute the twelve systems. Each agent has a narrow responsibility, communicates through the database, and invokes capabilities through the Skill Library.

| Agent | Drives System(s) | Mode |
|---|---|---|
| **Strategy Agent** | Strategic Brain (planning) | Project, Autonomous |
| **Research Agent** | Research Intelligence Engine | All (manual/auto) |
| **Analysis Agent** | Knowledge Acquisition → Knowledge Engine (analysis pass) | All |
| **Planning Agent** | Content Planning Engine | Project, Autonomous |
| **Writing Agent** | Content Creation Engine | All |
| **Media Agent** | Media Production Engine | All |
| **Publishing Agent** | Publishing Engine | All |
| **Analytics Agent** | Analytics Engine | Project, Autonomous |
| **Optimization Agent** | Learning Engine | Project (end), Autonomous (weekly) |
| **Monetization Agent** | Monetization Engine | All |
| **Notification Agent** | Operator alerts | All |

**Agent principles:**
- Every agent communicates via database rows and job queues. No agent calls another agent's code directly.
- Every agent invokes capabilities through the Skill Library. Skills are versioned, tracked, and swappable.
- Every agent's generation calls are RAG-augmented by Knowledge Engine retrieval before any AI call.
- Agents do not have memory across invocations. State lives in the database.

---

## Data Architecture

### Canonical Data Layers

```
WORKSPACE
  │
  ├── STRATEGY (12mo plan, 90d roadmap, sprint plans, pillars)
  │
  ├── CHANNELS (platform connections, Postiz IDs, follower snapshots)
  │
  ├── CONTENT LIFECYCLE
  │     content_queue → content_drafts → video_posts → analytics_events
  │
  ├── INTELLIGENCE
  │     research_assets · competitor_profiles
  │     knowledge_objects · knowledge_chunks
  │     channel_analyses · channel_playbooks · channel_versions
  │     skill_manifests · skill_invocations
  │     hooks · content_patterns · ctas · audience_insights
  │
  ├── MEDIA
  │     media_jobs (status tracking per asset)
  │     [assets in Vercel Blob at blob://contentos/{workspace_id}/]
  │
  └── REVENUE
        products · sales · affiliate_links · sponsorships
```

### Storage Allocation

| Data Type | Storage | Why |
|---|---|---|
| Structured data | Supabase PostgreSQL | Relational integrity, RLS per workspace |
| Vector embeddings | Supabase pgvector | Co-located with data, semantic search |
| Generated assets | Vercel Blob | CDN-served, persistent, not ephemeral |
| Raw source files | Supabase Storage | Long-term file storage (transcripts, documents) |
| Auth & sessions | Supabase Auth | Email/password + RLS enforcement |

### Embedding Model

**Primary:** OpenAI `text-embedding-3-small` (1536 dimensions)  
**Dimension:** 1536 vectors throughout — all KB, research, channel, and skill embeddings use the same dimension so cross-table similarity queries are valid.

---

## Infrastructure Principles

### Provider Abstraction (non-negotiable)

Every AI capability is accessed through a typed interface, never a direct client call from business logic:

```typescript
interface TextProvider    { generate(prompt, opts): Promise<string> }
interface ImageProvider   { generate(prompt, opts): Promise<{url}> }
interface VideoProvider   { generate(images, prompt, opts): Promise<{url}> }
interface VoiceProvider   { synthesize(text, opts): Promise<{audio_url}> }
interface MusicProvider   { generate(prompt, opts): Promise<{audio_url}> }
```

**Why:** Any provider can be swapped, A/B tested, or removed without touching business logic. Cost optimization happens at the provider layer. New providers are registered in one place.

**Current providers:**

| Interface | Primary | Fallback |
|---|---|---|
| Text | Kimi k2.7 (Moonshot) | GPT-4o, Gemini 2.5 Pro |
| Image | FLUX Pro (fal.ai) | Runware SDXL |
| Video | Wan 2.7 (fal.ai) | Kling 2.0 |
| Voice | Qwen-3-TTS (fal.ai) | Kokoro v1 (local) |
| Music | ElevenLabs Music | Pixabay (free) |

### Single Key Principle

`FAL_AI_API_KEY` unlocks images (FLUX), video (Wan 2.7, Kling), and voice (Qwen-3-TTS) through one gateway. Minimize account sprawl. See full env var manifest in `AUTONOMOUS_CONTENT_OS_VISION.md § 13`.

### No Keys in Browser (non-negotiable)

All third-party API calls happen server-side through `/api/*` Vercel functions. The browser never receives any API key under any circumstances, including fal.ai, Kimi, Postiz, or Supabase service role.

The only client-side credentials are:
- `VITE_SUPABASE_URL` — the project URL (public by design)
- `VITE_SUPABASE_ANON_KEY` — the anon key (public, RLS-gated)

### Job Queue for Long-Running Work (non-negotiable)

Media generation, FFmpeg assembly, transcript processing, and deep research scans cannot run in a 30-second serverless function. These must use **Vercel Queues** with dedicated worker handlers.

Never attempt to run media generation synchronously in a request handler.

### Data Isolation (non-negotiable)

Every database table that contains workspace data has:
```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_owner" ON {table}
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );
```

No workspace can access another workspace's data. The Supabase service role key (which bypasses RLS) is used only in server-side cron jobs, never exposed to any user context.

### Cron Schedule

```
*/5  * * * *   → Publishing: check due scheduled posts
0    6 * * *   → Planning: fill next 3 days of content queue
0  */6 * * *   → Research: scan competitor + niche (Autonomous Mode)
0  */4 * * *   → Analytics: collect performance data for due posts
0    0 * * *   → Snapshots: daily channel subscriber/view snapshots
0   22 * * 0   → Learning: weekly optimization pass (Sunday 10PM)
0    9 1 * *   → Strategy: monthly strategy health review
```

---

## Mode × System Matrix

Which systems run in which modes:

| System | Creator | Project | Autonomous |
|---|:---:|:---:|:---:|
| Research Intelligence Engine | Manual | Manual | **Continuous** |
| Knowledge Acquisition Engine | Manual | Manual | Manual |
| Knowledge Engine | Query | Auto-inject | **Auto-inject** |
| Channel Intelligence Engine | Manual | Manual | **Continuous** |
| Skill Intelligence Engine | Manual | Auto | **Auto** |
| Content Planning Engine | — | **Active** | **Active** |
| Content Creation Engine | Manual | **Auto** | **Auto** |
| Media Production Engine | Manual | **Auto** | **Auto** |
| Publishing Engine | Manual | **Auto** | **Auto** |
| Analytics Engine | — | **Active** | **Active** |
| Learning Engine | — | End-of-project | **Weekly** |
| Monetization Engine | Manual | **Active** | **Active** |

---

## Phased Delivery

The twelve systems are built in four phases. Phases are sequential. A later phase cannot begin until the prior phase is stable.

### Phase 0 — Activate What Exists (1 week)

The current codebase has a functional dashboard, Kimi AI generation, Supabase schema, Postiz integration, and Supabase Auth scaffold — all either inactive or in localStorage mode. Phase 0 activates everything already built.

**Deliverables:**
- Supabase project created + schema deployed + RLS active
- Auth gate live (email/password login enforced)
- Postiz deployed on Railway + social accounts connected
- `FAL_AI_API_KEY` set → real FLUX images + Qwen-TTS voice
- Cron rewritten to use Postiz (not dead direct connectors)
- Vercel Blob added for asset persistence
- Leaked `KIMI_API_KEY` rotated
- `App.jsx` split into per-view files (velocity prerequisite)

**Exit criteria:** A user can sign up, connect social channels, generate a script, produce real media, and publish it. Data persists in cloud. Login works.

---

### Phase 1 — Intelligence Foundation (4 weeks)

Build the systems that make every future output better. Research Intelligence + Knowledge Acquisition + Knowledge Engine + Channel Intelligence must exist before Phase 2, because Phase 2's creation quality depends entirely on what the knowledge layer contains.

**Deliverables:**
- Research Intelligence Engine: YouTube + TikTok + Instagram ingestion, Whisper transcription
- Knowledge Acquisition Engine: PDF/DOCX/URL/YouTube upload → 10-type extraction → embedding
- Knowledge Engine: pgvector activated, semantic search functions, retrieval API
- Channel Intelligence Engine: channel analysis (10 dimensions), DNA extraction, playbook generation
- Research + Knowledge Library UI views
- Writing Agent RAG-augmented: scripts now generated with KB context injected
- Media Agent KALS-enriched: FLUX prompts enriched with cinematography knowledge objects

**Exit criteria:** Upload a marketing book, get frameworks extracted. Add a competitor channel, get their playbook. Generate a script, verify it's grounded in extracted hooks. Media generation prompts contain enriched vocabulary.

---

### Phase 2 — Autonomous Creation Pipeline (5 weeks)

Build the systems that autonomously create and distribute content. By the end of Phase 2, the platform can operate in Autonomous Brand Mode end-to-end: idea → script → media → publish.

**Deliverables:**
- Content Planning Engine: daily queue, opportunity scoring, mix enforcement, timing optimization
- Content Creation Engine: full RAG-grounded pipeline, Script Critic, Asset Spec Generator, review gates
- Media Production Engine: parallel image/voice jobs, Wan 2.7 video, FFmpeg assembly to MP4, Vercel Blob
- Publishing Engine: full platform adapters (YT/TikTok/IG/FB/X), Postiz scheduling, `*/5` cron
- Skill Intelligence Engine: registry, GitHub import, `video-analysis` skill registered + wired
- Autonomous Brand Mode: end-to-end operational for a workspace with brief set
- Project Mode: campaign, series, and launch sequence project types

**Exit criteria:** Create a workspace with a brief. Flip to Autonomous Brand Mode. Wait 24 hours. Verify: content was planned, script was generated with KB context, media was produced (MP4), video was published to at least one platform.

---

### Phase 3 — Intelligence Loop (4 weeks)

Close the feedback loop. Without Phase 3, the system generates and distributes but never learns. Phase 3 makes it self-improving.

**Deliverables:**
- Analytics Engine: 1h/24h/7d/30d collection, per-post performance data, channel snapshots
- Revenue attribution: UTM tracking, Stripe + Gumroad webhooks, `sales` table population
- Learning Engine: performance scorer, winner/loser classifier, pattern extraction, KB weight updates
- Strategy insights: recommendations surfaced to operator dashboard
- Growth forecasting: predicted vs actual trajectory comparison
- Performance dashboard: real data across all metrics (no fabricated change badges)
- Skill performance tracking: per-skill invocation cost, success rate, quality scores

**Exit criteria:** After 30 days of operation, the system can demonstrate: (a) knowledge base weights have shifted based on real performance, (b) at least one strategy insight has been generated and applied, (c) revenue has been attributed to specific content pieces, (d) the planning engine scores are influenced by analytics data.

---

### Phase 4 — Scale (ongoing)

Platform maturity, multi-brand operation, and advanced capabilities that build on the stable foundation.

**Key deliverables:**
- Multi-workspace: operator runs N brands simultaneously from one dashboard
- Cross-workspace learning: patterns discovered in brand A available (opt-in) to brand B
- Platform expansion: LinkedIn, Pinterest, newsletter (Beehiiv/ConvertKit), podcast RSS
- Advanced AI: fine-tuned Writing Agent, predictive virality scoring, A/B hook testing
- Monetization expansion: Sponsorship CRM, membership integrations, course platform webhooks
- Infrastructure maturity: CI/CD pipeline, observability, cost dashboards, SLA monitoring
- Skill Marketplace: community-built skills, browse/import/rate

---

## Decision Framework

When evaluating any proposed feature, change, or architectural decision, apply these tests in order:

**1. Mode alignment** — Does it serve Creator Mode, Project Mode, Autonomous Brand Mode, or all three? If it serves none, it doesn't belong.

**2. System boundary** — Which of the twelve systems owns this capability? If it spans more than two systems, the design is wrong — break it down.

**3. Intelligence first** — Does this make the system smarter over time? A feature that generates output is worth less than a feature that generates output *and* learns from whether it worked.

**4. Provider agnosticism** — Does this implementation assume a specific AI provider, social platform, or infrastructure vendor? If yes, put it behind an interface.

**5. Phase appropriateness** — Is this Phase 1 work being proposed in Phase 3? Phase ordering exists because later phases depend on earlier ones being stable. Don't skip.

**6. Operator autonomy** — Does this increase or decrease the operator's ability to reduce their involvement? Features that require more operator input are lower priority than features that run autonomously.

---

## Document Hierarchy

```
MASTER_VISION.md                          ← this document (source of truth)
   │
   ├── AUTONOMOUS_CONTENT_OS_VISION.md   ← full technical specification
   │      Sections 1-15: core systems
   │      Section 16: Knowledge Acquisition Engine (KALS)
   │      Section 17: Channel Intelligence Engine (CIE)
   │      Section 18: Skill Intelligence Engine (SIE)
   │
   ├── SYSTEM_AUDIT.md                   ← current state vs vision gap analysis
   │
   ├── CONTENTOS_STATUS.md               ← deployment status (Phase 0 tracker)
   │
   └── CONTENTOS_TASKS.md                ← task list (Phase 0 activation)
```

**Resolution hierarchy when documents conflict:**
1. `MASTER_VISION.md` (this document) — always wins on direction and principles
2. `AUTONOMOUS_CONTENT_OS_VISION.md` — wins on technical specification details
3. `SYSTEM_AUDIT.md` — wins on current reality / what actually exists today
4. `CONTENTOS_STATUS.md` / `CONTENTOS_TASKS.md` — wins on immediate next actions

---

## Current State vs Vision (Phase 0 Baseline)

| Capability | Today | Vision |
|---|---|---|
| Data persistence | localStorage | Supabase PostgreSQL + RLS |
| Authentication | None (dormant) | Email/password, per-user data isolation |
| AI text generation | Kimi k2.7 (live) | Kimi + GPT-4o + Gemini (provider abstraction) |
| AI media generation | fal.ai (unsecured) | Server-side routes + Vercel Blob storage |
| Social publishing | Postiz (not deployed) | Postiz + platform adapters |
| Cron publishing | Broken (dead manager) | PostizClient, every 5 min |
| Research | None | 6-platform continuous ingestion |
| Knowledge Base | None | pgvector RAG, 10 object types, 13 categories |
| Channel Intelligence | None | 10-dimension analysis, DNA, playbooks, Version Builder |
| Skill Library | None | 18 built-in + GitHub import + video-analysis registered |
| Content Planning | Manual | Daily queue, opportunity scoring, mix enforcement |
| Media production | HTML compositions | MP4: FLUX + Wan 2.7 + FFmpeg assembly |
| Analytics | Demo/mock | Real per-post tracking, revenue attribution |
| Learning | None | Weekly optimization loop, KB weight updates |
| Monetization | Manual entry | Attribution from content → webhook → revenue |
| Operating modes | None (single dashboard) | Creator / Project / Autonomous Brand |

---

*ContentOS. One brief. An entire content business.*
