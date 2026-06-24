/**
 * EmbeddingProvider — text-embedding-3-small via OpenAI.
 * Used for pgvector semantic search across all knowledge tables.
 * 1536 dimensions, $0.02/M tokens.
 */
import OpenAI from 'openai'

const MODEL = 'text-embedding-3-small'
const DIMENSIONS = 1536

function getClient() {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

export async function embed(text) {
  const client = getClient()
  if (!client) throw new Error('OPENAI_API_KEY required for embeddings')
  const input = text.slice(0, 8000) // token safety cap
  const res = await client.embeddings.create({ model: MODEL, input, dimensions: DIMENSIONS })
  return res.data[0].embedding
}

export async function embedBatch(texts) {
  const client = getClient()
  if (!client) throw new Error('OPENAI_API_KEY required for embeddings')
  const inputs = texts.map(t => t.slice(0, 8000))
  const res = await client.embeddings.create({ model: MODEL, input: inputs, dimensions: DIMENSIONS })
  return res.data.map(d => d.embedding)
}

export function hasEmbedProvider() {
  return !!process.env.OPENAI_API_KEY
}

export { DIMENSIONS }
