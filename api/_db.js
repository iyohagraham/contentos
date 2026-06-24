/**
 * Server-side Supabase client — uses service key (bypasses RLS).
 * ONLY for server-side API routes. Never expose to client.
 * Falls back to anon key if service key not configured.
 */
import { createClient } from '@supabase/supabase-js'

let _client = null

export function getServerSupabase() {
  if (_client) return _client
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _client = createClient(url, key, {
    auth: { persistSession: false }
  })
  return _client
}

export function isSupabaseReady() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  return !!url
}

/**
 * Execute a Supabase RPC function (stored procedure).
 */
export async function rpc(fnName, params = {}) {
  const db = getServerSupabase()
  if (!db) throw new Error('Supabase not configured')
  const { data, error } = await db.rpc(fnName, params)
  if (error) throw error
  return data
}

export default getServerSupabase
