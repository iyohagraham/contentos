/**
 * Text chunking utility for knowledge ingestion.
 * Strategies differ by document type.
 *
 * Target chunk size: ~512 tokens (~400 words).
 * Overlap: ~10% (~50 tokens) for context continuity.
 */

const TARGET_TOKENS = 512
const OVERLAP_TOKENS = 50
const AVG_CHARS_PER_TOKEN = 4

const TARGET_CHARS = TARGET_TOKENS * AVG_CHARS_PER_TOKEN   // ~2048
const OVERLAP_CHARS = OVERLAP_TOKENS * AVG_CHARS_PER_TOKEN // ~200

/**
 * Chunk plain text with paragraph-aware splitting.
 */
export function chunkText(text, { chunkSize = TARGET_CHARS, overlap = OVERLAP_CHARS } = {}) {
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  const chunks = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > chunkSize && current) {
      chunks.push(current.trim())
      // Start next chunk with overlap: grab last ~overlap chars of current
      current = current.slice(-overlap) + '\n\n' + para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }
  if (current.trim()) chunks.push(current.trim())

  // Split any chunks still over limit (e.g. single huge paragraph)
  const result = []
  for (const chunk of chunks) {
    if (chunk.length <= chunkSize) {
      result.push(chunk)
    } else {
      // Hard split by sentences
      const sentences = chunk.split(/(?<=[.!?])\s+/)
      let sub = ''
      for (const s of sentences) {
        if ((sub + ' ' + s).length > chunkSize && sub) {
          result.push(sub.trim())
          sub = sub.slice(-overlap) + ' ' + s
        } else {
          sub = sub ? sub + ' ' + s : s
        }
      }
      if (sub.trim()) result.push(sub.trim())
    }
  }
  return result.filter(c => c.length > 50)
}

/**
 * Chunk a YouTube transcript (preserves timestamp context).
 * Input: [{ timestamp: "0:05", text: "..." }, ...]
 */
export function chunkTranscript(segments, { chunkSize = TARGET_CHARS } = {}) {
  const chunks = []
  let current = { text: '', startTimestamp: null, endTimestamp: null }

  for (const seg of segments) {
    const addition = ` ${seg.text}`
    if (current.text.length + addition.length > chunkSize && current.text) {
      chunks.push({
        content: current.text.trim(),
        metadata: { start: current.startTimestamp, end: current.endTimestamp, type: 'transcript' }
      })
      current = { text: seg.text, startTimestamp: seg.timestamp, endTimestamp: seg.timestamp }
    } else {
      if (!current.startTimestamp) current.startTimestamp = seg.timestamp
      current.endTimestamp = seg.timestamp
      current.text += addition
    }
  }
  if (current.text.trim()) {
    chunks.push({
      content: current.text.trim(),
      metadata: { start: current.startTimestamp, end: current.endTimestamp, type: 'transcript' }
    })
  }
  return chunks
}

/**
 * Chunk code/structured content by logical blocks (functions, classes, sections).
 */
export function chunkCode(text, { chunkSize = TARGET_CHARS * 2 } = {}) {
  // Split on function/class/section boundaries
  const blocks = text.split(/(?=\n(?:def |class |function |export |#+ ))/gm)
  const chunks = []
  let current = ''

  for (const block of blocks) {
    if ((current + block).length > chunkSize && current) {
      chunks.push(current.trim())
      current = block
    } else {
      current += block
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(c => c.length > 30)
}

/**
 * Estimate token count (rough: 1 token ≈ 4 chars).
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN)
}
