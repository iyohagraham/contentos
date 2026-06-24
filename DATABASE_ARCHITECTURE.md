# ContentOS — Database Architecture
**Authority:** MASTER_VISION.md → this document → individual schema files.
**Source:** `supabase/schema.sql` is the canonical implementation. This document describes intent and structure.
**Updated:** 2026-06-23

---

## Overview

ContentOS uses Supabase (PostgreSQL + pgvector) as its primary database. Every table is workspace-scoped. Row-Level Security (RLS) is enabled on every table with policies that enforce `workspaces.user_id = auth.uid()`.

In localStorage mode (no Supabase configured), all tables map to `localStorage` keys with the same structure. The `src/lib/db/store.js` adapter is interface-identical for both modes.

---

## Extension Requirements

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector (Supabase built-in)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- trigram search for text matching
```

---

## Table Groups

### Group 1 — Core Identity (existing)
| Table | Purpose |
|---|---|
| `workspaces` | Brand workspace; root of all RLS chains |
| `strategies` | Brand strategy (pillars, positioning, schedule) |
| `channels` | Connected social accounts |
| `videos` | Content items (script → asset → published) |
| `video_posts` | Per-platform publishing records |
| `products` | Monetization products |
| `sales` | Revenue events |

### Group 2 — Workspace Configuration (new)
| Table | Purpose |
|---|---|
| `workspace_config` | Operating mode, autonomy settings, review gates |

### Group 3 — Job Queue (new)
| Table | Purpose |
|---|---|
| `jobs` | Async job queue for long-running tasks |
| `job_logs` | Job execution logs |

### Group 4 — Knowledge System (new)
| Table | Purpose |
|---|---|
| `knowledge_assets` | Raw uploaded assets (PDF, URL, YouTube, GitHub) |
| `knowledge_chunks` | Chunked text with embeddings (pgvector) |
| `knowledge_objects` | Extracted structured objects (concepts, frameworks, etc.) |
| `knowledge_relationships` | Links between knowledge objects |
| `knowledge_ingestion_jobs` | Ingestion pipeline job tracking |
| `knowledge_search_log` | Search query log for improving retrieval |

### Group 5 — Research Intelligence (new)
| Table | Purpose |
|---|---|
| `research_queries` | Research requests |
| `research_results` | Structured research findings |
| `competitor_analyses` | Competitor channel analyses |
| `market_signals` | Trending topics, niche opportunities |

### Group 6 — Channel Intelligence (new)
| Table | Purpose |
|---|---|
| `channel_analyses` | Full channel analysis results |
| `channel_content_samples` | Individual piece analysis |
| `channel_playbooks` | Extracted playbooks (title / hook / CTA / thumbnail / structure) |
| `channel_versions` | Version Builder outputs |
| `channel_intelligence_jobs` | CIE job tracking |

### Group 7 — Skill System (new)
| Table | Purpose |
|---|---|
| `skill_manifests` | Registered skill definitions (SKILL.md format) |
| `skill_versions` | Versioned skill releases |
| `skill_sources` | Source repositories/documents |
| `agent_skill_assignments` | Which agents can call which skills |
| `skill_invocations` | Skill call log (for performance tracking) |
| `skill_compositions` | Multi-skill pipeline definitions |

### Group 8 — Agent System (new)
| Table | Purpose |
|---|---|
| `agent_runs` | Individual agent execution records |
| `agent_messages` | Inter-agent communication log |
| `agent_tools` | Tool call records per agent run |

### Group 9 — Content Planning (new)
| Table | Purpose |
|---|---|
| `campaigns` | Content campaigns / series / launch sequences |
| `campaign_posts` | Posts assigned to a campaign |
| `content_calendar` | Scheduled content calendar view |

### Group 10 — Analytics (new)
| Table | Purpose |
|---|---|
| `post_analytics` | Per-post performance metrics |
| `platform_snapshots` | Daily channel metric snapshots |
| `revenue_events` | Revenue attribution (UTM → content) |
| `learning_insights` | AI-generated optimization insights |

---

## Key Design Patterns

### RLS Pattern
Every new table follows this pattern:
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_owner_only" ON <table>
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );
```

For tables that chain through another table (e.g., `knowledge_chunks → knowledge_assets → workspaces`):
```sql
CREATE POLICY "workspace_owner_only" ON knowledge_chunks
  USING (
    asset_id IN (
      SELECT id FROM knowledge_assets
      WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
      )
    )
  );
```

### Embedding Pattern
All tables storing vector embeddings use:
```sql
embedding VECTOR(1536)  -- OpenAI text-embedding-3-small dimension
```

With an ivfflat index:
```sql
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Match Function Pattern
Semantic search functions follow this template:
```sql
CREATE OR REPLACE FUNCTION match_<table>(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, content TEXT, similarity FLOAT, metadata JSONB)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.content, 1 - (t.embedding <=> query_embedding) AS similarity, t.metadata
  FROM <table> t
  WHERE (p_workspace_id IS NULL OR t.workspace_id = p_workspace_id)
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### JSONB Metadata Pattern
All tables store flexible metadata as `JSONB` for extensibility without schema migrations:
```sql
metadata JSONB DEFAULT '{}'
```

### Soft Delete Pattern
No hard deletes. All tables use:
```sql
deleted_at TIMESTAMPTZ DEFAULT NULL
```
With a partial index: `CREATE INDEX ON <table> (id) WHERE deleted_at IS NULL;`

---

## pgvector Search Functions

### `match_knowledge_chunks(query_embedding, threshold, count, workspace_id)`
Semantic search over chunked knowledge documents.

### `match_knowledge_objects(query_embedding, threshold, count, workspace_id, object_type)`
Semantic search over structured knowledge objects, filterable by type.

### `match_skills(query_embedding, threshold, count, workspace_id)`
Find relevant skills by semantic similarity to a task description.

### `match_research_results(query_embedding, threshold, count, workspace_id)`
Find relevant prior research by semantic similarity.

---

## Data Flow

```
User uploads PDF
    → knowledge_assets (raw)
    → knowledge_chunks (chunked + embedded via text-embedding-3-small)
    → knowledge_objects (structured extraction by AI)
    → knowledge_relationships (links between objects)

Agent call (e.g., Writing Agent)
    → match_knowledge_chunks(task_embedding) → RAG context
    → match_skills(task_embedding) → relevant skills
    → Kimi chat with enriched context
    → result stored in agent_runs

Weekly Learning Loop
    → post_analytics (all posts last 7 days)
    → performance scorer → winner/loser labels
    → pattern extractor → learning_insights
    → strategy update → strategies (updated)
```

---

## Size Estimates (per workspace, 6-month horizon)

| Table | Estimated rows |
|---|---|
| knowledge_chunks | 50,000 (1 embedding = ~6KB → 300MB) |
| post_analytics | 5,000 (daily × 100 posts × 50 days) |
| agent_runs | 10,000 (avg 5 agents/day × 365) |
| research_results | 2,000 |
| channel_analyses | 500 |

Supabase free tier: 500MB storage, 1GB bandwidth. Pro ($25/mo): 8GB storage. Recommend Pro for any active workspace.
