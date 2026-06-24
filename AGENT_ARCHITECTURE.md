# ContentOS — Agent Architecture
**Authority:** MASTER_VISION.md → this document → individual agent implementations.
**Updated:** 2026-06-23

---

## Principles

1. **No direct agent-to-agent calls.** Agents communicate through the database job queue only. Agent A enqueues a job; Agent B picks it up.
2. **Every agent call is preceded by a RAG retrieval.** Agents always query the Knowledge Engine before calling any AI model.
3. **Every agent run is logged.** `agent_runs`, `agent_messages`, `agent_tools` — full audit trail.
4. **Agents are stateless.** They read context from the DB, act, write results to the DB, and exit.
5. **Provider abstraction.** Agents never call AI providers directly — they use TextProvider, ImageProvider, VideoProvider, VoiceProvider.

---

## The Eleven Agents

### 1. Strategy Agent
**Trigger:** New workspace created, weekly refresh, operator request.
**Reads:** workspace_config, strategies, knowledge_objects (frameworks/strategies type), channel_analyses, learning_insights.
**Writes:** strategies (upsert), agent_runs.
**Tools:** TextProvider (Kimi), match_knowledge_objects, match_channel_playbooks.
**Output:** Updated brand strategy (content pillars, posting schedule, product strategy, viral hooks).

```javascript
// api/agents/strategy.js
// Input: { workspace_id, trigger: 'init'|'refresh'|'learning_update' }
// Output: { strategy_id, changes: [...], confidence: 0-1 }
```

---

### 2. Research Agent
**Trigger:** Weekly cron (Autonomous Brand Mode), operator request (all modes), new competitor URL added.
**Reads:** research_queries, market_signals, competitor_analyses.
**Writes:** research_results, market_signals, research_queries (mark complete).
**Tools:** Web scraping, YouTube oEmbed/Data API, yt-dlp transcript, TextProvider (analysis).
**Output:** Structured research results with opportunity scores.

```javascript
// api/agents/research.js
// Input: { workspace_id, query_type: 'competitors'|'trends'|'niche'|'audience', target_urls?: [] }
// Output: { results: [...], market_signals: [...], opportunities: [...] }
```

---

### 3. Analysis Agent
**Trigger:** After Research Agent completes, after new analytics data arrives.
**Reads:** research_results, post_analytics, competitor_analyses, platform_snapshots.
**Writes:** competitor_analyses, channel_analyses, learning_insights.
**Tools:** TextProvider (analysis + pattern extraction), match_knowledge_objects.
**Output:** Competitor DNA blueprints, performance patterns, actionable insights.

```javascript
// api/agents/analysis.js
// Input: { workspace_id, analysis_type: 'competitor'|'performance'|'opportunity' }
// Output: { insights: [...], patterns: [...], recommendations: [...] }
```

---

### 4. Planning Agent
**Trigger:** Strategy update, campaign creation, weekly calendar refresh.
**Reads:** strategies, campaigns, content_calendar, learning_insights, channel_playbooks.
**Writes:** content_calendar, campaigns (update), videos (create stubs).
**Tools:** TextProvider (planning), opportunity scorer, match_knowledge_chunks.
**Output:** 30-day content calendar with scored, prioritized video stubs.

```javascript
// api/agents/planning.js
// Input: { workspace_id, horizon_days: 30, campaign_id?: string }
// Output: { calendar_items: [...], videos_created: number }
```

**Opportunity Scoring Formula:**
```
score = (niche_gap × 0.25) + (audience_resonance × 0.25) +
        (platform_trend × 0.20) + (pillar_balance × 0.15) +
        (funnel_position × 0.15)
```

**Content Mix Target:**
- Educational: 40%
- Inspirational: 25%
- Entertaining: 20%
- Promotional: 15%

---

### 5. Writing Agent
**Trigger:** Video stub in `draft` status, operator request.
**Reads:** videos (stub), strategies, knowledge_chunks (RAG), channel_playbooks.
**Writes:** videos (script, hook, CTA populated).
**Tools:** TextProvider (Kimi), match_knowledge_chunks (RAG), match_channel_playbooks.
**Output:** Full video script (hook + body + CTA), alt hooks, thumbnail concepts.

```javascript
// api/agents/writing.js
// Input: { workspace_id, video_id }
// Output: { script: { hook, body, cta, duration }, alt_hooks: [], thumbnail_concepts: [] }
```

**Script Structure:**
```
hook (0-5s): Pattern-interrupt opening
problem (5-20s): Audience pain statement
solution (20-50s): Core value delivery
proof (50-80s): Evidence / story
cta (80-90s): Single clear next action
```

---

### 6. Media Agent
**Trigger:** Video with complete script, operator request.
**Reads:** videos (script), workspace_config (style prefs), skill_manifests (image/video skills).
**Writes:** videos (image_urls, video_url, audio_url, composition_path), jobs (FFmpeg assembly).
**Tools:** ImageProvider (FLUX), VideoProvider (Wan 2.7), VoiceProvider (Qwen-TTS), FFmpeg assembly.
**Output:** Assembled MP4 URL (Vercel Blob), thumbnail URL.

```javascript
// api/agents/media.js
// Input: { workspace_id, video_id, style?: { character_refs: [], voice_id: string } }
// Output: { video_url: string, thumbnail_url: string, audio_url: string }
```

**Production Pipeline:**
```
Script → scene breakdown (Writing Agent output)
  → FLUX scene images (1-3 per segment)
  → Wan 2.7 motion (image → 5s clips)
  → Qwen-TTS narration
  → FFmpeg: clips + narration + music → MP4
  → Caption burn-in
  → Upload to Vercel Blob
```

---

### 7. Publishing Agent
**Trigger:** Video in `ready` status + scheduled_time reached, operator publish request.
**Reads:** videos (video_url, thumbnail_url, scheduled_time, target_platforms), channels.
**Writes:** video_posts, videos (status → published|failed, published_at).
**Tools:** PostizClient (multi-platform posting).
**Output:** Per-platform post IDs, delivery status.

```javascript
// api/agents/publishing.js
// Input: { workspace_id, video_id }
// Output: { posts: [{ platform, post_id, url, status }] }
```

---

### 8. Analytics Agent
**Trigger:** Daily cron (all active workspaces), operator request.
**Reads:** video_posts (post_ids), channels (platform credentials).
**Writes:** post_analytics, platform_snapshots.
**Tools:** Platform APIs (read-only: views, likes, comments, shares, saves, reach).
**Output:** Updated analytics records for all published posts in last 30 days.

```javascript
// api/agents/analytics.js
// Input: { workspace_id, lookback_days: 30 }
// Output: { updated_posts: number, new_snapshots: number }
```

---

### 9. Optimization Agent
**Trigger:** Weekly (Sunday 10PM UTC) in Autonomous Brand Mode, operator request.
**Reads:** post_analytics, platform_snapshots, strategies, learning_insights.
**Writes:** learning_insights, strategies (weight adjustments), knowledge_objects (new patterns).
**Tools:** TextProvider (pattern analysis), performance scorer.
**Output:** Learning insights, strategy weight updates, content recommendations.

```javascript
// api/agents/optimization.js
// Input: { workspace_id }
// Output: { insights: [...], strategy_updates: {...}, patterns_learned: number }
```

**Learning Loop:**
```
1. Fetch all posts from last 7 days
2. Score performance (views, engagement rate, completion rate)
3. Classify winners (top 20%) and losers (bottom 20%)
4. Extract patterns from winners (hook type, length, format, topic)
5. Update knowledge_objects with new patterns
6. Update strategy weights based on patterns
7. Generate learning_insights for operator review
```

---

### 10. Monetization Agent
**Trigger:** Monthly (1st of month), revenue milestone, operator request.
**Reads:** revenue_events, post_analytics, strategies (product_strategy), learning_insights.
**Writes:** strategies (product_strategy updates), agent_messages (recommendations).
**Tools:** TextProvider (monetization analysis), revenue attribution.
**Output:** Revenue analysis, product recommendations, funnel optimization suggestions.

```javascript
// api/agents/monetization.js
// Input: { workspace_id }
// Output: { revenue_analysis: {...}, recommendations: [...], funnel_score: 0-100 }
```

---

### 11. Notification Agent
**Trigger:** Any agent produces a result requiring human review, anomaly detected.
**Reads:** agent_runs (status=needs_review), workspace_config (notification_channels).
**Writes:** agent_messages, notification log.
**Tools:** Email (via Resend), webhook, in-app notification.
**Output:** Notification delivered to operator.

**Review gate triggers (configurable per workspace):**
- Script written → notify (if review_scripts: true)
- Media assembled → notify (if review_media: true)
- Post ready to publish → notify (if review_publish: true)
- Analytics anomaly (>50% drop/spike) → always notify
- Agent failure → always notify

```javascript
// api/agents/notification.js
// Input: { workspace_id, event_type, payload }
// Output: { delivered: boolean, channels: string[] }
```

---

## Agent Communication Protocol

Agents never call each other directly. All inter-agent communication goes through the `jobs` table:

```javascript
// Enqueueing work for another agent
await db.jobs.create({
  workspace_id,
  job_type: 'agent:writing',
  payload: { video_id },
  status: 'pending',
  priority: 1,
  created_by: 'agent:planning'
})

// Agent runner polls the queue
// api/cron/run-agents.js → runs every 5 minutes
// Picks up pending jobs, dispatches to appropriate agent handler
// Updates job status (pending → running → completed|failed)
```

---

## Orchestrator

`api/agents/_orchestrator.js` is the central dispatcher. It:
1. Reads pending jobs from the `jobs` table (ordered by priority DESC, created_at ASC)
2. Acquires a lock (UPDATE jobs SET status='running', locked_at=now() WHERE id=... AND status='pending')
3. Dispatches to the correct agent handler
4. Handles timeouts (jobs running > 5 min → status='timeout', re-queued with retry_count++)
5. Logs all results to `agent_runs`
6. Triggers Notification Agent for review-gate events

---

## Operating Mode Matrix

| Agent | Creator Mode | Project Mode | Autonomous Brand Mode |
|---|---|---|---|
| Strategy | Manual trigger | Auto at project start | Weekly auto-refresh |
| Research | Manual trigger | Manual trigger | Weekly auto-scan |
| Analysis | Manual trigger | Auto after research | Daily auto-analysis |
| Planning | Manual trigger | Auto at project start | Monthly calendar auto-gen |
| Writing | Manual trigger | Auto for each calendar item | Auto for each calendar item |
| Media | Manual trigger | Auto after script | Auto after script |
| Publishing | Manual trigger | Auto (configurable gate) | Auto (configurable gate) |
| Analytics | Manual trigger | Daily auto-track | Daily auto-track |
| Optimization | Manual trigger | End-of-project | Weekly auto-optimize |
| Monetization | Manual trigger | Monthly | Monthly |
| Notification | Always active | Always active | Always active |

---

## Agent Skill Assignments

| Agent | Skills |
|---|---|
| Research | web-scraper, youtube-research, transcript-extractor |
| Analysis | competitor-analyzer, pattern-extractor, niche-scorer |
| Writing | rag-retriever, script-generator, hook-generator |
| Media | flux-image, wan-video, qwen-tts, ffmpeg-assembler, video-analysis |
| Publishing | postiz-publisher, platform-formatter |
| Analytics | analytics-fetcher, performance-scorer |
| Optimization | pattern-analyzer, strategy-optimizer |
| Monetization | revenue-attributor, funnel-analyzer |
