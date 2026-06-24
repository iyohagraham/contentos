/**
 * useWorkspace — returns the active workspace ID for the current user.
 *
 * When Supabase is connected:
 *   1. Gets the authenticated user
 *   2. Fetches their first workspace from the workspaces table
 *   3. Returns that workspace's ID
 *
 * When Supabase is not configured (localStorage mode):
 *   Returns 'default' — works with all localStorage-backed stores.
 */
import { useState, useEffect } from 'react'
import { supabase } from './db/supabase.js'

export function useWorkspace() {
  const [workspaceId, setWorkspaceId] = useState('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase) return  // No Supabase configured — stay with 'default'

    let cancelled = false
    setLoading(true)

    async function resolve() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          if (!cancelled) setWorkspaceId('default')
          return
        }

        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true })
          .limit(1)

        if (!cancelled && workspaces?.[0]?.id) {
          setWorkspaceId(workspaces[0].id)
        }
      } catch {
        // Silently fall back to 'default' if anything fails
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    resolve()

    // Re-resolve on auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      resolve()
    })

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [])

  return { workspaceId, loading }
}
