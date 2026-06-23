-- ContentOS Database Schema
-- Run this in your Supabase SQL editor to set up all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & WORKSPACES
-- ============================================

-- Workspaces (a user can have multiple brand workspaces)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT,
  audience TEXT,
  brand_color TEXT DEFAULT '#06b6d4',
  font_family TEXT DEFAULT 'Inter',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STRATEGIES
-- ============================================

CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_name TEXT,
  handle TEXT,
  tagline TEXT,
  positioning TEXT,
  content_pillars JSONB,      -- [{name, pct, desc, examples}]
  posting_schedule JSONB,     -- {tiktok: {...}, instagram: {...}}
  growth_roadmap JSONB,       -- [{phase, goal, action, metrics}]
  product_strategy JSONB,     -- {name, price, format, funnel}
  viral_hooks JSONB,          -- ["hook1", "hook2"]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHANNELS (Connected Social Accounts)
-- ============================================

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,     -- tiktok, instagram, youtube, facebook
  handle TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  followers INT DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, growing, paused
  -- OAuth credentials (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_account_id TEXT,
  auto_post BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- VIDEOS
-- ============================================

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  script JSONB,               -- {hook, body, cta, duration}
  format TEXT DEFAULT 'vertical', -- vertical, landscape, square
  content_style TEXT,         -- faceless, stock, ai-generated
  status TEXT DEFAULT 'draft', -- draft, rendering, ready, scheduled, published, failed
  -- Asset URLs
  video_url TEXT,
  thumbnail_url TEXT,
  audio_url TEXT,
  composition_path TEXT,      -- HyperFrames HTML path
  -- Scheduling
  scheduled_time TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  target_platforms JSONB,     -- ["tiktok", "instagram"]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- VIDEO POSTS (Per-platform publishing records)
-- ============================================

CREATE TABLE IF NOT EXISTS video_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT,      -- ID returned by platform
  post_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, posting, published, failed
  -- Analytics (synced from platform)
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  clicks INT DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  posted_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PRODUCTS (Digital Products to Sell)
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  product_url TEXT,           -- Gumroad/Beacons/Stripe link
  product_type TEXT,          -- guide, template, course, bundle
  platform TEXT,              -- gumroad, beacons, shopify, stripe
  -- Stats
  total_sales INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SALES (Track Conversions)
-- ============================================

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  source_platform TEXT,       -- which platform drove the sale
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ANALYTICS SNAPSHOTS (Daily aggregates)
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  followers INT DEFAULT 0,
  total_views INT DEFAULT 0,
  total_likes INT DEFAULT 0,
  total_clicks INT DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, snapshot_date)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_videos_workspace ON videos(workspace_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_video_posts_video ON video_posts(video_id);
CREATE INDEX IF NOT EXISTS idx_products_workspace ON products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_channel_date ON analytics_snapshots(channel_id, snapshot_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Workspace access policy (users see only their workspaces)
CREATE POLICY "Users manage own workspaces" ON workspaces
  FOR ALL USING (auth.uid() = user_id);

-- Child tables inherit access through workspace ownership
CREATE POLICY "Users manage workspace strategies" ON strategies
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users manage workspace channels" ON channels
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users manage workspace videos" ON videos
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users manage workspace products" ON products
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users manage workspace analytics" ON analytics_snapshots
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- video_posts and sales have RLS enabled above but need explicit policies,
-- otherwise RLS denies ALL access to them. Scope through the owning workspace.
CREATE POLICY "Users manage workspace video_posts" ON video_posts
  FOR ALL USING (
    video_id IN (
      SELECT id FROM videos WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users manage workspace sales" ON sales
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- TRIGGERS (Auto-update timestamps)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER strategies_updated BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER channels_updated BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER videos_updated BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();