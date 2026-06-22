/**
 * Facebook Pages API Integration
 * Posts videos to Facebook Pages and Reels
 */

const FACEBOOK_BASE_URL = 'https://graph.facebook.com/v18.0'

class FacebookConnector {
  constructor(accessToken, pageId) {
    this.accessToken = accessToken
    this.pageId = pageId
    this.baseUrl = FACEBOOK_BASE_URL
  }

  // Get Page info
  async getPageInfo() {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.pageId}?fields=name,username,picture,followers_count`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Facebook getPageInfo error:', error)
      throw error
    }
  }

  // Create video post on Page
  async postVideo(videoUrl, options = {}) {
    const {
      title = 'Check out this video!',
      description = '',
      published = true,
      scheduled_publish_time = null,
      thumbnail_url = null
    } = options

    const params = new URLSearchParams({
      file_url: videoUrl,
      title,
      description,
      published: published.toString(),
      access_token: this.accessToken
    })

    if (scheduled_publish_time) {
      params.append('scheduled_publish_time', scheduled_publish_time.toString())
    }

    if (thumbnail_url) {
      params.append('thumbnail_url', thumbnail_url)
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.pageId}/videos?${params.toString()}`,
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
        videoId: data.id,
        postId: data.id,
        postUrl: `https://facebook.com/${this.pageId}/videos/${data.id}`,
        scheduled: !!scheduled_publish_time
      }
    } catch (error) {
      console.error('Facebook postVideo error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Post Reel to Facebook
  async postReel(videoUrl, options = {}) {
    const { caption = '', thumbnail_url = null } = options

    // Facebook Reels use the same video endpoint with specific formatting
    return await this.postVideo(videoUrl, {
      ...options,
      title: caption.substring(0, 100), // Reel title limit
      description: caption
    })
  }

  // Schedule video post
  async scheduleVideo(videoUrl, scheduledTime, options = {}) {
    const timestamp = Math.floor(new Date(scheduledTime).getTime() / 1000)
    
    return await this.postVideo(videoUrl, {
      ...options,
      published: false,
      scheduled_publish_time: timestamp
    })
  }

  // Get post insights
  async getPostInsights(postId, metrics = ['impressions', 'reach', 'engagement', 'video_views']) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${postId}/insights?metric=${metrics.join(',')}&access_token=${this.accessToken}`,
        {
          method: 'GET'
        }
      )

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      // Format insights
      const insights = {}
      data.data?.forEach(metric => {
        insights[metric.name] = metric.values?.[0]?.value || 0
      })

      return {
        success: true,
        insights
      }
    } catch (error) {
      console.error('Facebook getPostInsights error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Delete video post
  async deletePost(postId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${postId}?access_token=${this.accessToken}`,
        {
          method: 'DELETE'
        }
      )

      const data = await response.json()
      return {
        success: data === true,
        message: 'Post deleted successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Get comments on post
  async getComments(postId, limit = 10) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${postId}/comments?limit=${limit}&access_token=${this.accessToken}`,
        {
          method: 'GET'
        }
      )

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        success: true,
        comments: data.data || [],
        paging: data.paging
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Validate connection
  async validate() {
    try {
      const info = await this.getPageInfo()
      
      if (info.error) {
        return {
          valid: false,
          error: info.error.message
        }
      }

      return {
        valid: true,
        page: {
          name: info.name,
          username: info.username,
          followers: info.followers_count
        }
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      }
    }
  }
}

export default FacebookConnector