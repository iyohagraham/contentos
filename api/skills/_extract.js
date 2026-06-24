/**
 * Skill EXTRACTION core.
 *
 * Mission: a user uploads PDFs / SOPs / playbooks / courses / training material;
 * ContentOS studies it and extracts REUSABLE CONTENT SKILLS — hooks, frameworks,
 * story structures, content patterns, offer structures, marketing concepts — that
 * can be searched and APPLIED to new content generation.
 *
 * This module owns two pure-ish helpers used by the ingest pipeline:
 *   - loadDocumentText(source) → { text, source_type, source_url }
 *       Pulls plain text out of raw text, a URL, a blob URL, or a PDF (via unpdf).
 *   - extractSkills(text, opts) → SKILL RECORD[] (minus workspace_id/embedding)
 *       Uses textGenerateJSON to pull genuinely reusable techniques, validated &
 *       normalized to the shared SKILL RECORD contract.
 *
 * It does NOT touch the DB or embeddings — ingest layers workspace_id + embedding
 * on top of what extractSkills returns.
 */
import { textGenerateJSON, hasTextProvider } from '../_providers/text.js'

// ~60k chars keeps the prompt well inside model context while covering most docs.
const MAX_TEXT_CHARS = 60000

// The 6 allowed skill_type values (hard contract — apply/search/context rely on it).
const SKILL_TYPES = [
  'hook',
  'framework',
  'story_structure',
  'content_pattern',
  'offer_structure',
  'marketing_concept'
]

/**
 * Resolve the plain text of a document from a polymorphic source descriptor.
 *
 * @param {object} source
 * @param {'text'|'url'|'pdf'|'blob_url'} source.source_type
 * @param {string} [source.content] — raw text when source_type === 'text'
 * @param {string} [source.url]     — fetchable URL for url/blob_url/pdf
 * @returns {Promise<{ text: string, source_type: string, source_url: string|null }>}
 */
export async function loadDocumentText(source = {}) {
  const { source_type, content, url } = source
  if (!source_type) throw new Error('loadDocumentText: source.source_type is required')

  let text = ''
  let sourceUrl = null

  if (source_type === 'text') {
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('loadDocumentText: source.content is required for source_type "text"')
    }
    text = content
  } else if (source_type === 'url' || source_type === 'blob_url' || source_type === 'pdf') {
    if (!url) throw new Error(`loadDocumentText: source.url is required for source_type "${source_type}"`)
    sourceUrl = url

    const res = await fetch(url, { headers: { 'User-Agent': 'ContentOS/1.0' } })
    if (!res.ok) throw new Error(`loadDocumentText: failed to fetch ${url} (${res.status})`)

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    const looksPdf =
      source_type === 'pdf' ||
      contentType.includes('application/pdf') ||
      /\.pdf(?:[?#].*)?$/i.test(url)

    const buf = await res.arrayBuffer()

    if (looksPdf) {
      text = await extractPdfText(buf)
    } else {
      const raw = new TextDecoder('utf-8').decode(new Uint8Array(buf))
      text = htmlToText(raw)
    }
  } else {
    throw new Error(`loadDocumentText: unsupported source_type "${source_type}"`)
  }

  text = (text || '').replace(/\x00/g, '').trim()
  if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS)

  if (!text) {
    throw new Error(`loadDocumentText: no readable text extracted from ${source_type}${sourceUrl ? ` (${sourceUrl})` : ''}`)
  }

  return { text, source_type, source_url: sourceUrl }
}

/**
 * Extract reusable content SKILLS from a body of text.
 *
 * Returns SKILL RECORD objects WITHOUT workspace_id / embedding — the ingest layer
 * adds those. Resilient by design: validates and normalizes every candidate,
 * coerces skill_type to one of the 6 allowed values, fills a kebab skill_name from
 * the display_name when missing, and silently drops malformed entries.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {'pdf'|'url'|'manual'} [opts.sourceType]
 * @param {string|null} [opts.sourceUrl]
 * @param {number} [opts.maxSkills=12]
 * @returns {Promise<object[]>}
 */
export async function extractSkills(text, opts = {}) {
  if (!hasTextProvider()) {
    throw new Error('extractSkills: no text AI provider configured (set KIMI_API_KEY or OPENAI_API_KEY)')
  }

  const { sourceType, sourceUrl = null, maxSkills = 12 } = opts
  const source_type = normalizeSourceType(sourceType)
  const cleanText = (text || '').trim()
  if (!cleanText) throw new Error('extractSkills: empty text')

  const prompt = buildPrompt(cleanText, maxSkills)

  let parsed
  try {
    parsed = await textGenerateJSON(prompt, { maxTokens: 4000 })
  } catch (err) {
    throw new Error(`extractSkills: AI extraction failed — ${err.message}`)
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.skills)
      ? parsed.skills
      : []

  const records = []
  const seenNames = new Set()

  for (const raw of candidates) {
    const record = normalizeRecord(raw, { source_type, source_url, seenNames })
    if (record) {
      seenNames.add(record.skill_name)
      records.push(record)
    }
    if (records.length >= maxSkills) break
  }

  return records
}

/* ----------------------------------------------------------------------------
 * Internal helpers
 * -------------------------------------------------------------------------- */

async function extractPdfText(buf) {
  // unpdf bundles a serverless-friendly build of pdf.js — no native deps.
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buf))
  const out = await extractText(pdf, { mergePages: true })
  return typeof out?.text === 'string' ? out.text : Array.isArray(out?.text) ? out.text.join('\n\n') : ''
}

function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeSourceType(sourceType) {
  // SKILL RECORD source_type is constrained to 'pdf' | 'url' | 'manual'.
  if (sourceType === 'pdf') return 'pdf'
  if (sourceType === 'url' || sourceType === 'blob_url') return 'url'
  if (sourceType === 'manual' || sourceType === 'text') return 'manual'
  return 'manual'
}

function buildPrompt(text, maxSkills) {
  return `You are a content-strategy analyst. You are studying source material (a PDF, SOP, playbook, course, or training document) to extract REUSABLE CONTENT SKILLS — concrete techniques that can be applied later to generate NEW content on any topic.

Extract ONLY genuinely reusable techniques. A technique qualifies only if a content creator could lift it out of this material and apply it to an unrelated subject. Reject anything that is merely a fact, a topic-specific anecdote, a definition, filler, or a restatement of the source's subject matter. Quality over quantity — return fewer, sharper skills rather than padding the list. If the material contains nothing reusable, return an empty array.

Each skill MUST be classified into exactly one of these 6 categories (skill_type):
- "hook" — an attention-grabbing opening formula or pattern.
- "framework" — a structured, repeatable model or method (e.g. PAS, AIDA, a 5-step system).
- "story_structure" — a narrative arc or storytelling template.
- "content_pattern" — a recurring format or content-building tactic (e.g. listicle scaffold, before/after, myth-busting).
- "offer_structure" — a way to package, price, or present an offer / CTA.
- "marketing_concept" — a strategic principle or psychological lever (e.g. scarcity, social proof, identity marketing).

Return STRICT JSON: an array of up to ${maxSkills} objects. Each object MUST have exactly these fields:
{
  "skill_type": one of the 6 values above,
  "display_name": short human-friendly name (Title Case, e.g. "The Open Loop Hook"),
  "skill_name": kebab-case slug of the display_name (e.g. "the-open-loop-hook"),
  "description": 1-2 sentences stating plainly what the technique is,
  "when_to_use": one sentence describing the situation where it applies,
  "structure": the template / skeleton of the technique, written so it can be reused (use placeholders like [topic], [pain], [outcome]),
  "steps": array of short strings — how to apply it, step by step,
  "examples": array of concrete example strings (draw from the source material where possible),
  "keywords": array of lowercase search keywords,
  "source_excerpt": a short verbatim quote (one or two sentences) from the material that supports this skill
}

Rules:
- Output ONLY the JSON array. No prose, no markdown fences.
- Do not invent techniques that are not genuinely supported by the material.
- "structure" must be reusable across topics, not tied to this document's subject.

SOURCE MATERIAL:
"""
${text}
"""`
}

function normalizeRecord(raw, { source_type, source_url, seenNames }) {
  if (!raw || typeof raw !== 'object') return null

  const display_name = cleanStr(raw.display_name || raw.name || raw.title)
  if (!display_name) return null

  const description = cleanStr(raw.description || raw.summary)
  if (!description) return null

  const skill_type = coerceSkillType(raw.skill_type)

  let skill_name = kebab(cleanStr(raw.skill_name))
  if (!skill_name) skill_name = kebab(display_name)
  if (!skill_name) return null
  // Disambiguate collisions within a single extraction run.
  if (seenNames.has(skill_name)) {
    let n = 2
    while (seenNames.has(`${skill_name}-${n}`)) n++
    skill_name = `${skill_name}-${n}`
  }

  const when_to_use = cleanStr(raw.when_to_use)
  const structure = cleanStr(raw.structure)
  const source_excerpt = cleanStr(raw.source_excerpt || raw.excerpt)
  const steps = toStringArray(raw.steps)
  const examples = toStringArray(raw.examples)
  const keywords = toStringArray(raw.keywords).map(k => k.toLowerCase())

  return {
    skill_name,
    display_name,
    skill_type,
    version: '1.0.0',
    description,
    source_type,
    source_url: source_url || null,
    runtime: 'prompt',
    inputs: [
      { name: 'topic', type: 'string', required: true, description: 'subject to apply the skill to' }
    ],
    outputs: [
      { name: 'content', type: 'string', description: 'content produced by applying the skill' }
    ],
    permissions: ['ai_generation'],
    status: 'active',
    metadata: {
      when_to_use,
      structure,
      steps,
      examples,
      keywords,
      source_excerpt
    }
  }
}

function coerceSkillType(value) {
  const v = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (SKILL_TYPES.includes(v)) return v

  // Map common synonyms the model may emit onto the closed enum.
  const aliases = {
    hooks: 'hook',
    opening: 'hook',
    opener: 'hook',
    hook_formula: 'hook',
    frameworks: 'framework',
    model: 'framework',
    method: 'framework',
    system: 'framework',
    formula: 'framework',
    story: 'story_structure',
    narrative: 'story_structure',
    storytelling: 'story_structure',
    story_arc: 'story_structure',
    content: 'content_pattern',
    pattern: 'content_pattern',
    format: 'content_pattern',
    structure: 'content_pattern',
    content_structure: 'content_pattern',
    offer: 'offer_structure',
    cta: 'offer_structure',
    cta_formula: 'offer_structure',
    pricing: 'offer_structure',
    offer_design: 'offer_structure',
    marketing: 'marketing_concept',
    concept: 'marketing_concept',
    strategy: 'marketing_concept',
    psychology: 'marketing_concept',
    principle: 'marketing_concept'
  }
  return aliases[v] || 'content_pattern'
}

function kebab(str) {
  return String(str || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function cleanStr(v) {
  if (v == null) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

function toStringArray(v) {
  if (Array.isArray(v)) {
    return v
      .map(x => (typeof x === 'string' ? x : x == null ? '' : String(x)))
      .map(s => s.trim())
      .filter(Boolean)
  }
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}
