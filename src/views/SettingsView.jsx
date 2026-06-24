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
import { authEnabled, signOut } from '../lib/auth.js'
import { resetData } from '../lib/db/seed.js'

function SettingsView({ dbMode = 'local' }) {
  const handleReset = () => {
    if (confirm('Reset all data? This will clear channels, videos, and products, then reload demo data on next refresh.')) {
      resetData()
      window.location.reload()
    }
  }

  const handleExport = () => {
    const data = {}
    Object.keys(localStorage).filter(k => k.startsWith('contentos_')).forEach(k => {
      try { data[k] = JSON.parse(localStorage.getItem(k)) } catch { data[k] = localStorage.getItem(k) }
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contentos-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          {dbMode === 'cloud' ? <Database className="w-5 h-5 text-green-500" /> : <HardDrive className="w-5 h-5 text-amber-500" />}
          Data Storage
        </h2>
        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800 mb-4">
          <div>
            <p className="font-medium">{dbMode === 'cloud' ? 'Cloud (Supabase)' : 'Local Storage'}</p>
            <p className="text-sm text-slate-400">{dbMode === 'cloud' ? 'Your data syncs across devices' : 'Data is stored in this browser. Add Supabase keys in .env.local for cloud sync.'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${dbMode === 'cloud' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{dbMode === 'cloud' ? 'Synced' : 'Offline'}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"><Download className="w-4 h-4" />Export Data</button>
          <button onClick={handleReset} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"><RefreshCw className="w-4 h-4" />Reset Data</button>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold mb-2">Email</label><input type="email" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full" placeholder="your@email.com" /></div>
          <div><label className="block text-sm font-semibold mb-2">Timezone</label><select className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full"><option>Pacific Time (PT)</option><option>Eastern Time (ET)</option><option>UTC</option></select></div>
          {authEnabled && (
            <button onClick={() => signOut()} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Sign out</button>
          )}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">API Keys</h2>
        <p className="text-sm text-slate-400 mb-4">Keys are stored in <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-400">.env.local</code> on the server. These fields are for reference.</p>
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold mb-2">Kimi AI Key (script & strategy generation)</label><input type="password" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full" placeholder="sk-..." /></div>
          <div><label className="block text-sm font-semibold mb-2">fal.ai API Key (video generation)</label><input type="password" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full" placeholder="..." /></div>
          <div><label className="block text-sm font-semibold mb-2">Supabase URL + Anon Key (cloud sync)</label><input type="password" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full" placeholder="https://xxx.supabase.co" /></div>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Default Video Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-2">Default Format</label><select className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full"><option>9:16 Vertical (Reels/TikTok)</option><option>16:9 Landscape (YouTube)</option><option>1:1 Square (Feed)</option></select></div>
          <div><label className="block text-sm font-semibold mb-2">Default Voice</label><select className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full"><option>Standard TTS</option><option>Premium Voice 1</option><option>Premium Voice 2</option></select></div>
        </div>
      </div>
      <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">Save Settings</button>
    </div>
  )
}


export default SettingsView
