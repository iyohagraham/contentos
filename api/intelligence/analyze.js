/**
 * POST /api/intelligence/analyze
 * Full Channel Intelligence Engine analysis.
 * Reverse-engineers a channel into DNA blueprints + playbooks.
 *
 * Body: { workspace_id, channel_url, platform?, sample_count? }
 * Returns: { analysis_id, dna: {...}, playbooks: [...], versions: [...] }
 */
import { getServerSupabase } from '../_db.js'
import { textGenerateJSON } from '../_providers/text.js'
import { embed } from '../_providers/embed.js'
import { fetchChannelSamples, performanceTier, detectPlatform } from './_sources.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { workspace_id, channel_url, platform: explicitPlatform, sample_count = 15 } = req.body
  if (!workspace_id || !channel_url) return res.status(400).json({ error: 'workspace_id and channel_url required' })

  const db = getServerSupabase()

  try {
    // Step 1: Fetch REAL recent content samples (keyless for YouTube via Atom RSS).
    const ingest = await fetchChannelSamples(channel_url, { max: sample_count })
    const platform = explicitPlatform || ingest.platform || detectPlatform(channel_url)
    const meta = {
      platform,
      channel_url,
      handle: ingest.channel?.handle || (channel_url.match(/@([a-zA-Z0-9_.-]+)/) || [])[1] || null,
      display_name: ingest.channel?.display_name || null,
      subscribers: ingest.channel?.subscribers || null,
      total_views: ingest.channel?.total_views || null,
      video_count: ingest.channel?.video_count || null,
      data_source: ingest.source,
      real_samples: !!(ingest.supported && ingest.samples.length)
    }
    const samples = ingest.samples || []

    // Step 2: Create analysis record
    let analysis = { id: `local_${Date.now()}` }
    if (db) {
      const { data } = await db.from('channel_analyses').insert({
        workspace_id, channel_url, platform,
        handle: meta.handle, display_name: meta.display_name,
        subscribers: meta.subscribers, total_views: meta.total_views, video_count: meta.video_count,
        videos_analyzed: 0, sample_period_days: 90
      }).select().single()
      analysis = data || analysis
    }

    // Step 2b: Persist the real samples with a performance tier vs the set median.
    if (db && samples.length) {
      const sortedViews = samples.map(s => s.views).filter(v => v > 0).sort((a, b) => a - b)
      const median = sortedViews.length ? sortedViews[Math.floor(sortedViews.length / 2)] : 0
      for (const s of samples) {
        await db.from('channel_content_samples').insert({
          analysis_id: analysis.id,
          video_url: s.video_url,
          title: s.title,
          views: s.views,
          likes: s.likes,
          comments: s.comments,
          performance_tier: performanceTier(s.views, median),
          metadata: {
            description: (s.description || '').slice(0, 1000),
            published_at: s.published_at,
            thumbnail_url: s.thumbnail_url
          }
        }).catch(() => {})
      }
    }

    // Step 3: AI DNA extraction — grounded in the REAL samples when available.
    const dna = await extractDNA(channel_url, meta, platform, samples)

    // Step 4: Generate playbooks from DNA
    const playbooks = await generatePlaybooks(dna, workspace_id, analysis.id, db)

    // Step 5: Generate Version Builder suggestions
    const versions = generateVersions(dna, platform)

    // Step 6: Update analysis record
    if (db) {
      await db.from('channel_analyses').update({
        channel_dna: dna.channel_dna,
        content_dna: dna.content_dna,
        monetization_dna: dna.monetization_dna,
        growth_dna: dna.growth_dna,
        scores: dna.scores,
        videos_analyzed: samples.length,
        analyzed_at: new Date().toISOString()
      }).eq('id', analysis.id)

      // Store version suggestions
      for (const v of versions) {
        await db.from('channel_versions').insert({
          workspace_id, source_analysis_id: analysis.id,
          version_type: v.type, name: v.name,
          description: v.description, modifications: v.modifications,
          projected_performance: v.projected_performance
        })
      }
    }

    return res.status(200).json({
      analysis_id: analysis.id,
      meta,
      data_source: meta.data_source,
      real_samples: meta.real_samples,
      samples_analyzed: samples.length,
      dna,
      playbooks,
      versions
    })
  } catch (err) {
    console.error('[intelligence/analyze]', err)
    return res.status(500).json({ error: err.message })
  }
}

async function extractDNA(channelUrl, meta, platform, samples = []) {
  const hasReal = Array.isArray(samples) && samples.length > 0
  const sampleBlock = hasReal
    ? samples
        .map((s, i) => {
          const v = s.views ? `${s.views.toLocaleString()} views` : 'views n/a'
          const l = s.likes ? `, ${s.likes.toLocaleString()} likes` : ''
          const d = s.description ? `\n   ${s.description.slice(0, 160).replace(/\s+/g, ' ')}` : ''
          return `${i + 1}. "${s.title}" — ${v}${l}${d}`
        })
        .join('\n')
    : ''

  const framing = hasReal
    ? `Analyze this ${platform} channel using its ${samples.length} MOST RECENT REAL videos (with real view counts) listed below. Base EVERY conclusion on the ACTUAL titles, topics, and view distribution — note which titles over/under-performed vs the others, the real title/hook style, the real topic mix, and the posting cadence implied by the data. Do NOT invent stats.`
    : `You could NOT fetch this channel's real videos (platform without a keyless feed, or resolution failed). Analyze from the URL/handle and comparable channels, and set data_confidence to "low".`

  const prompt = `You are a content intelligence analyst. ${framing}

Channel: ${channelUrl}
Display Name: ${meta.display_name || 'Unknown'}
Handle: ${meta.handle || 'Unknown'}
Platform: ${platform}${meta.subscribers ? `\nSubscribers: ${meta.subscribers.toLocaleString()}` : ''}
${hasReal ? `\nRECENT VIDEOS (real data):\n${sampleBlock}\n` : ''}
Return comprehensive JSON:
{
  "channel_dna": {
    "niche": "specific content niche",
    "audience": {
      "primary_age": "25-34",
      "interests": ["finance", "entrepreneurship"],
      "pain_points": ["time", "money", "knowledge"],
      "desires": ["freedom", "income", "skills"],
      "sophistication_level": "intermediate"
    },
    "brand_voice": "educational yet casual",
    "visual_identity": "minimal, dark mode, charts",
    "unique_value_proposition": "what makes this channel unique",
    "positioning": "how it's positioned vs competitors"
  },
  "content_dna": {
    "primary_format": "talking head / faceless / animation",
    "typical_duration": "8-12 minutes",
    "content_pillars": ["pillar1", "pillar2", "pillar3"],
    "hook_pattern": "typical opening pattern",
    "storytelling_style": "documentary / tutorial / listicle",
    "production_quality": "high / medium / low",
    "pacing": "fast / medium / slow",
    "posting_frequency": "X per week",
    "best_performing_topics": ["topic1", "topic2"]
  },
  "monetization_dna": {
    "revenue_streams": ["sponsorships", "courses", "affiliate"],
    "primary_cta": "what they primarily drive viewers to do",
    "lead_magnet": "free resource offered",
    "product_type": "course / community / tool / physical",
    "price_point": "estimated price range",
    "funnel_structure": "how they convert viewers to buyers"
  },
  "growth_dna": {
    "growth_strategy": "primary growth tactic",
    "collaboration_style": "does / doesn't collaborate",
    "platform_strategy": "single / multi platform",
    "repurposing_strategy": "how content is repurposed",
    "community_engagement": "how they engage with audience",
    "virality_tactics": ["tactic1", "tactic2"]
  },
  "scores": {
    "hook_strength": 8,
    "cta_effectiveness": 7,
    "thumbnail_quality": 9,
    "pacing": 8,
    "storytelling": 8,
    "educational_value": 9,
    "entertainment_value": 6,
    "format_consistency": 9,
    "posting_consistency": 8,
    "audience_engagement": 7
  },
  "videos_analyzed": ${samples.length},
  "data_confidence": "${hasReal ? 'high' : 'low'}",
  "key_insights": ["insight grounded in the real videos above", "insight2", "insight3"]
}`

  return textGenerateJSON(prompt, { maxTokens: 2000 })
}

async function generatePlaybooks(dna, workspace_id, analysis_id, db) {
  const playbookTypes = [
    { type: 'title_formula', prompt: 'title formulas' },
    { type: 'hook_formula', prompt: 'hook opening formulas' },
    { type: 'cta_formula', prompt: 'call-to-action formulas' },
    { type: 'content_structure', prompt: 'content structure templates' },
    { type: 'thumbnail_formula', prompt: 'thumbnail design formulas' }
  ]

  const playbooks = []

  const prompt = `Based on this channel DNA, generate specific, reusable playbooks for each content element.

Channel DNA: ${JSON.stringify(dna, null, 2)}

Generate 2-3 formulas for each of these 5 playbook types:
1. Title formulas (patterns that drive clicks)
2. Hook formulas (opening 5 seconds patterns)
3. CTA formulas (calls-to-action patterns)
4. Content structure templates (full video structure)
5. Thumbnail formulas (visual design patterns)

Return JSON array:
[
  {
    "playbook_type": "title_formula",
    "name": "The Curiosity Gap Title",
    "formula": "[Unexpected Claim] That [Audience Want] (No One Talks About)",
    "examples": ["The Investing Strategy That Builds Wealth (No One Talks About)", "The Productivity Hack That Saves 3 Hours Daily"],
    "success_rate": 0.82
  }
]`

  try {
    const items = await textGenerateJSON(prompt, { maxTokens: 2000 })
    if (!Array.isArray(items)) return []

    for (const item of items) {
      let embedding = null
      try { embedding = await embed(`${item.name}: ${item.formula}`) } catch { /* optional */ }

      const row = { ...item, workspace_id, analysis_id, embedding }
      if (db) {
        const { data } = await db.from('channel_playbooks').insert(row).select().single()
        if (data) playbooks.push(data)
      } else {
        playbooks.push(row)
      }
    }
  } catch { /* non-fatal */ }

  return playbooks
}

function generateVersions(dna, sourcePlatform) {
  const niche = dna.channel_dna?.niche || 'content creation'
  return [
    {
      type: 'improved',
      name: `Improved ${niche} Channel`,
      description: `Same niche, better production and stronger hooks based on DNA analysis`,
      modifications: {
        hook_improvement: `Apply the strongest hook patterns from the analysis`,
        production_upgrade: `Increase production quality based on scores`,
        cta_optimization: `Implement highest-performing CTA formula`
      },
      projected_performance: { views_multiplier: 1.4, engagement_boost: '20-35%' }
    },
    {
      type: 'niche_transfer',
      name: `Niche Transfer Version`,
      description: `Apply proven content DNA to a different but related niche`,
      modifications: {
        target_niche: `Adjacent niche with similar audience`,
        content_style: dna.content_dna?.primary_format,
        monetization: dna.monetization_dna?.revenue_streams?.[0]
      },
      projected_performance: { views_multiplier: 0.7, growth_rate: 'faster due to lower competition' }
    },
    {
      type: 'platform_transfer',
      name: `Platform Transfer — Short-Form`,
      description: `Adapt long-form content DNA for ${sourcePlatform === 'youtube' ? 'TikTok/Reels' : 'YouTube'}`,
      modifications: {
        format: sourcePlatform === 'youtube' ? '60-90s vertical clips' : '8-15 min horizontal',
        hook_adaptation: `Compress hook to first 2 seconds`,
        cta_adaptation: `Drive to link-in-bio or full video`
      },
      projected_performance: { discovery_rate: '3-5x higher', conversion_rate: '40-60% lower per view' }
    }
  ]
}
