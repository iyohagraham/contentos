/**
 * Formatters - bridge raw DB values to display strings
 * the existing views expect.
 */

// 12500 -> "12.5K", 1200000 -> "1.2M"
export function formatCount(n) {
  if (n == null) return '0'
  const num = typeof n === 'string' ? parseFloat(n.replace(/[^0-9.]/g, '')) : n
  if (isNaN(num)) return '0'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(num)
}

// 3915 -> "$3,915"
export function formatMoney(n) {
  const num = typeof n === 'string' ? parseFloat(n.replace(/[^0-9.]/g, '')) : n
  if (isNaN(num) || num == null) return '$0'
  return '$' + Math.round(num).toLocaleString('en-US')
}

// "2026-06-21T..." -> "2 hours ago"
export function timeAgo(iso) {
  if (!iso) return '-'
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 0) {
    // future (scheduled)
    const fwd = Math.abs(diff)
    const h = Math.round(fwd / 3_600_000)
    if (h < 24) return `In ${h}h`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const PLATFORM_AVATARS = {
  tiktok: 'TT', instagram: 'IG', youtube: 'YT', facebook: 'FB'
}

// DB channel -> display channel
export function channelToDisplay(ch) {
  return {
    id: ch.id,
    name: ch.handle || ch.display_name || 'Unnamed',
    platform: ch.platform,
    followers: formatCount(ch.followers),
    status: ch.status || 'active',
    revenue: formatMoney(ch.total_revenue || estimateChannelRevenue(ch)),
    avatar: PLATFORM_AVATARS[ch.platform] || ch.platform?.slice(0, 2).toUpperCase() || '??',
    autoPost: ch.auto_post || false,
    raw: ch
  }
}

function estimateChannelRevenue(ch) {
  // rough placeholder estimate until real analytics sync
  return Math.round((ch.followers || 0) * 0.05)
}

// DB video -> display video
export function videoToDisplay(v) {
  const platforms = Array.isArray(v.target_platforms) ? v.target_platforms : []
  const platformLabel = platforms.length > 1 ? 'multi' : (platforms[0] || 'draft')
  const isLive = v.status === 'published'
  const post = v.published_at || v.scheduled_time

  return {
    id: v.id,
    title: v.title,
    status: v.status,
    views: isLive ? formatCount(v.views || 0) : '-',
    platform: platformLabel,
    postedAt: post ? timeAgo(post) : '-',
    engagement: isLive ? (v.engagement_rate ? `${v.engagement_rate}%` : '0%') : '-',
    clicks: v.clicks || 0,
    sales: v.sales || 0,
    raw: v
  }
}

// DB product -> display product
export function productToDisplay(p) {
  return {
    id: p.id,
    name: p.name,
    price: formatMoney(p.price),
    sales: p.total_sales || 0,
    revenue: formatMoney(p.total_revenue || 0),
    conversion: p.conversion_rate ? `${p.conversion_rate}%` : '0%',
    raw: p
  }
}