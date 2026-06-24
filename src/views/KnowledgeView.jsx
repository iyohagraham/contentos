import React, { useState, useEffect } from 'react'
import {
  Brain, Upload, Link, Search, Plus, Trash2, RefreshCw,
  FileText, Youtube, Github, Globe, Loader2, CheckCircle,
  AlertCircle, ChevronRight, Book, Lightbulb, Hash, Database
} from 'lucide-react'

const ASSET_TYPES = [
  { id: 'url', label: 'Web Page', icon: Globe, placeholder: 'https://example.com/article' },
  { id: 'youtube', label: 'YouTube Video', icon: Youtube, placeholder: 'https://youtu.be/...' },
  { id: 'github', label: 'GitHub Repo', icon: Github, placeholder: 'https://github.com/user/repo' },
  { id: 'text', label: 'Paste Text', icon: FileText, placeholder: null }
]

const CATEGORIES = ['strategy', 'hooks', 'frameworks', 'copywriting', 'monetization', 'growth', 'production', 'research', 'seo', 'psychology']

const OBJECT_TYPE_COLORS = {
  hook_formula: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  cta_formula: 'bg-green-500/20 text-green-300 border-green-500/30',
  framework: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  strategy: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  technique: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  concept: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  content_structure: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  pattern: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
}

export default function KnowledgeView({ workspaceId }) {
  const [assets, setAssets] = useState([])
  const [objects, setObjects] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [ingestForm, setIngestForm] = useState({ type: 'url', url: '', text: '', title: '', categories: [] })
  const [loading, setLoading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('assets')
  const [error, setError] = useState(null)

  useEffect(() => { loadAssets() }, [workspaceId])

  async function loadAssets() {
    setLoading(true)
    try {
      const res = await fetch(`/api/knowledge/assets?workspace_id=${workspaceId}`)
      const data = await res.json()
      setAssets(data.assets || [])
    } catch { /* non-fatal */ }
    setLoading(false)
  }

  async function handleIngest() {
    if (!ingestForm.url && !ingestForm.text) return
    setIngesting(true)
    setError(null)
    try {
      const res = await fetch('/api/knowledge/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          source_url: ingestForm.url || null,
          text: ingestForm.text || null,
          asset_type: ingestForm.type,
          title: ingestForm.title || ingestForm.url || 'Untitled',
          categories: ingestForm.categories
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ingest failed')
      setIngestForm({ type: 'url', url: '', text: '', title: '', categories: [] })
      await loadAssets()
    } catch (err) {
      setError(err.message)
    }
    setIngesting(false)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, query: searchQuery, type: 'both', limit: 12 })
      })
      const data = await res.json()
      setSearchResults(data)
    } catch { setSearchResults(null) }
    setSearching(false)
  }

  async function deleteAsset(id) {
    await fetch(`/api/knowledge/assets?workspace_id=${workspaceId}&id=${id}`, { method: 'DELETE' })
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  const selectedType = ASSET_TYPES.find(t => t.id === ingestForm.type)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Brain className="w-6 h-6 text-cyan-500" />Knowledge Base</h2>
          <p className="text-sm text-slate-400 mt-1">Import any resource — YouTube, PDFs, articles, repos — into searchable knowledge</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">{assets.length} assets · {assets.reduce((s, a) => s + (a.chunk_count || 0), 0)} chunks · {assets.reduce((s, a) => s + (a.object_count || 0), 0)} objects</span>
        </div>
      </div>

      {/* Ingest form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-cyan-500" />Add to Knowledge Base</h3>

        {/* Type selector */}
        <div className="flex gap-2 mb-4">
          {ASSET_TYPES.map(t => (
            <button key={t.id} onClick={() => setIngestForm(f => ({ ...f, type: t.id }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${ingestForm.type === t.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {ingestForm.type !== 'text' ? (
            <input value={ingestForm.url} onChange={e => setIngestForm(f => ({ ...f, url: e.target.value }))}
              placeholder={selectedType?.placeholder || 'Enter URL'}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
          ) : (
            <textarea value={ingestForm.text} onChange={e => setIngestForm(f => ({ ...f, text: e.target.value }))}
              placeholder="Paste your text, SOP, playbook, or notes here..."
              rows={6} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors resize-none" />
          )}
          <div className="flex gap-3">
            <input value={ingestForm.title} onChange={e => setIngestForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title (optional)"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
            <button onClick={handleIngest} disabled={ingesting || (!ingestForm.url && !ingestForm.text)}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
              {ingesting ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><Upload className="w-4 h-4" />Ingest</>}
            </button>
          </div>
          {/* Category tags */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setIngestForm(f => ({ ...f, categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat] }))}
                className={`px-2 py-0.5 rounded text-xs border transition-all ${ingestForm.categories.includes(cat) ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
      </div>

      {/* Semantic search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-cyan-500" />Semantic Search</h3>
        <div className="flex gap-3">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by concept, e.g. 'hook formulas for education content'"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
          <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
            className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Search
          </button>
        </div>

        {searchResults && (
          <div className="mt-4 space-y-4">
            {searchResults.objects?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">KNOWLEDGE OBJECTS ({searchResults.objects.length})</p>
                <div className="space-y-2">
                  {searchResults.objects.map(obj => (
                    <div key={obj.id} className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs border ${OBJECT_TYPE_COLORS[obj.object_type] || 'bg-slate-700 text-slate-300'}`}>{obj.object_type}</span>
                            <span className="font-medium text-sm">{obj.title}</span>
                          </div>
                          <p className="text-xs text-slate-400">{obj.summary}</p>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">{obj.similarity ? `${(obj.similarity * 100).toFixed(0)}%` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {searchResults.chunks?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">PASSAGES ({searchResults.chunks.length})</p>
                <div className="space-y-2">
                  {searchResults.chunks.slice(0, 4).map(chunk => (
                    <div key={chunk.id} className="bg-slate-950 rounded-lg p-3 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                      {chunk.content.slice(0, 300)}{chunk.content.length > 300 ? '...' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {searchResults.total === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No results found — try a different query or add more knowledge assets</p>
            )}
          </div>
        )}
      </div>

      {/* Tabs: Assets / Objects */}
      <div>
        <div className="flex gap-1 mb-4">
          {['assets', 'objects'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'assets' && (
          <div className="space-y-3">
            {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
            {!loading && assets.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <Brain className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No knowledge assets yet. Add a URL, YouTube video, or paste text to get started.</p>
              </div>
            )}
            {assets.map(asset => (
              <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${asset.ingestion_status === 'complete' ? 'bg-green-500/20' : asset.ingestion_status === 'failed' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                    {asset.ingestion_status === 'complete' ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                     asset.ingestion_status === 'failed' ? <AlertCircle className="w-4 h-4 text-red-400" /> :
                     <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{asset.title}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="capitalize">{asset.asset_type}</span>
                      {asset.chunk_count > 0 && <><span>·</span><span>{asset.chunk_count} chunks</span></>}
                      {asset.object_count > 0 && <><span>·</span><span>{asset.object_count} objects</span></>}
                      {asset.categories?.length > 0 && <><span>·</span><span>{asset.categories.slice(0, 2).join(', ')}</span></>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-slate-500">{asset.created_at?.slice(0, 10)}</span>
                  <button onClick={() => deleteAsset(asset.id)} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 text-slate-500 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'objects' && (
          <div className="space-y-3">
            {assets.reduce((s, a) => s + (a.object_count || 0), 0) === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <Lightbulb className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">Knowledge objects will appear here after ingestion. Objects are structured frameworks, hooks, and techniques extracted from your assets.</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Search above to find specific knowledge objects, or ingest more content to build the knowledge base.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
