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

export default StrategyView
