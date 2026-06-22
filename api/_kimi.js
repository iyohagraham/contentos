import OpenAI from 'openai'
import { jsonrepair } from 'jsonrepair'

/**
 * Shared Kimi (Moonshot) client + helpers.
 * Verified working: api.moonshot.ai + kimi-k2.7-code-highspeed + temperature:1
 * Highspeed model responds in ~2s vs ~26s for the standard model.
 */

export const KIMI_BASE_URL = 'https://api.moonshot.ai/v1'
export const KIMI_MODEL = 'kimi-k2.7-code-highspeed'

export function getKimiKey() {
  return process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || ''
}

export function hasValidKey() {
  const k = getKimiKey()
  return !!k && k.length > 20 && !k.includes('your_')
}

export function makeKimi() {
  return new OpenAI({ apiKey: getKimiKey(), baseURL: KIMI_BASE_URL })
}

// Strip ```json fences and parse, with robust repair fallback.
export function parseJSON(content) {
  let txt = (content || '').trim()
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  // grab first {...} block if extra prose surrounds it
  const first = txt.indexOf('{')
  const last = txt.lastIndexOf('}')
  if (first !== -1 && last !== -1 && (first > 0 || last < txt.length - 1)) {
    txt = txt.slice(first, last + 1)
  }
  // Try strict parse first, then repair malformed JSON (trailing commas,
  // unterminated strings, missing brackets — common with LLM output).
  try {
    return JSON.parse(txt)
  } catch {
    return JSON.parse(jsonrepair(txt))
  }
}

export async function kimiChat(messages, { maxTokens = 800 } = {}) {
  const kimi = makeKimi()
  const res = await kimi.chat.completions.create({
    model: KIMI_MODEL,
    messages,
    temperature: 1, // required by kimi-k2.7-code
    max_tokens: maxTokens
  })
  return res.choices[0].message.content
}