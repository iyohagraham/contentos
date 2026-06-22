import express from 'express'
import socialMediaManager from '../src/lib/social/manager.js'
import scheduler from '../src/lib/social/scheduler.js'

const router = express.Router()

// Connect to platform
router.post('/connect', async (req, res) => {
  try {
    const { platform, credentials } = req.body
    
    if (!platform || !credentials) {
      return res.status(400).json({ error: 'Platform and credentials required' })
    }

    socialMediaManager.connect(platform, credentials)
    
    const validation = await socialMediaManager.validateConnection(platform)
    
    res.json({
      success: validation.valid,
      platform,
      account: validation.account || validation.channel || validation.page || validation.user,
      error: validation.error
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Disconnect from platform
router.post('/disconnect/:platform', async (req, res) => {
  try {
    const { platform } = req.params
    socialMediaManager.disconnect(platform)
    res.json({ success: true, message: `Disconnected from ${platform}` })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get connection status
router.get('/status', async (req, res) => {
  try {
    const status = socialMediaManager.getConnectionStatus()
    
    // Validate each connection
    const detailed = {}
    for (const platform of Object.keys(status)) {
      if (platform !== 'connectedCount' && status[platform]) {
        const validation = await socialMediaManager.validateConnection(platform)
        detailed[platform] = {
          connected: true,
          valid: validation.valid,
          account: validation.account || validation.channel || validation.page,
          error: validation.error
        }
      }
    }

    res.json({
      ...status,
      platforms: detailed
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Post to platform
router.post('/post', async (req, res) => {
  try {
    const { platform, videoUrl, options = {} } = req.body
    
    if (!platform || !videoUrl) {
      return res.status(400).json({ error: 'Platform and videoUrl required' })
    }

    const result = await socialMediaManager.post(platform, videoUrl, options)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Post to multiple platforms
router.post('/post-multi', async (req, res) => {
  try {
    const { platforms, videoUrl, options = {} } = req.body
    
    if (!platforms || !videoUrl) {
      return res.status(400).json({ error: 'Platforms and videoUrl required' })
    }

    const result = await socialMediaManager.postToMultiple(platforms, videoUrl, options)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Schedule post
router.post('/schedule', async (req, res) => {
  try {
    const { platforms, videoUrl, scheduledTime, options = {} } = req.body
    
    if (!platforms || !videoUrl || !scheduledTime) {
      return res.status(400).json({ error: 'Platforms, videoUrl, and scheduledTime required' })
    }

    const scheduled = scheduler.schedule({
      platforms,
      videoUrl,
      scheduledTime: new Date(scheduledTime),
      options
    })

    res.json({
      success: true,
      scheduled
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get scheduled posts
router.get('/scheduled', async (req, res) => {
  try {
    const { status } = req.query
    const posts = scheduler.getScheduledPosts(status || null)
    res.json({ posts })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get upcoming posts
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const posts = scheduler.getUpcomingPosts(parseInt(limit))
    res.json({ posts })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Cancel scheduled post
router.post('/cancel/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    const result = scheduler.cancel(postId)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get scheduler stats
router.get('/stats', async (req, res) => {
  try {
    const stats = scheduler.getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get analytics for a post
router.get('/analytics/:platform/:itemId', async (req, res) => {
  try {
    const { platform, itemId } = req.params
    const analytics = await socialMediaManager.getAnalytics(platform, itemId)
    res.json(analytics)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router