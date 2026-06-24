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

function CalendarView({ videos, channels, updateVideo }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [draggedVideo, setDraggedVideo] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week' | 'day'
  const [selectedVideos, setSelectedVideos] = useState([])
  const [hoveredVideo, setHoveredVideo] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  // Effective scheduling date comes from the RAW row. The display `postedAt`
  // is a humanized string ("2 hours ago", "In 24h") that cannot be re-parsed
  // into a Date, so calendar bucketing must read the underlying ISO fields.
  const effectiveDate = (v) => {
    const iso = v.raw?.scheduled_time || v.raw?.published_at || null
    if (!iso) return null
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d
  }

  // Filter videos by month
  const monthVideos = videos.filter(v => {
    const date = effectiveDate(v)
    return date && date.getFullYear() === year && date.getMonth() === month
  })

  const getVideosForDay = (day) => {
    return monthVideos.filter(v => {
      const date = effectiveDate(v)
      return date && date.getDate() === day
    })
  }

  const handleDragStart = (e, video) => {
    setDraggedVideo(video)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, day) => {
    e.preventDefault()
    if (draggedVideo && day) {
      const newDate = new Date(year, month, day, 12, 0, 0)
      // Persist to the raw ISO field the display layer actually reads, so the
      // move survives reloads. Published videos keep their published_at date;
      // everything else is treated as scheduled.
      const field = draggedVideo.raw?.published_at ? 'published_at' : 'scheduled_time'
      updateVideo(draggedVideo.id, { [field]: newDate.toISOString() })
      setDraggedVideo(null)
    }
  }

  const days = []
  for (let i = 0; i < startingDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Content Calendar</h2>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'month' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'day' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Day
            </button>
          </div>
          <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <span className="font-semibold text-lg">{monthName}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bulk Operations Bar */}
      {selectedVideos.length > 0 && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-cyan-400 font-medium">{selectedVideos.length} video(s) selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                selectedVideos.forEach(id => updateVideo(id, { status: 'scheduled' }))
                setSelectedVideos([])
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Schedule Selected
            </button>
            <button
              onClick={() => {
                selectedVideos.forEach(id => updateVideo(id, { status: 'published' }))
                setSelectedVideos([])
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Publish Selected
            </button>
            <button
              onClick={() => setSelectedVideos([])}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const dayVideos = day ? getVideosForDay(day) : []
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
            
            return (
              <div
                key={idx}
                onDragOver={day ? handleDragOver : undefined}
                onDrop={day ? (e) => handleDrop(e, day) : undefined}
                className={`min-h-[100px] rounded-lg border ${
                  day ? 'border-slate-800 hover:border-cyan-500/50' : 'border-transparent'
                } ${isToday ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-950'} p-2 transition-colors`}
              >
                {day && (
                  <>
                    <div className="text-sm font-semibold mb-1 text-slate-400">{day}</div>
                    <div className="space-y-1">
                      {dayVideos.map(v => {
                        const isSelected = selectedVideos.includes(v.id)
                        const platformInfo = PLATFORMS[v.platform] || { icon: '📹', bg: 'bg-slate-700' }
                        
                        return (
                          <div
                            key={v.id}
                            className="relative group"
                            onMouseEnter={() => setHoveredVideo(v.id)}
                            onMouseLeave={() => setHoveredVideo(null)}
                          >
                            {/* Checkbox for bulk selection */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation()
                                if (e.target.checked) {
                                  setSelectedVideos([...selectedVideos, v.id])
                                } else {
                                  setSelectedVideos(selectedVideos.filter(id => id !== v.id))
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-1 left-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                            
                            <button
                              draggable
                              onDragStart={(e) => handleDragStart(e, v)}
                              onClick={() => setSelectedVideo(v)}
                              className={`w-full text-left text-xs px-2 py-1 rounded cursor-move transition-all ${
                                isSelected
                                  ? 'ring-2 ring-cyan-500 bg-cyan-500/20 text-cyan-400'
                                  : v.status === 'published'
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                  : v.status === 'scheduled'
                                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{platformInfo.icon}</span>
                                <span className="truncate flex-1">{v.title}</span>
                              </div>
                            </button>
                            
                            {/* Hover Tooltip */}
                            {hoveredVideo === v.id && (
                              <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 z-20 pointer-events-none">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center ${platformInfo.bg}`}>
                                      <span>{platformInfo.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{v.title}</p>
                                      <p className="text-xs text-slate-400 capitalize">{platformInfo.name}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <p className="text-slate-500">Status</p>
                                      <p className={`capitalize ${
                                        v.status === 'published' ? 'text-green-400' :
                                        v.status === 'scheduled' ? 'text-blue-400' :
                                        'text-slate-400'
                                      }`}>{v.status}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Views</p>
                                      <p className="text-white">{v.views}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Engagement</p>
                                      <p className="text-white">{v.engagement}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Posted</p>
                                      <p className="text-white text-[10px]">{effectiveDate(v)?.toLocaleDateString() || v.postedAt}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500"></div>
            <span className="text-sm text-slate-400">Published</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500"></div>
            <span className="text-sm text-slate-400">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-700/50 border border-slate-700"></div>
            <span className="text-sm text-slate-400">Draft</span>
          </div>
        </div>
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedVideo(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedVideo.title}</h3>
              <button onClick={() => setSelectedVideo(null)} className="p-2 hover:bg-slate-800 rounded-lg">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-400">Platform</p>
                <p className="capitalize">{selectedVideo.platform}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Status</p>
                <p className={`inline-block px-2 py-1 rounded text-xs capitalize ${
                  selectedVideo.status === 'published' ? 'bg-green-500/20 text-green-400' :
                  selectedVideo.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-slate-700 text-slate-400'
                }`}>{selectedVideo.status}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Posted</p>
                <p>{selectedVideo.postedAt}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Views</p>
                <p>{selectedVideo.views}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Engagement</p>
                <p>{selectedVideo.engagement}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── ANALYTICS ─── */

export default CalendarView
