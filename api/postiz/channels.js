import PostizClient from '../../src/lib/social/postiz.js'

export default async function handler(req, res) {
  const client = new PostizClient(process.env.POSTIZ_URL, process.env.POSTIZ_API_KEY)

  if (!client.configured) {
    return res.status(400).json({ error: 'Postiz not configured' })
  }

  try {
    const channels = await client.listChannels()
    return res.status(200).json({ channels })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
