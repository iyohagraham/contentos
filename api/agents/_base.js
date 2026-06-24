/**
 * Agent base — shared utilities for all agent handlers.
 * Handles: run logging, RAG retrieval, AI calls with context, error recording.
 */
import { getServerSupabase } from '../_db.js'
import { textChat } from '../_providers/text.js'
import { buildRAGContext } from '../knowledge/rag.js'

/**
 * Execute an agent run with full logging and RAG context.
 * @param {object} opts
 *   agentType: string — e.g. 'strategy', 'writing'
 *   workspaceId: string
 *   inputs: object — job payload
 *   task: string — description for RAG retrieval
 *   systemPrompt: string — base system prompt (RAG context appended)
 *   messages: [{role, content}] — conversation for AI call
 *   maxTokens: number
 *   jobId: string — from queue
 *   run: (context: { db, ragContext, agentRunId }) => Promise<result>
 *       — use this for complex multi-step agents instead of messages
 */
export async function runAgent({
  agentType,
  workspaceId,
  inputs = {},
  task,
  systemPrompt,
  messages,
  maxTokens = 1500,
  jobId,
  run
}) {
  const db = getServerSupabase()
  const start = Date.now()

  // Create agent run record
  let agentRunId = `local_${Date.now()}`
  if (db) {
    const { data } = await db.from('agent_runs').insert({
      workspace_id: workspaceId,
      job_id: jobId || null,
      agent_type: agentType,
      trigger_type: jobId ? 'queue' : 'manual',
      inputs,
      status: 'running'
    }).select().single()
    agentRunId = data?.id || agentRunId
  }

  try {
    // RAG context retrieval
    const ragContext = task ? await buildRAGContext(workspaceId, task) : ''

    let result
    if (run) {
      // Delegated run function (complex agents)
      result = await run({ db, ragContext, agentRunId })
    } else {
      // Direct AI call
      const fullSystemPrompt = [systemPrompt, ragContext].filter(Boolean).join('\n\n')
      const { content } = await textChat(messages, { systemPrompt: fullSystemPrompt, maxTokens })
      result = { content }
    }

    // Update run as completed
    const duration = Date.now() - start
    if (db) {
      await db.from('agent_runs').update({
        status: 'completed',
        outputs: result,
        duration_ms: duration,
        rag_chunks_used: ragContext ? (ragContext.match(/>/g) || []).length : 0,
        completed_at: new Date().toISOString()
      }).eq('id', agentRunId)
    }

    return result
  } catch (err) {
    if (db) {
      await db.from('agent_runs').update({
        status: 'failed',
        error: err.message,
        duration_ms: Date.now() - start,
        completed_at: new Date().toISOString()
      }).eq('id', agentRunId)
    }
    throw err
  }
}

/**
 * Quick AI call with optional RAG (for simple agents).
 */
export async function agentAI(workspaceId, task, systemPrompt, userMessage, { maxTokens = 1500 } = {}) {
  const ragContext = await buildRAGContext(workspaceId, task)
  const fullSystem = [systemPrompt, ragContext].filter(Boolean).join('\n\n')
  return textChat([{ role: 'user', content: userMessage }], { systemPrompt: fullSystem, maxTokens })
}
