/**
 * Shared UI primitives + constants used by multiple views in src/views/.
 * Extracted from App.jsx so each view file can import only what it uses.
 */
import { ArrowUpRight } from 'lucide-react'

/** Platform metadata (name, avatar glyph, color, tailwind bg class). */
export const PLATFORMS = {
  tiktok: { name: 'TikTok', icon: '♫', color: 'black', bg: 'bg-black' },
  instagram: { name: 'Instagram', icon: '📷', color: '#E1306C', bg: 'bg-gradient-to-r from-purple-500 to-orange-500' },
  youtube: { name: 'YouTube', icon: '▶', color: '#FF0000', bg: 'bg-red-600' },
  facebook: { name: 'Facebook', icon: 'f', color: '#1877F2', bg: 'bg-blue-600' }
}

/** Compact KPI card with an icon, value, label, and a change pill. */
export function StatCard({ icon: Icon, label, value, change, positive }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 text-cyan-500" />
        <span className={`text-sm font-medium flex items-center gap-1 ${positive !== false ? 'text-green-400' : 'text-red-400'}`}>
          {change}<ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  )
}

/** Clickable quick-action tile used on the dashboard. */
export function QuickActionCard({ icon: Icon, title, description, onClick }) {
  return (
    <button onClick={onClick} className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-left hover:border-cyan-500/50 transition-colors group">
      <Icon className="w-6 h-6 text-cyan-500 mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </button>
  )
}