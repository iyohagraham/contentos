/**
 * Unified Social Media Manager
 * Manages connections and posting across all platforms
 */

import TikTokConnector from './tiktok.js'
import InstagramConnector from './instagram.js'
import YouTubeConnector from './youtube.js'
import FacebookConnector from './facebook.js'

class SocialMediaManager {
  constructor() {
    this.connections = {
      tiktok: null,
      instagram: null,
      youtube: null,
      facebook: null
    }
  }

  // Connect to platform
  connect(platform, credentials) {
    switch (platform) {
      case 'tiktok':
        this.connections.tiktok = new TikTokConnector(
          credentials.accessToken,
          credentials.advertiserId
        )
        break
      case 'instagram':
        this.connections.instagram = new InstagramConnector(
          credentials.accessToken,
          credentials.instagramBusinessId
        )
        break
      case 'youtube':
        this.connections.youtube = new YouTubeConnector(
          credentials.apiKey,
          credentials.oauthToken
        )
        break
      case 'facebook':
        this.connections.facebook = new FacebookConnector(
          credentials.accessToken,
          credentials.pageId
        )
        break
      default:
        throw new Error(`Unknown platform: ${platform}`)
    }

    return true
  }

  // Disconnect from platform
  disconnect(platform) {
    this.connections[platform] = null
    return true
  }

  // Validate connection
  async validateConnection(platform) {
    const connector = this.connections[platform]
    
    if (!connector) {
      return {
        connected: false,
        error: 'Not connected'
      }
    }

    return await connector.validate()
  }

  // Post to single platform
  async post(platform, videoUrl, options = {}) {
    const connector = this.connections[platform]
    
    if (!connector) {
      return {
        success: false,
        error: `Not connected to ${platform}`
      }
    }

    switch (platform) {
      case 'tiktok':
        return await connector.uploadVideo(videoUrl, options)
      case 'instagram':
        return await connector.postReel(videoUrl, options.caption || '')
      case 'youtube':
        return await connector.uploadVideo(videoUrl, options)
      case 'facebook':
        return await connector.postVideo(videoUrl, options)
      default:
        return {
          success: false,
          error: `Unknown platform: ${platform}`
        }
    }
  }

  // Post to multiple platforms at once
  async postToMultiple(platforms, videoUrl, options = {}) {
    const results = {}
    const promises = []

    for (const platform of platforms) {
      const promise = this.post(platform, videoUrl, options)
        .then(result => {
          results[platform] = result
        })
        .catch(error => {
          results[platform] = {
            success: false,
            error: error.message
          }
        })
      
      promises.push(promise)
    }

    await Promise.all(promises)

    const successCount = Object.values(results).filter(r => r.success).length
    
    return {
      success: successCount > 0,
      results,
      summary: {
        total: platforms.length,
        successful: successCount,
        failed: platforms.length - successCount
      }
    }
  }

  // Schedule post for later
  async schedule(platform, videoUrl, scheduledTime, options = {}) {
    const connector = this.connections[platform]
    
    if (!connector) {
      return {
        success: false,
        error: `Not connected to ${platform}`
      }
    }

    switch (platform) {
      case 'tiktok':
        return await connector.scheduleVideo(videoUrl, scheduledTime, options)
      case 'instagram':
        // Instagram scheduling requires business account setup
        return await connector.postReel(videoUrl, options)
      case 'youtube':
        return await connector.scheduleVideo(videoUrl, scheduledTime, options)
      case 'facebook':
        return await connector.scheduleVideo(videoUrl, scheduledTime, options)
      default:
        return {
          success: false,
          error: `Unknown platform: ${platform}`
        }
    }
  }

  // Get analytics from platform
  async getAnalytics(platform, itemId) {
    const connector = this.connections[platform]
    
    if (!connector) {
      return {
        success: false,
        error: `Not connected to ${platform}`
      }
    }

    switch (platform) {
      case 'tiktok':
        return await connector.getVideoAnalytics(itemId)
      case 'instagram':
        return await connector.getInsights(itemId)
      case 'youtube':
        return await connector.getVideoStats(itemId)
      case 'facebook':
        return await connector.getPostInsights(itemId)
      default:
        return {
          success: false,
          error: `Unknown platform: ${platform}`
        }
    }
  }

  // Get all connected platforms
  getConnectedPlatforms() {
    const connected = []
    
    for (const [platform, connector] of Object.entries(this.connections)) {
      if (connector) {
        connected.push(platform)
      }
    }

    return connected
  }

  // Get connection status for all platforms
  getConnectionStatus() {
    return {
      tiktok: !!this.connections.tiktok,
      instagram: !!this.connections.instagram,
      youtube: !!this.connections.youtube,
      facebook: !!this.connections.facebook,
      connectedCount: this.getConnectedPlatforms().length
    }
  }
}

// Singleton instance
const socialMediaManager = new SocialMediaManager()

export default socialMediaManager
export { SocialMediaManager }