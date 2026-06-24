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

function MonetizeView({ products, videos }) {
  const totalRev = products.reduce((s, p) => s + (parseFloat(String(p.revenue).replace(/[$,]/g, '')) || 0), 0)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRev.toLocaleString()}`} change="+34%" positive />
        <StatCard icon={ShoppingCart} label="Total Sales" value={products.reduce((s, p) => s + p.sales, 0)} change="+28%" positive />
        <StatCard icon={TrendingUp} label="Avg. Order Value" value="$52.40" change="+12%" positive />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-cyan-500" />Your Products</h2>
          <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />Add Product</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">{p.name}</h3><button className="p-1 hover:bg-slate-800 rounded"><MoreVertical className="w-4 h-4" /></button></div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-slate-400">Price</span><span className="font-medium text-green-400">{p.price}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Sales</span><span className="font-medium">{p.sales}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Revenue</span><span className="font-medium text-cyan-400">{p.revenue}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Conversion</span><span className="font-medium">{p.conversion}</span></div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors">Edit</button>
                <button className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 py-2 rounded-lg text-sm transition-colors">View Stats</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><LinkIcon className="w-5 h-5 text-cyan-500" />Funnel Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[{ stage: 'Views', value: '284.5K', icon: Eye }, { stage: 'Profile Visits', value: '45.2K', icon: Users, rate: '15.9%' }, { stage: 'Link Clicks', value: '12.8K', icon: MousePointerClick, rate: '28.3%' }, { stage: 'Sales', value: '268', icon: ShoppingCart, rate: '2.1%' }].map((item, i) => (
            <div key={i} className="bg-slate-950 rounded-lg p-4 border border-slate-800 text-center">
              <item.icon className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm mb-1">{item.stage}</p>
              <p className="text-2xl font-bold">{item.value}</p>
              {item.rate && <p className="text-xs text-slate-500 mt-1">Conversion: {item.rate}</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Integration Options</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{ n: 'Gumroad', c: true }, { n: 'Beacons', c: true }, { n: 'Shopify', c: false }, { n: 'Stripe', c: false }, { n: 'PayPal', c: false }, { n: 'Lemon Squeezy', c: false }, { n: 'Stan Store', c: false }, { n: 'Custom', c: false }].map(ig => (
            <div key={ig.n} className={`p-4 rounded-lg border flex items-center justify-between ${ig.c ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-950 border-slate-800'}`}>
              <span className="font-medium">{ig.n}</span>
              {ig.c ? <span className="text-green-400 flex items-center gap-1 text-sm"><Check className="w-4 h-4" />Connected</span> : <button className="text-cyan-400 text-sm hover:text-cyan-300">Connect</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── CHANNELS ─── */

export default MonetizeView
