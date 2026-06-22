/**
 * Serverless social media API (Vercel catch-all route)
 * Handles: /api/social/connect, /api/social/post, /api/social/post-multi,
 *          /api/social/schedule, /api/social/status, /api/social/analytics
 *
 * NOTE: In serverless, persistent scheduling (setInterval) is not available.
 * Scheduled posts are stored in the database and triggered by a Vercel Cron
 * job (see vercel.json crons -> /api/cron/process-scheduled).
 */

import socialMediaManager from '../../src/lib/social/manager.js'

export default async function handler(req, res) {
  // action is an array from the catch-all route, e.g. ['post'] or ['analytics','tiktok','123']
  const segments = req.query.action || []
  const action = Array.isArray(segments) ? segments[0] : segments

  try {
    switch (action) {
      case 'connect': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { platform, credentials } = req.body
        socialMediaManager.connect(platform, credentials)
        const validation = await socialMediaManager.validateConnection(platform)
        return res.json({ success: validation.valid, platform, ...validation })
      }

      case 'status': {
        const status = socialMediaManager.getConnectionStatus()
        return res.json(status)
      }

      case 'post': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { platform, videoUrl, options = {} } = req.body
        const result = await socialMediaManager.post(platform, videoUrl, options)
        return res.json(result)
      }

      case 'post-multi': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })
        const { platforms, videoUrl, options = {} } = req.body
        const result = await socialMediaManager.postToMultiple(platforms, videoUrl, options)
        return res.json(result)
      }

      case 'analytics': {
        // /api/social/analytics/:platform/:itemId
        const platform = segments[1]
        const itemId = segments[2]
        const analytics = await socialMediaManager.getAnalytics(platform, itemId)
        return res.json(analytics)
      }

      default:
        return res.status(404).json({ error: `Unknown action: ${action}` })
    }
  } catch (error) {
    console.error('Social API error:', error)
    return res.status(500).json({ error: error.message })
  }
}