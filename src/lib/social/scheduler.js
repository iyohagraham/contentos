/**
 * Auto-Posting Scheduler
 * Manages scheduled posts across all platforms
 */

import socialMediaManager from './manager.js'

class AutoPostingScheduler {
  constructor() {
    this.scheduledPosts = []
    this.isRunning = false
    this.checkInterval = null
    this.INTERVAL_MS = 60000 // Check every minute
  }

  // Start the scheduler
  start() {
    if (this.isRunning) return

    this.isRunning = true
    
    this.checkInterval = setInterval(() => {
      this.checkAndPost()
    }, this.INTERVAL_MS)

    console.log('🕐 Auto-posting scheduler started')
  }

  // Stop the scheduler
  stop() {
    this.isRunning = false
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    console.log('⏹️ Auto-posting scheduler stopped')
  }

  // Schedule a new post
  schedule(data) {
    const {
      platforms,
      videoUrl,
      scheduledTime,
      options = {}
    } = data

    const scheduledPost = {
      id: this.generateId(),
      platforms: platforms || ['tiktok'],
      videoUrl,
      scheduledTime: new Date(scheduledTime),
      options,
      status: 'scheduled',
      createdAt: new Date(),
      results: {}
    }

    this.scheduledPosts.push(scheduledPost)
    
    console.log(`📅 Scheduled post ${scheduledPost.id} for ${scheduledPost.scheduledTime.toISOString()}`)
    
    return scheduledPost
  }

  // Check for posts ready to publish
  async checkAndPost() {
    const now = new Date()
    const readyPosts = this.scheduledPosts.filter(
      post => post.status === 'scheduled' && post.scheduledTime <= now
    )

    for (const post of readyPosts) {
      await this.executePost(post)
    }
  }

  // Execute the post
  async executePost(post) {
    console.log(`🚀 Executing scheduled post ${post.id}`)
    
    post.status = 'posting'

    try {
      const result = await socialMediaManager.postToMultiple(
        post.platforms,
        post.videoUrl,
        post.options
      )

      post.results = result.results
      post.status = result.success ? 'published' : 'failed'
      post.publishedAt = new Date()

      if (result.success) {
        console.log(`✅ Post ${post.id} published successfully to ${result.summary.successful}/${result.summary.total} platforms`)
      } else {
        console.error(`❌ Post ${post.id} failed: ${JSON.stringify(result.results)}`)
      }
    } catch (error) {
      post.status = 'failed'
      post.error = error.message
      console.error(`❌ Post ${post.id} error:`, error)
    }
  }

  // Cancel a scheduled post
  cancel(postId) {
    const index = this.scheduledPosts.findIndex(p => p.id === postId)
    
    if (index === -1) {
      return {
        success: false,
        error: 'Scheduled post not found'
      }
    }

    const post = this.scheduledPosts[index]
    
    if (post.status !== 'scheduled') {
      return {
        success: false,
        error: `Cannot cancel post with status: ${post.status}`
      }
    }

    post.status = 'cancelled'
    console.log(`🗑️ Cancelled scheduled post ${postId}`)

    return {
      success: true,
      message: 'Post cancelled'
    }
  }

  // Get all scheduled posts
  getScheduledPosts(status = null) {
    let posts = this.scheduledPosts

    if (status) {
      posts = posts.filter(p => p.status === status)
    }

    return posts.sort((a, b) => b.scheduledTime - a.scheduledTime)
  }

  // Get upcoming posts
  getUpcomingPosts(limit = 10) {
    return this.scheduledPosts
      .filter(p => p.status === 'scheduled' && p.scheduledTime > new Date())
      .sort((a, b) => a.scheduledTime - b.scheduledTime)
      .slice(0, limit)
  }

  // Get post by ID
  getPost(postId) {
    return this.scheduledPosts.find(p => p.id === postId)
  }

  // Generate unique ID
  generateId() {
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get scheduler stats
  getStats() {
    const total = this.scheduledPosts.length
    const scheduled = this.scheduledPosts.filter(p => p.status === 'scheduled').length
    const published = this.scheduledPosts.filter(p => p.status === 'published').length
    const failed = this.scheduledPosts.filter(p => p.status === 'failed').length
    const cancelled = this.scheduledPosts.filter(p => p.status === 'cancelled').length

    return {
      isRunning: this.isRunning,
      total,
      scheduled,
      published,
      failed,
      cancelled,
      upcoming: this.getUpcomingPosts().length
    }
  }

  // Clear old posts (older than 30 days)
  clearOldPosts(days = 30) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const before = this.scheduledPosts.length
    this.scheduledPosts = this.scheduledPosts.filter(
      p => p.createdAt > cutoff
    )
    const removed = before - this.scheduledPosts.length

    console.log(`🧹 Cleared ${removed} old scheduled posts`)
    
    return removed
  }
}

// Singleton instance
const scheduler = new AutoPostingScheduler()

// Auto-start scheduler
scheduler.start()

export default scheduler
export { AutoPostingScheduler }