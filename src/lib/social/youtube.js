/**
 * YouTube Data API v3 Integration
 * Uploads videos to YouTube (Shorts and long-form)
 */

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/upload/youtube/v3'

class YouTubeConnector {
  constructor(apiKey, oauthToken) {
    this.apiKey = apiKey
    this.oauthToken = oauthToken
    this.baseUrl = YOUTUBE_BASE_URL
  }

  // Get channel info
  async getChannelInfo() {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
        {
          headers: {
            'Authorization': `Bearer ${this.oauthToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      const data = await response.json()
      return data
    } catch (error) {
      console.error('YouTube getChannelInfo error:', error)
      throw error
    }
  }

  // Upload video to YouTube
  async uploadVideo(videoFile, options = {}) {
    const {
      title = 'My Video',
      description = '',
      tags = [],
      categoryId = '22', // People & Blogs
      privacyStatus = 'public', // public, private, unlisted
      isShort = false
    } = options

    const metadata = {
      snippet: {
        title,
        description,
        tags,
        categoryId
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false
      }
    }

    try {
      // For browser: use resumable upload
      // For server: use multipart upload
      
      const params = new URLSearchParams({
        part: 'snippet,status',
        uploadType: 'multipart'
      })

      const formData = new FormData()
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      formData.append('file', videoFile, 'video.mp4')

      const response = await fetch(
        `${this.baseUrl}/videos?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.oauthToken}`,
            'X-Upload-Content-Type': 'video/mp4'
          },
          body: formData
        }
      )

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      return {
        success: true,
        videoId: data.id,
        videoUrl: `https://www.youtube.com/watch?v=${data.id}`,
        isShort: isShort || (data.snippet?.categoryId === '22' && data.status?.privacyStatus === 'public')
      }
    } catch (error) {
      console.error('YouTube uploadVideo error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Upload from URL (for server-side)
  async uploadFromUrl(videoUrl, options = {}) {
    // Note: YouTube doesn't support direct URL uploads
    // This requires downloading first, then uploading
    // For production, use Google Cloud Storage as intermediate
    
    return {
      success: false,
      error: 'YouTube requires direct file upload. Use uploadVideo() with file blob.'
    }
  }

  // Schedule video for later
  async scheduleVideo(videoFile, publishAt, options = {}) {
    const scheduledTime = new Date(publishAt).toISOString()
    
    return await this.uploadVideo(videoFile, {
      ...options,
      privacyStatus: 'private', // Must be private until scheduled time
      scheduledPublishTime: scheduledTime
    })
  }

  // Update video details
  async updateVideo(videoId, updates = {}) {
    const { title, description, tags, privacyStatus } = updates

    const metadata = {
      id: videoId,
      snippet: {},
      status: {}
    }

    if (title !== undefined) metadata.snippet.title = title
    if (description !== undefined) metadata.snippet.description = description
    if (tags !== undefined) metadata.snippet.tags = tags
    if (privacyStatus !== undefined) metadata.status.privacyStatus = privacyStatus

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.oauthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metadata)
        }
      )

      const data = await response.json()
      
      return {
        success: !data.error,
        videoId: data.id,
        error: data.error?.message
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Get video statistics
  async getVideoStats(videoId) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.oauthToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0]
        return {
          success: true,
          stats: {
            views: item.statistics.viewCount,
            likes: item.statistics.likeCount,
            comments: item.statistics.commentCount,
            favorites: item.statistics.favoriteCount,
            publishedAt: item.snippet.publishedAt
          }
        }
      }

      return { success: false, error: 'Video not found' }
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
      const info = await this.getChannelInfo()
      
      if (info.error) {
        return {
          valid: false,
          error: info.error.message
        }
      }

      if (info.items && info.items.length > 0) {
        const channel = info.items[0]
        return {
          valid: true,
          channel: {
            title: channel.snippet.title,
            subscribers: channel.statistics.subscriberCount,
            views: channel.statistics.viewCount,
            videos: channel.statistics.videoCount
          }
        }
      }

      return { valid: false, error: 'No channel found' }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      }
    }
  }
}

export default YouTubeConnector