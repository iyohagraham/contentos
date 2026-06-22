/**
 * Instagram Graph API Integration
 * Posts to Instagram Reels via Facebook Graph API
 */

const INSTAGRAM_BASE_URL = 'https://graph.facebook.com/v18.0'

class InstagramConnector {
  constructor(accessToken, instagramBusinessId) {
    this.accessToken = accessToken
    this.instagramBusinessId = instagramBusinessId
    this.baseUrl = INSTAGRAM_BASE_URL
  }

  // Get Instagram account info
  async getAccountInfo() {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.instagramBusinessId}?fields=username,name,profile_picture_url,followers_count`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Instagram getAccountInfo error:', error)
      throw error
    }
  }

  // Create media container (Reel)
  async createMediaContainer(videoUrl, caption = '', thumbnailUrl = null) {
    try {
      const params = new URLSearchParams({
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        access_token: this.accessToken
      })

      if (thumbnailUrl) {
        params.append('thumbnail_url', thumbnailUrl)
      }

      const response = await fetch(
        `${this.baseUrl}/${this.instagramBusinessId}/media?${params.toString()}`,
        {
          method: 'POST'
        }
      )

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        success: true,
        containerId: data.id
      }
    } catch (error) {
      console.error('Instagram createMediaContainer error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Publish media container
  async publishMedia(containerId) {
    try {
      const params = new URLSearchParams({
        creation_id: containerId,
        access_token: this.accessToken
      })

      const response = await fetch(
        `${this.baseUrl}/${this.instagramBusinessId}/media_publish?${params.toString()}`,
        {
          method: 'POST'
        }
      )

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        success: true,
        mediaId: data.id,
        postId: data.id
      }
    } catch (error) {
      console.error('Instagram publishMedia error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Upload and publish Reel (complete flow)
  async postReel(videoUrl, caption = '', options = {}) {
    const { thumbnailUrl = null } = options

    try {
      // Step 1: Create container
      const containerResult = await this.createMediaContainer(videoUrl, caption, thumbnailUrl)
      
      if (!containerResult.success) {
        return containerResult
      }

      // Step 2: Publish
      const publishResult = await this.publishMedia(containerResult.containerId)
      
      if (!publishResult.success) {
        return publishResult
      }

      return {
        ...publishResult,
        containerId: containerResult.containerId,
        platform: 'instagram',
        type: 'reel'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Check publishing status
  async checkPublishStatus(containerId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${containerId}?fields=status_code,status_message&access_token=${this.accessToken}`,
        {
          method: 'GET'
        }
      )

      const data = await response.json()
      
      return {
        statusCode: data.status_code,
        statusMessage: data.status_message,
        isComplete: data.status_code === 'FINISHED'
      }
    } catch (error) {
      console.error('Instagram checkPublishStatus error:', error)
      throw error
    }
  }

  // Get media insights
  async getInsights(mediaId, metrics = ['reach', 'impressions', 'likes', 'comments', 'shares', 'plays']) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${this.accessToken}`,
        {
          method: 'GET'
        }
      )

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Instagram getInsights error:', error)
      throw error
    }
  }

  // Validate connection
  async validate() {
    try {
      const info = await this.getAccountInfo()
      return {
        valid: !info.error,
        account: {
          username: info.username,
          name: info.name,
          followers: info.followers_count
        },
        error: info.error?.message
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      }
    }
  }
}

export default InstagramConnector