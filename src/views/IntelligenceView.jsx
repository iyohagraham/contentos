import React, { useState } from 'react'
import {
  Zap, Youtube, Link, Loader2, AlertCircle, ChevronDown, ChevronUp,
  TrendingUp, Hash, Star, Copy, ArrowUpRight, BookOpen, Layers,
  Target, Shuffle, Globe, Wand2
} from 'lucide-react'

const DNA_LABELS = {
  channel_dna: { label: 'Channel DNA', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  content_dna: { label: 'Content DNA', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  monetization_dna: { label: 'Monetization DNA', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  growth_dna: { label: 'Growth DNA', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' }
}

const PLAYBOOK_COLORS = {
  title_formula: 'border-amber-500/30 bg-amber-500/10',
  hook_formula: 'border-orange-500/30 bg-orange-500/10',
  cta_formula: 'border-green-500/30 bg-green-500/10',
  content_structure: 'border-blue-500/30 bg-blue-500/10',
  thumbnail_formula: 'border-pink-500/30 bg-pink-500/10'
}

export default function IntelligenceView({ workspaceId }) {
  const [channelUrl, setChannelUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedDNA, setExpandedDNA] = useState({})
  const [applyPlaybook, setApplyPlaybook] = useState(null)
  const [applyTopic, setApplyTopic] = useState('')
  const [applyResult, setApplyResult] = useState(null)
  const [applying, setApplying] = useState(false)
  const [adaptVersion, setAdaptVersion] = useState(null)
  const [adaptNiche, setAdaptNiche] = useState('')
  const [adaptResult, setAdaptResult] = useState(null)
  const [adapting, setAdapting] = useState(false)

  async function analyze() {
    if (!channelUrl.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, channel_url: channelUrl })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function applyFormula(playbook) {
    if (!applyTopic.trim()) return
    setApplying(true)
    try {
      const res = await fetch('/api/intelligence/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbook_id: playbook.id, topic: applyTopic, workspace_id: workspaceId })
      })
      const data = await res.json()
      setApplyResult(data)
    } catch { /* non-fatal */ }
    setApplying(false)
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  async function adaptToNiche(version) {
    if (!adaptNiche.trim()) return
    setAdapting(true)
    try {
      const res = await fetch('/api/intelligence/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          dna: result.dna,
          target_niche: adaptNiche,
          version_type: version.type
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Adaptation failed')
      setAdaptResult(data)
    } catch (err) {
      setAdaptResult({ error: err.message })
    }
    setAdapting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-cyan-500" />Channel Intelligence</h2>
        <p className="text-sm text-slate-400 mt-1">Reverse-engineer any channel into DNA blueprints, playbook formulas, and version templates</p>
      </div>

      {/* URL input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex gap-3">
          <input value={channelUrl} onChange={e => setChannelUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="https://youtube.com/@channelname or https://youtu.be/video_id"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
          <button onClick={analyze} disabled={loading || !channelUrl.trim()}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Zap className="w-4 h-4" />Analyze</>}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
        <p className="text-xs text-slate-500 mt-2">Works with YouTube channels, individual videos, or any social profile URL. The AI extracts DNA from known channels and infers from URL structure for others.</p>
      </div>

      {result && (
        <>
          {/* Channel meta */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{result.meta?.display_name || channelUrl}</h3>
                {result.meta?.handle && <p className="text-slate-400 text-sm">{result.meta.handle}</p>}
                {result.dna?.key_insights?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.dna.key_insights.slice(0, 3).map((insight, i) => (
                      <p key={i} className="text-sm text-slate-300 flex items-start gap-2"><Star className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />{insight}</p>
                    ))}
                  </div>
                )}
              </div>
              <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-cyan-400 transition-colors"><Globe className="w-5 h-5" /></a>
            </div>

            {/* Score grid */}
            {result.dna?.scores && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Object.entries(result.dna.scores).slice(0, 10).map(([key, score]) => (
                  <div key={key} className="bg-slate-950 rounded-lg p-2 text-center border border-slate-800">
                    <p className="text-lg font-bold text-cyan-400">{score}</p>
                    <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DNA Blueprints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(DNA_LABELS).map(([key, meta]) => {
              const dna = result.dna?.[key]
              if (!dna) return null
              const isOpen = expandedDNA[key]
              return (
                <div key={key} className={`rounded-xl p-4 border ${meta.bg}`}>
                  <button onClick={() => setExpandedDNA(prev => ({ ...prev, [key]: !isOpen }))}
                    className="w-full flex items-center justify-between">
                    <span className={`font-semibold text-sm ${meta.color}`}>{meta.label}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {isOpen && (
                    <div className="mt-3 space-y-2">
                      {Object.entries(dna).map(([field, value]) => (
                        <div key={field} className="text-xs">
                          <span className="text-slate-500 capitalize">{field.replace(/_/g, ' ')}: </span>
                          <span className="text-slate-300">{Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Playbooks */}
          {result.playbooks?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-cyan-500" />Extracted Playbooks ({result.playbooks.length})</h3>
              <div className="space-y-3">
                {result.playbooks.map((pb, i) => (
                  <div key={i} className={`rounded-xl p-4 border ${PLAYBOOK_COLORS[pb.playbook_type] || 'border-slate-700 bg-slate-900'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-500 capitalize">{pb.playbook_type?.replace(/_/g, ' ')}</span>
                          {pb.success_rate && <span className="text-xs text-green-400">{(pb.success_rate * 100).toFixed(0)}% success rate</span>}
                        </div>
                        <p className="font-medium text-sm">{pb.name}</p>
                        <p className="text-sm text-slate-300 mt-1 font-mono bg-slate-950/50 rounded p-2">{pb.formula}</p>
                        {pb.examples?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {pb.examples.slice(0, 2).map((ex, j) => <p key={j} className="text-xs text-slate-400">→ {ex}</p>)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => copyText(pb.formula)} className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors" title="Copy formula">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setApplyPlaybook(applyPlaybook?.id === pb.id ? null : pb)} className="p-1.5 hover:bg-cyan-500/20 rounded text-slate-500 hover:text-cyan-400 transition-colors" title="Apply formula">
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {applyPlaybook?.id === pb.id && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                        <div className="flex gap-2">
                          <input value={applyTopic} onChange={e => setApplyTopic(e.target.value)}
                            placeholder="Enter your topic to apply this formula..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
                          <button onClick={() => applyFormula(pb)} disabled={applying || !applyTopic.trim()}
                            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-4 py-2 rounded text-sm transition-colors">
                            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                          </button>
                        </div>
                        {applyResult?.variations?.length > 0 && (
                          <div className="space-y-2">
                            {applyResult.variations.map((v, k) => (
                              <div key={k} className="bg-slate-950 rounded p-2 text-sm flex items-start gap-2">
                                <span className="text-slate-300 flex-1">{v.text}</span>
                                <button onClick={() => copyText(v.text)} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version Builder */}
          {result.versions?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-500" />Version Builder</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.versions.map((v, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 capitalize">{v.type?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="font-medium text-sm">{v.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{v.description}</p>
                    {v.projected_performance && (
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        {Object.entries(v.projected_performance).map(([k, val]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
                            <span className="text-green-400">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adapt to my niche — makes the "clone/adapt → new niche" loop actionable */}
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <button onClick={() => { setAdaptVersion(adaptVersion?.type === v.type ? null : v); setAdaptResult(null) }}
                        className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
                        <Wand2 className="w-3.5 h-3.5" />
                        {adaptVersion?.type === v.type ? 'Cancel' : 'Adapt to my niche'}
                      </button>

                      {adaptVersion?.type === v.type && (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <input value={adaptNiche} onChange={e => setAdaptNiche(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && adaptToNiche(v)}
                              placeholder={v.type === 'niche_transfer' ? 'e.g. personal finance for freelancers' : v.type === 'platform_transfer' ? 'target platform' : 'same niche — leave blank or refine'}
                              className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
                            <button onClick={() => adaptToNiche(v)} disabled={adapting || !adaptNiche.trim()}
                              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1.5">
                              {adapting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                              Generate
                            </button>
                          </div>

                          {adaptResult?.error && (
                            <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{adaptResult.error}</p>
                          )}

                          {adaptResult?.adapted_strategy && (
                            <div className="bg-slate-950/60 rounded-lg p-3 space-y-1.5 border border-slate-800">
                              <p className="text-xs text-slate-500">Adapted angle: <span className="text-slate-200">{adaptResult.adapted_strategy.niche_angle}</span></p>
                              {adaptResult.adapted_strategy.audience && <p className="text-xs text-slate-500">Audience: <span className="text-slate-200">{adaptResult.adapted_strategy.audience}</span></p>}
                              {adaptResult.adapted_strategy.content_pillars?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {adaptResult.adapted_strategy.content_pillars.map((p, k) => (
                                    <span key={k} className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded px-2 py-0.5">{p}</span>
                                  ))}
                                </div>
                              )}
                              {adaptResult.adapted_strategy.title_formula && <p className="text-xs text-slate-500 mt-1">Title: <span className="text-slate-300 font-mono">{adaptResult.adapted_strategy.title_formula}</span> <button onClick={() => copyText(adaptResult.adapted_strategy.title_formula)} className="text-slate-600 hover:text-white"><Copy className="w-3 h-3 inline" /></button></p>}
                              {adaptResult.adapted_strategy.hook_formula && <p className="text-xs text-slate-500">Hook: <span className="text-slate-300 font-mono">{adaptResult.adapted_strategy.hook_formula}</span></p>}
                              {adaptResult.adapted_strategy.cta_formula && <p className="text-xs text-slate-500">CTA: <span className="text-slate-300 font-mono">{adaptResult.adapted_strategy.cta_formula}</span></p>}
                            </div>
                          )}

                          {adaptResult?.posts?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500 font-semibold pt-1">Starter posts ({adaptResult.posts.length}):</p>
                              {adaptResult.posts.map((p, k) => (
                                <div key={k} className="bg-slate-950 rounded p-2.5 border border-slate-800">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium flex-1">{p.title}</p>
                                    <button onClick={() => copyText(`${p.title}\n\nHook: ${p.hook || ''}\nCTA: ${p.cta || ''}`)} className="text-slate-600 hover:text-white flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                                  </div>
                                  {p.hook && <p className="text-xs text-slate-400 mt-1">Hook: {p.hook}</p>}
                                  {p.cta && <p className="text-xs text-slate-400">CTA: {p.cta}</p>}
                                  {p.why_it_works && <p className="text-xs text-slate-500 mt-1 italic">why: {p.why_it_works}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <Zap className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Enter any YouTube channel or video URL above to extract its complete DNA blueprint and playbook formulas.</p>
        </div>
      )}
    </div>
  )
}
