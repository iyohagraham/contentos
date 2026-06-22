/**
 * Supabase Client
 * Handles connection to Supabase database
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export function getSupabase() {
  if (!supabase) {
    console.warn('⚠️ Supabase not configured - using local storage fallback')
    return null
  }
  return supabase
}