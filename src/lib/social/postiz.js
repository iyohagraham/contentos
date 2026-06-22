/**
 * Postiz Integration Client
 * ─────────────────────────
 * Postiz (https://postiz.com) is an open-source social scheduler that has
 * already completed the TikTok / Instagram / YouTube / Facebook developer
 * approvals. You connect your accounts to Postiz once (via its UI), then
 * ContentOS posts through Postiz's PUBLIC API — no per-platform OAuth here.
 *
 * Self-hosted Postiz exposes a public API at:  {POSTIZ_URL}/public/v1
 * Auth header:  Authorization: <API_KEY>   (no "Bearer " prefix)
 *
 * Get your API key in Postiz: Settings → Public API.
 *
 * NOTE: Endpoint paths can vary slightly between Postiz versions. This client
 * centralises them so there's one place to adjust if your version differs.
 */

const DEFAULT_TIMEOUT = 20000

class PostizClient {
  constructor(baseUrl, apiKey) {
    // normalise: strip trailing slash, ensure /public/v1 suffix
    const root = (baseUrl || '').replace(/\/+$/, '')
    this.apiRoot = root.endsWith('/public/v1') ? root : `${root}/public/v1`
    this.apiKey = apiKey || ''
  }

  get configured() {
    return !!(this.apiRoot && this.apiKey)
  }

  async _request(path, { method = 'GET', body = null } = {}) {
    if (!this.configured) {
      return { success: false, error: 'Postiz not configured (missing URL or API key)' }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

    try {
      const res = await fetch(`${this.apiRoot}${path}`, {
        method,
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      const text = await res.text()
      let data
      try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }

      if (!res.ok) {
        return { success: false, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}`, data }
      }
      return { success: true, status: res.status, data }
    } catch (err) {
      return { success: false, error: err.name === 'AbortError' ? 'Request timed out' : err.message }
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * List connected channels (Postiz calls them "integrations").
   * Returns normalised: [{ id, name, platform, picture, disabled }]
   */
  async listChannels() {
    const result = await this._request('/integrations')
    if (!result.success) return result

    const raw = Array.isArray(result.data) ? result.data : (result.data?.integrations || [])
    const channels = raw.map(i => ({
      id: i.id,
      name: i.name || i.profile || 'Unnamed',
      // Postiz uses "providerIdentifier" e.g. 'instagram','tiktok','youtube','facebook'
      platform: i.providerIdentifier || i.provider || i.identifier,
      picture: i.picture || i.avatar || null,
      disabled: !!i.disabled,
      raw: i
    }))

    return { success: true, channels }
  }

  /**
   * Publish (or schedule) a post to one or more Postiz channels.
   *
   * @param {Object} opts
   * @param {string[]} opts.channelIds  Postiz integration IDs to post to
   * @param {string}   opts.content     Caption / text
   * @param {string[]} [opts.mediaUrls] Public URLs of video/image assets
   * @param {Date|string|null} [opts.scheduledTime] null/now = publish immediately
   */
  async createPost({ channelIds, content, mediaUrls = [], scheduledTime = null }) {
    if (!channelIds || channelIds.length === 0) {
      return { success: false, error: 'No channelIds provided' }
    }

    const when = scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString()
    const type = scheduledTime ? 'schedule' : 'now'

    // Postiz expects per-integration post objects.
    const posts = channelIds.map(id => ({
      integration: { id },
      value: [
        {
          content,
          ...(mediaUrls.length ? { image: mediaUrls.map(url => ({ path: url })) } : {})
        }
      ]
    }))

    const body = { type, date: when, posts }

    const result = await this._request('/posts', { method: 'POST', body })
    if (!result.success) return result

    return {
      success: true,
      postId: result.data?.id || result.data?.postId || null,
      scheduled: type === 'schedule',
      scheduledTime: when,
      data: result.data
    }
  }

  /** Verify the URL + key work and return the connected channel count. */
  async validate() {
    const result = await this.listChannels()
    if (!result.success) {
      return { valid: false, error: result.error }
    }
    return {
      valid: true,
      channelCount: result.channels.length,
      channels: result.channels
    }
  }
}

export default PostizClient
