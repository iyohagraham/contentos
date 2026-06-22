import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env.local first, then .env
dotenv.config({ path: ['.env.local', '.env'] })

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Load API handlers
const generateScript = (await import('./api/generate-script.js')).default
const generateStrategy = (await import('./api/generate-strategy.js')).default
const generateIdeas = (await import('./api/generate-ideas.js')).default
const generateComposition = (await import('./api/generate-composition.js')).default
const analytics = (await import('./api/analytics.js')).default
const socialRouter = (await import('./api/social.js')).default
const postizStatus = (await import('./api/postiz/status.js')).default
const postizChannels = (await import('./api/postiz/channels.js')).default
const postizPost = (await import('./api/postiz/post.js')).default

// Routes
app.post('/api/generate-script', generateScript)
app.post('/api/generate-strategy', generateStrategy)
app.post('/api/generate-ideas', generateIdeas)
app.post('/api/generate-composition', generateComposition)
app.get('/api/analytics', analytics)

// Social media APIs
app.use('/api/social', socialRouter)

// Postiz proxy — route to individual handlers
app.get('/api/postiz/status', postizStatus)
app.get('/api/postiz/channels', postizChannels)
app.post('/api/postiz/post', postizPost)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    kimiconfigured: !!process.env.KIMI_API_KEY,
    timestamp: new Date().toISOString() 
  })
})

app.listen(PORT, () => {
  console.log(`🚀 ContentOS API Server running on http://localhost:${PORT}`)
  console.log(`📝 Kimi API configured: ${!!process.env.KIMI_API_KEY}`)
})