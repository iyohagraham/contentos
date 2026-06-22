import PostizClient from '../../src/lib/social/postiz.js'

export default async function handler(req, res) {
  const client = new PostizClient(process.env.POSTIZ_URL, process.env.POSTIZ_API_KEY)

  if (!client.configured) {
    return res.status(200).json({
      configured: false,
      message: 'Postiz not connected. Set POSTIZ_URL and POSTIZ_API_KEY.'
    })
  }

  try {
    const validation = await client.validate()
    return res.status(200).json({
      configured: true,
      channelCount: validation.channelCount
    })
  } catch (error) {
    return res.status(500).json({
      configured: false,
      error: error.message
    })
  }
}
