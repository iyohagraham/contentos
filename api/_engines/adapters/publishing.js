/**
 * Publishing Engine (#18) — adapter (LIVE).
 *
 * Final pipeline stage: takes a RENDER_RESULT (the finished video) + caption +
 * target channels and publishes/schedules via Postiz. Provider-agnostic (Postiz is
 * the vendor-neutral layer). Honest: when Postiz isn't configured it returns a
 * request-spec (selected:false) instead of fabricating a publish.
 *
 * input:  { render_result | video_url, caption?, channelIds?, scheduledTime?, story? }
 * output: { published, scheduled?, post?, channels?, selected?, message? }
 */
import { defineEngine } from '../_base.js'
import PostizClient from '../../../src/lib/social/postiz.js'

function client() {
  return new PostizClient(process.env.POSTIZ_URL, process.env.POSTIZ_API_KEY)
}

export default defineEngine({
  id: 'publishing',
  name: 'Publishing Engine',
  responsibility: 'Schedule + publish to YT/IG/TikTok/FB/LinkedIn/X with metadata, tags, descriptions.',
  status: 'live',
  inputs: ['render_result'],
  outputs: [],
  run: async (input = {}) => {
    const videoUrl = input.video_url || input.render_result?.url || input.render_result?.video_url || ''
    const caption = input.caption || input.story?.title || input.story?.hook || ''

    const postiz = client()
    if (!postiz.configured) {
      return {
        published: false, selected: false,
        video_url: videoUrl, caption,
        message: 'Postiz not configured — set POSTIZ_URL + POSTIZ_API_KEY. Returning publish request spec.'
      }
    }

    if (!videoUrl) throw new Error('publishing: a render_result.url (video) is required')

    // Resolve channels: explicit ids, else all enabled connected channels.
    let channelIds = Array.isArray(input.channelIds) ? input.channelIds : []
    if (!channelIds.length) {
      const ch = await postiz.listChannels()
      if (!ch.success) return { published: false, error: ch.error, message: 'Could not list Postiz channels' }
      channelIds = (ch.channels || []).filter((c) => !c.disabled).map((c) => c.id)
    }
    if (!channelIds.length) return { published: false, message: 'No connected Postiz channels to publish to' }

    const result = await postiz.createPost({
      channelIds,
      content: caption,
      mediaUrls: videoUrl ? [videoUrl] : [],
      scheduledTime: input.scheduledTime || null
    })

    if (!result.success) return { published: false, error: result.error, message: 'Postiz publish failed' }

    return {
      published: !result.scheduled,
      scheduled: !!result.scheduled,
      scheduledTime: result.scheduledTime || null,
      channels: channelIds,
      post: result.data || result.postId || null,
      video_url: videoUrl
    }
  }
})