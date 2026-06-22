/**
 * Frontend Postiz client — talks to our own /api/postiz/* proxy.
 * The actual Postiz URL + API key live server-side only.
 */

async function call(path, options = {}) {
  const res = await fetch(`/api/postiz/${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { success: false, error: `Bad response: ${text.slice(0, 120)}` }
  }
}

export const postiz = {
  // Is Postiz connected on the server? How many channels?
  status() {
    return call('status')
  },

  // List connected social accounts
  channels() {
    return call('channels')
  },

  // Publish or schedule a post
  // { channelIds: string[], content: string, mediaUrls?: string[], scheduledTime?: ISO|null }
  post(payload) {
    return call('post', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export default postiz
