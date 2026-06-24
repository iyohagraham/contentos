import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, RefreshCw, Play, Loader2, AlertTriangle, AlertCircle, Info,
  CheckCircle, Bot, Layers, Send, Zap, TrendingUp, Clock, ShieldCheck, XCircle
} from 'lucide-react'

const SEV = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  info: { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' }
}
const MODE_COLOR = { creator: 'text-cyan-400', project: 'text-purple-400', brand: 'text-emerald-400' }

export default function MonitorView({ workspaceId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/monitor/status?workspace_id=${encodeURIComponent(workspaceId)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }, [workspaceId])

  useEffect(() => { load() }, [load])

  async function runCheck() {
    setChecking(true)
    try {
      await fetch('/api/agents/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_type: 'notification', workspace_id: workspaceId })
      })
      await load()
    } catch { /* surfaced via load */ }
    setChecking(false)
  }

  async function act(id, action) {
    await fetch('/api/monitor/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    }).catch(() => {})
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>

  if (data && data.configured === false) {
    return (
      <div className="space-y-4">
        <Header onRefresh={load} onCheck={runCheck} checking={checking} />
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 text-sm text-amber-300">
          Running in localStorage mode — connect Supabase to see live autonomous-loop health.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header onRefresh={load} onCheck={runCheck} checking={checking} mode={data?.operating_mode} generatedAt={data?.generated_at} />
      {error && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

      {/* Review gates */}
      {data?.review_gates && (
        <div className="flex flex-wrap gap-2 text-xs">
          {[['Scripts', data.review_gates.review_scripts], ['Media', data.review_gates.review_media], ['Publish', data.review_gates.review_publish]].map(([label, on]) => (
            <span key={label} className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${on ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-slate-700 text-slate-500'}`}>
              <ShieldCheck className="w-3 h-3" />{label} gate {on ? 'on' : 'off'}
            </span>
          ))}
        </div>
      )}

      {/* Job queue */}
      <Section title="Job Queue" icon={Layers}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Pending" value={data?.jobs?.pending} color="text-slate-200" />
          <Stat label="Running" value={data?.jobs?.running} color="text-cyan-400" />
          <Stat label="Failed" value={data?.jobs?.failed} color="text-red-400" />
          <Stat label="Completed" value={data?.jobs?.completed} color="text-green-400" />
        </div>
      </Section>

      {/* Content pipeline */}
      <Section title="Content Pipeline" icon={Send}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label="Drafts" value={data?.content?.drafts} />
          <Stat label="Media Ready" value={data?.content?.media_ready} />
          <Stat label="Scheduled" value={data?.content?.scheduled} color="text-purple-400" />
          <Stat label="Published" value={data?.content?.published} color="text-green-400" />
          <Stat label="Assembled" value={data?.content?.assembled} />
        </div>
      </Section>

      {/* Notifications — needs attention */}
      <Section title="Needs Attention" icon={AlertTriangle} badge={data?.notifications?.total}>
        {(!data?.notifications?.open || data.notifications.open.length === 0) ? (
          <p className="text-sm text-slate-500 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />All clear — no open alerts.</p>
        ) : (
          <div className="space-y-2">
            {data.notifications.open.map(n => {
              const s = SEV[n.severity] || SEV.info
              const Icon = s.icon
              return (
                <div key={n.id} className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${s.bg}`}>
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${s.color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => act(n.id, 'acknowledge')} className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">Ack</button>
                    <button onClick={() => act(n.id, 'resolve')} className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400">Resolve</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Agents */}
      <Section title="Agent Activity" icon={Bot} badge={`${data?.agents?.success_rate ?? 0}% ok`}>
        {(!data?.agents?.recent || data.agents.recent.length === 0) ? (
          <p className="text-sm text-slate-500">No agent runs yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.agents.recent.slice(0, 10).map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs bg-slate-950 rounded px-3 py-2 border border-slate-800">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${r.status === 'completed' ? 'bg-green-400' : r.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <span className="text-slate-200 font-medium">{r.agent_type}</span>
                  <span className="text-slate-500">{r.status}</span>
                </span>
                <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Routing mix */}
      {data?.routing?.by_provider && Object.keys(data.routing.by_provider).length > 0 && (
        <Section title="Model Routing (recent)" icon={Zap}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.routing.by_provider).map(([p, c]) => (
              <span key={p} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-200 font-medium">{p}</span> <span className="text-cyan-400">{c}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Insights */}
      {data?.insights?.length > 0 && (
        <Section title="Recent Insights" icon={TrendingUp}>
          <div className="space-y-2">
            {data.insights.map(i => (
              <div key={i.id} className="bg-slate-950 rounded p-3 border border-slate-800 text-xs">
                <p className="font-medium text-white">{i.title}</p>
                {i.recommendation && <p className="text-slate-400 mt-0.5">{i.recommendation}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Header({ onRefresh, onCheck, checking, mode, generatedAt }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-cyan-500" />Brand Monitor</h2>
        <p className="text-sm text-slate-400 mt-1">
          Live health of the autonomous loop.
          {mode && <> Mode: <span className={`font-semibold ${MODE_COLOR[mode] || 'text-slate-300'}`}>{mode}</span>.</>}
          {generatedAt && <span className="text-slate-600"> · {new Date(generatedAt).toLocaleTimeString()}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onCheck} disabled={checking} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
          {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}Run check
        </button>
        <button onClick={onRefresh} className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, badge, children }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Icon className="w-4 h-4 text-cyan-500" />{title}</h3>
        {badge != null && <span className="text-xs text-slate-500">{badge}</span>}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
    </div>
  )
}
