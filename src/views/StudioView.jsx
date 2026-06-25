/**
 * StudioView — the v2.0 AI Media OS pipeline interface.
 *
 * Visualizes the 21-engine production pipeline, lets the operator run each engine
 * stage for a project, inspects the JSON contracts, and manages resumable projects.
 *
 * 1. Project list (GET /api/projects) + "New Project" modal (POST /api/projects).
 * 2. Select a project -> shows its pipeline state (stages done, current stage).
 * 3. Click an engine -> POST /api/studio/run { project_id, engine, ... } ->
 *    persists engine_output, advances project state.
 * 4. Shows the structured JSON output contract from each engine run.
 */
import React, { useState, useEffect } from 'react'
import {
  Zap, Plus, X as XIcon, Check, Loader2,
  FileJson, AlertCircle, RefreshCw, Server, Play, Layers, ChevronRight, GitBranch
} from 'lucide-react'

function StudioView({ workspaceId }) {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [outputs, setOutputs] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [architecture, setArchitecture] = useState({ pipeline: [], engines: [], stats: {} })
  const [tab, setTab] = useState('projects')

  useEffect(() => {
    fetchProjects()
    fetchArchitecture()
  }, [workspaceId])

  async function fetchArchitecture() {
    try {
      const res = await fetch('/api/engines')
      const data = await res.json()
      if (res.ok) setArchitecture(data)
    } catch { /* non-fatal */ }
  }

  async function fetchProjects() {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects?workspace_id=${workspaceId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch projects')
      setProjects(data.projects || [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function selectProject(p) {
    if (!p) {
      setSelectedProject(null)
      setOutputs({})
      return
    }
    setSelectedProject(p)
    setOutputs({})
    try {
      const res = await fetch(`/api/projects?workspace_id=${workspaceId}&id=${p.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch project details')
      setSelectedProject(data.project)
      setOutputs(data.outputs || {})
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-cyan-500" />Studio</h2>
          <p className="text-sm text-slate-400 mt-1">AI Media OS — run the v2.0 engine pipeline for a project.</p>
        </div>
        {tab === 'projects' && (
          <button onClick={() => setShowNewProject(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />New Project
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {['projects', 'library', 'franchises', 'usage'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{t}</button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

      {tab === 'library' && <LibraryPanel workspaceId={workspaceId} />}
      {tab === 'usage' && <UsagePanel workspaceId={workspaceId} />}
      {tab === 'franchises' && <FranchisesPanel workspaceId={workspaceId} onSpawn={(p) => { setTab('projects'); fetchProjects(); selectProject(p) }} />}

      {tab === 'projects' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold">Projects</h3>
            <button onClick={fetchProjects} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="p-4">
            {loading && <p className="text-slate-500">Loading projects...</p>}
            {!loading && !projects.length && <p className="text-slate-500">No projects yet. Click "New Project" to start.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map(p => (
                <button key={p.id} onClick={() => selectProject(p)}
                  className={`p-3 rounded-lg text-left border transition-colors ${selectedProject?.id === p.id ? 'bg-slate-800 border-cyan-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-slate-400 truncate">{p.brief || 'No brief'}</p>
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-4">
                    <span>{p.format}</span>
                    <span className="capitalize">{p.status}</span>
                    <span className="capitalize">{p.current_stage || 'Not started'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'projects' && selectedProject && (
        <PipelineView project={selectedProject} outputs={outputs} workspaceId={workspaceId}
          architecture={architecture} onUpdate={selectProject} />
      )}

      {tab === 'projects' && !selectedProject && architecture.engines?.length > 0 && (
        <ArchitectureOverview architecture={architecture} />
      )}

      {showNewProject && (
        <NewProjectModal
          workspaceId={workspaceId}
          onClose={() => setShowNewProject(false)}
          onCreated={(p) => { fetchProjects(); selectProject(p); setShowNewProject(false) }}
        />
      )}
    </div>
  )
}

/** The invocable engine ids that the studio runner can execute directly. */
const RUNNABLE = new Set([
  'knowledge', 'creative_director', 'story', 'style', 'universe', 'character', 'brand',
  'storyboard', 'continuity', 'scene_planner', 'media_loop', 'media_router', 'voice', 'music',
  'composition', 'rendering', 'publishing', 'franchise'
])

function statusColor(status) {
  if (status === 'live') return 'text-green-400'
  if (status === 'stub') return 'text-amber-400'
  return 'text-slate-500'
}

function ArchitectureOverview({ architecture }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="font-semibold mb-1 flex items-center gap-2"><Server className="w-4 h-4 text-cyan-500" />Engine Architecture</h3>
      <p className="text-xs text-slate-500 mb-4">
        {architecture.stats?.total} engines · {architecture.stats?.live} live · {architecture.stats?.stub} stub · {architecture.contracts?.length || 0} JSON contracts
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(architecture.pipeline || []).map((e, i) => (
          <React.Fragment key={e.id}>
            <span className={`text-xs px-2 py-1 rounded border border-slate-700 bg-slate-950 ${statusColor(e.status)}`}>{e.name}</span>
            {i < architecture.pipeline.length - 1 && <span className="text-slate-700 self-center">→</span>}
          </React.Fragment>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4">Select or create a project to run the pipeline.</p>
    </div>
  )
}

function PipelineView({ project, outputs, workspaceId, architecture, onUpdate }) {
  const [running, setRunning] = useState(null)
  const [inspect, setInspect] = useState(null)
  const [runError, setRunError] = useState(null)
  const [runningAll, setRunningAll] = useState(false)
  const [pipelineResult, setPipelineResult] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [editError, setEditError] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  function openInspect(engineId) {
    const next = inspect === engineId ? null : engineId
    setInspect(next)
    setEditError(null)
    if (next && outputs[next]) setEditDraft(JSON.stringify(outputs[next].output, null, 2))
  }

  async function saveEdit(engineId) {
    setEditError(null)
    let parsed
    try { parsed = JSON.parse(editDraft) } catch (e) { setEditError(`Invalid JSON: ${e.message}`); return }
    setSavingEdit(true)
    try {
      const res = await fetch('/api/studio/run', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, project_id: project.id, engine: engineId, output: parsed })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onUpdate(project)
    } catch (err) {
      setEditError(err.message)
    }
    setSavingEdit(false)
  }

  async function restorePrevious(engineId) {
    setEditError(null)
    setSavingEdit(true)
    try {
      const res = await fetch('/api/studio/run', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, project_id: project.id, engine: engineId, restore_index: 0 })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Restore failed')
      onUpdate(project)
    } catch (err) { setEditError(err.message) }
    setSavingEdit(false)
  }

  const pipeline = (architecture.pipeline || []).filter(e => (e.order || 0) > 0)

  async function runEngine(engineId) {
    setRunning(engineId)
    setRunError(null)
    try {
      const res = await fetch('/api/studio/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, project_id: project.id, engine: engineId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Engine run failed')
      onUpdate(project) // refresh project + outputs
    } catch (err) {
      setRunError(`${engineId}: ${err.message}`)
    }
    setRunning(null)
  }

  async function branchFrom(engineId) {
    setRunError(null)
    try {
      const res = await fetch('/api/studio/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, project_id: project.id, at_stage: engineId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Branch failed')
      if (data.project) onUpdate(data.project) // switch to the new branch project
    } catch (err) {
      setRunError(`branch: ${err.message}`)
    }
  }

  async function runFullPipeline() {
    setRunningAll(true)
    setRunError(null)
    setPipelineResult(null)
    try {
      const res = await fetch('/api/studio/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, project_id: project.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Pipeline run failed')
      setPipelineResult(data)
      onUpdate(project)
    } catch (err) {
      setRunError(err.message)
    }
    setRunningAll(false)
  }

  const done = new Set(project.stages_done || [])

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-lg truncate">{project.title}</h3>
          <p className="text-sm text-slate-400 truncate">{project.brief}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 capitalize">{project.status}</span>
          <button onClick={runFullPipeline} disabled={runningAll}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 transition-colors">
            {runningAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}Run full pipeline
          </button>
        </div>
      </div>

      {pipelineResult && (
        <div className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
          <div>
            Ran {pipelineResult.ran?.length || 0} stages → <span className="capitalize text-slate-200">{pipelineResult.status}</span>
            {pipelineResult.stopped_at && <span className="text-amber-400"> (paused at {pipelineResult.stopped_at} — needs a provider)</span>}
          </div>
          {pipelineResult.ran?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pipelineResult.ran.map((s, i) => (
                <span key={i} className={`px-2 py-0.5 rounded border ${s.status === 'complete' ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-amber-500/30 text-amber-400 bg-amber-500/5'}`}>
                  {s.engine} · {s.durationMs}ms
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {runError && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{runError}</p>}

      <div className="space-y-2">
        {pipeline.map(engine => {
          const out = outputs[engine.id]
          const isDone = done.has(engine.id) || !!out
          const canRun = RUNNABLE.has(engine.id)
          return (
            <div key={engine.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isDone ? 'border-green-500/30 bg-green-500/5' : 'border-slate-800 bg-slate-950'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs">{engine.order}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{engine.name}</p>
                {out && <p className="text-xs text-slate-500">{out.status} · {out.duration_ms ?? '–'}ms · {out.contract}</p>}
              </div>
              {out && (
                <button onClick={() => openInspect(engine.id)}
                  className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 rounded" title="Inspect / edit output JSON">
                  <FileJson className="w-4 h-4" />
                </button>
              )}
              {isDone && (
                <button onClick={() => branchFrom(engine.id)}
                  className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-slate-800 rounded" title="Branch a new project from this stage">
                  <GitBranch className="w-4 h-4" />
                </button>
              )}
              {canRun ? (
                <button onClick={() => runEngine(engine.id)} disabled={running === engine.id}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors">
                  {running === engine.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isDone ? 'Re-run' : 'Run'}
                </button>
              ) : (
                <span className="text-xs text-slate-600 px-2" title="Served by an existing endpoint/agent">existing</span>
              )}
            </div>
          )
        })}
      </div>

      {inspect && outputs[inspect] && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500">{inspect} output ({outputs[inspect].contract}) — editable</p>
            <div className="flex gap-1.5">
              {outputs[inspect].history_count > 0 && (
                <button onClick={() => restorePrevious(inspect)} disabled={savingEdit}
                  className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 px-2.5 py-1 rounded flex items-center gap-1.5" title="Revert to the previous version">
                  <RefreshCw className="w-3.5 h-3.5" />Restore ({outputs[inspect].history_count})
                </button>
              )}
              <button onClick={() => saveEdit(inspect)} disabled={savingEdit}
                className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-2.5 py-1 rounded flex items-center gap-1.5">
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Save edits
              </button>
            </div>
          </div>
          <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} spellCheck={false}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono h-72 focus:outline-none focus:border-cyan-500" />
          {editError && <p className="text-red-400 text-xs mt-1 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{editError}</p>}
          <p className="text-xs text-slate-600 mt-1">Edit this stage's contract JSON, save, then re-run downstream stages to use it.</p>
        </div>
      )}
    </div>
  )
}

function NewProjectModal({ workspaceId, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [format, setFormat] = useState('9:16')
  const [styleProfileId, setStyleProfileId] = useState('')
  const [universeId, setUniverseId] = useState('')
  const [styles, setStyles] = useState([])
  const [universes, setUniverses] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!workspaceId) return
    fetch(`/api/library?workspace_id=${workspaceId}&type=style`).then(r => r.json()).then(d => setStyles(d.items || [])).catch(() => {})
    fetch(`/api/library?workspace_id=${workspaceId}&type=universe`).then(r => r.json()).then(d => setUniverses(d.items || [])).catch(() => {})
  }, [workspaceId])

  async function create() {
    if (!title.trim()) return
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, title, brief, format, style_profile_id: styleProfileId || null, universe_id: universeId || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')
      onCreated(data.project)
    } catch (e) {
      setErr(e.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">New Project</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><XIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Brief / topic (seeds the pipeline)</label>
            <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Format</label>
            <div className="flex gap-2 mt-1">
              {['9:16', '16:9', '1:1'].map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 rounded text-sm ${format === f ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{f}</button>
              ))}
            </div>
          </div>
          {styles.length > 0 && (
            <div>
              <label className="text-xs text-slate-400">Style profile (optional)</label>
              <select value={styleProfileId} onChange={e => setStyleProfileId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-cyan-500">
                <option value="">None</option>
                {styles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {universes.length > 0 && (
            <div>
              <label className="text-xs text-slate-400">Universe (optional — enables recurring characters)</label>
              <select value={universeId} onChange={e => setUniverseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-cyan-500">
                <option value="">None</option>
                {universes.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          {err && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{err}</p>}
          <button onClick={create} disabled={saving || !title.trim()}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create Project
          </button>
        </div>
      </div>
    </div>
  )
}

const LIBRARY_TYPES = [
  { type: 'style', label: 'Style Profiles', placeholder: 'e.g. Documentary, Pixar-inspired' },
  { type: 'brand', label: 'Brands', placeholder: 'e.g. AcmeCo' },
  { type: 'universe', label: 'Universes', placeholder: 'e.g. Neon City' },
  { type: 'character', label: 'Characters', placeholder: 'e.g. Detective Rho' }
]

function LibraryPanel({ workspaceId }) {
  const [type, setType] = useState('style')
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [refImage, setRefImage] = useState('')
  const [appearance, setAppearance] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState(null)
  const [inspect, setInspect] = useState(null)

  const cfg = LIBRARY_TYPES.find(t => t.type === type)

  useEffect(() => { fetchItems() }, [type, workspaceId])

  async function fetchItems() {
    if (!workspaceId) return
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/library?workspace_id=${workspaceId}&type=${type}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setItems(data.items || [])
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }

  async function create() {
    if (!name.trim()) return
    setCreating(true); setErr(null)
    try {
      const body = { workspace_id: workspaceId, type, name }
      if (type === 'character') {
        if (refImage.trim()) body.reference_image_url = refImage.trim()
        if (appearance.trim()) body.appearance = appearance.trim()
      }
      const res = await fetch('/api/library', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setName(''); setRefImage(''); setAppearance(''); fetchItems()
    } catch (e) { setErr(e.message) }
    setCreating(false)
  }

  async function remove(id) {
    try {
      await fetch(`/api/library?type=${type}&id=${id}`, { method: 'DELETE' })
      fetchItems()
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {LIBRARY_TYPES.map(t => (
          <button key={t.type} onClick={() => { setType(t.type); setInspect(null) }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${type === t.type ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}>{t.label}</button>
        ))}
      </div>

      {type === 'character' && (
        <div className="space-y-2">
          <input value={refImage} onChange={e => setRefImage(e.target.value)}
            placeholder="Reference image URL (optional — locks the face via img2img across scenes)"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
          <input value={appearance} onChange={e => setAppearance(e.target.value)}
            placeholder="Appearance anchor (optional — e.g. 'weathered trenchcoat, gray stubble')"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
        </div>
      )}
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()}
          placeholder={cfg.placeholder}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
        <button onClick={create} disabled={creating || !name.trim()}
          className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Generate
        </button>
      </div>

      {err && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{err}</p>}
      {loading && <p className="text-slate-500 text-sm">Loading...</p>}
      {!loading && !items.length && <p className="text-slate-500 text-sm">No {cfg.label.toLowerCase()} yet — generate one above.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map(it => (
          <div key={it.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm truncate">{it.name}</p>
              <div className="flex gap-1">
                <button onClick={() => setInspect(inspect === it.id ? null : it.id)} className="p-1 text-slate-500 hover:text-cyan-400"><FileJson className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(it.id)} className="p-1 text-slate-500 hover:text-red-400"><XIcon className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {inspect === it.id && (
              <pre className="mt-2 bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 overflow-auto max-h-60">{JSON.stringify(it.data, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Recursive hierarchy node renderer; episode nodes get a "+ project" spawn button. */
function HierarchyNode({ node, depth, onSpawn }) {
  const isEpisode = node.level === 'episode'
  return (
    <div style={{ marginLeft: depth * 14 }}>
      <div className="flex items-center gap-2 py-0.5 text-xs">
        <span className="text-slate-600 uppercase w-16 flex-shrink-0">{node.level}</span>
        <span className="text-slate-300">{node.name}</span>
        {isEpisode && (
          <button onClick={() => onSpawn(node)} className="ml-2 text-cyan-400 hover:text-cyan-300" title="Create a project for this episode">+ project</button>
        )}
      </div>
      {(node.children || []).map((c) => <HierarchyNode key={c.id} node={c} depth={depth + 1} onSpawn={onSpawn} />)}
    </div>
  )
}

function FranchisesPanel({ workspaceId, onSpawn }) {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [seasons, setSeasons] = useState(1)
  const [eps, setEps] = useState(3)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => { load() }, [workspaceId])

  async function load() {
    if (!workspaceId) return
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/franchises?workspace_id=${workspaceId}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load')
      setItems(d.franchises || [])
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }

  async function create() {
    if (!name.trim()) return
    setCreating(true); setErr(null)
    try {
      const res = await fetch('/api/franchises', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, name, op: 'plan', seasons: Number(seasons) || 1, series_per_season: 1, episodes_per_series: Number(eps) || 3 })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Create failed')
      setName(''); load()
    } catch (e) { setErr(e.message) }
    setCreating(false)
  }

  async function spawnEpisode(franchise, node) {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, title: `${franchise.name} — ${node.name}`, brief: `Episode of ${franchise.name}`, franchise_id: franchise.id, universe_id: franchise.universe_id || null })
      })
      const d = await res.json()
      if (res.ok && d.project) onSpawn(d.project)
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-500" />Franchises</h3>
      <div className="flex flex-wrap gap-2 items-end">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Franchise name"
          className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
        <label className="text-xs text-slate-500">Seasons<input type="number" min="1" value={seasons} onChange={e => setSeasons(e.target.value)} className="ml-1 w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm" /></label>
        <label className="text-xs text-slate-500">Eps/series<input type="number" min="1" value={eps} onChange={e => setEps(e.target.value)} className="ml-1 w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm" /></label>
        <button onClick={create} disabled={creating || !name.trim()}
          className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Scaffold
        </button>
      </div>

      {err && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{err}</p>}
      {loading && <p className="text-slate-500 text-sm">Loading...</p>}
      {!loading && !items.length && <p className="text-slate-500 text-sm">No franchises yet — scaffold one above to plan a Season → Series → Episode hierarchy.</p>}

      <div className="space-y-2">
        {items.map(fr => (
          <div key={fr.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <button onClick={() => setOpen(open === fr.id ? null : fr.id)} className="w-full flex items-center justify-between">
              <span className="font-medium text-sm">{fr.name}</span>
              <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${open === fr.id ? 'rotate-90' : ''}`} />
            </button>
            {open === fr.id && fr.hierarchy && (
              <div className="mt-2 border-t border-slate-800 pt-2">
                <HierarchyNode node={fr.hierarchy} depth={0} onSpawn={(node) => spawnEpisode(fr, node)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function UsagePanel({ workspaceId }) {
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => { load() }, [period, workspaceId])

  async function load() {
    if (!workspaceId) return
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/usage?workspace_id=${workspaceId}&period=${period}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load usage')
      setData(d)
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }

  const Table = ({ title, rows }) => (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <p className="text-xs text-slate-500 font-semibold mb-2">{title}</p>
      {(!rows || !rows.length) && <p className="text-xs text-slate-600">No data.</p>}
      {rows?.map((r, i) => (
        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50 last:border-0">
          <span className="text-slate-300 truncate flex-1">{r.key}</span>
          <span className="text-slate-500 w-16 text-right">{r.calls} calls</span>
          <span className="text-green-400 w-20 text-right">${(r.cost_usd || 0).toFixed(4)}</span>
          <span className="text-slate-500 w-16 text-right">{(r.success_rate * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Server className="w-4 h-4 text-cyan-500" />Model Router Usage</h3>
        <div className="flex gap-2 items-center">
          {['7d', '30d', '90d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs ${period === p ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{p}</button>
          ))}
          <button onClick={load} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {err && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{err}</p>}
      {data?.mode === 'no-db' && <p className="text-amber-400 text-sm">Supabase not provisioned — usage logging is inert. (See ACTIVATION.md.)</p>}

      {data && data.mode !== 'no-db' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 rounded-lg p-3"><p className="text-xs text-slate-500">Total spend</p><p className="text-lg font-bold text-green-400">${(data.totals?.cost_usd || 0).toFixed(4)}</p></div>
            <div className="bg-slate-950 rounded-lg p-3"><p className="text-xs text-slate-500">Calls</p><p className="text-lg font-bold">{data.totals?.calls || 0}</p></div>
            <div className="bg-slate-950 rounded-lg p-3"><p className="text-xs text-slate-500">Success rate</p><p className="text-lg font-bold">{((data.totals?.success_rate || 0) * 100).toFixed(0)}%</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Table title="By provider" rows={data.byProvider} />
            <Table title="By model" rows={data.byModel} />
            <Table title="By task" rows={data.byTask} />
          </div>
        </>
      )}
    </div>
  )
}

export default StudioView
