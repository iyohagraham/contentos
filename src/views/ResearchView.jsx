import React, { useState, useEffect } from 'react'
import {
  Search, TrendingUp, Users, Globe, Loader2, Plus, RefreshCw,
  AlertCircle, ChevronRight, Youtube, Target, Zap, BarChart3,
  ArrowUpRight, Star, Hash
} from 'lucide-react'

const QUERY_TYPES = [
  { id: 'competitors', label: 'Competitors', icon: Users, desc: 'Analyze competitor channels' },
  { id: 'trends', label: 'Trends', icon: TrendingUp, desc: 'Discover trending topics' },
  { id: 'niche', label: 'Niche Research', icon: Target, desc: 'Find niche opportunities' }
]

export default function ResearchView({ workspaceId }) {
  const [queryType, setQueryType] = useState('competitors')
  const [urlInput, setUrlInput] = useState('')
  const [nicheQuery, setNicheQuery] = useState('')
  const [urls, setUrls] = useState([])
  const [results, setResults] = useState([])
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { loadResults() }, [workspaceId])

  async function loadResults() {
    try {
      const res = await fetch(`/api/research/results?workspace_id=${workspaceId}&limit=30`)
      const data = await res.json()
      setResults(data.results || [])
      setQueries(data.queries || [])
    } catch { /* non-fatal */ }
  }

  function addUrl() {
    if (!urlInput.trim() || urls.includes(urlInput.trim())) return
    setUrls(prev => [...prev, urlInput.trim()])
    setUrlInput('')
  }

  async function runResearch() {
    setLoading(true)
    setError(null)
    try {
      const body = {
        workspace_id: workspaceId,
        query_type: queryType,
        query: nicheQuery,
        target_urls: urls
      }
      const res = await fetch('/api/research/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Research failed')
      await loadResults()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const recentResults = results.slice(0, 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Search className="w-6 h-6 text-cyan-500" />Research Intelligence</h2>
        <p className="text-sm text-slate-400 mt-1">Research competitors, discover trends, and find niche opportunities</p>
      </div>

      {/* Research config */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex gap-2 mb-5">
          {QUERY_TYPES.map(t => (
            <button key={t.id} onClick={() => setQueryType(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-all ${queryType === t.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              <t.icon className="w-4 h-4" />
              <span className="font-medium">{t.label}</span>
              <span className="text-xs opacity-70">{t.desc}</span>
            </button>
          ))}
        </div>

        {queryType === 'competitors' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Add competitor or reference channel URLs to analyze</p>
            <div className="flex gap-2">
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUrl()}
                placeholder="https://youtube.com/@channelname"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
              <button onClick={addUrl} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {urls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {urls.map(u => (
                  <span key={u} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span className="max-w-[200px] truncate">{u}</span>
                    <button onClick={() => setUrls(prev => prev.filter(x => x !== u))} className="text-slate-500 hover:text-red-400 ml-1">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {(queryType === 'trends' || queryType === 'niche') && (
          <input value={nicheQuery} onChange={e => setNicheQuery(e.target.value)}
            placeholder={queryType === 'niche' ? 'e.g. personal finance for millennials' : 'Optional: specify niche or topic focus'}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
        )}

        {error && <p className="text-red-400 text-sm flex items-center gap-2 mt-3"><AlertCircle className="w-4 h-4" />{error}</p>}

        <div className="flex justify-end mt-4">
          <button onClick={runResearch} disabled={loading || (queryType === 'competitors' && urls.length === 0)}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Researching...</> : <><Search className="w-4 h-4" />Run Research</>}
          </button>
        </div>
      </div>

      {/* Query history */}
      {queries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-semibold mb-3 text-sm text-slate-400">RECENT RESEARCH JOBS</h3>
          <div className="space-y-2">
            {queries.slice(0, 5).map(q => (
              <div key={q.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${q.status === 'complete' ? 'bg-green-500' : q.status === 'running' ? 'bg-amber-500 animate-pulse' : q.status === 'failed' ? 'bg-red-500' : 'bg-slate-500'}`} />
                  <span className="text-sm capitalize">{q.query_type}{q.query ? `: ${q.query}` : ''}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {q.result_count > 0 && <span>{q.result_count} results</span>}
                  <span>{q.created_at?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {recentResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-500" />Research Results</h3>
          {recentResults.map(r => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}

      {recentResults.length === 0 && queries.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No research yet. Add competitor URLs or scan for trends to get started.</p>
        </div>
      )}
    </div>
  )
}

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false)
  const data = result.data || {}

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 capitalize">{result.result_type}</span>
            {result.platform && <span className="text-xs text-slate-500 capitalize">{result.platform}</span>}
            {result.opportunity_score && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-400">{(result.opportunity_score * 100).toFixed(0)}% opportunity</span>
              </div>
            )}
          </div>
          <p className="font-medium text-sm">{result.title || result.url}</p>
          {data.summary && <p className="text-xs text-slate-400 mt-1">{data.summary}</p>}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-white transition-colors">
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {expanded && data && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
          {data.niche && <Detail label="Niche" value={data.niche} />}
          {data.content_focus && <Detail label="Content Focus" value={data.content_focus} />}
          {data.estimated_subscribers && <Detail label="Est. Subscribers" value={data.estimated_subscribers.toLocaleString()} />}
          {data.posting_frequency && <Detail label="Posting Frequency" value={data.posting_frequency} />}
          {data.strengths?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1">STRENGTHS</p>
              <div className="flex flex-wrap gap-1">{data.strengths.slice(0, 3).map((s, i) => <span key={i} className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded px-2 py-0.5">{s}</span>)}</div>
            </div>
          )}
          {data.content_gaps?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1">CONTENT GAPS (YOUR OPPORTUNITY)</p>
              <div className="flex flex-wrap gap-1">{data.content_gaps.slice(0, 3).map((g, i) => <span key={i} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded px-2 py-0.5">{g}</span>)}</div>
            </div>
          )}
          {result.url && <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline mt-1"><Globe className="w-3 h-3" />View channel<ArrowUpRight className="w-3 h-3" /></a>}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300">{value}</span>
    </div>
  )
}
