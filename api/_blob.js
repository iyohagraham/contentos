/**
 * Vercel Blob helper — upload buffers/URLs to persistent storage.
 * Falls back gracefully when BLOB_READ_WRITE_TOKEN is not set.
 */

let blobModule = null
async function getBlob() {
  if (!blobModule) blobModule = await import('@vercel/blob')
  return blobModule
}

const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN

/**
 * Upload a Buffer or Uint8Array to Vercel Blob.
 * Returns the blob URL.
 */
export async function uploadBuffer(buffer, filename, { contentType = 'application/octet-stream' } = {}) {
  if (!hasBlob()) throw new Error('BLOB_READ_WRITE_TOKEN not set')
  const { put } = await getBlob()
  const result = await put(filename, buffer, { access: 'public', contentType })
  return result.url
}

/**
 * Fetch a remote URL and re-upload to Vercel Blob (makes ephemeral fal.ai URLs permanent).
 * Returns the blob URL.
 */
export async function reuploadUrl(remoteUrl, filename, { contentType } = {}) {
  if (!hasBlob()) return remoteUrl  // Return original URL if blob not configured
  const res = await fetch(remoteUrl)
  if (!res.ok) throw new Error(`Failed to fetch ${remoteUrl}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = contentType || res.headers.get('content-type') || 'application/octet-stream'
  return uploadBuffer(buf, filename, { contentType: ct })
}

/**
 * Upload text content (scripts, JSON manifests) to Vercel Blob.
 */
export async function uploadText(text, filename) {
  if (!hasBlob()) return null
  const buf = Buffer.from(text, 'utf8')
  return uploadBuffer(buf, filename, { contentType: 'text/plain; charset=utf-8' })
}

export { hasBlob }
