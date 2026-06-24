import React, { useState } from 'react'
import {
  Bot, Play, Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  Zap, Brain, Search, BarChart3, TrendingUp, Calendar, PenTool,
  Film, Send, DollarSign, Bell, Settings
} from 'lucide-react'

const AGENTS = [
  { id: 'strategy', label: 'Strategy Agent', icon: Target, color: 'text-cyan-400', desc: 'Generate or refresh brand strategy with RAG-enhanced intelligence', inputs: [{ key: 'trigger', type: 'select', options: ['init', 'refresh', 'manual'], label: 'Trigger', default: 'manual' }] },
  { id: 'research', label: 'Research Agent', icon: Search, color: 'text-blue-400', desc: 'Scan competitors, trends, and niche opportunities', inputs: [{ key: 'query_type', type: 'select', options: ['competitors', 'trends', 'niche'], label: 'Research Type', default: 'trends' }, { key: 'query', type: 'text', label: 'Query (optional)' }] },
  { id: 'planning', label: 'Planning Agent', icon: Calendar, color: 'text-purple-400', desc: 'Generate a 30-day content calendar from strategy', inputs: [{ key: 'horizon_days', type: 'number', label: 'Days Ahead', default: 30 }] },
  { id: 'writing', label: 'Writing Agent', icon: PenTool, color: 'text-green-400', desc: 'Write a complete script with RAG-enhanced knowledge and playbooks', inputs: [{ key: 'video_id', type: 'text', label: 'Video ID (from Content view)' }, { key: 'title', type: 'text', label: 'Or enter title directly' }, { key: 'topic', type: 'text', label: 'Topic / angle' }] },
  { id: 'analytics', label: 'Analytics Agent', icon: BarChart3, color: 'text-amber-400', desc: 'Sync post performance metrics and channel snapshots', inputs: [{ key: 'lookback_days', type: 'number', label: 'Lookback Days', default: 30 }] },
  { id: 'optimization', label: 'Optimization Agent', icon: TrendingUp, color: 'text-orange-400', desc: 'Run the learning loop — analyze patterns, update strategy weights', inputs: [] }
]

function Target(props) { return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg> }

export default function AgentsView({ workspaceId }) {
  const [runs, setRuns] = useState({})
  const [results, setResults] = useState({})
  const [errors, setErrors] = useState({})
  const [expanded, setExpanded] = useState({})
  const [inputs, setInputs] = useState({})

  async function runAgent(agentId) {
    setRuns(r => ({ ...r, [agentId]: true }))
    setErrors(e => ({ ...e, [agentId]: null }))
    setResults(r => ({ ...r, [agentId]: null }))

    const agentInputs = inputs[agentId] || {}
    const body = { agent_type: agentId, workspace_id: workspaceId, ...agentInputs }

    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Agent failed')
      setResults(r => ({ ...r, [agentId]: data.result }))
    } catch (err) {
      setErrors(e => ({ ...e, [agentId]: err.message }))
    }
    setRuns(r => ({ ...r, [agentId]: false }))
  }

  function setInput(agentId, key, value) {
    setInputs(prev => ({ ...prev, [agentId]: { ...(prev[agentId] || {}), [key]: value } }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Bot className="w-6 h-6 text-cyan-500" />Agents</h2>
        <p className="text-sm text-slate-400 mt-1">Trigger autonomous agents manually. In Autonomous Brand Mode, these run on schedule via the job queue.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
        <p className="flex items-center gap-2"><Settings className="w-4 h-4 text-cyan-500" />
          All agents retrieve RAG context from your Knowledge Base before executing. Add knowledge assets to improve output quality.
        </p>
      </div>

      <div className="space-y-4">
        {AGENTS.map(agent => {
          const isRunning = runs[agent.id]
          const result = results[agent.id]
          const err = errors[agent.id]
          const isExpanded = expanded[agent.id]

          return (
            <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0`}>
                      <agent.icon className={`w-4 h-4 ${agent.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{agent.label}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{agent.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {result && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {err && <AlertCircle className="w-4 h-4 text-red-400" />}
                    <button onClick={() => runAgent(agent.id)} disabled={isRunning}
                      className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors">
                      {isRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</> : <><Play className="w-3.5 h-3.5" />Run</>}
                    </button>
                  </div>
                </div>

                {/* Agent inputs */}
                {agent.inputs.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {agent.inputs.map(input => (
                      <div key={input.key}>
                        <label className="text-xs text-slate-500 block mb-1">{input.label}</label>
                        {input.type === 'select' ? (
                          <select value={(inputs[agent.id] || {})[input.key] || input.default || ''} onChange={e => setInput(agent.id, input.key, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors">
                            {input.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={input.type || 'text'} value={(inputs[agent.id] || {})[input.key] || input.default || ''}
                            onChange={e => setInput(agent.id, input.key, e.target.value)}
                            placeholder={input.label}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {err && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" />{err}</p>}
              </div>

              {result && (
                <div className="border-t border-slate-800">
                  <button onClick={() => setExpanded(e => ({ ...e, [agent.id]: !isExpanded }))}
                    className="w-full px-5 py-3 flex items-center justify-between text-sm text-slate-400 hover:bg-slate-800/50 transition-colors">
                    <span className="text-green-400 font-medium">Result</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5">
                      <ResultDisplay agentId={agent.id} result={result} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultDisplay({ agentId, result }) {
  if (agentId === 'writing' && result.script) {
    return (
      <div className="space-y-3">
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
          <p className="text-xs text-slate-500 mb-1">HOOK</p>
          <p className="text-sm text-white font-medium">{result.script.hook}</p>
        </div>
        {result.script.body?.slice(0, 2).map((section, i) => (
          <div key={i} className="bg-slate-950 rounded-lg p-3 border border-slate-800">
            <p className="text-xs text-slate-500 mb-1">{section.section} • {section.duration}</p>
            <p className="text-sm text-slate-300">{section.script?.slice(0, 200)}{section.script?.length > 200 ? '...' : ''}</p>
          </div>
        ))}
        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
          <p className="text-xs text-slate-500 mb-1">CTA</p>
          <p className="text-sm text-white">{result.script.cta}</p>
        </div>
        {result.alt_hooks?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">ALT HOOKS</p>
            {result.alt_hooks.map((h, i) => <p key={i} className="text-xs text-slate-400 mb-1">• {h}</p>)}
          </div>
        )}
      </div>
    )
  }

  if (agentId === 'strategy' && result.strategy) {
    const s = result.strategy
    return (
      <div className="space-y-3">
        {s.brand_name && <p className="font-bold text-lg">{s.brand_name} <span className="text-slate-400 font-normal text-sm">{s.handle}</span></p>}
        {s.tagline && <p className="text-sm text-slate-300 italic">"{s.tagline}"</p>}
        {s.content_pillars?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {s.content_pillars.map((p, i) => (
              <div key={i} className="bg-slate-950 rounded p-2 border border-slate-800">
                <p className="text-xs font-medium">{p.name} <span className="text-cyan-400">{p.pct}%</span></p>
                <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (agentId === 'planning' && result.calendar_items) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-green-400">{result.posts_planned} posts planned over {result.horizon_days} days</p>
        {result.calendar_items?.slice(0, 5).map((item, i) => (
          <div key={i} className="bg-slate-950 rounded p-2 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300 truncate flex-1">{item.title}</span>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0 text-slate-500">
              <span>{item.date}</span>
              {item.score && <span className="text-cyan-400">{(item.score * 100).toFixed(0)}%</span>}
            </div>
          </div>
        ))}
        {result.calendar_items?.length > 5 && <p className="text-xs text-slate-500">+{result.calendar_items.length - 5} more</p>}
      </div>
    )
  }

  if (agentId === 'optimization' && result.insights) {
    return (
      <div className="space-y-2">
        <p className="text-sm">{result.posts_analyzed} posts analyzed · {result.patterns_learned} patterns learned</p>
        {result.weekly_summary && <p className="text-xs text-slate-400 bg-slate-950 rounded p-3 border border-slate-800">{result.weekly_summary}</p>}
        {result.insights?.slice(0, 3).map((ins, i) => (
          <div key={i} className="bg-slate-950 rounded p-2 border border-slate-800 text-xs">
            <p className="font-medium text-white">{ins.title}</p>
            <p className="text-slate-400 mt-0.5">{ins.recommendation}</p>
          </div>
        ))}
      </div>
    )
  }

  // Generic fallback
  return (
    <pre className="text-xs text-slate-400 bg-slate-950 rounded-lg p-3 border border-slate-800 overflow-auto max-h-64">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}
