import React, { useState, useEffect } from 'react'
import { upload } from '@vercel/blob/client'
import {
  GraduationCap, Upload, Link, Search, Plus, RefreshCw,
  FileText, Globe, Loader2, CheckCircle, AlertCircle,
  Sparkles, Wand2, Lightbulb, Database, BookOpen
} from 'lucide-react'

// Add-material modes
const SOURCE_MODES = [
  { id: 'text', label: 'Text', icon: FileText },
  { id: 'url', label: 'URL', icon: Globe },
  { id: 'file', label: 'File', icon: Upload }
]

// The six contract skill types, in a fixed display order, with palette + label.
const SKILL_TYPES = [
  { id: 'hook', label: 'Hooks', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { id: 'framework', label: 'Frameworks', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'story_structure', label: 'Story Structures', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'content_pattern', label: 'Content Patterns', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { id: 'offer_structure', label: 'Offer Structures', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { id: 'marketing_concept', label: 'Marketing Concepts', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
]

const TYPE_COLOR = SKILL_TYPES.reduce((m, t) => { m[t.id] = t.color; return m }, {})
const TYPE_LABEL = SKILL_TYPES.reduce((m, t) => { m[t.id] = t.label; return m }, {})

function typeColor(type) {
  return TYPE_COLOR[type] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'
}
function typeLabel(type) {
  return TYPE_LABEL[type] || (type || 'skill')
}

export default function SkillsView({ workspaceId }) {
  const [activeTab, setActiveTab] = useState('add')

  // ── Add Material ──
  const [sourceMode, setSourceMode] = useState('text')
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [ingesting, setIngesting] = useState(false)
  const [ingestResult, setIngestResult] = useState(null)
  const [ingestError, setIngestError] = useState(null)

  // ── Skill Library ──
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  // ── Apply ──
  const [applySkill, setApplySkill] = useState(null)
  const [applyTopic, setApplyTopic] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyResults, setApplyResults] = useState(null)
  const [applyError, setApplyError] = useState(null)

  useEffect(() => { loadSkills() }, [workspaceId])

  async function loadSkills() {
    setLoading(true)
    try {
      const res = await fetch(`/api/skills/list?workspace_id=${workspaceId}`)
      const data = await res.json()
      setSkills(data.skills || [])
    } catch { /* non-fatal */ }
    setLoading(false)
  }

  /* ─── Add Material ─── */
  async function postIngest(payload) {
    const res = await fetch('/api/skills/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, ...payload })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Ingest failed')
    return data
  }

  async function handleIngestText() {
    if (!text.trim()) return
    setIngesting(true); setIngestError(null); setIngestResult(null)
    try {
      const data = await postIngest({ source_type: 'text', content: text, title: title || undefined })
      setIngestResult(data)
      setText(''); setTitle('')
      await loadSkills()
    } catch (err) {
      setIngestError(err.message)
    }
    setIngesting(false)
  }

  async function handleIngestUrl() {
    if (!url.trim()) return
    setIngesting(true); setIngestError(null); setIngestResult(null)
    try {
      const data = await postIngest({ source_type: 'url', url, title: title || undefined })
      setIngestResult(data)
      setUrl(''); setTitle('')
      await loadSkills()
    } catch (err) {
      setIngestError(err.message)
    }
    setIngesting(false)
  }

  async function handleFile(file) {
    if (!file) return
    setIngesting(true); setIngestError(null); setIngestResult(null)
    try {
      const name = (file.name || '').toLowerCase()
      let data
      if (name.endsWith('.txt') || name.endsWith('.md')) {
        // Read text-like files client-side and post as plain text.
        const content = await file.text()
        data = await postIngest({ source_type: 'text', content, title: title || file.name })
      } else if (name.endsWith('.pdf')) {
        // Upload large PDFs straight to Vercel Blob, then ingest by URL.
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/skills/blob-upload'
        })
        data = await postIngest({ source_type: 'blob_url', url: blob.url, title: title || file.name })
      } else {
        throw new Error('Unsupported file type — use .pdf, .txt, or .md')
      }
      setIngestResult(data)
      setTitle('')
      await loadSkills()
    } catch (err) {
      setIngestError(err.message)
    }
    setIngesting(false)
  }

  /* ─── Search ─── */
  async function handleSearch() {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const res = await fetch('/api/skills/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, query: searchQuery, limit: 12 })
      })
      const data = await res.json()
      setSearchResults(data.skills || [])
    } catch { setSearchResults(null) }
    setSearching(false)
  }

  /* ─── Apply ─── */
  function startApply(skill) {
    setApplySkill(skill)
    setApplyResults(null)
    setApplyError(null)
    setActiveTab('apply')
  }

  async function handleApply() {
    if (!applySkill || !applyTopic.trim()) return
    setApplying(true); setApplyError(null); setApplyResults(null)
    try {
      const res = await fetch('/api/skills/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          skill_id: applySkill.id,
          topic: applyTopic,
          variations: 3
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Apply failed')
      setApplyResults(data)
    } catch (err) {
      setApplyError(err.message)
    }
    setApplying(false)
  }

  // Skills to render in the library: search results when present, else full list.
  const librarySkills = searchResults !== null ? searchResults : skills

  // Group library skills by skill_type for the card sections.
  const grouped = {}
  for (const s of librarySkills) {
    const t = s.skill_type || 'other'
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(s)
  }
  const orderedTypes = [
    ...SKILL_TYPES.map(t => t.id).filter(t => grouped[t]),
    ...Object.keys(grouped).filter(t => !TYPE_LABEL[t])
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6 text-cyan-500" />Skill System</h2>
          <p className="text-sm text-slate-400 mt-1">Teach ContentOS reusable content skills — hooks, frameworks, story structures — then apply them to anything</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">{skills.length} learned skill{skills.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {[
          { id: 'add', label: 'Add Material', icon: Plus },
          { id: 'library', label: 'Skill Library', icon: BookOpen },
          { id: 'apply', label: 'Apply', icon: Wand2 }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ─── ADD MATERIAL ─── */}
      {activeTab === 'add' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-cyan-500" />Add Material to Learn From</h3>

          {/* Source mode selector */}
          <div className="flex gap-2 mb-4">
            {SOURCE_MODES.map(m => (
              <button key={m.id} onClick={() => { setSourceMode(m.id); setIngestError(null) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${sourceMode === m.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                <m.icon className="w-3.5 h-3.5" />{m.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {sourceMode === 'text' && (
              <>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="Paste a SOP, playbook, course transcript, or training notes here. ContentOS will extract reusable content skills."
                  rows={8} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors resize-none" />
                <div className="flex gap-3">
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
                  <button onClick={handleIngestText} disabled={ingesting || !text.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                    {ingesting ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting...</> : <><Sparkles className="w-4 h-4" />Extract Skills</>}
                  </button>
                </div>
              </>
            )}

            {sourceMode === 'url' && (
              <>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/playbook"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
                <div className="flex gap-3">
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
                  <button onClick={handleIngestUrl} disabled={ingesting || !url.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                    {ingesting ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting...</> : <><Sparkles className="w-4 h-4" />Extract Skills</>}
                  </button>
                </div>
              </>
            )}

            {sourceMode === 'file' && (
              <>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg py-10 text-center transition-colors ${ingesting ? 'opacity-50 pointer-events-none' : 'hover:border-cyan-500/50 cursor-pointer'}`}>
                  <input type="file" accept=".pdf,.txt,.md" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; handleFile(f) }} />
                  {ingesting
                    ? <><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /><span className="text-sm text-slate-400">Uploading & extracting...</span></>
                    : <><Upload className="w-6 h-6 text-slate-500" /><span className="text-sm text-slate-400">Drop or choose a .pdf, .txt, or .md file</span></>}
                </label>
                <p className="text-xs text-slate-500">.txt / .md are read in your browser. PDFs upload to Blob storage, then get studied.</p>
              </>
            )}
          </div>

          {ingestError && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{ingestError}</p>}
          {ingestResult && (
            <div className="mt-4 bg-slate-950 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 font-semibold flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4" />
                {ingestResult.ingested || 0} skill{(ingestResult.ingested || 0) === 1 ? '' : 's'} extracted
              </p>
              {ingestResult.skills?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ingestResult.skills.map(s => (
                    <span key={s.id} className={`px-2 py-0.5 rounded text-xs border ${typeColor(s.skill_type)}`}>
                      {s.display_name}
                    </span>
                  ))}
                </div>
              )}
              {(ingestResult.ingested || 0) === 0 && (
                <p className="text-slate-400 text-sm">No reusable skills found in this material — try richer source content.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── SKILL LIBRARY ─── */}
      {activeTab === 'library' && (
        <div className="space-y-5">
          {/* Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-cyan-500" />Search Skills</h3>
            <div className="flex gap-3">
              <input value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) setSearchResults(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by concept, e.g. 'hooks for educational content'"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
              <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
                className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Search
              </button>
              <button onClick={loadSkills} title="Refresh"
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2.5 rounded-lg text-sm flex items-center transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {searchResults !== null && (
              <p className="text-xs text-slate-500 mt-2">{searchResults.length} result{searchResults.length === 1 ? '' : 's'} — <button onClick={() => { setSearchResults(null); setSearchQuery('') }} className="text-cyan-400 hover:underline">show all</button></p>
            )}
          </div>

          {/* Cards grouped by skill_type */}
          {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
          {!loading && librarySkills.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <GraduationCap className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No skills yet. Add material in the "Add Material" tab and ContentOS will extract reusable skills here.</p>
            </div>
          )}

          {!loading && orderedTypes.map(type => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-xs border ${typeColor(type)}`}>{typeLabel(type)}</span>
                <span className="text-xs text-slate-500">{grouped[type].length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[type].map(skill => (
                  <div key={skill.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{skill.display_name}</h4>
                      {skill.similarity != null && (
                        <span className="text-xs text-slate-500 flex-shrink-0">{(skill.similarity * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    {skill.description && <p className="text-xs text-slate-400 mb-2">{skill.description}</p>}
                    {skill.metadata?.when_to_use && (
                      <p className="text-xs text-slate-500 mb-3 flex items-start gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                        <span><span className="text-slate-400">When to use:</span> {skill.metadata.when_to_use}</span>
                      </p>
                    )}
                    <button onClick={() => startApply(skill)}
                      className="mt-auto self-start bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                      <Wand2 className="w-3.5 h-3.5" />Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── APPLY ─── */}
      {activeTab === 'apply' && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Wand2 className="w-4 h-4 text-cyan-500" />Apply a Skill</h3>

            {/* Skill picker */}
            <label className="block text-sm font-semibold mb-2">Skill</label>
            <select value={applySkill?.id || ''}
              onChange={e => { const s = skills.find(x => x.id === e.target.value); setApplySkill(s || null); setApplyResults(null) }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-cyan-500 transition-colors">
              <option value="">Select a learned skill…</option>
              {skills.map(s => (
                <option key={s.id} value={s.id}>{s.display_name} ({typeLabel(s.skill_type)})</option>
              ))}
            </select>

            {applySkill && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs border ${typeColor(applySkill.skill_type)}`}>{typeLabel(applySkill.skill_type)}</span>
                  <span className="font-medium text-sm">{applySkill.display_name}</span>
                </div>
                {applySkill.description && <p className="text-xs text-slate-400">{applySkill.description}</p>}
              </div>
            )}

            <label className="block text-sm font-semibold mb-2">Topic</label>
            <div className="flex gap-3">
              <input value={applyTopic} onChange={e => setApplyTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApply()}
                placeholder="What should the skill be applied to? e.g. 'launching a budgeting app for freelancers'"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors" />
              <button onClick={handleApply} disabled={applying || !applySkill || !applyTopic.trim()}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                {applying ? <><Loader2 className="w-4 h-4 animate-spin" />Applying...</> : <><Sparkles className="w-4 h-4" />Apply</>}
              </button>
            </div>

            {applyError && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{applyError}</p>}
          </div>

          {/* Results */}
          {applyResults?.results?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">{applyResults.results.length} variation{applyResults.results.length === 1 ? '' : 's'} applying <span className="text-slate-300">{applyResults.skill?.display_name}</span> to "{applyResults.topic}"</p>
              {applyResults.results.map((r, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    {r.notes && <span className="text-xs text-slate-500">{r.notes}</span>}
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                </div>
              ))}
            </div>
          )}
          {applyResults && (!applyResults.results || applyResults.results.length === 0) && (
            <p className="text-slate-500 text-sm text-center py-4">No variations returned — try a different topic.</p>
          )}
        </div>
      )}
    </div>
  )
}
