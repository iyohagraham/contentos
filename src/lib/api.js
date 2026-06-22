// API client for ContentOS backend

const API_BASE = '/api'

export async function generateScript({ topic, niche, audience, style, length }) {
  try {
    const response = await fetch(`${API_BASE}/generate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, niche, audience, style, length })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || error.error || 'Failed to generate script')
    }

    const data = await response.json()
    return data.script
  } catch (error) {
    console.error('Script generation failed:', error)
    throw error
  }
}

export async function generateStrategy({ niche, audience, product }) {
  try {
    const response = await fetch(`${API_BASE}/generate-strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche, audience, product })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || error.error || 'Failed to generate strategy')
    }

    const data = await response.json()
    return data.strategy
  } catch (error) {
    console.error('Strategy generation failed:', error)
    throw error
  }
}

export async function generateVideoIdeas({ niche, count = 10 }) {
  try {
    const response = await fetch(`${API_BASE}/generate-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche, count })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate ideas')
    }

    const data = await response.json()
    return data.ideas
  } catch (error) {
    console.error('Idea generation failed:', error)
    throw error
  }
}