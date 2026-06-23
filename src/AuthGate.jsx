/**
 * AuthGate — wraps the app and enforces login ONLY in cloud mode.
 *
 * - Local mode (Supabase not configured): renders children immediately. The
 *   app behaves exactly as it does today; there is no login screen.
 * - Cloud mode: shows a sign-in / sign-up screen until the user has a session,
 *   then renders the app. RLS in the database scopes all data to that user.
 */

import React, { useState, useEffect } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { authEnabled, getSession, onAuthChange, signIn, signUp } from './lib/auth.js'

export default function AuthGate({ children }) {
  // When auth is disabled, this component is a transparent pass-through.
  if (!authEnabled) return children

  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    getSession().then(s => {
      if (active) { setSession(s); setChecking(false) }
    })
    const unsub = onAuthChange(s => { if (active) setSession(s) })
    return () => { active = false; unsub() }
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  if (!session) return <AuthScreen />

  return children
}

function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setInfo(null); setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setInfo('Account created. Check your email if confirmation is required, then sign in.')
        setMode('signin')
      } else {
        await signIn(email, password)
        // onAuthChange in AuthGate will pick up the new session.
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">ContentOS</span>
        </div>
        <h1 className="text-lg font-semibold mb-1">
          {mode === 'signin' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {mode === 'signin' ? 'Welcome back.' : 'Start managing your channels.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:border-cyan-500 focus:outline-none"
          />
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:border-cyan-500 focus:outline-none"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-green-400">{info}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null) }}
          className="mt-4 text-sm text-slate-400 hover:text-white transition-colors"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
