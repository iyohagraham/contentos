/**
 * /api/monitor/notifications
 *   GET  ?workspace_id=&status=open      → list notifications
 *   POST { id, action: 'acknowledge'|'resolve'|'reopen' } → update one
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'

const NEXT = { acknowledge: 'acknowledged', resolve: 'resolved', reopen: 'open' }

export default async function handler(req, res) {
  const db = getServerSupabase()
  if (!db) return res.status(200).json({ notifications: [], configured: false })

  if (req.method === 'GET') {
    const ws = coerceWorkspaceId(req.query.workspace_id)
    const status = req.query.status || 'open'
    let q = db.from('notifications')
      .select('id, type, severity, title, body, status, data, created_at, acknowledged_at')
      .order('created_at', { ascending: false })
      .limit(100)
    q = ws ? q.eq('workspace_id', ws) : q.is('workspace_id', null)
    if (status !== 'all') q = q.eq('status', status)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ notifications: data || [] })
  }

  if (req.method === 'POST') {
    const { id, action } = req.body || {}
    if (!id || !NEXT[action]) return res.status(400).json({ error: 'id and a valid action (acknowledge|resolve|reopen) required' })
    const patch = { status: NEXT[action] }
    if (action === 'acknowledge') patch.acknowledged_at = new Date().toISOString()
    const { error } = await db.from('notifications').update(patch).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, status: NEXT[action] })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
