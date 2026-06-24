/**
 * RAG — Retrieval-Augmented Generation context builder.
 * Called by every agent before making an AI text call.
 * Returns a formatted context block ready to inject into a system prompt.
 *
 * Usage (in any agent):
 *   const context = await buildRAGContext(workspace_id, taskDescription)
 *   const { content } = await textChat(messages, { systemPrompt: basePrompt + context })
 */
import { embed, hasEmbedProvider } from '../_providers/embed.js'
import { getServerSupabase, rpc } from '../_db.js'

/**
 * Build a RAG context string for injection into an agent's system prompt.
 * @param {string} workspaceId
 * @param {string} task - description of what the agent is about to do
 * @param {object} opts - { maxChunks, maxObjects, threshold, objectTypes }
 * @returns {string} - formatted context block, or empty string if nothing found
 */
export async function buildRAGContext(workspaceId, task, opts = {}) {
  if (!hasEmbedProvider()) return ''

  const db = getServerSupabase()
  if (!db) return ''

  const { maxChunks = 5, maxObjects = 5, threshold = 0.72, objectTypes = null } = opts

  try {
    const queryEmbedding = await embed(task)

    const [chunks, objects] = await Promise.all([
      rpc('match_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: maxChunks,
        p_workspace_id: workspaceId
      }),
      rpc('match_knowledge_objects', {
        query_embedding: queryEmbedding,
        match_threshold: threshold - 0.05,
        match_count: maxObjects,
        p_workspace_id: workspaceId,
        p_object_type: objectTypes?.[0] || null
      })
    ])

    if (!chunks?.length && !objects?.length) return ''

    const lines = ['## Relevant Knowledge Base Context\n']

    if (objects?.length) {
      lines.push('### Knowledge Objects (Frameworks & Techniques)\n')
      for (const obj of objects) {
        lines.push(`**${obj.title}** (${obj.object_type}, relevance: ${(obj.similarity * 100).toFixed(0)}%)`)
        lines.push(obj.summary || obj.content.slice(0, 300))
        if (obj.examples?.length) lines.push(`Examples: ${obj.examples.slice(0, 2).join('; ')}`)
        lines.push('')
      }
    }

    if (chunks?.length) {
      lines.push('### Reference Passages\n')
      for (const chunk of chunks) {
        lines.push(`> ${chunk.content.slice(0, 400).replace(/\n/g, ' ')}`)
        lines.push('')
      }
    }

    lines.push('---\nUse the above knowledge to inform your response. Apply relevant frameworks and techniques.\n')

    // Mark objects as used
    const objectIds = (objects || []).map(o => o.id)
    if (objectIds.length) {
      await db.from('knowledge_objects')
        .update({ usage_count: db.rpc('usage_count', { increment: 1 }), last_used_at: new Date().toISOString() })
        .in('id', objectIds)
        .catch(() => {}) // non-critical
    }

    return lines.join('\n')
  } catch {
    return '' // RAG failure should never block an agent
  }
}

export default buildRAGContext
