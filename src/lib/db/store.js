/**
 * Unified Data Store
 * Auto-switches between Supabase and localStorage.
 * The app works immediately with localStorage; when Supabase
 * credentials are added, it transparently uses the cloud DB.
 */

import { getSupabase, isSupabaseConfigured } from './supabase.js'

const STORAGE_PREFIX = 'contentos_'

// ============================================
// LocalStorage adapter (default / offline mode)
// ============================================

const localStore = {
  read(table) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + table)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  write(table, rows) {
    localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(rows))
  },

  generateId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  },

  async list(table, filter = {}) {
    let rows = this.read(table)
    for (const [key, value] of Object.entries(filter)) {
      rows = rows.filter(r => r[key] === value)
    }
    return rows
  },

  async get(table, id) {
    return this.read(table).find(r => r.id === id) || null
  },

  async insert(table, data) {
    const rows = this.read(table)
    const row = {
      id: data.id || this.generateId(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    rows.push(row)
    this.write(table, rows)
    return row
  },

  async update(table, id, data) {
    const rows = this.read(table)
    const idx = rows.findIndex(r => r.id === id)
    if (idx === -1) return null
    rows[idx] = { ...rows[idx], ...data, updated_at: new Date().toISOString() }
    this.write(table, rows)
    return rows[idx]
  },

  async remove(table, id) {
    const rows = this.read(table).filter(r => r.id !== id)
    this.write(table, rows)
    return true
  }
}

// ============================================
// Supabase adapter (cloud mode)
// ============================================

const cloudStore = {
  async list(table, filter = {}) {
    const sb = getSupabase()
    let query = sb.from(table).select('*')
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async get(table, id) {
    const sb = getSupabase()
    const { data, error } = await sb.from(table).select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async insert(table, data) {
    const sb = getSupabase()
    let payload = data
    // Workspaces are owned by the signed-in user; RLS requires user_id to match
    // auth.uid(). Stamp it automatically so callers don't have to.
    if (table === 'workspaces' && !data.user_id) {
      const { data: u } = await sb.auth.getUser()
      if (u?.user?.id) payload = { ...data, user_id: u.user.id }
    }
    const { data: row, error } = await sb.from(table).insert(payload).select().single()
    if (error) throw error
    return row
  },

  async update(table, id, data) {
    const sb = getSupabase()
    const { data: row, error } = await sb.from(table).update(data).eq('id', id).select().single()
    if (error) throw error
    return row
  },

  async remove(table, id) {
    const sb = getSupabase()
    const { error } = await sb.from(table).delete().eq('id', id)
    if (error) throw error
    return true
  }
}

// ============================================
// Active adapter
// ============================================

const adapter = isSupabaseConfigured ? cloudStore : localStore

export const dbMode = isSupabaseConfigured ? 'cloud' : 'local'

// ============================================
// Domain-specific repositories
// ============================================

export const db = {
  mode: dbMode,

  // Workspaces
  workspaces: {
    list: (filter) => adapter.list('workspaces', filter),
    get: (id) => adapter.get('workspaces', id),
    create: (data) => adapter.insert('workspaces', data),
    update: (id, data) => adapter.update('workspaces', id, data),
    delete: (id) => adapter.remove('workspaces', id)
  },

  // Strategies
  strategies: {
    list: (filter) => adapter.list('strategies', filter),
    get: (id) => adapter.get('strategies', id),
    create: (data) => adapter.insert('strategies', data),
    update: (id, data) => adapter.update('strategies', id, data),
    delete: (id) => adapter.remove('strategies', id)
  },

  // Channels
  channels: {
    list: (filter) => adapter.list('channels', filter),
    get: (id) => adapter.get('channels', id),
    create: (data) => adapter.insert('channels', data),
    update: (id, data) => adapter.update('channels', id, data),
    delete: (id) => adapter.remove('channels', id)
  },

  // Videos
  videos: {
    list: (filter) => adapter.list('videos', filter),
    get: (id) => adapter.get('videos', id),
    create: (data) => adapter.insert('videos', data),
    update: (id, data) => adapter.update('videos', id, data),
    delete: (id) => adapter.remove('videos', id)
  },

  // Products
  products: {
    list: (filter) => adapter.list('products', filter),
    get: (id) => adapter.get('products', id),
    create: (data) => adapter.insert('products', data),
    update: (id, data) => adapter.update('products', id, data),
    delete: (id) => adapter.remove('products', id)
  },

  // Sales
  sales: {
    list: (filter) => adapter.list('sales', filter),
    create: (data) => adapter.insert('sales', data)
  }
}

export default db