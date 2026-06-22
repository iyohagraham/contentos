/**
 * React hooks for ContentOS data store
 * Works with both Supabase (cloud) and localStorage (local)
 */

import { useState, useEffect, useCallback } from 'react'
import db from './store.js'

// Generic collection hook
export function useCollection(collection, filter = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filterKey = JSON.stringify(filter)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await db[collection].list(filter)
      setData(rows)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, filterKey])

  useEffect(() => {
    load()
  }, [load])

  const create = useCallback(async (item) => {
    const row = await db[collection].create(item)
    setData(prev => [...prev, row])
    return row
  }, [collection])

  const update = useCallback(async (id, changes) => {
    const row = await db[collection].update(id, changes)
    setData(prev => prev.map(r => (r.id === id ? row : r)))
    return row
  }, [collection])

  const remove = useCallback(async (id) => {
    await db[collection].delete(id)
    setData(prev => prev.filter(r => r.id !== id))
  }, [collection])

  return { data, loading, error, create, update, remove, refresh: load }
}

// Convenience hooks per collection
export const useWorkspaces = (filter) => useCollection('workspaces', filter)
export const useStrategies = (filter) => useCollection('strategies', filter)
export const useChannels = (filter) => useCollection('channels', filter)
export const useVideos = (filter) => useCollection('videos', filter)
export const useProducts = (filter) => useCollection('products', filter)

// Database mode indicator
export function useDbMode() {
  return db.mode // 'cloud' or 'local'
}