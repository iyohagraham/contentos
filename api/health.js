export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    configured: !!process.env.KIMI_API_KEY,
    timestamp: new Date().toISOString() 
  })
}
