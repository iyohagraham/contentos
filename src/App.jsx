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
  Database, HardDrive, RefreshCw, Bot, BookOpen
} from 'lucide-react'
import { useChannels, useVideos, useProducts, useStrategies, useDbMode } from './lib/db/useStore.js'
import { channelToDisplay, videoToDisplay, productToDisplay } from './lib/format.js'
import { resetData } from './lib/db/seed.js'
import { postiz } from './lib/postizClient.js'
import { authEnabled, signOut } from './lib/auth.js'
import { useWorkspace } from './lib/useWorkspace.js'
import KnowledgeView from './views/KnowledgeView.jsx'
import ResearchView from './views/ResearchView.jsx'
import IntelligenceView from './views/IntelligenceView.jsx'
import AgentsView from './views/AgentsView.jsx'
import WorkspaceConfigView from './views/WorkspaceConfigView.jsx'

const PLATFORMS = {
  tiktok: { name: 'TikTok', icon: '♫', color: 'black', bg: 'bg-black' },
  instagram: { name: 'Instagram', icon: '📷', color: '#E1306C', bg: 'bg-gradient-to-r from-purple-500 to-orange-500' },
  youtube: { name: 'YouTube', icon: '▶', color: '#FF0000', bg: 'bg-red-600' },
  facebook: { name: 'Facebook', icon: 'f', color: '#1877F2', bg: 'bg-blue-600' }
}

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Force rebuild - v2
  const dbMode = useDbMode()
  const { workspaceId } = useWorkspace()

  // Live data from store (localStorage or Supabase)
  const { data: rawChannels, create: createChannel, update: updateChannel, remove: removeChannel } = useChannels()
  const { data: rawVideos, create: createVideo, update: updateVideo, remove: removeVideo } = useVideos()
  const { data: rawProducts } = useProducts()
  const { data: rawStrategies, create: createStrategy } = useStrategies()

  // Map DB rows -> display shape the views expect
  const channels = rawChannels.map(channelToDisplay)
  const videos = rawVideos.map(videoToDisplay)
  const products = rawProducts.map(productToDisplay)

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">ContentOS</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            {sidebarOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} expanded={sidebarOpen} />
          <NavItem icon={Target} label="Strategy" active={activeView === 'strategy'} onClick={() => setActiveView('strategy')} expanded={sidebarOpen} />
          <NavItem icon={Video} label="Create" active={activeView === 'create'} onClick={() => setActiveView('create')} expanded={sidebarOpen} />
          <NavItem icon={Layers} label="Content" active={activeView === 'content'} onClick={() => setActiveView('content')} expanded={sidebarOpen} />
          <NavItem icon={Calendar} label="Calendar" active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} expanded={sidebarOpen} />
          <NavItem icon={BarChart3} label="Analytics" active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} expanded={sidebarOpen} />
          <NavItem icon={DollarSign} label="Monetize" active={activeView === 'monetize'} onClick={() => setActiveView('monetize')} expanded={sidebarOpen} />
          <NavItem icon={Globe} label="Channels" active={activeView === 'channels'} onClick={() => setActiveView('channels')} expanded={sidebarOpen} />
          {sidebarOpen && <div className="px-3 pt-3 pb-1 text-xs text-slate-600 uppercase tracking-wider font-semibold">Intelligence</div>}
          <NavItem icon={Brain} label="Knowledge" active={activeView === 'knowledge'} onClick={() => setActiveView('knowledge')} expanded={sidebarOpen} />
          <NavItem icon={Search} label="Research" active={activeView === 'research'} onClick={() => setActiveView('research')} expanded={sidebarOpen} />
          <NavItem icon={Zap} label="Intelligence" active={activeView === 'intelligence'} onClick={() => setActiveView('intelligence')} expanded={sidebarOpen} />
          <NavItem icon={Bot} label="Agents" active={activeView === 'agents'} onClick={() => setActiveView('agents')} expanded={sidebarOpen} />
          <NavItem icon={Zap} label="Brand Mode" active={activeView === 'workspace'} onClick={() => setActiveView('workspace')} expanded={sidebarOpen} />
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-2">
          <NavItem icon={Settings} label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} expanded={sidebarOpen} />
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              {dbMode === 'cloud' ? <Database className="w-3.5 h-3.5 text-green-500" /> : <HardDrive className="w-3.5 h-3.5 text-amber-500" />}
              <span>{dbMode === 'cloud' ? 'Cloud synced' : 'Local storage'}</span>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-2xl font-bold capitalize">{activeView}</h1>
          <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />New Project
          </button>
        </header>
        <main className="p-6">
          {activeView === 'dashboard' && <DashboardView channels={channels} videos={videos} products={products} onNavigate={setActiveView} />}
          {activeView === 'strategy' && <StrategyView createStrategy={createStrategy} />}
          {activeView === 'create' && <CreateView channels={channels} createVideo={createVideo} />}
          {activeView === 'content' && <ContentView videos={videos} updateVideo={updateVideo} removeVideo={removeVideo} />}
          {activeView === 'calendar' && <CalendarView videos={videos} channels={channels} updateVideo={updateVideo} />}
          {activeView === 'analytics' && <AnalyticsView videos={videos} channels={channels} />}
          {activeView === 'monetize' && <MonetizeView products={products} videos={videos} />}
          {activeView === 'channels' && <ChannelsView channels={channels} createChannel={createChannel} updateChannel={updateChannel} removeChannel={removeChannel} />}
          {activeView === 'settings' && <SettingsView dbMode={dbMode} />}
          {activeView === 'knowledge' && <KnowledgeView workspaceId={workspaceId} />}
          {activeView === 'research' && <ResearchView workspaceId={workspaceId} />}
          {activeView === 'intelligence' && <IntelligenceView workspaceId={workspaceId} />}
          {activeView === 'agents' && <AgentsView workspaceId={workspaceId} />}
          {activeView === 'workspace' && <WorkspaceConfigView workspaceId={workspaceId} />}
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, onClick, expanded }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${active ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />{expanded && <span className="truncate">{label}</span>}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, change, positive }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 text-cyan-500" />
        <span className={`text-sm font-medium flex items-center gap-1 ${positive !== false ? 'text-green-400' : 'text-red-400'}`}>
          {change}<ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  )
}

function QuickActionCard({ icon: Icon, title, description, onClick }) {
  return (
    <button onClick={onClick} className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-left hover:border-cyan-500/50 transition-colors group">
      <Icon className="w-6 h-6 text-cyan-500 mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </button>
  )
}

/* ─── DASHBOARD ─── */
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
function StrategyView({ createStrategy }) {
  const [step, setStep] = useState(1)
  const [niche, setNiche] = useState('')
  const [audience, setAudience] = useState('')
  const [product, setProduct] = useState('')
  const [strategy, setStrategy] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const generateStrategy = async () => {
    setIsGenerating(true)
    const newStrategy = {
      brand: {
        name: `${niche || 'Your'} Pro`,
        handle: `@${(niche || 'your').toLowerCase().replace(/\s/g, '')}pro`,
        tagline: `Master ${niche || 'your craft'} in minutes, not months`,
        positioning: `The go-to resource for ${audience || 'professionals'} looking to achieve results faster`
      },
      pillars: [
        { name: 'Educational', pct: 40, desc: 'How-to tutorials, tips, industry insights', examples: ['Step-by-step guides', 'Common mistakes', 'Pro tips'] },
        { name: 'Relatable', pct: 30, desc: 'Pain points, struggles, wins', examples: ['Day in the life', 'Before/after', 'Confessions'] },
        { name: 'Engagement', pct: 20, desc: 'Questions, hot takes, polls', examples: ['Unpopular opinions', 'This or that', 'Hot takes'] },
        { name: 'Conversion', pct: 10, desc: 'Product mentions, CTAs, results', examples: ['Success stories', 'Product demos', 'Limited offers'] },
      ],
      schedule: {
        tiktok: { frequency: 'Daily', time: '6:00 PM', bestDays: ['Tue', 'Wed', 'Thu'] },
        instagram: { frequency: '5x/week', time: '12:00 PM', bestDays: ['Mon', 'Wed', 'Fri'] },
        youtube: { frequency: '3 Shorts + 1 Long', time: '2:00 PM', bestDays: ['Sat', 'Sun'] },
        facebook: { frequency: '3x/week', time: '1:00 PM', bestDays: ['Wed', 'Thu', 'Fri'] },
      },
      roadmap: [
        { phase: 'Month 1-2', goal: '0-10K followers', action: 'Focus on value content, build trust, post consistently', metrics: { followers: '10K', engagement: '5%', emailList: '500' } },
        { phase: 'Month 3-4', goal: '10-50K followers', action: 'Introduce soft CTAs, grow email list, test products', metrics: { followers: '50K', engagement: '4%', emailList: '2.5K' } },
        { phase: 'Month 5-6', goal: '50K+ followers', action: 'Launch digital product, optimize funnel, scale ads', metrics: { followers: '100K', engagement: '3%', revenue: '$10K/mo' } },
      ],
      product: {
        name: product || `${niche || 'Your'} Starter Pack`,
        price: '$27-97',
        format: 'Digital Download (PDF + Templates)',
        description: `Help ${audience || 'your audience'} skip the learning curve and get results immediately`,
        funnel: { top: 'Free lead magnet (checklist/cheatsheet)', middle: 'Email nurture sequence (5-7 days)', bottom: 'Core product + upsell bundle' }
      }
    }
    setStrategy(newStrategy)
    setStep(2)
    setIsGenerating(false)

    // Save to database
    if (createStrategy) {
      try {
        await createStrategy({
          workspace_id: 'default',
          name: newStrategy.brand.name,
          niche: niche,
          audience: audience,
          product_idea: product,
          strategy_data: newStrategy,
          created_at: new Date().toISOString()
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(null), 3000)
      } catch (err) {
        console.error('Failed to save strategy:', err)
        setSaveStatus('error')
      }
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-cyan-400' : 'text-slate-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-cyan-500 text-white' : 'bg-slate-800'}`}>1</div>
          <span className="font-medium">Define</span>
        </div>
        <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-cyan-500' : 'bg-slate-800'}`} />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-cyan-400' : 'text-slate-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-cyan-500 text-white' : 'bg-slate-800'}`}>2</div>
          <span className="font-medium">Strategy</span>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Target className="w-6 h-6 text-cyan-500" />Define Your Channel</h2>
          <p className="text-slate-400 mb-6">Enter your niche and target audience to generate a complete monetization strategy.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">What's your niche or industry?</label>
              <input type="text" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" placeholder="e.g., Personal Finance, Tech, Fitness" value={niche} onChange={e => setNiche(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Who is your target audience?</label>
              <input type="text" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" placeholder="e.g., New freelancers, Small business owners" value={audience} onChange={e => setAudience(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">What digital product will you sell?</label>
              <input type="text" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" placeholder="e.g., Tax checklist, Contract templates, Course" value={product} onChange={e => setProduct(e.target.value)} />
            </div>
            <button onClick={generateStrategy} className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-4 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors mt-6">
              <Sparkles className="w-5 h-5" />Generate Complete Strategy
            </button>
          </div>
        </div>
      )}

      {step === 2 && strategy && (
        <>
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Star className="w-6 h-6 text-cyan-500" />{strategy.brand.name}</h2>
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white text-sm">Edit</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/50 rounded-lg p-4"><p className="text-slate-400 text-sm mb-1">Handle</p><p className="text-lg font-semibold">{strategy.brand.handle}</p></div>
              <div className="bg-slate-950/50 rounded-lg p-4"><p className="text-slate-400 text-sm mb-1">Tagline</p><p className="text-lg">{strategy.brand.tagline}</p></div>
              <div className="bg-slate-950/50 rounded-lg p-4 md:col-span-2"><p className="text-slate-400 text-sm mb-1">Positioning</p><p className="text-lg">{strategy.brand.positioning}</p></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-cyan-500" />Content Mix Strategy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategy.pillars.map((p, i) => (
                <div key={i} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-3"><span className="font-semibold">{p.name}</span><span className="text-cyan-400 font-bold">{p.pct}%</span></div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mb-3"><div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${p.pct}%` }} /></div>
                  <p className="text-slate-400 text-sm mb-2">{p.desc}</p>
                  <div className="flex flex-wrap gap-1">{p.examples.map((ex, j) => <span key={j} className="text-xs bg-slate-800 px-2 py-1 rounded">{ex}</span>)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-cyan-500" />Posting Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(strategy.schedule).map(([plat, sched]) => (
                <div key={plat} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${PLATFORMS[plat]?.bg || 'bg-slate-700'}`}>{PLATFORMS[plat]?.icon}</div>
                    <span className="font-semibold capitalize">{plat}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Frequency</span><span>{sched.frequency}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Best Time</span><span>{sched.time}</span></div>
                    <div className="text-slate-400">Best Days: {sched.bestDays.join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-cyan-500" />Growth Roadmap</h2>
            <div className="space-y-4">
              {strategy.roadmap.map((ph, i) => (
                <div key={i} className="flex items-start gap-4 bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-semibold text-lg">{ph.phase}</span>
                      <span className="text-cyan-400 bg-cyan-500/20 px-3 py-1 rounded-full text-sm">{ph.goal}</span>
                    </div>
                    <p className="text-slate-400 mb-3">{ph.action}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span><span className="text-slate-500">Followers:</span> <span className="font-medium">{ph.metrics.followers}</span></span>
                      <span><span className="text-slate-500">Engagement:</span> <span className="font-medium">{ph.metrics.engagement}</span></span>
                      {ph.metrics.emailList && <span><span className="text-slate-500">Email:</span> <span className="font-medium">{ph.metrics.emailList}</span></span>}
                      {ph.metrics.revenue && <span><span className="text-slate-500">Revenue:</span> <span className="font-medium text-green-400">{ph.metrics.revenue}</span></span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-cyan-500" />Product & Funnel Strategy</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-cyan-500" />Product Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="font-medium">{strategy.product.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Price</span><span className="font-medium text-green-400">{strategy.product.price}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Format</span><span className="font-medium">{strategy.product.format}</span></div>
                  <div className="pt-3 border-t border-slate-800"><p className="text-slate-400 text-sm mb-1">Description</p><p>{strategy.product.description}</p></div>
                </div>
              </div>
              <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-500" />Sales Funnel</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg">
                    <div className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <div><p className="font-medium text-sm">Top of Funnel</p><p className="text-slate-400 text-sm">{strategy.product.funnel.top}</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg">
                    <div className="w-6 h-6 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <div><p className="font-medium text-sm">Middle of Funnel</p><p className="text-slate-400 text-sm">{strategy.product.funnel.middle}</p></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg">
                    <div className="w-6 h-6 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <div><p className="font-medium text-sm">Bottom of Funnel</p><p className="text-slate-400 text-sm">{strategy.product.funnel.bottom}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── CREATE ─── */
function CreateView({ channels = [], createVideo }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [format, setFormat] = useState('vertical')
  const [script, setScript] = useState('')
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState(null)
  const [error, setError] = useState(null)
  const [visuals, setVisuals] = useState([])
  const [audio, setAudio] = useState(null)
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState({ script: 'pending', voice: 'pending', visuals: 'pending', captions: 'pending', render: 'pending' })
  const [publishTargets, setPublishTargets] = useState([])
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState(null)
  const [composition, setComposition] = useState(null)
  const [showCompositionPreview, setShowCompositionPreview] = useState(false)
  const [isGeneratingComposition, setIsGeneratingComposition] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Render the composition via a Blob URL rather than iframe srcDoc. Safari does
  // not reliably render large srcDoc documents (Bug #5); a blob: URL does, and
  // it also gives us an "open in new tab" fallback.
  useEffect(() => {
    if (!composition?.html) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(new Blob([composition.html], { type: 'text/html' }))
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [composition])

  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic first')
      return
    }
    
    setIsGenerating(true)
    setError(null)
    setPipelineStatus(prev => ({ ...prev, script: 'current' }))
    
    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          style: 'faceless',
          length: 'short'
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.details || err.error || 'Generation failed')
      }

      const data = await response.json()
      setGeneratedScript(data.script)
      setScript(data.script.fullScript)
      setCurrentStep(2)
      setPipelineStatus(prev => ({ ...prev, script: 'complete' }))

      // Save as draft video record
      if (createVideo) {
        await createVideo({
          workspace_id: 'default',
          title: topic,
          platform: 'tiktok',
          status: 'draft',
          views: 0,
          engagement: '0%',
          posted_at: null,
          script_content: data.script.fullScript,
          visuals_count: 0,
          has_audio: false
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to generate script. Make sure OPENAI_API_KEY is set.')
      setPipelineStatus(prev => ({ ...prev, script: 'error' }))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateVisuals = async () => {
    if (!generatedScript) {
      setError('Please generate a script first')
      return
    }

    setIsGeneratingVisuals(true)
    setPipelineStatus(prev => ({ ...prev, visuals: 'current' }))
    
    try {
      // Generate visual prompts for each body point
      const visualPrompts = generatedScript.body.map((point, i) => ({
        id: i,
        text: point,
        visualPrompt: `Professional business infographic showing: ${point}. Modern flat design, clean layout, corporate colors, minimalist style`
      }))

      // Simulate visual generation (in production, this would call fal.ai)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const generatedVisuals = visualPrompts.map(v => ({
        ...v,
        imageUrl: `https://via.placeholder.com/1080x1920/1e293b/06b6d4?text=Scene+${v.id + 1}`,
        status: 'complete'
      }))

      setVisuals(generatedVisuals)
      setCurrentStep(3)
      setPipelineStatus(prev => ({ ...prev, visuals: 'complete' }))
    } catch (err) {
      setError('Failed to generate visuals: ' + err.message)
      setPipelineStatus(prev => ({ ...prev, visuals: 'error' }))
    } finally {
      setIsGeneratingVisuals(false)
    }
  }

  const handleGenerateAudio = async () => {
    if (!script) {
      setError('Please enter or generate a script first')
      return
    }

    setIsGeneratingAudio(true)
    setPipelineStatus(prev => ({ ...prev, voice: 'current' }))
    
    try {
      // Simulate TTS generation (in production, this would call fal.ai Kokoro)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const audioData = {
        audioUrl: 'https://example.com/audio.mp3',
        duration: Math.ceil(script.split(' ').length / 2.5), // ~2.5 words per second
        status: 'complete'
      }

      setAudio(audioData)
      setPipelineStatus(prev => ({ ...prev, voice: 'complete' }))
    } catch (err) {
      setError('Failed to generate audio: ' + err.message)
      setPipelineStatus(prev => ({ ...prev, voice: 'error' }))
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const handleRenderVideo = async () => {
    setPipelineStatus(prev => ({ ...prev, captions: 'current', render: 'current' }))
    
    try {
      // Simulate rendering process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setPipelineStatus(prev => ({ ...prev, captions: 'complete', render: 'complete' }))
      setCurrentStep(5)
    } catch (err) {
      setError('Failed to render video: ' + err.message)
      setPipelineStatus(prev => ({ ...prev, captions: 'error', render: 'error' }))
    }
  }

  const handleGenerateComposition = async () => {
    if (!generatedScript) {
      setError('Please generate a script first')
      return
    }

    setIsGeneratingComposition(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-composition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: generatedScript,
          options: {
            brandName: 'ContentOS',
            primaryColor: '#06b6d4',
            fontFamily: 'Inter'
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate composition')
      }

      const data = await response.json()
      setComposition(data)
      setShowCompositionPreview(true)
    } catch (err) {
      setError('Failed to generate composition: ' + err.message)
    } finally {
      setIsGeneratingComposition(false)
    }
  }

  const handleDownloadComposition = () => {
    if (!composition) return

    const blob = new Blob([composition.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${composition.composition.name.replace(/[^a-z0-9]/gi, '_')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const togglePublishTarget = (channelId) => {
    setPublishTargets(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    )
  }

  const handlePublishNow = async () => {
    if (publishTargets.length === 0) {
      setError('Select at least one channel to publish to')
      return
    }

    setIsPublishing(true)
    setPublishResult(null)
    setError(null)

    try {
      // Post to each selected channel via Postiz
      const results = []
      for (const channelId of publishTargets) {
        try {
          const result = await postiz.post({
            channelIds: [channelId],
            content: generatedScript?.fullScript || script || topic,
            mediaUrls: visuals.map(v => v.imageUrl).filter(Boolean),
            scheduledTime: null
          })
          results.push({ channelId, success: true, ...result })
        } catch (err) {
          results.push({ channelId, success: false, error: err.message })
        }
      }

      // Save video record to DB. Use the field names the display/calendar layer
      // reads: published_at (date) and target_platforms (array).
      if (createVideo) {
        await createVideo({
          workspace_id: 'default',
          title: topic || generatedScript?.hook || 'Untitled Video',
          target_platforms: publishTargets.map(id => channels.find(c => c.id === id)?.platform).filter(Boolean),
          status: 'published',
          views: 0,
          engagement: '0%',
          published_at: new Date().toISOString(),
          script_content: script,
          visuals_count: visuals.length,
          has_audio: !!audio
        })
      }

      const successCount = results.filter(r => r.success).length
      setPublishResult({
        success: successCount > 0,
        message: `Published to ${successCount}/${publishTargets.length} channel(s)`,
        results
      })
      setPipelineStatus(prev => ({ ...prev, publish: 'complete' }))
    } catch (err) {
      setError('Publish failed: ' + err.message)
      setPublishResult({ success: false, message: err.message })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSchedulePost = async () => {
    if (publishTargets.length === 0) {
      setError('Select at least one channel to schedule for')
      return
    }
    if (!scheduleDate || !scheduleTime) {
      setError('Please select a date and time to schedule')
      return
    }

    setIsPublishing(true)
    setPublishResult(null)
    setError(null)

    try {
      const scheduledTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      const results = []
      
      for (const channelId of publishTargets) {
        try {
          const result = await postiz.post({
            channelIds: [channelId],
            content: generatedScript?.fullScript || script || topic,
            mediaUrls: visuals.map(v => v.imageUrl).filter(Boolean),
            scheduledTime
          })
          results.push({ channelId, success: true, scheduledTime, ...result })
        } catch (err) {
          results.push({ channelId, success: false, error: err.message })
        }
      }

      // Save video record to DB with scheduled status. scheduled_time is the
      // field the calendar buckets by.
      if (createVideo) {
        await createVideo({
          workspace_id: 'default',
          title: topic || generatedScript?.hook || 'Untitled Video',
          target_platforms: publishTargets.map(id => channels.find(c => c.id === id)?.platform).filter(Boolean),
          status: 'scheduled',
          views: 0,
          engagement: '0%',
          scheduled_time: scheduledTime,
          script_content: script,
          visuals_count: visuals.length,
          has_audio: !!audio
        })
      }

      const successCount = results.filter(r => r.success).length
      setPublishResult({
        success: successCount > 0,
        message: `Scheduled for ${new Date(scheduledTime).toLocaleString()} on ${successCount} channel(s)`,
        results
      })
    } catch (err) {
      setError('Schedule failed: ' + err.message)
      setPublishResult({ success: false, message: err.message })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        {[{ n: 1, l: 'Script', ic: FileText }, { n: 2, l: 'Voice', ic: Mic }, { n: 3, l: 'Visuals', ic: Film }, { n: 4, l: 'Design', ic: Palette }, { n: 5, l: 'Publish', ic: Send }].map((s, i, a) => (
          <React.Fragment key={s.n}>
            <button onClick={() => setCurrentStep(s.n)} className={`flex items-center gap-2 flex-shrink-0 ${currentStep >= s.n ? 'text-cyan-400' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= s.n ? 'bg-cyan-500 text-white' : 'bg-slate-800'}`}>
                {currentStep > s.n ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <s.ic className="w-4 h-4" /><span className="text-sm font-medium hidden lg:inline">{s.l}</span>
            </button>
            {i < a.length - 1 && <div className={`w-8 h-0.5 flex-shrink-0 ${currentStep > s.n ? 'bg-cyan-500' : 'bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Film className="w-5 h-5 text-cyan-500" />Video Configuration</h2>
          <div>
            <label className="block text-sm font-semibold mb-2">Video Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ k: 'vertical', icon: '📱', label: '9:16 Vertical' }, { k: 'landscape', icon: '🖥️', label: '16:9 Landscape' }, { k: 'square', icon: '📐', label: '1:1 Square' }].map(f => (
                <button key={f.k} onClick={() => setFormat(f.k)} className={`p-3 rounded-lg text-center transition-colors ${format === f.k ? 'bg-cyan-500/20 border border-cyan-500' : 'bg-slate-950 border border-slate-800 hover:border-slate-600'}`}>
                  <div className="text-2xl mb-1">{f.icon}</div><p className="text-xs">{f.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Content Style</label>
            <select className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500">
              <option>Text-on-Screen (Faceless)</option><option>Stock Footage + Voiceover</option><option>AI-Generated Visuals</option><option>Screen Recording</option><option>Whiteboard Animation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Topic / Hook</label>
            <input 
              type="text" 
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" 
              placeholder="e.g., The tax mistake 90% of freelancers make" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Script</label>
            <textarea 
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full h-40 focus:outline-none focus:border-cyan-500 resize-none" 
              placeholder="Enter script or click 'Generate with AI'..." 
              value={script} 
              onChange={(e) => setScript(e.target.value)} 
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <button 
            onClick={handleGenerateScript} 
            disabled={isGenerating}
            className={`bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />Generate Script with AI
              </>
            )}
          </button>
          {generatedScript && (
            <div className="bg-slate-950 rounded-lg p-4 border border-cyan-500/30">
              <h4 className="font-semibold text-cyan-400 mb-2">✨ Generated Script</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Hook:</span>
                  <p className="ml-2">{generatedScript.hook}</p>
                </div>
                <div>
                  <span className="text-slate-400">Body:</span>
                  <ul className="ml-2 list-disc">
                    {generatedScript.body.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-slate-400">CTA:</span>
                  <p className="ml-2">{generatedScript.cta}</p>
                </div>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>⏱️ {generatedScript.estimatedDuration}</span>
                </div>
              </div>
              <button
                onClick={handleGenerateVisuals}
                disabled={isGeneratingVisuals}
                className={`mt-4 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors ${isGeneratingVisuals ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGeneratingVisuals ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Visuals...
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />Generate Visuals
                  </>
                )}
              </button>
              <button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio}
                className={`mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors ${isGeneratingAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGeneratingAudio ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Audio...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />Generate Voiceover
                  </>
                )}
              </button>
              {visuals.length > 0 && audio && (
                <button
                  onClick={handleRenderVideo}
                  className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors"
                >
                  <Film className="w-4 h-4" />Render Video
                </button>
              )}
              {generatedScript && (
                <button
                  onClick={handleGenerateComposition}
                  disabled={isGeneratingComposition}
                  className={`mt-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors ${isGeneratingComposition ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGeneratingComposition ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating Composition...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />Export HyperFrames Composition
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5 text-cyan-500" />Brand Design System</h2>
          <div>
            <label className="block text-sm font-semibold mb-2">Brand Name</label>
            <input type="text" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" placeholder="Your brand name" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Primary Color</label>
            <div className="flex flex-wrap gap-2">
              {['bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-pink-500', 'bg-blue-500', 'bg-emerald-500'].map((c, i) => (
                <div key={i} className={`w-10 h-10 rounded-lg ${c} cursor-pointer border-2 border-transparent hover:border-white hover:scale-110 transition-all`} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Typography</label>
            <select className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500">
              <option>Inter (Modern Sans)</option><option>Impact (Bold)</option><option>Playfair Display (Serif)</option><option>JetBrains Mono (Monospace)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Caption Style</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ n: 'Word Highlight', d: 'Karaoke style' }, { n: 'Full Subtitles', d: 'Complete lines' }, { n: 'Minimal', d: 'Bottom third' }, { n: 'Animated', d: 'Pop-in effects' }].map((s, i) => (
                <button key={i} className={`p-3 rounded-lg text-left transition-colors ${i === 0 ? 'bg-slate-950 border border-cyan-500' : 'bg-slate-950 border border-slate-800 hover:border-slate-600'}`}>
                  <p className="font-medium text-sm">{s.n}</p><p className="text-xs text-slate-400">{s.d}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <p className="text-sm font-semibold mb-2">Preview</p>
            <div className={`rounded-lg bg-slate-800 flex items-center justify-center ${format === 'vertical' ? 'aspect-[9/16]' : format === 'landscape' ? 'aspect-video' : 'aspect-square'}`}>
              <p className="text-slate-500 text-sm">Video preview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Panel - Step 5 */}
      {currentStep === 5 && pipelineStatus.render === 'complete' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Send className="w-5 h-5 text-cyan-500" />
            Publish to Channels
          </h2>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Select Channels</label>
            {channels.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-center">
                <p className="text-slate-400 text-sm">No channels connected</p>
                <p className="text-slate-500 text-xs mt-1">Add channels in the Channels view first</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {channels.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => togglePublishTarget(ch.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      publishTargets.includes(ch.id)
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${PLATFORMS[ch.platform]?.bg || 'bg-slate-700'}`}>
                        {PLATFORMS[ch.platform]?.icon || '🌐'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{ch.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{ch.platform}</p>
                      </div>
                      {publishTargets.includes(ch.id) && (
                        <Check className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Schedule Date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Schedule Time</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Publish Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePublishNow}
              disabled={isPublishing || publishTargets.length === 0}
              className={`flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                (isPublishing || publishTargets.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post Now
                </>
              )}
            </button>
            <button
              onClick={handleSchedulePost}
              disabled={isPublishing || publishTargets.length === 0 || !scheduleDate || !scheduleTime}
              className={`flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                (isPublishing || publishTargets.length === 0 || !scheduleDate || !scheduleTime) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
          </div>

          {/* Publish Result */}
          {publishResult && (
            <div className={`p-4 rounded-lg border ${
              publishResult.success
                ? 'border-green-500 bg-green-500/10'
                : 'border-red-500 bg-red-500/10'
            }`}>
              <div className="flex items-start gap-3">
                {publishResult.success ? (
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${publishResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {publishResult.message}
                  </p>
                  {publishResult.results && (
                    <div className="mt-2 space-y-1">
                      {publishResult.results.map((r, i) => (
                        <p key={i} className="text-xs text-slate-400">
                          {r.success ? '✓' : '✗'} Channel {r.channelId}: {r.success ? 'Success' : r.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4"><Zap className="w-5 h-5 text-cyan-500 inline mr-2" />Production Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { n: 1, t: 'Script', key: 'script' },
            { n: 2, t: 'Voiceover', key: 'voice' },
            { n: 3, t: 'Visuals', key: 'visuals' },
            { n: 4, t: 'Captions', key: 'captions' },
            { n: 5, t: 'Render', key: 'render' }
          ].map(step => {
            const status = pipelineStatus[step.key]
            return (
              <div key={step.n} className={`p-4 rounded-lg border ${status === 'complete' ? 'border-green-500 bg-green-500/5' : status === 'current' ? 'border-cyan-500 bg-cyan-500/5' : status === 'error' ? 'border-red-500 bg-red-500/5' : 'border-slate-800 bg-slate-950'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${status === 'complete' ? 'bg-green-500' : status === 'current' ? 'bg-cyan-500' : status === 'error' ? 'bg-red-500' : 'bg-slate-700'}`}>
                  {status === 'complete' ? <Check className="w-4 h-4" /> : status === 'current' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : step.n}
                </div>
                <p className="font-semibold">{step.t}</p>
                <p className="text-xs text-slate-400 capitalize">{status}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Composition Preview Modal */}
      {showCompositionPreview && composition && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-500" />
                HyperFrames Composition Preview
              </h2>
              <button onClick={() => setShowCompositionPreview(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Preview iframe */}
              <div>
                <p className="text-sm font-semibold mb-2 text-slate-400">Live Preview</p>
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                  <iframe
                    src={previewUrl || undefined}
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-[500px] border-0"
                    title="Composition Preview"
                  />
                </div>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <ArrowUpRight className="w-3 h-3" />Open preview in new tab
                  </a>
                )}
              </div>
              
              {/* Composition details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2 text-slate-400">Composition Info</p>
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Name:</span>
                      <span className="font-medium">{composition.composition.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-medium">{composition.duration}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Resolution:</span>
                      <span className="font-medium">{composition.composition.width}×{composition.composition.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Clips:</span>
                      <span className="font-medium">{composition.composition.clips.length}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-semibold mb-2 text-slate-400">Timeline</p>
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 space-y-2 max-h-[300px] overflow-auto">
                    {composition.composition.clips.map((clip, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-20 text-slate-500 font-mono text-xs">
                          {clip.start}s - {clip.start + clip.duration}s
                        </div>
                        <div className="flex-1 bg-slate-800 rounded px-2 py-1 truncate">
                          {clip.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadComposition}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download HTML
                  </button>
                  <button
                    onClick={() => setShowCompositionPreview(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── CONTENT ─── */
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
function AnalyticsView({ videos, channels }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?period=${period}`)
      const data = await res.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (err) {
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
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
    </div>
  )
}

/* ─── MONETIZE ─── */
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

export default App
