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
  FileJson, AlertCircle, RefreshCw, Server, Play
} from 'lucide-react'

function StudioView({ workspaceId }) {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [outputs, setOutputs] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [architecture, setArchitecture] = useState({ pipeline: [], engines: [], stats: {} })

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
        <button onClick={() => setShowNewProject(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />New Project
        </button>
      </div>

      {error && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

      {/* Project List */}
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

      {selectedProject && (
        <PipelineView project={selectedProject} outputs={outputs} workspaceId={workspaceId}
          architecture={architecture} onUpdate={selectProject} />
      )}

      {!selectedProject && architecture.engines?.length > 0 && (
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
  'storyboard', 'continuity', 'scene_planner', 'media_router', 'voice', 'music',
  'composition', 'rendering', 'franchise'
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
        <div className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3">
          Ran {pipelineResult.ran?.length || 0} stages → <span className="capitalize text-slate-200">{pipelineResult.status}</span>
          {pipelineResult.stopped_at && <span className="text-amber-400"> (paused at {pipelineResult.stopped_at} — needs a provider)</span>}
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
            <button onClick={() => saveEdit(inspect)} disabled={savingEdit}
              className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 px-2.5 py-1 rounded flex items-center gap-1.5">
              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Save edits
            </button>
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
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function create() {
    if (!title.trim()) return
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, title, brief, format })
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

export default StudioView
