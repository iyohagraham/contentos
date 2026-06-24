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

function DashboardView({ channels, videos, products, onNavigate }) {
  // Calculate real stats from RAW numeric values (display fields are pre-formatted strings)
  const totalFollowers = channels.reduce((sum, ch) => sum + (Number(ch.raw?.followers) || 0), 0)
  const totalViews = videos.reduce((sum, v) => sum + (Number(v.raw?.views) || 0), 0)
  const totalRevenue = products.reduce((sum, p) => sum + (Number(p.raw?.total_revenue) || 0), 0)
  
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Followers" value={formatNumber(totalFollowers)} change="+12%" positive />
        <StatCard icon={Eye} label="Total Views" value={formatNumber(totalViews)} change="+23%" positive />
        <StatCard icon={MousePointerClick} label="Videos" value={videos.length.toString()} change="+8%" positive />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} change="+34%" positive />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-cyan-500" />Channel Performance</h2>
          <div className="space-y-3">
            {channels.map(ch => (
              <div key={ch.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${PLATFORMS[ch.platform]?.bg || 'bg-slate-700'}`}>{ch.avatar}</div>
                  <div><p className="font-medium">{ch.name}</p><p className="text-sm text-slate-400">{PLATFORMS[ch.platform]?.name}</p></div>
                </div>
                <div className="text-right"><p className="font-semibold">{ch.followers}</p><p className="text-sm text-green-400">{ch.revenue}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Film className="w-5 h-5 text-cyan-500" />Recent Videos</h2>
          <div className="space-y-3">
            {videos.slice(0, 4).map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${v.status === 'published' ? 'bg-green-500' : v.status === 'scheduled' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                  <div><p className="font-medium">{v.title}</p><p className="text-sm text-slate-400">{v.platform} • {v.postedAt}</p></div>
                </div>
                {v.views !== '-' && <span className="text-slate-400 text-sm">{v.views}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-cyan-500" />Top Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-cyan-500" /><p className="font-semibold">{p.name}</p></div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Price</span><span className="font-medium text-green-400">{p.price}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Sales</span><span className="font-medium">{p.sales}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Revenue</span><span className="font-medium text-cyan-400">{p.revenue}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard icon={Sparkles} title="Generate Ideas" description="AI-powered video ideas based on trends" onClick={() => onNavigate('create')} />
        <QuickActionCard icon={Calendar} title="Schedule Posts" description="Plan your content calendar" onClick={() => onNavigate('calendar')} />
        <QuickActionCard icon={BarChart3} title="View Analytics" description="Deep dive into performance" onClick={() => onNavigate('analytics')} />
      </div>
    </div>
  )
}

/* ─── STRATEGY ─── */

export default DashboardView
