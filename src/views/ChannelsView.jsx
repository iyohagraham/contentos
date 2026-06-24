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

function ChannelsView({ channels, createChannel, updateChannel, removeChannel }) {
  const [showModal, setShowModal] = useState(false)
  const [newCh, setNewCh] = useState({ name: '', platform: 'tiktok' })
  const [postizStatus, setPostizStatus] = useState(null)
  const [postizChannels, setPostizChannels] = useState([])
  const [syncing, setSyncing] = useState(false)

  // Check Postiz status on mount
  useEffect(() => {
    postiz.status().then(setPostizStatus).catch(() => setPostizStatus({ configured: false }))
  }, [])

  const syncFromPostiz = async () => {
    setSyncing(true)
    try {
      const result = await postiz.channels()
      if (result.success && result.channels) {
        setPostizChannels(result.channels)
        // Auto-create any missing channels in local DB
        for (const ch of result.channels) {
          const exists = channels.find(c => c.raw?.postiz_id === ch.id)
          if (!exists) {
            await createChannel({
              workspace_id: 'default',
              platform: ch.platform || 'tiktok',
              handle: ch.name || ch.id,
              display_name: ch.name || ch.id,
              followers: 0,
              status: 'active',
              auto_post: false,
              postiz_id: ch.id
            })
          }
        }
      }
    } catch (err) {
      console.error('Postiz sync failed:', err)
    }
    setSyncing(false)
  }

  const addChannel = async () => {
    if (newCh.name) {
      await createChannel({
        workspace_id: channels[0]?.raw?.workspace_id || 'default',
        platform: newCh.platform,
        handle: newCh.name,
        display_name: newCh.name.replace('@', ''),
        followers: 0,
        status: 'new',
        auto_post: false
      })
      setNewCh({ name: '', platform: 'tiktok' })
      setShowModal(false)
    }
  }

  const toggleAutoPost = async (ch) => {
    await updateChannel(ch.id, { auto_post: !ch.autoPost })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Connected Channels</h2>
        <button onClick={() => setShowModal(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />Add Channel</button>
      </div>

      {/* Postiz Connection Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${postizStatus?.configured ? 'bg-green-500/20' : 'bg-slate-700'}`}>
              <Globe className={`w-5 h-5 ${postizStatus?.configured ? 'text-green-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="font-semibold">Postiz Social Manager</p>
              <p className="text-sm text-slate-400">
                {postizStatus?.configured 
                  ? `Connected • ${postizStatus.channelCount || 0} channels`
                  : 'Not connected — deploy Postiz to sync real social accounts'}
              </p>
            </div>
          </div>
          {postizStatus?.configured ? (
            <button 
              onClick={syncFromPostiz}
              disabled={syncing}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Channels'}
            </button>
          ) : (
            <a 
              href="https://postiz.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              Learn More <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
        </div>
        {postizChannels.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-400 mb-2">Connected in Postiz:</p>
            <div className="flex flex-wrap gap-2">
              {postizChannels.map(ch => (
                <span key={ch.id} className="bg-slate-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {PLATFORMS[ch.platform]?.icon || '🌐'} {ch.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(ch => (
          <div key={ch.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-cyan-500/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${PLATFORMS[ch.platform]?.bg || 'bg-slate-700'}`}>{PLATFORMS[ch.platform]?.icon}</div>
                <div><p className="font-semibold">{ch.name}</p><p className="text-sm text-slate-400 capitalize">{ch.platform}</p></div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${ch.status === 'active' ? 'bg-green-500/20 text-green-400' : ch.status === 'growing' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>{ch.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><p className="text-slate-400 text-sm">Followers</p><p className="text-lg font-semibold">{ch.followers}</p></div>
              <div><p className="text-slate-400 text-sm">Revenue</p><p className="text-lg font-semibold text-green-400">{ch.revenue}</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => removeChannel(ch.id)} className="flex-1 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" />Remove</button>
              <button className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 py-2 rounded-lg text-sm transition-colors">Analytics</button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-cyan-500" />Auto-Posting Schedule</h2>
        <div className="space-y-4">
          {channels.map(ch => (
            <div key={ch.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${PLATFORMS[ch.platform]?.bg || 'bg-slate-700'}`}>{PLATFORMS[ch.platform]?.icon}</div>
                <div><p className="font-medium">{ch.name}</p><p className="text-sm text-slate-400">Posts automatically at optimal times</p></div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={ch.autoPost} onChange={() => toggleAutoPost(ch)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 relative"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Channel</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold mb-2">Channel Name</label><input type="text" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" placeholder="@yourchannel" value={newCh.name} onChange={e => setNewCh({...newCh, name: e.target.value})} /></div>
              <div><label className="block text-sm font-semibold mb-2">Platform</label><select className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" value={newCh.platform} onChange={e => setNewCh({...newCh, platform: e.target.value})}><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option></select></div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-lg font-semibold transition-colors">Cancel</button>
                <button onClick={addChannel} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-lg font-semibold transition-colors">Add Channel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── SETTINGS ─── */

export default ChannelsView
