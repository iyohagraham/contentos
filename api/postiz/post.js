import PostizClient from '../../src/lib/social/postiz.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const client = new PostizClient(process.env.POSTIZ_URL, process.env.POSTIZ_API_KEY)

  if (!client.configured) {
    return res.status(400).json({ error: 'Postiz not configured' })
  }

  try {
    const { channelIds, content, mediaUrls, scheduledTime } = req.body
    const result = await client.createPost({
      channelIds,
      content,
      mediaUrls,
      scheduledTime
    })
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
