/**
 * Skill context builder — Retrieval-Augmented skill injection.
 * Mirrors knowledge/rag.js: called by an agent before an AI text call to pull
 * the most relevant LEARNED CONTENT SKILLS and format them for prompt injection.
 *
 * Usage (in any agent):
 *   const skillBlock = await buildSkillContext(workspace_id, taskDescription)
 *   const { content } = await textChat(messages, { systemPrompt: basePrompt + skillBlock })
 *
 * MUST NEVER throw — agents depend on this. Returns '' on any failure,
 * when there is no embed provider, or when nothing matches.
 */
import { embed, hasEmbedProvider } from '../_providers/embed.js'
import { getServerSupabase, rpc, coerceWorkspaceId } from '../_db.js'

/**
 * Build a "Learned Skills" context string for injection into an agent's prompt.
 * @param {string} workspaceId
 * @param {string} task - description of what the agent is about to do
 * @param {object} opts - { maxSkills, threshold }
 * @returns {Promise<string>} - formatted markdown block, or '' if nothing found
 */
export async function buildSkillContext(workspaceId, task, opts = {}) {
  if (!hasEmbedProvider()) return ''

  const db = getServerSupabase()
  if (!db) return ''

  const { maxSkills = 4, threshold = 0.6 } = opts

  try {
    const queryEmbedding = await embed(task)

    // 1. Find the most relevant skill ids via the vector match function.
    const matches = await rpc('match_skills', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: maxSkills,
      p_workspace_id: coerceWorkspaceId(workspaceId)
    })

    if (!matches?.length) return ''

    // 2. Load the full metadata payload for the matched ids (match_skills
    //    only returns the summary columns, not the reusable technique).
    const ids = matches.map(m => m.id)
    const { data: full, error } = await db
      .from('skill_manifests')
      .select('id, display_name, skill_type, description, metadata')
      .in('id', ids)
      .is('deleted_at', null)
      .eq('status', 'active')

    if (error || !full?.length) return ''

    // 3. Preserve similarity ordering from the match call.
    const order = new Map(ids.map((id, i) => [id, i]))
    const skills = full.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

    // 4. Format the markdown block.
    const lines = ['## Learned Skills (apply these)\n']

    for (const skill of skills) {
      const meta = skill.metadata || {}
      lines.push(`### ${skill.display_name} (${skill.skill_type})`)
      if (skill.description) lines.push(skill.description)
      if (meta.when_to_use) lines.push(`**When to use:** ${meta.when_to_use}`)
      if (meta.structure) lines.push(`**Structure:**\n${meta.structure}`)
      if (Array.isArray(meta.steps) && meta.steps.length) {
        lines.push('**Steps:**')
        meta.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`))
      }
      if (Array.isArray(meta.examples) && meta.examples.length) {
        lines.push(`**Examples:** ${meta.examples.slice(0, 2).join('; ')}`)
      }
      lines.push('')
    }

    lines.push('---\nApply the relevant learned skills above when producing your output.\n')

    return lines.join('\n')
  } catch {
    return '' // Skill-context failure must never block an agent.
  }
}

export default buildSkillContext
