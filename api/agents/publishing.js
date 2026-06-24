/**
 * Publishing Agent — distributes assembled videos via Postiz.
 *
 * Inputs:  { workspace_id, video_id?, batch_size? }
 * Outputs: { published, skipped, errors }
 *
 * Modes:
 *   - video_id provided: publish that specific video now
 *   - no video_id: scan for scheduled videos due in the next window + publish
 *
 * Requires: POSTIZ_URL + POSTIZ_API_KEY env vars.
 * Falls back to queuing in video_posts.status = 'publish_pending' when Postiz not configured.
 */
import { getServerSupabase } from '../_db.js'
import { runAgent } from './_base.js'
import PostizClient from '../../src/lib/social/postiz.js'

function getPostiz() {
  return new PostizClient(
    process.env.POSTIZ_URL,
    process.env.POSTIZ_API_KEY
  )
}

export default async function publishingAgent({ workspace_id, video_id, batch_size = 10, job_id } = {}) {
  return runAgent({
    agentType: 'publishing',
    workspaceId: workspace_id,
    inputs: { video_id, batch_size },
    task: 'Publish ready videos to social platforms via Postiz',
    run: async ({ db }) => {
      const postiz = getPostiz()
      const results = { published: [], skipped: [], errors: [] }

      // Build query for videos to publish
      let query = db
        .from('video_posts')
        .select('id, title, description, script, final_video_url, scene_image_urls, target_platforms, scheduled_time, workspace_id')
        .eq('workspace_id', workspace_id)

      if (video_id) {
        // Single-video mode
        query = query.eq('id', video_id).in('status', ['assembled', 'media_ready', 'approved'])
      } else {
        // Batch mode: find scheduled posts due now (within next 5 min window)
        const now = new Date()
        const windowEnd = new Date(now.getTime() + 5 * 60 * 1000)
        query = query
          .eq('status', 'scheduled')
          .lte('scheduled_time', windowEnd.toISOString())
          .order('scheduled_time', { ascending: true })
          .limit(batch_size)
      }

      const { data: videos, error: queryErr } = await query
      if (queryErr) throw new Error(`DB query failed: ${queryErr.message}`)
      if (!videos?.length) return { published: 0, skipped: 0, message: 'No videos ready to publish' }

      // Get Postiz channel list once (shared for all videos in this batch)
      let postizChannels = []
      if (postiz.configured) {
        const channelResult = await postiz.listChannels()
        if (channelResult.success) postizChannels = channelResult.channels
      }

      for (const video of videos) {
        try {
          // Determine media URLs for this post
          const mediaUrls = buildMediaUrls(video)
          const caption = buildCaption(video)
          const platforms = video.target_platforms || ['youtube', 'tiktok', 'instagram']

          // Mark as publishing (prevents double-publish if cron fires again before done)
          await db.from('video_posts').update({ status: 'publishing' }).eq('id', video.id)

          if (!postiz.configured) {
            // Postiz not set up — mark as pending for when it's configured
            await db.from('video_posts').update({ status: 'publish_pending' }).eq('id', video.id)
            results.skipped.push({ id: video.id, reason: 'Postiz not configured' })
            continue
          }

          // Match target_platforms to Postiz channel IDs
          const channelIds = postizChannels
            .filter(ch => !ch.disabled && platforms.some(p => ch.platform?.toLowerCase().includes(p.toLowerCase())))
            .map(ch => ch.id)

          if (channelIds.length === 0) {
            await db.from('video_posts').update({ status: 'publish_no_channels' }).eq('id', video.id)
            results.skipped.push({ id: video.id, reason: `No Postiz channels match platforms: ${platforms.join(', ')}` })
            continue
          }

          // Publish via Postiz
          const publishResult = await postiz.createPost({
            channelIds,
            content: caption,
            mediaUrls,
            scheduledTime: null  // publish now
          })

          if (!publishResult.success) {
            throw new Error(publishResult.error || 'Postiz publish failed')
          }

          // Update video record
          const now = new Date().toISOString()
          await db.from('video_posts').update({
            status: 'published',
            published_at: now,
            postiz_post_id: publishResult.postId,
            platform_post_ids: { postiz: publishResult.postId }
          }).eq('id', video.id)

          // Seed analytics record
          await db.from('post_analytics').insert({
            workspace_id,
            video_id: video.id,
            platform: 'postiz',
            platform_post_id: publishResult.postId,
            channel_ids: channelIds,
            recorded_at: now
          }).select().single()

          results.published.push({ id: video.id, title: video.title, postiz_id: publishResult.postId, channels: channelIds.length })
        } catch (err) {
          console.error(`[publishing] Video ${video.id} failed:`, err.message)
          await db.from('video_posts').update({ status: 'publish_failed', publish_error: err.message }).eq('id', video.id).catch(() => {})
          results.errors.push({ id: video.id, error: err.message })
        }
      }

      return {
        published: results.published.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
        detail: results,
        postiz_configured: postiz.configured,
        channels_available: postizChannels.length
      }
    }
  })
}

function buildMediaUrls(video) {
  const urls = []
  if (video.final_video_url) urls.push(video.final_video_url)
  else if (video.scene_image_urls?.length > 0) urls.push(...video.scene_image_urls.slice(0, 4))
  return urls
}

function buildCaption(video) {
  const parts = []
  if (video.title) parts.push(video.title)
  if (video.description) parts.push(video.description)
  else if (video.script?.hook) {
    const hook = typeof video.script.hook === 'string' ? video.script.hook : video.script.hook?.text || ''
    if (hook) parts.push(hook.slice(0, 200))
  }
  return parts.join('\n\n').trim() || video.title || 'New video'
}
