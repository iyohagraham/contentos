/**
 * Cron — agent orchestrator. Runs every 5 minutes.
 * Claims pending jobs from the queue and dispatches to the correct agent handler.
 * This is the heartbeat of Autonomous Brand Mode.
 */
import { claimNext, complete, fail, log } from '../_queue.js'

// Agent handler map (lazy-loaded to keep cold start fast)
const AGENT_HANDLERS = {
  'agent:strategy':     () => import('../agents/strategy.js'),
  'agent:research':     () => import('../agents/research.js'),
  'agent:analysis':     () => import('../agents/analysis.js'),
  'agent:planning':     () => import('../agents/planning.js'),
  'agent:writing':      () => import('../agents/writing.js'),
  'agent:media':        () => import('../agents/media.js'),
  'agent:publishing':   () => import('../agents/publishing.js'),
  'agent:analytics':    () => import('../agents/analytics.js'),
  'agent:optimization': () => import('../agents/optimization.js'),
  'agent:monetization': () => import('../agents/monetization.js'),
  'agent:notification': () => import('../agents/notification.js'),
  'knowledge:ingest':   () => import('../knowledge/ingest.js').then(m => ({ default: m.ingestHandler })),
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const maxJobs = parseInt(process.env.CRON_MAX_JOBS || '5')
  const processed = []
  const errors = []

  for (let i = 0; i < maxJobs; i++) {
    const job = await claimNext(null, Object.keys(AGENT_HANDLERS))
    if (!job) break

    await log(job.id, `Starting job: ${job.job_type}`, job.payload)

    try {
      const loaderFn = AGENT_HANDLERS[job.job_type]
      if (!loaderFn) throw new Error(`Unknown job type: ${job.job_type}`)

      const mod = await loaderFn()
      const agentFn = mod.default || mod.run

      const result = await agentFn(job.payload, { jobId: job.id })
      await complete(job.id, result)
      await log(job.id, 'Job completed', result)
      processed.push({ id: job.id, type: job.job_type, status: 'completed' })
    } catch (err) {
      await fail(job.id, err.message)
      await log(job.id, `Job failed: ${err.message}`, null, 'error')
      errors.push({ id: job.id, type: job.job_type, error: err.message })
    }
  }

  return res.status(200).json({
    processed: processed.length,
    errors: errors.length,
    jobs: processed,
    timestamp: new Date().toISOString()
  })
}
