/**
 * Knowledge Engine (#1) — adapter (LIVE).
 *
 * The Knowledge responsibility's heavy ingestion lives in api/knowledge/* (URL/PDF/
 * YouTube → chunk → embed → pgvector). This adapter is the pipeline-facing ENGINE
 * surface: for a topic it pulls RAG context (when a workspace + embeddings exist)
 * and/or synthesizes structured facts, returning the KNOWLEDGE contract.
 *
 * input:  { topic|brief, workspace_id? }
 * output: KNOWLEDGE contract { workspace_id, topic, facts[], sources[], rag }
 */
import { defineEngine } from '../_base.js'
import { Knowledge, validateContract } from '../../_contracts/index.js'
import { buildRAGContext } from '../../knowledge/rag.js'
import { textGenerateJSON, hasTextProvider } from '../../_providers/text.js'

export default defineEngine({
  id: 'knowledge',
  name: 'Knowledge Engine',
  responsibility: 'Research/ingest/verify → structured knowledge (RAG).',
  status: 'live',
  outputs: ['knowledge'],
  run: async (input = {}, ctx = {}) => {
    const topic = input.topic || input.brief || ''
    if (!topic) throw new Error('knowledge: a topic/brief is required')
    const wsId = ctx.workspaceId || input.workspace_id || null

    // RAG context from the workspace knowledge base (empty string if unavailable).
    let rag = { chunks: 0, objects: 0 }
    let ragText = ''
    try {
      ragText = await buildRAGContext(wsId, topic)
      if (ragText) {
        rag.chunks = (ragText.match(/^>/gm) || []).length
        rag.objects = (ragText.match(/\*\*/g) || []).length / 2 | 0
      }
    } catch { /* RAG never blocks */ }

    let facts = []
    if (hasTextProvider()) {
      const prompt = `Compile verified, useful facts about: "${topic}".
${ragText ? `Prefer and cite this known context:\n${ragText.slice(0, 2000)}` : ''}
Return JSON array of up to 8 facts:
[{ "title": "short fact title", "summary": "1-2 sentence fact", "confidence": 0.8 }]`
      try {
        const out = await textGenerateJSON(prompt, { maxTokens: 1200 })
        if (Array.isArray(out)) facts = out
        else if (Array.isArray(out?.facts)) facts = out.facts
      } catch { /* fall through */ }
    }

    if (!facts.length) facts = [{ title: topic, summary: `Core subject: ${topic}.`, confidence: 0.4 }]

    const knowledge = {
      ...Knowledge.blank(),
      workspace_id: wsId,
      topic,
      facts: facts.map((f) => ({ title: f.title || '', summary: f.summary || '', source: f.source || (ragText ? 'rag' : 'synthesized'), confidence: Number(f.confidence) || 0.6 })),
      sources: ragText ? ['knowledge_base'] : [],
      rag
    }

    const v = validateContract('knowledge', knowledge)
    if (!v.ok) throw new Error(`knowledge: output failed contract (missing: ${v.missing.join(', ')})`)
    return knowledge
  }
})