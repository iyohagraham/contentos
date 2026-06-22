/**
 * TikTok API Integration
 * Uses TikTok Business API for posting videos
 */

const TIKTOK_BASE_URL = 'https://business-api.tiktok.com/open_api/v1.3'

class TikTokConnector {
  constructor(accessToken, advertiserId) {
    this.accessToken = accessToken
    this.advertiserId = advertiserId
    this.baseUrl = TIKTOK_BASE_URL
  }

  // Get user info
  async getUserInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/user/info/`, {
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      return data
    } catch (error) {
      console.error('TikTok getUserInfo error:', error)
      throw error
    }
  }

  // Upload video to TikTok
  async uploadVideo(videoUrl, options = {}) {
    const {
      title = 'Check out this video!',
      privacy_level = 'PUBLIC_TO_EVERYONE',
      disable_duet = false,
      disable_comment = false,
      disable_stitch = false
    } = options

    try {
      // Step 1: Initiate upload
      const initResponse = await fetch(`${this.baseUrl}/video/upload/`, {
        method: 'POST',
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          advertiser_id: this.advertiserId,
          video_source: 'PULLED_FROM_URL',
          video_url: videoUrl,
          format: 'mp4'
        })
      })

      const initData = await initResponse.json()
      
      if (initData.code !== 0) {
        throw new Error(initData.message || 'Upload initiation failed')
      }

      const videoId = initData.data?.video_id

      // Step 2: Create post
      const postResponse = await fetch(`${this.baseUrl}/video/publish/`, {
        method: 'POST',
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          advertiser_id: this.advertiserId,
          video_id: videoId,
          title,
          privacy_level,
          disable_duet,
          disable_comment,
          disable_stitch
        })
      })

      const postData = await postResponse.json()
      
      return {
        success: postData.code === 0,
        itemId: postData.data?.item_id,
        shareUrl: postData.data?.share_url,
        message: postData.message
      }
    } catch (error) {
      console.error('TikTok uploadVideo error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Schedule video post
  async scheduleVideo(videoUrl, scheduleTime, options = {}) {
    try {
      // TikTok requires scheduling through their platform
      // This is a simplified version - full implementation needs webhook
      const result = await this.uploadVideo(videoUrl, options)
      
      if (result.success) {
        return {
          ...result,
          scheduled: true,
          scheduledTime: scheduleTime.toISOString()
        }
      }
      
      return result
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Get video analytics
  async getVideoAnalytics(itemId, metrics = ['view', 'like', 'comment', 'share']) {
    try {
      const response = await fetch(`${this.baseUrl}/video/analytics/`, {
        method: 'POST',
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          advertiser_id: this.advertiserId,
          item_id: itemId,
          metrics
        })
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('TikTok getVideoAnalytics error:', error)
      throw error
    }
  }

  // Validate connection
  async validate() {
    try {
      const info = await this.getUserInfo()
      return {
        valid: info.code === 0,
        user: info.data?.user_info,
        error: info.message
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      }
    }
  }
}

export default TikTokConnector