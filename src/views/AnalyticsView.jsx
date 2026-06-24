import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Target, Video, Instagram, Youtube,
  Facebook, TrendingUp, DollarSign, Settings, Plus, Calendar,
  BarChart3, Layers, Zap, Sparkles, Clock, ChevronRight, Star,
  Users, Eye, MousePointerClick, ShoppingCart, FileText,
  Globe, Upload, Check, X as XIcon, Menu, ArrowUpRight,
  Film, Mic, Palette, Send, Play, Hash, Clock as ClockIcon,
  BarChart2, Copy, Trash2, Edit3, Eye as EyeIcon, Download,
  Link as LinkIcon, Package, CreditCard, TrendingDown, Calendar as CalendarIcon,
  MessageSquare, ThumbsUp, Share2, Bookmark, MoreVertical, Filter, Search,
  Smartphone, Monitor, Tv, Hash as HashIcon, Brain, Lightbulb, Wand2,
  Database, HardDrive, RefreshCw, Bot, BookOpen, GraduationCap
} from 'lucide-react'
import { StatCard, QuickActionCard, PLATFORMS } from '../lib/ui'
import { postiz } from '../lib/postizClient.js'

function AnalyticsView({ videos, channels, workspaceId }) {
  const [analytics, setAnalytics] = useState(null)
  const [dbAgg, setDbAgg] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    setDbAgg(null)
    setRevenue(null)
    try {
      // Postiz-backed real analytics (legacy endpoint) — submit alongside the new DB aggregation.
      const [postizRes, aggRes, revRes] = await Promise.all([
        fetch(`/api/analytics?period=${period}`),
        workspaceId ? fetch(`/api/analytics/aggregate?workspace_id=${workspaceId}&period=${period}`) : Promise.resolve(null),
        workspaceId ? fetch(`/api/analytics/revenue?workspace_id=${workspaceId}&period=${period}`) : Promise.resolve(null)
      ])
      const pt = await postizRes.json()
      if (pt.success) setAnalytics(pt.analytics)
      if (aggRes && aggRes.ok) setDbAgg(await aggRes.json())
      if (revRes && revRes.ok) setRevenue(await revRes.json())
    } catch (err) {
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = async () => {
    if (!workspaceId) return
    setGeneratingInsights(true)
    try {
      const res = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, period })
      })
      const data = await res.json()
      if (res.ok) setInsights(data.insights || [])
    } catch { /* non-fatal */ }
    setGeneratingInsights(false)
  }

  const published = videos.filter(v => v.status === 'published')
  const totalViews = published.reduce((s, v) => s + (parseInt(String(v.views).replace(/,/g, '')) || 0), 0)
  // Keep this a NUMBER (no premature toFixed) so render-time .toFixed() is safe.
  const avgEng = published.length > 0
    ? published.reduce((s, v) => s + (parseFloat(v.engagement) || 0), 0) / published.length
    : 0

  // Calculate platform breakdown from channels
  const platformStats = {}
  channels.forEach(ch => {
    const plat = ch.platform
    if (!platformStats[plat]) {
      platformStats[plat] = { count: 0, followers: 0 }
    }
    platformStats[plat].count++
    // ch.followers is a formatted display string ("12.5K"); sum the raw number.
    platformStats[plat].followers += Number(ch.raw?.followers) || 0
  })

  const totalFollowers = Object.values(platformStats).reduce((s, p) => s + p.followers, 0)

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <div className="flex gap-2 items-center">
          {['7d', '30d', '90d'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
          <button
            onClick={fetchAnalytics}
            title="Refresh analytics"
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Postiz Connection Status */}
      {analytics?.source === 'postiz' ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <Globe className="w-5 h-5 text-green-400" />
          <div className="flex-1">
            <p className="font-medium text-green-400">Connected to Postiz</p>
            <p className="text-sm text-slate-400">Real-time analytics from {analytics.channels} channel(s)</p>
          </div>
          <button onClick={fetchAnalytics} className="p-2 hover:bg-green-500/20 rounded-lg">
            <RefreshCw className={`w-4 h-4 text-green-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
          <Globe className="w-5 h-5 text-slate-500" />
          <div className="flex-1">
            <p className="font-medium text-slate-300">Local Analytics Mode</p>
            <p className="text-sm text-slate-500">Connect Postiz for real-time platform analytics</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Views" value={Number(analytics?.totalViews ?? totalViews).toLocaleString()} change="+23%" positive />
        <StatCard icon={Users} label="Total Followers" value={Number(analytics?.totalFollowers ?? totalFollowers).toLocaleString()} change="+12%" positive />
        <StatCard icon={MousePointerClick} label="Avg. Engagement" value={`${Number(analytics?.avgEngagement ?? avgEng).toFixed(1)}%`} change="+1.2%" positive />
        <StatCard icon={Clock} label="Videos Published" value={published.length.toString()} change="+8%" positive />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-cyan-500" />Views Over Time</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {(() => {
              // Generate chart data from API or use defaults
              const platformData = analytics?.byPlatform || {}
              const platforms = Object.keys(platformData)
              if (platforms.length > 0) {
                // Create bars based on platform views
                const maxViews = Math.max(...platforms.map(p => platformData[p].views))
                return platforms.map((plat, i) => {
                  const height = (platformData[plat].views / maxViews) * 100
                  const platformInfo = PLATFORMS[plat] || { name: plat, bg: 'bg-slate-700' }
                  return (
                    <div key={plat} className="flex-1 flex flex-col items-center gap-2">
                      <div className={`w-full ${platformInfo.bg} rounded-t transition-all duration-500`} style={{ height: `${height}%` }} />
                      <span className="text-xs text-slate-400">{platformInfo.icon}</span>
                    </div>
                  )
                })
              }
              // Fallback to default chart
              return [65, 45, 78, 52, 89, 67, 92, 75, 88, 95, 82, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500/20 to-cyan-500 rounded-t" style={{ height: `${h}%` }} />
              ))
            })()}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            {analytics?.byPlatform ? Object.keys(analytics.byPlatform).map(p => PLATFORMS[p]?.name || p) : ['Jan', 'Mar', 'Jun', 'Dec']}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-cyan-500" />Platform Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(platformStats).map(([plat, stats]) => {
              const pct = totalFollowers > 0 ? Math.round((stats.followers / totalFollowers) * 100) : 0
              const platformInfo = PLATFORMS[plat] || { name: plat, icon: '?', bg: 'bg-slate-700' }
              return (
                <div key={plat}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium flex items-center gap-2">
                      <span>{platformInfo.icon}</span>
                      {platformInfo.name}
                    </span>
                    <span className="text-slate-400">{stats.followers.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3">
                    <div className={`${platformInfo.bg} h-3 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(platformStats).length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No channels connected yet</p>
            )}
          </div>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Top Performing Videos</h2>
        <div className="space-y-3">
          {published.map((v, i) => (
            <div key={v.id} className="flex items-center gap-4 p-3 bg-slate-950 rounded-lg">
              <div className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center font-bold">{i + 1}</div>
              <div className="flex-1"><p className="font-medium">{v.title}</p><p className="text-sm text-slate-400">{v.platform}</p></div>
              <div className="text-right"><p className="font-semibold">{v.views} views</p><p className="text-sm text-slate-400">{v.engagement} engagement</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-500" />
          Growth Trends
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Views Trend</span>
              <span className="text-green-400 text-sm font-medium">↑ 23%</span>
            </div>
            <div className="h-20 flex items-end justify-between gap-1">
              {[40, 45, 52, 48, 65, 72, 68, 75, 82, 78, 85, 92].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500/40 to-cyan-500 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Last 12 periods</p>
          </div>

          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Engagement Trend</span>
              <span className="text-green-400 text-sm font-medium">↑ 1.2%</span>
            </div>
            <div className="h-20 flex items-end justify-between gap-1">
              {[55, 58, 52, 60, 65, 62, 68, 70, 72, 75, 73, 78].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-purple-500/40 to-purple-500 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Last 12 periods</p>
          </div>

          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Follower Growth</span>
              <span className="text-green-400 text-sm font-medium">↑ 12%</span>
            </div>
            <div className="h-20 flex items-end justify-between gap-1">
              {[30, 35, 42, 48, 55, 62, 68, 75, 82, 88, 95, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-green-500/40 to-green-500 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Last 12 periods</p>
          </div>
        </div>
      </div>

      {/* Platform Performance Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-cyan-500" />
          Platform Performance
        </h2>
        <div className="space-y-4">
          {Object.entries(platformStats).map(([plat, stats]) => {
            const platformInfo = PLATFORMS[plat] || { name: plat, icon: '?', bg: 'bg-slate-700' }
            const avgViews = stats.count > 0 ? Math.round((analytics?.byPlatform?.[plat]?.views || 0) / stats.count) : 0
            const engagement = analytics?.byPlatform?.[plat]?.engagement || 0
            
            return (
              <div key={plat} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platformInfo.bg}`}>
                      <span className="text-lg">{platformInfo.icon}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{platformInfo.name}</p>
                      <p className="text-sm text-slate-400">{stats.count} channel{stats.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{stats.followers.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">followers</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Avg Views/Video</p>
                    <p className="font-medium">{avgViews > 0 ? avgViews.toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Engagement Rate</p>
                    <p className="font-medium">{engagement > 0 ? `${engagement.toFixed(1)}%` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Videos</p>
                    <p className="font-medium">{published.filter(v => v.platform === plat).length}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {Object.keys(platformStats).length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No platform data available yet</p>
          )}
        </div>
      </div>

      {/* Revenue + Insights — backed by the new /api/analytics/* endpoints */}
      {workspaceId && (dbAgg || revenue) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue attribution */}
          {revenue && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" />Revenue Attribution</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-950 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Total Revenue</p>
                  <p className="text-lg font-bold text-green-400">${(revenue.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Attributed to content</p>
                  <p className="text-lg font-bold text-green-400">${(revenue.attributedRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
              {revenue.byVideo?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 font-semibold">Top revenue-driving videos:</p>
                  {revenue.byVideo.slice(0, 5).map((v, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-300 truncate flex-1">{v.title}</span>
                      <span className="text-green-400 ml-2">${v.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {revenue.totalRevenue === 0 && <p className="text-xs text-slate-500">No revenue events tracked for this period.</p>}
            </div>
          )}

          {/* Learning insights */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400" />Learning Insights</h3>
              <button onClick={generateInsights} disabled={generatingInsights}
                className="text-xs bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1.5">
                {generatingInsights ? 'Analyzing...' : 'Generate'}
              </button>
            </div>
            {insights?.length > 0 && (
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className="bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded px-1.5 py-0.5">{ins.insight_type?.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-slate-500">{ins.impact} impact</span>
                    </div>
                    <p className="text-sm font-medium">{ins.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{ins.description}</p>
                    {ins.recommendation && <p className="text-xs text-cyan-400 mt-1">→ {ins.recommendation}</p>}
                  </div>
                ))}
              </div>
            )}
            {!insights && <p className="text-xs text-slate-500">Click "Generate" to analyze your performance data and surface optimization insights grounded in real metrics.</p>}
            {insights?.length === 0 && <p className="text-xs text-slate-500">Not enough tracked posts to generate insights yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsView
