import PostizClient from '../../src/lib/social/postiz.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const client = new PostizClient(process.env.POSTIZ_URL, process.env.POSTIZ_API_KEY)

  if (!client.configured) {
    return res.status(400).json({ error: 'Postiz not configured' })
  }

  try {
    const { channelId, postId, period = '30d' } = req.query

    if (channelId) {
      // Get analytics for specific channel
      const result = await client.getChannelAnalytics(channelId, period)
      return res.status(result.success ? 200 : 502).json(result)
    } else if (postId) {
      // Get analytics for specific post
      const result = await client.getPostAnalytics(postId)
      return res.status(result.success ? 200 : 502).json(result)
    } else {
      // Get aggregated analytics
      const result = await client.getAggregatedAnalytics(period)
      return res.status(result.success ? 200 : 502).json(result)
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
