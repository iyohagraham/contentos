/**
 * POST /api/skills/blob-upload
 *
 * Vercel Blob client-upload TOKEN route. The browser asks this route for a
 * short-lived upload token, then uploads large PDFs / SOPs straight to Vercel Blob
 * (bypassing the serverless body-size limit). Once the upload finishes, the client
 * calls POST /api/skills/ingest with { source_type: 'blob_url', url: blobUrl } to
 * run extraction.
 *
 * This is the standard @vercel/blob client-upload handshake: the SDK's
 * `handleUpload` both issues the token (onBeforeGenerateToken) and processes the
 * upload-completed callback (onUploadCompleted), returning the JSON the browser's
 * `upload()` helper expects.
 *
 * Requires BLOB_READ_WRITE_TOKEN in the environment (Vercel Blob store).
 */
import { handleUpload } from '@vercel/blob/client'

// 25 MB — generous headroom for course PDFs / playbooks.
const MAX_UPLOAD_BYTES = 25_000_000
const ALLOWED_CONTENT_TYPES = ['application/pdf', 'text/plain', 'text/markdown']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (/* pathname, clientPayload */) => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_UPLOAD_BYTES
      }),
      // The browser ingests via /api/skills/ingest after upload, so nothing to do
      // here. Note: this fires only on a publicly reachable deployment, never on
      // localhost (Blob can't call back to a non-public URL).
      onUploadCompleted: async () => {}
    })

    return res.status(200).json(jsonResponse)
  } catch (err) {
    console.error('[skills/blob-upload]', err)
    // handleUpload throws on invalid tokens / disallowed content types / oversize.
    return res.status(400).json({ error: err.message })
  }
}
