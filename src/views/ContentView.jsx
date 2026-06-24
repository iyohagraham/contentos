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

function ContentView({ videos, updateVideo, removeVideo, onNavigate }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const filtered = videos.filter(v => (filter === 'all' || v.status === filter) && (v.title || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search videos..." className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-cyan-500" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Status</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option>
          </select>
        </div>
        <button onClick={() => onNavigate?.('create')} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />New Video</button>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-950 border-b border-slate-800">
            <tr>
              <th className="text-left p-4 font-semibold text-slate-400">Video</th>
              <th className="text-left p-4 font-semibold text-slate-400">Platform</th>
              <th className="text-left p-4 font-semibold text-slate-400">Status</th>
              <th className="text-left p-4 font-semibold text-slate-400">Views</th>
              <th className="text-left p-4 font-semibold text-slate-400">Engagement</th>
              <th className="text-left p-4 font-semibold text-slate-400">Posted</th>
              <th className="text-right p-4 font-semibold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="p-4"><div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${v.status === 'published' ? 'bg-green-500' : v.status === 'scheduled' ? 'bg-blue-500' : 'bg-slate-500'}`} /><span className="font-medium">{v.title}</span></div></td>
                <td className="p-4 capitalize">{v.platform}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs capitalize ${v.status === 'published' ? 'bg-green-500/20 text-green-400' : v.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>{v.status}</span></td>
                <td className="p-4">{v.views}</td>
                <td className="p-4">{v.engagement}</td>
                <td className="p-4 text-slate-400">{v.postedAt}</td>
                <td className="p-4"><div className="flex items-center justify-end gap-2"><button className="p-2 hover:bg-slate-700 rounded-lg"><EyeIcon className="w-4 h-4" /></button><button className="p-2 hover:bg-slate-700 rounded-lg"><Edit3 className="w-4 h-4" /></button><button onClick={() => removeVideo(v.id)} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── ANALYTICS ─── */

export default ContentView
