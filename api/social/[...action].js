/**
 * Social API — all social actions now route through Postiz.
 * Direct platform connectors (TikTok, Instagram, YouTube, Facebook) are removed.
 * Connect accounts once in Postiz UI; ContentOS posts through Postiz's public API.
 *
 * Routes: /api/social/channels, /api/social/post, /api/social/validate
 */
import PostizClient from '../../src/lib/social/postiz.js'

function getPostiz() {
  return new PostizClient(process.env.POSTIZ_URL, process.env.POSTIZ_API_KEY)
}

export default async function handler(req, res) {
  const segments = req.query.action || []
  const action = Array.isArray(segments) ? segments[0] : segments
  const postiz = getPostiz()

  try {
    switch (action) {
      case 'channels': {
        if (!postiz.configured) return res.json({ channels: [], configured: false, message: 'Set POSTIZ_URL + POSTIZ_API_KEY in Vercel env' })
        const result = await postiz.listChannels()
        return res.json(result)
      }

      case 'validate': {
        if (!postiz.configured) return res.json({ valid: false, message: 'Postiz not configured' })
        const result = await postiz.validate()
        return res.json(result)
      }

      case 'post': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        if (!postiz.configured) return res.status(503).json({ error: 'Postiz not configured' })
        const { channelIds, content, mediaUrls, scheduledTime } = req.body
        const result = await postiz.createPost({ channelIds, content, mediaUrls, scheduledTime })
        return res.json(result)
      }

      case 'status': {
        return res.json({
          provider: 'postiz',
          configured: postiz.configured,
          postiz_url: process.env.POSTIZ_URL ? '(set)' : '(not set)',
          message: postiz.configured ? 'Postiz connected' : 'Set POSTIZ_URL + POSTIZ_API_KEY'
        })
      }

      // Legacy action aliases for backwards compatibility
      case 'connect':
        return res.status(410).json({ error: 'Direct platform connect removed. Connect via Postiz UI instead.', docs: 'https://docs.postiz.app' })

      case 'post-multi': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        if (!postiz.configured) return res.status(503).json({ error: 'Postiz not configured' })
        const { channelIds, content, mediaUrls, scheduledTime } = req.body
        const result = await postiz.createPost({ channelIds, content, mediaUrls, scheduledTime })
        return res.json(result)
      }

      case 'analytics': {
        if (!postiz.configured) return res.status(503).json({ error: 'Postiz not configured' })
        const channelId = segments[1]
        const period = req.query.period || '30d'
        if (channelId) {
          const result = await postiz.getChannelAnalytics(channelId, period)
          return res.json(result)
        }
        const result = await postiz.getAggregatedAnalytics(period)
        return res.json(result)
      }

      default:
        return res.status(404).json({ error: `Unknown action: ${action}`, available: ['channels', 'validate', 'post', 'status', 'analytics'] })
    }
  } catch (error) {
    console.error('[social API]', error)
    return res.status(500).json({ error: error.message })
  }
}
