/**
 * Cron — process scheduled posts due for publishing.
 * Runs every 5 minutes via vercel.json cron.
 * Delegates to the Publishing Agent (api/agents/publishing.js).
 */
import { getServerSupabase } from '../_db.js'
import publishingAgent from '../agents/publishing.js'

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = getServerSupabase()
  if (!db) {
    return res.status(200).json({ processed: 0, message: 'Database not configured' })
  }

  // Find all workspaces with scheduled posts due now
  const now = new Date()
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000)
  const { data: workspaces } = await db
    .from('video_posts')
    .select('workspace_id')
    .eq('status', 'scheduled')
    .lte('scheduled_time', windowEnd.toISOString())

  if (!workspaces?.length) {
    return res.status(200).json({ processed: 0, message: 'No scheduled posts due' })
  }

  const uniqueWorkspaces = [...new Set(workspaces.map(r => r.workspace_id))]
  const allResults = []

  for (const workspace_id of uniqueWorkspaces) {
    try {
      const result = await publishingAgent({ workspace_id, batch_size: 20 })
      allResults.push({ workspace_id, ...result })
    } catch (err) {
      console.error(`[cron/process-scheduled] workspace ${workspace_id}:`, err.message)
      allResults.push({ workspace_id, error: err.message })
    }
  }

  const totalPublished = allResults.reduce((sum, r) => sum + (r.published || 0), 0)
  return res.status(200).json({
    processed: totalPublished,
    workspaces: allResults.length,
    results: allResults,
    timestamp: now.toISOString()
  })
}
