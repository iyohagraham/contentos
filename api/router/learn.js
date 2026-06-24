/**
 * POST /api/router/learn
 * Re-run the Model Router auto-learning: read model_routing_log, recompute
 * per-model reliability from recent success rates, and push overrides into the
 * pure router registry. Also runs weekly via the learning-loop cron.
 *
 * Body: { lookback_days? = 14, workspace_id? }
 * Returns: { applied, cleared, models: [...], from, lookbackDays }
 *
 * GET /api/router/scores?lookback_days=14
 * Read-only effective-vs-static reliability per model with log backing.
 */
import { computeAndApplyLearnedRouting, getLearnedScores } from '../_providers/learned-routing.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { lookback_days } = req.query
      const result = await getLearnedScores({ lookbackDays: Number(lookback_days) || 14 })
      return res.status(200).json(result)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { lookback_days = 14 } = req.body || {}
      const result = await computeAndApplyLearnedRouting({ lookbackDays: Number(lookback_days) || 14 })
      return res.status(200).json(result)
    } catch (err) {
      console.error('[router/learn]', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}