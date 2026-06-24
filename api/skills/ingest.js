/**
 * POST /api/skills/ingest
 *
 * Ingest source material (PDF / SOP / playbook / course / training doc) into the
 * Skill System and extract REUSABLE CONTENT SKILLS — hooks, frameworks, story
 * structures, content patterns, offer structures, marketing concepts — that can be
 * searched and APPLIED to new content generation.
 *
 * Body: {
 *   workspace_id,                                  // required
 *   source_type: 'text' | 'url' | 'pdf' | 'blob_url',
 *   content?,    // raw text when source_type === 'text'
 *   url?,        // fetchable URL for url / pdf / blob_url (blob_url = a Vercel Blob URL)
 *   title?,      // optional human label, stored on each skill's metadata
 *   category?    // optional caller-supplied category tag, stored on metadata
 * }
 *
 * Pipeline:
 *   1. loadDocumentText(source)              -> plain text + normalized source_type/url
 *   2. extractSkills(text)                   -> SKILL RECORD[] (no workspace_id/embedding)
 *   3. embedBatch(embedText per skill)       -> embeddings (only if hasEmbedProvider)
 *   4. insert each as a full skill_manifests row (workspace_id, source_type, source_url)
 *      - (workspace_id, skill_name) is UNIQUE; on collision, suffix a short uuid.
 *
 * Returns: { ingested, skills: [{ id, display_name, skill_type }], source_type }
 * Tolerates no-embed-provider (skills stored with embedding=null; search falls back
 * to text). Returns 503 when no text AI provider is configured.
 */
import { randomUUID } from 'node:crypto'
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'
import { embedBatch, hasEmbedProvider } from '../_providers/embed.js'
import { loadDocumentText, extractSkills } from './_extract.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body || {}
  const { workspace_id, source_type, content, url, title, category } = body

  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })
  if (!source_type) return res.status(400).json({ error: 'source_type required' })
  if (!['text', 'url', 'pdf', 'blob_url'].includes(source_type)) {
    return res.status(400).json({ error: `unsupported source_type "${source_type}"` })
  }
  if (source_type === 'text' && (typeof content !== 'string' || !content.trim())) {
    return res.status(400).json({ error: 'content required for source_type "text"' })
  }
  if (source_type !== 'text' && !url) {
    return res.status(400).json({ error: `url required for source_type "${source_type}"` })
  }

  const db = getServerSupabase()
  if (!db) return res.status(503).json({ error: 'Supabase not configured' })

  try {
    // Step 1: resolve plain text from the polymorphic source descriptor.
    let loaded
    try {
      loaded = await loadDocumentText({ source_type, content, url })
    } catch (err) {
      // No readable text could be pulled from this source.
      return res.status(503).json({ error: err.message })
    }
    const { text, source_type: normSourceType, source_url } = loaded

    // Step 2: AI-extract reusable skills. extractSkills throws 'no text AI provider'
    // when neither KIMI nor OPENAI key is present -> surface as 503.
    let skills
    try {
      skills = await extractSkills(text, { sourceType: normSourceType, sourceUrl: source_url })
    } catch (err) {
      if (/no text AI provider/i.test(err.message)) {
        return res.status(503).json({ error: err.message })
      }
      throw err
    }

    if (!skills.length) {
      return res.status(200).json({ ingested: 0, skills: [], source_type: normSourceType })
    }

    // Step 3: embed each skill (display_name + description + when_to_use + keywords).
    // Only when an embed provider is configured; otherwise store embedding=null and
    // let search fall back to text.
    let embeddings = null
    if (hasEmbedProvider()) {
      const embedTexts = skills.map(buildEmbedText)
      try {
        embeddings = await embedBatch(embedTexts)
      } catch {
        // Embedding is optional — degrade gracefully to text-only search.
        embeddings = null
      }
    }

    // Step 4: insert each skill as a full skill_manifests row, handling the
    // (workspace_id, skill_name) uniqueness by suffixing a short uuid on collision.
    const inserted = []
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i]
      const embedding = embeddings ? embeddings[i] : null
      const row = await insertSkill(db, {
        skill,
        workspace_id: coerceWorkspaceId(workspace_id),
        source_type: normSourceType,
        source_url,
        embedding,
        title,
        category
      })
      if (row) inserted.push(row)
    }

    return res.status(200).json({
      ingested: inserted.length,
      skills: inserted.map(r => ({
        id: r.id,
        display_name: r.display_name,
        skill_type: r.skill_type
      })),
      source_type: normSourceType
    })
  } catch (err) {
    console.error('[skills/ingest]', err)
    return res.status(500).json({ error: err.message })
  }
}

/* ----------------------------------------------------------------------------
 * Internal helpers
 * -------------------------------------------------------------------------- */

/**
 * The text embedded for semantic search:
 *   "display_name. description. when_to_use. keyword1, keyword2, ..."
 */
function buildEmbedText(skill) {
  const keywords = Array.isArray(skill?.metadata?.keywords) ? skill.metadata.keywords : []
  return [
    skill.display_name,
    skill.description,
    skill?.metadata?.when_to_use,
    keywords.join(', ')
  ]
    .filter(Boolean)
    .join('. ')
    .trim()
}

/**
 * Insert a single skill, retrying with a uuid-suffixed skill_name when the
 * (workspace_id, skill_name) unique constraint trips.
 */
async function insertSkill(db, { skill, workspace_id, source_type, source_url, embedding, title, category }) {
  const baseRow = buildRow({ skill, workspace_id, source_type, source_url, embedding, title, category })

  // First attempt with the natural kebab slug.
  let attempt = baseRow
  for (let tries = 0; tries < 3; tries++) {
    const { data, error } = await db
      .from('skill_manifests')
      .insert(attempt)
      .select('id, display_name, skill_type')
      .single()

    if (!error) return data

    if (isUniqueViolation(error)) {
      // Suffix a short uuid fragment to dodge the (workspace_id, skill_name) clash.
      const suffix = randomUUID().slice(0, 8)
      attempt = { ...baseRow, skill_name: suffixSlug(baseRow.skill_name, suffix) }
      continue
    }
    throw error
  }
  // Exhausted retries (extremely unlikely) — surface as a hard failure.
  throw new Error(`failed to insert skill "${baseRow.skill_name}" after uuid retries`)
}

/**
 * Build the full skill_manifests row from an extracted SKILL RECORD.
 * extractSkills already produced the contract-shaped record (skill_name,
 * display_name, skill_type, version, description, runtime, inputs, outputs,
 * permissions, status, metadata) and normalized source_type to pdf|url|manual.
 * We pin workspace_id + source_type + source_url and fold optional title/category
 * into metadata.
 */
function buildRow({ skill, workspace_id, source_type, source_url, embedding, title, category }) {
  const metadata = { ...(skill.metadata || {}) }
  if (title) metadata.title = title
  if (category) metadata.category = category

  return {
    workspace_id,
    skill_name: skill.skill_name,
    display_name: skill.display_name,
    skill_type: skill.skill_type,
    version: skill.version || '1.0.0',
    description: skill.description,
    source_type: skill.source_type || source_type,
    source_url: source_url || skill.source_url || null,
    runtime: skill.runtime || 'prompt',
    inputs: skill.inputs || [],
    outputs: skill.outputs || [],
    permissions: skill.permissions || ['ai_generation'],
    status: skill.status || 'active',
    metadata,
    embedding
  }
}

function suffixSlug(slug, suffix) {
  // Keep within the kebab slug budget (80 chars) used by _extract.js.
  const base = String(slug || 'skill').slice(0, 80 - (suffix.length + 1))
  return `${base}-${suffix}`
}

function isUniqueViolation(error) {
  // Postgres unique_violation = 23505; Supabase surfaces it on error.code.
  return error?.code === '23505' || /duplicate key|unique constraint/i.test(error?.message || '')
}
