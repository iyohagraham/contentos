/**
 * POST /api/agents/run
 * HTTP endpoint to trigger any agent manually.
 * Body: { agent_type, workspace_id, ...payload }
 */
import strategyAgent from './strategy.js'
import writingAgent from './writing.js'
import researchAgent from './research.js'
import planningAgent from './planning.js'
import analyticsAgent from './analytics.js'
import optimizationAgent from './optimization.js'
import mediaAgent from './media.js'
import publishingAgent from './publishing.js'
import notificationAgent from './notification.js'
import monetizationAgent from './monetization.js'

const AGENTS = {
  strategy: strategyAgent,
  writing: writingAgent,
  research: researchAgent,
  planning: planningAgent,
  analytics: analyticsAgent,
  optimization: optimizationAgent,
  media: mediaAgent,
  publishing: publishingAgent,
  notification: notificationAgent,
  monetization: monetizationAgent
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { agent_type, workspace_id, ...payload } = req.body
  if (!agent_type || !workspace_id) return res.status(400).json({ error: 'agent_type and workspace_id required' })

  const agent = AGENTS[agent_type]
  if (!agent) return res.status(400).json({ error: `Unknown agent: ${agent_type}. Valid: ${Object.keys(AGENTS).join(', ')}` })

  try {
    const result = await agent({ workspace_id, ...payload })
    return res.status(200).json({ agent_type, result })
  } catch (err) {
    console.error(`[agents/run:${agent_type}]`, err)
    return res.status(500).json({ error: err.message, agent_type })
  }
}
