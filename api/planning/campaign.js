/**
 * POST /api/planning/campaign
 * Create a content campaign, series, or launch sequence.
 * Auto-generates the content plan for the campaign.
 *
 * Body: { workspace_id, name, campaign_type, goal, start_date, end_date, target_post_count, target_platforms }
 * campaign_type: campaign | series | launch
 */
import { getServerSupabase } from '../_db.js'
import { textGenerateJSON } from '../_providers/text.js'
import { buildRAGContext } from '../knowledge/rag.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    workspace_id, name, campaign_type = 'campaign', goal,
    start_date, end_date, target_post_count = 10,
    target_platforms = ['youtube', 'tiktok']
  } = req.body

  if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name required' })

  const db = getServerSupabase()

  // Create campaign record
  let campaign = { id: `local_${Date.now()}`, name, campaign_type }
  if (db) {
    const { data, error } = await db.from('campaigns').insert({
      workspace_id, name, campaign_type, goal,
      start_date, end_date, target_post_count, target_platforms,
      status: 'planning'
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    campaign = data
  }

  // Generate campaign content plan
  const ragContext = await buildRAGContext(workspace_id, `${campaign_type} content planning ${goal || name}`)
  const daySpan = start_date && end_date
    ? Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000)
    : 21

  const prompt = `Create a detailed ${campaign_type} content plan.

Campaign: "${name}"
Type: ${campaign_type}
Goal: ${goal || 'grow audience and drive engagement'}
Duration: ${daySpan} days (${start_date || 'starting now'} to ${end_date || `+${daySpan} days`})
Target posts: ${target_post_count}
Platforms: ${target_platforms.join(', ')}

${campaign_type === 'series' ? 'Create an episodic series with connected narrative and clear episode numbers.' : ''}
${campaign_type === 'launch' ? 'Structure as: awareness phase (40%) → launch day content (30%) → post-launch follow-up (30%).' : ''}
${campaign_type === 'campaign' ? 'Coordinate content across platforms with consistent theme and escalating engagement.' : ''}

Generate the content plan. Each post should build on the previous one.
Return JSON:
{
  "strategy": "one paragraph campaign strategy",
  "phases": [{"name": "Phase 1", "days": "1-7", "goal": "..."}],
  "posts": [
    {
      "position": 1,
      "title": "Specific video title",
      "topic": "detailed topic",
      "content_pillar": "Educational",
      "platforms": ["youtube"],
      "scheduled_date": "YYYY-MM-DD",
      "is_anchor_post": true,
      "hook_angle": "specific hook",
      "cta": "what action to drive",
      "connects_to": "how this connects to next post or campaign arc"
    }
  ]
}`

  try {
    const plan = await textGenerateJSON(prompt, { maxTokens: 3000 })
    const posts = plan.posts || []

    const createdPosts = []
    if (db && posts.length > 0) {
      for (const post of posts) {
        const { data: video } = await db.from('videos').insert({
          workspace_id, title: post.title, topic: post.topic,
          status: 'draft', target_platforms: post.platforms || target_platforms,
          scheduled_time: post.scheduled_date ? `${post.scheduled_date}T09:00:00Z` : null
        }).select().single()

        if (video) {
          await db.from('campaign_posts').insert({
            campaign_id: campaign.id,
            video_id: video.id,
            position: post.position,
            is_anchor_post: post.is_anchor_post || false,
            notes: post.connects_to
          })
          await db.from('content_calendar').insert({
            workspace_id, video_id: video.id, campaign_id: campaign.id,
            scheduled_date: post.scheduled_date,
            content_pillar: post.content_pillar,
            status: 'planned'
          })
          createdPosts.push(video)
        }
      }

      await db.from('campaigns').update({
        status: 'active',
        total_posts: createdPosts.length
      }).eq('id', campaign.id)
    }

    return res.status(200).json({
      campaign,
      strategy: plan.strategy,
      phases: plan.phases,
      posts_created: createdPosts.length,
      posts: posts
    })
  } catch (err) {
    console.error('[planning/campaign]', err)
    return res.status(500).json({ error: err.message })
  }
}
