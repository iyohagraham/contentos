/**
 * Channel sources — REAL channel data ingestion for the Intelligence Engine.
 *
 * Goal: replace "analyze from the model's memory of a channel" (hallucination-prone)
 * with actual recent videos + stats. Provider-agnostic, serverless-friendly.
 *
 *   detectPlatform(url)        -> 'youtube' | 'instagram' | 'tiktok' | 'unknown'
 *   fetchChannelSamples(url)   -> { platform, channel, samples[], source, supported }
 *
 * YouTube is fully real + KEYLESS via the public Atom feed
 *   https://www.youtube.com/feeds/videos.xml?channel_id=UC...
 * which returns the ~15 most recent uploads with title, description, published date,
 * view count and like count — exactly what DNA extraction needs. Optional
 * YOUTUBE_API_KEY enriches with subscriber counts but is not required.
 *
 * Instagram / TikTok have no reliable keyless channel feed (heavy anti-scraping);
 * we do best-effort oEmbed for a single post and otherwise return supported:false so
 * the caller degrades honestly (AI-estimated, clearly labeled) — never fabricated stats.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

/** @returns {'youtube'|'instagram'|'tiktok'|'unknown'} */
export function detectPlatform(url = '') {
  const u = String(url).toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('tiktok.com')) return 'tiktok'
  if (u.includes('instagram.com')) return 'instagram'
  return 'unknown'
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout || 15000)
  })
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`)
  return res.text()
}

function decodeXml(s = '') {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

// ---------------------------------------------------------------------------
// YouTube
// ---------------------------------------------------------------------------

/**
 * Resolve a channelId (UC...) from any YouTube URL form: /channel/UC..., @handle,
 * /c/custom, /user/legacy, or a video URL. Falls back to scraping the page HTML.
 */
export async function resolveYouTubeChannelId(url) {
  const direct = String(url).match(/\/channel\/(UC[\w-]+)/)
  if (direct) return direct[1]

  // Normalize: a bare @handle URL or video URL — fetch the page and extract the id.
  let pageUrl = url
  if (!/^https?:\/\//.test(pageUrl)) pageUrl = `https://www.youtube.com/${pageUrl.replace(/^\/+/, '')}`
  const sep = pageUrl.includes('?') ? '&' : '?'
  pageUrl = `${pageUrl}${sep}hl=en&gl=US`

  try {
    const html = await fetchText(pageUrl)
    const m =
      html.match(/"channelId":"(UC[\w-]+)"/) ||
      html.match(/"externalId":"(UC[\w-]+)"/) ||
      html.match(/\/channel\/(UC[\w-]+)/) ||
      html.match(/"browseId":"(UC[\w-]+)"/)
    if (m) return m[1]
  } catch {
    /* fall through */
  }
  return null
}

/** Parse the YouTube Atom feed into normalized samples. */
function parseYouTubeFeed(xml) {
  const channelName = decodeXml((xml.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '')
  const channelId = (xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/) || [])[1] || null

  const samples = []
  const entries = xml.split('<entry>').slice(1)
  for (const raw of entries) {
    const entry = raw.split('</entry>')[0]
    const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]
    if (!videoId) continue
    const title = decodeXml((entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '')
    const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || null
    const description = decodeXml((entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '')
    const views = parseInt((entry.match(/<media:statistics[^>]*views="(\d+)"/) || [])[1] || '0', 10) || null
    const likes = parseInt((entry.match(/<media:starRating[^>]*count="(\d+)"/) || [])[1] || '0', 10) || null
    const thumbnail = (entry.match(/<media:thumbnail[^>]*url="([^"]+)"/) || [])[1] || null

    samples.push({
      video_url: `https://www.youtube.com/watch?v=${videoId}`,
      video_id: videoId,
      title,
      description,
      published_at: published,
      views,
      likes,
      comments: null,
      thumbnail_url: thumbnail
    })
  }
  return { channelName, channelId, samples }
}

/** Optional enrichment with the YouTube Data API (subscriber/total counts). */
async function enrichWithYouTubeApi(channelId) {
  const key = process.env.YOUTUBE_API_KEY
  if (!key || !channelId) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${key}`,
      { signal: AbortSignal.timeout(12000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const ch = data.items?.[0]
    if (!ch) return null
    return {
      subscribers: parseInt(ch.statistics?.subscriberCount || '0', 10) || null,
      total_views: parseInt(ch.statistics?.viewCount || '0', 10) || null,
      video_count: parseInt(ch.statistics?.videoCount || '0', 10) || null,
      display_name: ch.snippet?.title || null
    }
  } catch {
    return null
  }
}

async function fetchYouTubeSamples(url, max = 15) {
  const channelId = await resolveYouTubeChannelId(url)
  if (!channelId) {
    return { platform: 'youtube', supported: false, source: 'unresolved', samples: [], channel: {} }
  }
  const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)
  const { channelName, samples } = parseYouTubeFeed(xml)
  const enrich = await enrichWithYouTubeApi(channelId)

  return {
    platform: 'youtube',
    supported: true,
    source: enrich ? 'youtube_rss+api' : 'youtube_rss',
    channel: {
      channel_id: channelId,
      display_name: enrich?.display_name || channelName,
      handle: (url.match(/@([a-zA-Z0-9_.-]+)/) || [])[1] || null,
      subscribers: enrich?.subscribers || null,
      total_views: enrich?.total_views || null,
      video_count: enrich?.video_count || null
    },
    samples: samples.slice(0, max)
  }
}

// ---------------------------------------------------------------------------
// Instagram / TikTok — best-effort oEmbed for a single post; no keyless channel feed
// ---------------------------------------------------------------------------

async function fetchOEmbedPost(url, platform) {
  // TikTok has a public oEmbed; Instagram's needs an app token, so it usually fails — that's fine.
  const endpoints = {
    tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    instagram: `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`
  }
  const ep = endpoints[platform]
  if (!ep) return { platform, supported: false, source: 'unsupported', samples: [], channel: {} }
  try {
    const res = await fetch(ep, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    return {
      platform,
      supported: true,
      source: `${platform}_oembed`,
      channel: { display_name: data.author_name || null, handle: data.author_unique_id || null },
      samples: [
        {
          video_url: url,
          title: data.title || '',
          description: data.title || '',
          published_at: null,
          views: null,
          likes: null,
          comments: null,
          thumbnail_url: data.thumbnail_url || null
        }
      ]
    }
  } catch {
    // No reliable keyless channel-level source for IG/TikTok.
    return { platform, supported: false, source: 'no_keyless_feed', samples: [], channel: {} }
  }
}

/**
 * Fetch real recent content samples for a channel URL.
 * @param {string} url
 * @param {object} [opts] - { max }
 * @returns {Promise<{ platform, supported, source, channel, samples }>}
 */
export async function fetchChannelSamples(url, opts = {}) {
  const platform = detectPlatform(url)
  const max = opts.max || 15
  if (platform === 'youtube') return fetchYouTubeSamples(url, max)
  if (platform === 'tiktok' || platform === 'instagram') return fetchOEmbedPost(url, platform)
  return { platform: 'unknown', supported: false, source: 'unknown_platform', samples: [], channel: {} }
}

/**
 * Classify a sample's performance relative to the set's median view count.
 * @param {number|null} views
 * @param {number} median
 * @returns {'viral'|'hit'|'average'|'miss'|'unknown'}
 */
export function performanceTier(views, median) {
  if (!views || !median) return 'unknown'
  const r = views / median
  if (r >= 3) return 'viral'
  if (r >= 1.3) return 'hit'
  if (r >= 0.5) return 'average'
  return 'miss'
}
