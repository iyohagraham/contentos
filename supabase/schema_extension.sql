-- ContentOS Database Schema Extension
-- Run AFTER schema.sql in your Supabase SQL editor.
-- Adds tables for all 12 systems: Knowledge, Research, Channel Intelligence,
-- Skills, Agents, Jobs, Content Planning, Analytics, and Workspace Config.
-- Updated: 2026-06-23

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector: semantic search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram: fast text matching

-- ============================================
-- WORKSPACE CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  -- Operating mode
  operating_mode TEXT DEFAULT 'creator', -- creator, project, brand
  -- Review gates (Autonomous Brand Mode)
  review_scripts BOOLEAN DEFAULT true,
  review_media BOOLEAN DEFAULT true,
  review_publish BOOLEAN DEFAULT false,
  -- Notification channels
  notification_email TEXT,
  notification_webhook TEXT,
  -- Brand brief (for Autonomous Brand Mode)
  brand_brief JSONB DEFAULT '{}',
  -- {niche, audience, monetization_goal, style, voice, platforms[]}
  -- Autonomy settings
  max_posts_per_day INT DEFAULT 3,
  content_mix JSONB DEFAULT '{"educational":40,"inspirational":25,"entertaining":20,"promotional":15}',
  -- Provider preferences
  preferred_text_model TEXT DEFAULT 'kimi-k2.7-code-highspeed',
  preferred_image_model TEXT DEFAULT 'flux-pro',
  preferred_video_model TEXT DEFAULT 'wan-2.7',
  preferred_voice TEXT DEFAULT 'Serena',
  -- Research settings
  research_scan_enabled BOOLEAN DEFAULT false,
  research_scan_day TEXT DEFAULT 'sunday', -- day of week
  competitor_urls JSONB DEFAULT '[]',
  -- Learning loop
  learning_loop_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- JOB QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  -- e.g. agent:writing, agent:media, knowledge:ingest, research:scan,
  --      intelligence:analyze, production:assemble, publish:distribute
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed, timeout
  priority INT DEFAULT 0,        -- higher = picked first
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  result JSONB,
  error TEXT,
  created_by TEXT,               -- agent:planning, cron:weekly, user:<id>
  locked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT now(), -- not before this time
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  level TEXT DEFAULT 'info',     -- info, warn, error
  message TEXT NOT NULL,
  data JSONB,
  logged_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_status ON jobs(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_priority ON jobs(status, priority DESC, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_job_logs_job ON job_logs(job_id);

-- ============================================
-- KNOWLEDGE SYSTEM
-- ============================================

-- Raw uploaded assets (PDF, URL, YouTube, GitHub repo, SOP, etc.)
CREATE TABLE IF NOT EXISTS knowledge_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  -- pdf, url, youtube, github, sop, prompt_library, book, course, guide, playbook
  source_url TEXT,
  file_path TEXT,                -- Vercel Blob path if uploaded
  file_size_bytes BIGINT,
  -- Ingestion state
  ingestion_status TEXT DEFAULT 'pending',
  -- pending, processing, complete, failed
  chunk_count INT DEFAULT 0,
  object_count INT DEFAULT 0,
  error TEXT,
  -- Classification
  categories JSONB DEFAULT '[]', -- ["strategy", "hooks", "frameworks", ...]
  tags JSONB DEFAULT '[]',
  language TEXT DEFAULT 'en',
  -- Raw content (for small assets)
  raw_content TEXT,
  metadata JSONB DEFAULT '{}',
  ingested_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chunked text with embeddings
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES knowledge_assets(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  token_count INT,
  embedding VECTOR(1536),        -- text-embedding-3-small
  -- Source location
  page_number INT,
  start_char INT,
  end_char INT,
  -- Classification
  chunk_type TEXT DEFAULT 'text', -- text, code, table, list, heading
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_asset ON knowledge_chunks(asset_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Structured knowledge objects extracted from chunks
CREATE TABLE IF NOT EXISTS knowledge_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES knowledge_assets(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  -- concept, framework, pattern, strategy, workflow, prompt, technique,
  -- hook_formula, cta_formula, content_structure, monetization_model, growth_strategy
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  applicability JSONB DEFAULT '[]',  -- ["short_form_video", "youtube_script", ...]
  platform_relevance JSONB DEFAULT '[]', -- ["tiktok", "youtube", "instagram"]
  confidence DECIMAL(3,2) DEFAULT 0.8,
  source_chunks JSONB DEFAULT '[]',  -- chunk IDs used to extract this
  examples JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_objects_workspace ON knowledge_objects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_objects_type ON knowledge_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_objects_embedding ON knowledge_objects
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Links between knowledge objects
CREATE TABLE IF NOT EXISTS knowledge_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_object_id UUID REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  to_object_id UUID REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  -- extends, contradicts, supports, requires, example_of, component_of
  strength DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_object_id, to_object_id, relationship_type)
);

-- Knowledge search log (for improving retrieval relevance)
CREATE TABLE IF NOT EXISTS knowledge_search_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_embedding VECTOR(1536),
  result_ids JSONB DEFAULT '[]',
  result_count INT DEFAULT 0,
  agent_id TEXT,                 -- which agent triggered the search
  relevance_feedback DECIMAL(3,2), -- 0-1 from downstream agent (did it use the results?)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_assets_workspace ON knowledge_assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_objects_usage ON knowledge_objects(usage_count DESC);

-- Semantic search function for knowledge chunks
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  asset_id UUID,
  content TEXT,
  chunk_type TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.asset_id,
    kc.content,
    kc.chunk_type,
    1 - (kc.embedding <=> query_embedding) AS similarity,
    kc.metadata
  FROM knowledge_chunks kc
  JOIN knowledge_assets ka ON ka.id = kc.asset_id
  WHERE
    (p_workspace_id IS NULL OR ka.workspace_id = p_workspace_id)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Semantic search function for knowledge objects
CREATE OR REPLACE FUNCTION match_knowledge_objects(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_workspace_id UUID DEFAULT NULL,
  p_object_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  object_type TEXT,
  title TEXT,
  summary TEXT,
  content TEXT,
  similarity FLOAT,
  examples JSONB,
  tags JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ko.id,
    ko.object_type,
    ko.title,
    ko.summary,
    ko.content,
    1 - (ko.embedding <=> query_embedding) AS similarity,
    ko.examples,
    ko.tags
  FROM knowledge_objects ko
  WHERE
    ko.deleted_at IS NULL
    AND (p_workspace_id IS NULL OR ko.workspace_id = p_workspace_id)
    AND (p_object_type IS NULL OR ko.object_type = p_object_type)
    AND 1 - (ko.embedding <=> query_embedding) > match_threshold
  ORDER BY ko.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- RESEARCH INTELLIGENCE
-- ============================================

CREATE TABLE IF NOT EXISTS research_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL,
  -- competitors, trends, niche, audience, keywords, hashtags
  query TEXT NOT NULL,
  target_urls JSONB DEFAULT '[]',
  target_platforms JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',  -- pending, running, complete, failed
  result_count INT DEFAULT 0,
  triggered_by TEXT DEFAULT 'user', -- user, cron:weekly, agent:research
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS research_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  query_id UUID REFERENCES research_queries(id) ON DELETE CASCADE,
  result_type TEXT NOT NULL,
  -- channel, video, article, trend, keyword, hashtag, creator
  title TEXT,
  url TEXT,
  platform TEXT,
  -- Structured data
  data JSONB DEFAULT '{}',
  -- For channels: {handle, followers, views, posting_freq, niche}
  -- For videos: {title, views, likes, duration, hook, cta}
  -- For trends: {keyword, volume, growth_rate, related_topics}
  summary TEXT,
  opportunity_score DECIMAL(3,2), -- 0-1
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitor_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT,
  display_name TEXT,
  -- Metrics
  subscribers INT,
  total_views BIGINT,
  video_count INT,
  avg_views_per_video INT,
  posting_frequency TEXT,        -- "daily", "3x/week", etc.
  -- Analysis
  niche TEXT,
  content_focus TEXT,
  audience_description TEXT,
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  content_gaps JSONB DEFAULT '[]',
  monetization_signals JSONB DEFAULT '[]',
  -- DNA (from Channel Intelligence Engine)
  dna JSONB DEFAULT '{}',
  analyzed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  -- trending_topic, keyword_surge, niche_gap, format_trend, platform_algorithm
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  data JSONB DEFAULT '{}',
  opportunity_score DECIMAL(3,2),
  expires_at TIMESTAMPTZ,        -- when this signal is likely stale
  actioned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_results_workspace ON research_results(workspace_id);
CREATE INDEX IF NOT EXISTS idx_research_results_embedding ON research_results
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_market_signals_workspace ON market_signals(workspace_id, signal_type);
CREATE INDEX IF NOT EXISTS idx_competitor_analyses_workspace ON competitor_analyses(workspace_id);

CREATE OR REPLACE FUNCTION match_research_results(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  result_type TEXT,
  title TEXT,
  url TEXT,
  platform TEXT,
  data JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rr.id,
    rr.result_type,
    rr.title,
    rr.url,
    rr.platform,
    rr.data,
    1 - (rr.embedding <=> query_embedding) AS similarity
  FROM research_results rr
  WHERE
    (p_workspace_id IS NULL OR rr.workspace_id = p_workspace_id)
    AND rr.embedding IS NOT NULL
    AND 1 - (rr.embedding <=> query_embedding) > match_threshold
  ORDER BY rr.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- CHANNEL INTELLIGENCE ENGINE
-- ============================================

CREATE TABLE IF NOT EXISTS channel_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT,
  display_name TEXT,
  -- Metrics snapshot
  subscribers INT,
  total_views BIGINT,
  video_count INT,
  -- Analysis dimensions (0-10 scores)
  scores JSONB DEFAULT '{}',
  -- {hook_strength, cta_effectiveness, thumbnail_click_rate, pacing, storytelling,
  --  educational_value, entertainment_value, format_consistency, posting_consistency,
  --  audience_engagement}
  -- DNA blueprints
  channel_dna JSONB DEFAULT '{}',
  content_dna JSONB DEFAULT '{}',
  monetization_dna JSONB DEFAULT '{}',
  growth_dna JSONB DEFAULT '{}',
  -- Sample analysis
  videos_analyzed INT DEFAULT 0,
  sample_period_days INT DEFAULT 90,
  analyzed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_content_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES channel_analyses(id) ON DELETE CASCADE,
  video_url TEXT,
  title TEXT,
  views INT,
  likes INT,
  comments INT,
  duration_seconds INT,
  hook_text TEXT,
  hook_type TEXT,        -- question, shock, promise, story, contrarian
  cta_text TEXT,
  cta_type TEXT,         -- subscribe, comment, click_link, share, follow
  thumbnail_style TEXT,  -- face, text_overlay, minimal, dramatic, tutorial
  content_structure JSONB DEFAULT '{}',
  performance_tier TEXT, -- viral, hit, average, miss
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES channel_analyses(id) ON DELETE CASCADE,
  playbook_type TEXT NOT NULL,
  -- title_formula, hook_formula, cta_formula, thumbnail_formula, content_structure
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  examples JSONB DEFAULT '[]',
  success_rate DECIMAL(3,2),
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  source_analysis_id UUID REFERENCES channel_analyses(id) ON DELETE CASCADE,
  version_type TEXT NOT NULL,
  -- similar, improved, niche_transfer, audience_transfer, platform_transfer,
  -- style_transfer, hybrid
  name TEXT NOT NULL,
  description TEXT,
  modifications JSONB DEFAULT '{}',
  projected_performance JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_analyses_workspace ON channel_analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channel_playbooks_workspace ON channel_playbooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channel_playbooks_embedding ON channel_playbooks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- SKILL SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS skill_manifests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  skill_type TEXT NOT NULL,
  -- content_analysis, media_generation, research, data_processing, publishing, utility
  version TEXT NOT NULL,          -- semver: "1.0.0"
  description TEXT,
  source_type TEXT,               -- github, pdf, manual, system
  source_url TEXT,
  -- Interface
  inputs JSONB DEFAULT '[]',      -- [{name, type, required, description}]
  outputs JSONB DEFAULT '[]',     -- [{name, type, description}]
  -- Agent assignments
  compatible_agents JSONB DEFAULT '[]',
  -- Config
  runtime TEXT DEFAULT 'api',     -- api, python, node, shell
  entry_point TEXT,
  dependencies JSONB DEFAULT '[]',
  -- Security
  permissions JSONB DEFAULT '[]', -- ["network", "filesystem", "ai_generation"]
  max_cost_usd DECIMAL(8,4),
  -- Performance
  avg_latency_ms INT,
  success_rate DECIMAL(3,2),
  total_invocations INT DEFAULT 0,
  status TEXT DEFAULT 'active',   -- active, deprecated, disabled
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),         -- for semantic skill discovery
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, skill_name)
);

CREATE TABLE IF NOT EXISTS skill_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID REFERENCES skill_manifests(id) ON DELETE CASCADE,
  agent_run_id UUID,
  inputs JSONB DEFAULT '{}',
  outputs JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',  -- pending, running, success, failed
  latency_ms INT,
  cost_usd DECIMAL(8,6),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS skill_compositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]',
  -- [{skill_name, inputs_map, outputs_map, condition}]
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_manifests_workspace ON skill_manifests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_manifests_embedding ON skill_manifests
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_skill_invocations_skill ON skill_invocations(skill_id);

CREATE OR REPLACE FUNCTION match_skills(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 5,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  skill_name TEXT,
  display_name TEXT,
  skill_type TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.skill_name,
    sm.display_name,
    sm.skill_type,
    sm.description,
    1 - (sm.embedding <=> query_embedding) AS similarity
  FROM skill_manifests sm
  WHERE
    sm.deleted_at IS NULL
    AND sm.status = 'active'
    AND (p_workspace_id IS NULL OR sm.workspace_id = p_workspace_id)
    AND sm.embedding IS NOT NULL
    AND 1 - (sm.embedding <=> query_embedding) > match_threshold
  ORDER BY sm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- AGENT SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL,
  -- strategy, research, analysis, planning, writing, media, publishing,
  -- analytics, optimization, monetization, notification
  trigger_type TEXT DEFAULT 'manual',
  -- manual, cron:daily, cron:weekly, agent:<name>, system
  inputs JSONB DEFAULT '{}',
  outputs JSONB DEFAULT '{}',
  -- RAG context used
  rag_chunks_used INT DEFAULT 0,
  rag_objects_used INT DEFAULT 0,
  -- AI calls made
  ai_calls INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  cost_usd DECIMAL(8,6) DEFAULT 0,
  -- Status
  status TEXT DEFAULT 'running',  -- running, completed, failed, needs_review
  error TEXT,
  duration_ms INT,
  review_requested BOOLEAN DEFAULT false,
  review_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  from_agent TEXT,
  to_agent TEXT,
  message_type TEXT NOT NULL,
  -- job_enqueued, result_ready, review_requested, error_occurred, insight_generated
  payload JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  inputs JSONB DEFAULT '{}',
  outputs JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  latency_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON agent_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_type ON agent_runs(agent_type, status);
CREATE INDEX IF NOT EXISTS idx_agent_messages_workspace ON agent_messages(workspace_id, read);
CREATE INDEX IF NOT EXISTS idx_agent_tools_run ON agent_tools(agent_run_id);

-- ============================================
-- CONTENT PLANNING
-- ============================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,   -- campaign, series, launch
  description TEXT,
  goal TEXT,
  -- Timeline
  start_date DATE,
  end_date DATE,
  -- Content targets
  target_post_count INT DEFAULT 10,
  target_platforms JSONB DEFAULT '[]',
  content_mix JSONB DEFAULT '{}',
  -- Status
  status TEXT DEFAULT 'planning', -- planning, active, paused, complete
  -- Performance
  total_posts INT DEFAULT 0,
  published_posts INT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  position INT,                  -- order in series/sequence
  is_anchor_post BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  target_platforms JSONB DEFAULT '[]',
  content_pillar TEXT,
  funnel_stage TEXT,             -- awareness, consideration, conversion, retention
  opportunity_score DECIMAL(3,2),
  status TEXT DEFAULT 'planned', -- planned, in_production, ready, published, missed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_content_calendar_workspace ON content_calendar(workspace_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(status);

-- ============================================
-- ANALYTICS (EXTENDED)
-- ============================================

CREATE TABLE IF NOT EXISTS post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  video_post_id UUID REFERENCES video_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  -- Core metrics
  views INT DEFAULT 0,
  unique_views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  clicks INT DEFAULT 0,
  -- Computed
  engagement_rate DECIMAL(5,4) DEFAULT 0,  -- (likes+comments+shares+saves)/views
  watch_time_seconds INT DEFAULT 0,
  completion_rate DECIMAL(5,4) DEFAULT 0,  -- % who watched to end
  -- Growth
  new_followers_from_post INT DEFAULT 0,
  -- Performance tier (set by Optimization Agent)
  performance_tier TEXT,         -- viral, hit, average, miss
  performance_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_post_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS platform_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  -- Account-level metrics
  followers INT DEFAULT 0,
  following INT DEFAULT 0,
  total_posts INT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  profile_visits INT DEFAULT 0,
  website_clicks INT DEFAULT 0,
  -- 7-day rolling averages
  avg_views_7d DECIMAL(12,2),
  avg_engagement_7d DECIMAL(5,4),
  follower_growth_7d INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS revenue_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  -- Attribution
  attribution_method TEXT,       -- utm_match, platform_native, correlation
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referring_platform TEXT,
  attribution_confidence DECIMAL(3,2),
  -- Customer
  customer_id TEXT,
  customer_country TEXT,
  event_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  insight_type TEXT NOT NULL,
  -- hook_pattern, format_winner, topic_resonance, posting_time, cta_effectiveness,
  -- thumbnail_style, content_length, pillar_performance
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}',   -- supporting data
  confidence DECIMAL(3,2) DEFAULT 0.7,
  impact TEXT DEFAULT 'medium',  -- high, medium, low
  -- Action
  recommendation TEXT,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  -- Scope
  platforms JSONB DEFAULT '[]',
  content_types JSONB DEFAULT '[]',
  valid_until TIMESTAMPTZ,       -- insights decay over time
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_workspace ON post_analytics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_video ON post_analytics(video_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_platform_snapshots_channel ON platform_snapshots(channel_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_revenue_events_workspace ON revenue_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_product ON revenue_events(product_id);
CREATE INDEX IF NOT EXISTS idx_learning_insights_workspace ON learning_insights(workspace_id, applied);

-- ============================================
-- RLS — NEW TABLES
-- ============================================

ALTER TABLE workspace_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_search_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_content_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_insights ENABLE ROW LEVEL SECURITY;

-- Workspace-direct tables
CREATE POLICY "workspace_owner" ON workspace_config FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON jobs FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON knowledge_assets FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON knowledge_objects FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON knowledge_search_log FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON research_queries FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON research_results FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON competitor_analyses FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON market_signals FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON channel_analyses FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON channel_playbooks FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON channel_versions FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON skill_manifests FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON skill_compositions FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON agent_runs FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON agent_messages FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON campaigns FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON content_calendar FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON post_analytics FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON platform_snapshots FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON revenue_events FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_owner" ON learning_insights FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- Chain-access tables (access via parent)
CREATE POLICY "chain_via_jobs" ON job_logs FOR ALL USING (
  job_id IN (SELECT id FROM jobs WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
);
CREATE POLICY "chain_via_assets" ON knowledge_chunks FOR ALL USING (
  asset_id IN (SELECT id FROM knowledge_assets WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
);
CREATE POLICY "chain_via_objects" ON knowledge_relationships FOR ALL USING (
  from_object_id IN (SELECT id FROM knowledge_objects WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
);
CREATE POLICY "chain_via_analysis" ON channel_content_samples FOR ALL USING (
  analysis_id IN (SELECT id FROM channel_analyses WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
);
CREATE POLICY "chain_via_skills" ON skill_invocations FOR ALL USING (
  skill_id IN (SELECT id FROM skill_manifests WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
);
CREATE POLICY "chain_via_runs" ON agent_tools FOR ALL USING (
  agent_run_id IN (SELECT id FROM agent_runs WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
);
CREATE POLICY "chain_via_campaigns" ON campaign_posts FOR ALL USING (
  campaign_id IN (SELECT id FROM campaigns WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
);

-- ============================================
-- TRIGGERS — NEW TABLES
-- ============================================

CREATE TRIGGER workspace_config_updated BEFORE UPDATE ON workspace_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER knowledge_assets_updated BEFORE UPDATE ON knowledge_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER knowledge_objects_updated BEFORE UPDATE ON knowledge_objects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER skill_manifests_updated BEFORE UPDATE ON skill_manifests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaigns_updated BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER content_calendar_updated BEFORE UPDATE ON content_calendar FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER competitor_analyses_updated BEFORE UPDATE ON competitor_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER channel_analyses_updated BEFORE UPDATE ON channel_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
