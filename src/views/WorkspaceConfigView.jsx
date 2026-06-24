import React, { useState, useEffect } from 'react'
import {
  Settings, Zap, Bot, User, Save, Loader2, CheckCircle, AlertCircle,
  Shield, Clock, ToggleLeft, ToggleRight, ChevronRight, Info
} from 'lucide-react'

const MODES = [
  {
    id: 'creator',
    label: 'Creator Mode',
    icon: User,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    desc: 'You control everything. AI assists on demand — scripts, ideas, thumbnails. Nothing runs without your trigger.',
    autonomy: 0
  },
  {
    id: 'project',
    label: 'Project Mode',
    icon: Zap,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
    desc: 'Time-boxed campaigns. AI plans and drafts; you review and approve before publishing.',
    autonomy: 50
  },
  {
    id: 'brand',
    label: 'Autonomous Brand',
    icon: Bot,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: 'AI runs the brand continuously. Research → Plan → Write → Produce → Publish → Optimize. You review exceptions.',
    autonomy: 90
  }
]

const DEFAULT_CONFIG = {
  operating_mode: 'creator',
  review_scripts: true,
  review_media: true,
  review_publish: true,
  max_posts_per_day: 3,
  content_mix: { educational: 40, inspirational: 25, entertaining: 20, promotional: 15 },
  brand_brief: { niche: '', tone: '', target_audience: '', unique_angle: '' }
}

export default function WorkspaceConfigView({ workspaceId }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!workspaceId || workspaceId === 'default') {
      setLoading(false)
      return
    }
    fetch(`/api/workspace/config?workspace_id=${workspaceId}`)
      .then(r => r.json())
      .then(data => { if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/workspace/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, config })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  function setField(path, value) {
    const keys = path.split('.')
    setConfig(prev => {
      const next = { ...prev }
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] }
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return next
    })
  }

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>

  const selectedMode = MODES.find(m => m.id === config.operating_mode) || MODES[0]
  const isLocalMode = !workspaceId || workspaceId === 'default'

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-cyan-500" />Workspace Config</h2>
        <p className="text-sm text-slate-400 mt-1">Control how autonomous the system is. Start in Creator Mode and graduate up.</p>
      </div>

      {isLocalMode && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">Config saves to the database. Connect Supabase (set VITE_SUPABASE_URL + keys) to persist across sessions.</p>
        </div>
      )}

      {/* Operating Mode */}
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Operating Mode</h3>
        <div className="space-y-3">
          {MODES.map(mode => (
            <button key={mode.id} onClick={() => setField('operating_mode', mode.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${config.operating_mode === mode.id ? mode.bg : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
              <div className="flex items-center gap-3">
                <mode.icon className={`w-5 h-5 ${config.operating_mode === mode.id ? mode.color : 'text-slate-500'}`} />
                <div className="flex-1">
                  <p className={`font-semibold ${config.operating_mode === mode.id ? 'text-white' : 'text-slate-300'}`}>{mode.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{mode.desc}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${config.operating_mode === mode.id ? 'bg-current ' + mode.color : 'bg-slate-700'}`} />
              </div>
              {config.operating_mode === mode.id && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                      <div className={`h-full rounded-full bg-current ${mode.color}`} style={{ width: `${mode.autonomy}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{mode.autonomy}% autonomous</span>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Review Gates */}
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Review Gates</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
          {[
            { key: 'review_scripts', label: 'Review scripts before production', desc: 'Pause after Writing Agent for human approval' },
            { key: 'review_media', label: 'Review media before publishing', desc: 'Pause after Media Agent for human approval' },
            { key: 'review_publish', label: 'Review posts before going live', desc: 'Pause before Publishing Agent for human approval' }
          ].map(gate => (
            <div key={gate.key} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-200">{gate.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{gate.desc}</p>
              </div>
              <button onClick={() => setField(gate.key, !config[gate.key])}
                className="flex-shrink-0 transition-colors">
                {config[gate.key]
                  ? <ToggleRight className="w-8 h-8 text-cyan-400" />
                  : <ToggleLeft className="w-8 h-8 text-slate-600" />}
              </button>
            </div>
          ))}
        </div>
        {config.operating_mode === 'brand' && (config.review_scripts || config.review_media || config.review_publish) && (
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Autonomous Brand Mode works best with review gates off. Turn them off to enable fully hands-free operation.
          </p>
        )}
      </section>

      {/* Posting Limits */}
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Posting Limits</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <label className="text-sm text-slate-400 block mb-2">Max posts per day</label>
          <div className="flex items-center gap-3">
            <input type="range" min="1" max="10" value={config.max_posts_per_day}
              onChange={e => setField('max_posts_per_day', parseInt(e.target.value))}
              className="flex-1 accent-cyan-500" />
            <span className="text-lg font-bold text-white w-8 text-center">{config.max_posts_per_day}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Applies per platform. Used by Planning Agent to cap calendar density.</p>
        </div>
      </section>

      {/* Brand Brief */}
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Brand Brief</h3>
        <p className="text-xs text-slate-500 mb-3">Used by all agents as context. Fill this in before enabling Brand Mode.</p>
        <div className="space-y-3">
          {[
            { key: 'brand_brief.niche', label: 'Niche / topic', placeholder: 'e.g. personal finance for millennials' },
            { key: 'brand_brief.tone', label: 'Tone of voice', placeholder: 'e.g. conversational, no jargon, slightly humorous' },
            { key: 'brand_brief.target_audience', label: 'Target audience', placeholder: 'e.g. 25-35 year olds earning $50-80k, stressed about money' },
            { key: 'brand_brief.unique_angle', label: 'Unique angle', placeholder: 'e.g. we explain finance through real-life stories, not textbooks' }
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs text-slate-500 block mb-1">{field.label}</label>
              <input type="text"
                value={(field.key.split('.').reduce((o, k) => o?.[k], config)) || ''}
                onChange={e => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors" />
            </div>
          ))}
        </div>
      </section>

      {/* Content Mix */}
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Content Mix</h3>
        <div className="space-y-3">
          {['educational', 'inspirational', 'entertaining', 'promotional'].map(type => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-sm text-slate-400 w-28 capitalize">{type}</span>
              <input type="range" min="0" max="60" value={config.content_mix?.[type] || 0}
                onChange={e => setField(`content_mix.${type}`, parseInt(e.target.value))}
                className="flex-1 accent-cyan-500" />
              <span className="text-sm font-medium text-white w-10 text-right">{config.content_mix?.[type] || 0}%</span>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Total: {Object.values(config.content_mix || {}).reduce((a, b) => a + b, 0)}%
            {Object.values(config.content_mix || {}).reduce((a, b) => a + b, 0) !== 100 && (
              <span className="text-amber-400 ml-1">⚠ Should sum to 100%</span>
            )}
          </p>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={saving || isLocalMode}
          className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Config</>}
        </button>
        {saved && <span className="text-green-400 text-sm flex items-center gap-1.5"><CheckCircle className="w-4 h-4" />Saved</span>}
        {error && <span className="text-red-400 text-sm flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{error}</span>}
        {isLocalMode && <span className="text-slate-500 text-xs">Connect Supabase to enable saving</span>}
      </div>
    </div>
  )
}
