/**
 * GET /api/analytics/revenue?workspace_id=&period=30d
 *   → { totalRevenue, attributedRevenue, byVideo, byPlatform, events: [...] }
 *
 * POST /api/analytics/revenue
 * Body: {
 *   workspace_id, product_id?, video_id?,
 *   amount, currency?='USD', attribution_method?='manual',
 *   utm_source?, utm_medium?, utm_campaign?, referring_platform?,
 *   attribution_confidence?, customer_id?, customer_country?, event_at?
 * }
 *   → record a revenue event (attribution: UTM match → video; else explicit
 *      video_id; else unattributed)
 *
 * Degrades gracefully without Supabase.
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'

function periodToSince(period) {
  const days = { '7d': 7, '30d': 30, '90d': 90, all: 365 * 5 }
  const d = days[period] || 30
  return new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  const { workspace_id } = req.method === 'GET' ? req.query : (req.body || {})
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

  const db = getServerSupabase()
  if (!db) return res.status(200).json({ mode: 'no-db', totalRevenue: 0, attributedRevenue: 0, byVideo: [], byPlatform: [], events: [] })

  const wsId = coerceWorkspaceId(workspace_id)

  if (req.method === 'GET') {
    const { period = '30d' } = req.query
    const since = periodToSince(period)

    const { data: events, error } = await db.from('revenue_events')
      .select('id, amount, currency, video_id, product_id, attribution_method, attribution_confidence, referring_platform, utm_campaign, event_at')
      .eq('workspace_id', wsId)
      .gte('event_at', since)
      .order('event_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })

    const videoIds = [...new Set((events || []).map(e => e.video_id).filter(Boolean))]
    let titleById = {}
    if (videoIds.length) {
      const { data: vids } = await db.from('videos').select('id, title').in('id', videoIds)
      titleById = Object.fromEntries((vids || []).map(v => [v.id, v.title]))
    }

    const totalRevenue = (events || []).reduce((s, e) => s + Number(e.amount || 0), 0)
    const attributedRevenue = (events || []).reduce((s, e) => s + (e.video_id ? Number(e.amount || 0) : 0), 0)

    const byVideo = {}
    const byPlatform = {}
    for (const e of (events || [])) {
      if (e.video_id) {
        byVideo[e.video_id] = byVideo[e.video_id] || { video_id: e.video_id, title: titleById[e.video_id] || 'Unattributed', revenue: 0, count: 0 }
        byVideo[e.video_id].revenue += Number(e.amount || 0)
        byVideo[e.video_id].count += 1
      }
      const p = e.referring_platform || 'unattributed'
      byPlatform[p] = byPlatform[p] || { platform: p, revenue: 0, count: 0 }
      byPlatform[p].revenue += Number(e.amount || 0)
      byPlatform[p].count += 1
    }

    return res.status(200).json({
      period,
      since,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      attributedRevenue: parseFloat(attributedRevenue.toFixed(2)),
      byVideo: Object.values(byVideo).sort((a, b) => b.revenue - a.revenue),
      byPlatform: Object.values(byPlatform).sort((a, b) => b.revenue - a.revenue),
      events: events || []
    })
  }

  if (req.method === 'POST') {
    const {
      product_id, video_id, amount, currency = 'USD',
      attribution_method = 'manual', attribution_confidence = 0.7,
      utm_source, utm_medium, utm_campaign, referring_platform,
      customer_id, customer_country, event_at
    } = req.body

    if (amount == null) return res.status(400).json({ error: 'amount required' })

    // UTM-match attribution: if utm_campaign matches a video's topic field, attribute it.
    let resolvedVideoId = video_id || null
    if (!resolvedVideoId && utm_campaign) {
      const { data: vid } = await db.from('videos')
        .select('id').eq('workspace_id', wsId)
        .ilike('topic', `%${utm_campaign}%`)
        .limit(1).maybeSingle()
      if (vid) resolvedVideoId = vid.id
    }

    const row = {
      workspace_id: wsId,
      product_id: product_id || null,
      video_id: resolvedVideoId,
      amount: Number(amount),
      currency,
      attribution_method: resolvedVideoId ? (video_id ? attribution_method : 'utm_match') : attribution_method,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      referring_platform: referring_platform || null,
      attribution_confidence: Number(attribution_confidence) || 0.7,
      customer_id: customer_id || null,
      customer_country: customer_country || null,
      event_at: event_at || new Date().toISOString()
    }

    const { data, error } = await db.from('revenue_events').insert(row).select().single()
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ recorded: true, event: data, attributed_to: resolvedVideoId })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}