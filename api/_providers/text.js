/**
 * TextProvider — abstracts text AI providers.
 * Primary: Kimi k2.7-code-highspeed (Moonshot AI)
 * Fallback: OpenAI GPT-4o-mini
 */
import OpenAI from 'openai'
import { jsonrepair } from 'jsonrepair'

const KIMI_BASE = 'https://api.moonshot.ai/v1'
const KIMI_MODEL = 'kimi-k2.7-code-highspeed'

function getClient() {
  const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY
  if (kimiKey) {
    return {
      client: new OpenAI({ apiKey: kimiKey, baseURL: KIMI_BASE }),
      model: KIMI_MODEL,
      provider: 'kimi',
      temperature: 1  // required by kimi-k2.7
    }
  }
  const oaiKey = process.env.OPENAI_API_KEY
  if (oaiKey) {
    return {
      client: new OpenAI({ apiKey: oaiKey }),
      model: 'gpt-4o-mini',
      provider: 'openai',
      temperature: 0.7
    }
  }
  return null
}

export async function textChat(messages, { maxTokens = 1200, systemPrompt } = {}) {
  const cfg = getClient()
  if (!cfg) throw new Error('No text AI provider configured (set KIMI_API_KEY or OPENAI_API_KEY)')

  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const res = await cfg.client.chat.completions.create({
    model: cfg.model,
    messages: msgs,
    temperature: cfg.temperature,
    max_tokens: maxTokens
  })
  return { content: res.choices[0].message.content, provider: cfg.provider }
}

export async function textGenerate(prompt, opts = {}) {
  return textChat([{ role: 'user', content: prompt }], opts)
}

export function parseJSON(text) {
  let t = (text || '').trim()
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const first = t.indexOf('{'), last = t.lastIndexOf('}')
  if (first !== -1 && last !== -1 && (first > 0 || last < t.length - 1)) t = t.slice(first, last + 1)
  try { return JSON.parse(t) } catch { return JSON.parse(jsonrepair(t)) }
}

export async function textGenerateJSON(prompt, opts = {}) {
  const { content } = await textGenerate(prompt, { ...opts, maxTokens: opts.maxTokens || 2000 })
  return parseJSON(content)
}

export function hasTextProvider() {
  return !!(process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || process.env.OPENAI_API_KEY)
}
