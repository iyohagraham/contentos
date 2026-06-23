/**
 * Authentication helpers (Supabase Auth).
 *
 * Auth is ONLY active in cloud mode. When Supabase is not configured the app
 * runs exactly as before — localStorage, no login wall — so the existing
 * offline experience is fully preserved. Every helper is a safe no-op when
 * `authEnabled` is false.
 */

import { supabase, isSupabaseConfigured } from './db/supabase.js'

export const authEnabled = isSupabaseConfigured

export async function getSession() {
  if (!authEnabled) return null
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}

export async function getUser() {
  if (!authEnabled) return null
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

// Subscribe to auth state changes. Returns an unsubscribe function.
export function onAuthChange(callback) {
  if (!authEnabled) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data?.subscription?.unsubscribe?.()
}

export async function signIn(email, password) {
  if (!authEnabled) throw new Error('Cloud auth is not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password) {
  if (!authEnabled) throw new Error('Cloud auth is not configured')
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!authEnabled) return
  await supabase.auth.signOut()
}
