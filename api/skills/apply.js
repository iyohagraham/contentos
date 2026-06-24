/**
 * POST /api/skills/apply
 * Apply a stored content SKILL (technique) to a new topic.
 *
 * Loads a skill from skill_manifests, injects its technique payload
 * (when_to_use / structure / steps / examples) into a generation prompt,
 * and asks the model to APPLY that exact technique to the given topic,
 * returning N distinct variations as JSON.
 *
 * Every apply is logged to skill_invocations (running -> success|failed)
 * and increments skill_manifests.total_invocations.
 *
 * Body: { workspace_id, skill_id?, skill_name?, topic, variations=3, format? }
 * Returns: { skill: { id, display_name, skill_type }, topic, results: [...] }
 */
import { getServerSupabase, coerceWorkspaceId } from '../_db.js'
import { textGenerateJSON, hasTextProvider } from '../_providers/text.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!hasTextProvider()) {
    return res.status(503).json({ error: 'No text AI provider configured (set KIMI_API_KEY or OPENAI_API_KEY)' })
  }

  const { workspace_id, skill_id, skill_name, topic, variations = 3, format } = req.body || {}

  if (!topic) return res.status(400).json({ error: 'topic required' })
  if (!skill_id && !skill_name) return res.status(400).json({ error: 'skill_id or skill_name required' })
  if (!skill_id && !workspace_id) {
    return res.status(400).json({ error: 'workspace_id required when looking up by skill_name' })
  }

  const db = getServerSupabase()
  if (!db) return res.status(503).json({ error: 'Supabase not configured' })

  const variationCount = clampVariations(variations)

  try {
    // Step 1: Load the skill (by id, or by skill_name + workspace_id), excluding soft-deleted rows.
    let q = db
      .from('skill_manifests')
      .select('id, workspace_id, skill_name, display_name, skill_type, description, metadata, total_invocations')
      .is('deleted_at', null)

    if (skill_id) {
      q = q.eq('id', skill_id)
    } else {
      q = q.eq('skill_name', skill_name)
      const ws = coerceWorkspaceId(workspace_id)
      q = ws ? q.eq('workspace_id', ws) : q.is('workspace_id', null)
    }

    const { data: skill, error: loadErr } = await q.maybeSingle()
    if (loadErr) throw loadErr
    if (!skill) return res.status(404).json({ error: 'Skill not found' })

    // Step 2: Build the technique-injecting generation prompt.
    const prompt = buildApplyPrompt(skill, topic, variationCount, format)

    // Step 3a: Open an invocation record (status: running).
    const inputs = { topic, variations: variationCount, format: format || null }
    const invocationId = await openInvocation(db, skill.id, inputs)

    const startedAt = Date.now()

    let results
    try {
      const out = await textGenerateJSON(prompt, { maxTokens: 3000 })
      results = normalizeResults(out, variationCount)
      if (!results.length) throw new Error('Model returned no results')
    } catch (genErr) {
      const latencyMs = Date.now() - startedAt
      // Step 3b: Mark invocation failed.
      await closeInvocation(db, invocationId, {
        status: 'failed',
        latency_ms: latencyMs,
        error: genErr?.message || String(genErr)
      })
      throw genErr
    }

    const latencyMs = Date.now() - startedAt

    // Step 3c: Mark invocation success + increment total_invocations.
    await closeInvocation(db, invocationId, {
      status: 'success',
      latency_ms: latencyMs,
      outputs: { results }
    })
    await incrementInvocations(db, skill)

    // Step 4: Return the applied results.
    return res.status(200).json({
      skill: { id: skill.id, display_name: skill.display_name, skill_type: skill.skill_type },
      topic,
      results
    })
  } catch (err) {
    console.error('[skills/apply]', err)
    return res.status(500).json({ error: err.message })
  }
}

/** Coerce + clamp the requested variation count to a sane range. */
function clampVariations(n) {
  const v = parseInt(n, 10)
  if (!Number.isFinite(v) || v < 1) return 3
  return Math.min(v, 10)
}

/**
 * Build a generation prompt that injects the full technique payload and
 * instructs the model to APPLY it to the topic, returning JSON.
 */
function buildApplyPrompt(skill, topic, variations, format) {
  const md = skill.metadata || {}
  const steps = Array.isArray(md.steps) ? md.steps : []
  const examples = Array.isArray(md.examples) ? md.examples : []

  const lines = []
  lines.push(`You are an expert content creator. You have ONE specific technique to apply.`)
  lines.push('')
  lines.push(`## TECHNIQUE: ${skill.display_name}`)
  lines.push(`Type: ${skill.skill_type}`)
  if (skill.description) lines.push(`What it is: ${skill.description}`)
  if (md.when_to_use) lines.push(`When to use: ${md.when_to_use}`)
  if (md.structure) {
    lines.push('')
    lines.push(`Structure / template:`)
    lines.push(md.structure)
  }
  if (steps.length) {
    lines.push('')
    lines.push(`How to apply it, step by step:`)
    steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`))
  }
  if (examples.length) {
    lines.push('')
    lines.push(`Concrete examples of this technique in action:`)
    examples.forEach((e) => lines.push(`- ${e}`))
  }
  lines.push('')
  lines.push(`## TOPIC TO APPLY IT TO`)
  lines.push(topic)
  lines.push('')
  lines.push(`## YOUR TASK`)
  lines.push(`Apply the "${skill.display_name}" technique EXACTLY as described above to the topic.`)
  lines.push(`Follow its structure and steps faithfully — do not substitute a different technique.`)
  if (format) lines.push(`Target format / platform: ${format}.`)
  lines.push(`Produce ${variations} DISTINCT output${variations === 1 ? '' : 's'} that each independently apply the technique to the topic. Make them genuinely different from one another, not minor rewordings.`)
  lines.push('')
  lines.push(`Return ONLY valid JSON in this exact shape:`)
  lines.push(`{`)
  lines.push(`  "results": [`)
  lines.push(`    { "content": "the produced content applying the technique", "notes": "one sentence on how this variation uses the technique" }`)
  lines.push(`  ]`)
  lines.push(`}`)
  lines.push(`The "results" array MUST contain exactly ${variations} item${variations === 1 ? '' : 's'}.`)

  return lines.join('\n')
}

/**
 * Coerce the model output into a clean results array.
 * Accepts { results: [...] }, a bare array, or a single object.
 */
function normalizeResults(out, variations) {
  let arr = []
  if (out && Array.isArray(out.results)) arr = out.results
  else if (Array.isArray(out)) arr = out
  else if (out && typeof out === 'object') arr = [out]

  const cleaned = arr
    .map((item) => {
      if (item == null) return null
      if (typeof item === 'string') return { content: item }
      if (typeof item === 'object') {
        // Prefer an explicit content field; otherwise keep the object as-is.
        if (typeof item.content === 'string' && item.content.trim()) return item
        if (typeof item.text === 'string' && item.text.trim()) return { content: item.text, ...item }
        return item
      }
      return { content: String(item) }
    })
    .filter(Boolean)

  return cleaned.slice(0, variations)
}

/** Insert a skill_invocations row in 'running' state. Returns its id (or null). */
async function openInvocation(db, skillId, inputs) {
  try {
    const { data, error } = await db
      .from('skill_invocations')
      .insert({ skill_id: skillId, inputs, status: 'running' })
      .select('id')
      .single()
    if (error) throw error
    return data?.id || null
  } catch (err) {
    // Logging must never block the actual application.
    console.error('[skills/apply] openInvocation', err.message)
    return null
  }
}

/** Update a skill_invocations row to its terminal state. */
async function closeInvocation(db, invocationId, fields) {
  if (!invocationId) return
  try {
    await db
      .from('skill_invocations')
      .update({ ...fields, completed_at: new Date().toISOString() })
      .eq('id', invocationId)
  } catch (err) {
    console.error('[skills/apply] closeInvocation', err.message)
  }
}

/** Increment skill_manifests.total_invocations for the applied skill. */
async function incrementInvocations(db, skill) {
  try {
    const next = (skill.total_invocations || 0) + 1
    await db
      .from('skill_manifests')
      .update({ total_invocations: next, updated_at: new Date().toISOString() })
      .eq('id', skill.id)
  } catch (err) {
    console.error('[skills/apply] incrementInvocations', err.message)
  }
}

export { handler as applyHandler }
