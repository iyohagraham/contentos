import { fal } from '@fal-ai/client'

// Configure fal.ai client
export function configureFal(key) {
  fal.config({
    credentials: key
  })
}

// Generate AI visuals using FLUX
export async function generateVisual({ prompt, width = 1080, height = 1920 }) {
  try {
    const result = await fal.subscribe('fal-ai/flux/dev/image', {
      input: {
        prompt,
        image_size: width > height ? 'landscape_4_3' : width < height ? 'portrait_16_9' : 'square',
        num_inference_steps: 28,
        guidance_scale: 3.5
      }
    })
    return {
      success: true,
      imageUrl: result.data.images?.[0]?.url,
      width: result.data.images?.[0]?.width,
      height: result.data.images?.[0]?.height
    }
  } catch (error) {
    console.error('FLUX generation error:', error)
    return { success: false, error: error.message }
  }
}

// Generate motion video using Wan 2.1
export async function generateMotion({ imagePrompt, motionPrompt, duration = 4 }) {
  try {
    const result = await fal.subscribe('fal-ai/wan', {
      input: {
        prompt: motionPrompt,
        image_prompt: imagePrompt,
        duration,
        resolution: '768x1280'
      }
    })
    return {
      success: true,
      videoUrl: result.data.video?.url,
      thumbnailUrl: result.data.video?.cover_url
    }
  } catch (error) {
    console.error('Wan motion generation error:', error)
    return { success: false, error: error.message }
  }
}

// Generate text-to-speech
export async function generateTTS({ text, voice = 'default' }) {
  try {
    const result = await fal.subscribe('fal-ai/kokoro', {
      input: {
        text,
        voice
      }
    })
    return {
      success: true,
      audioUrl: result.data.audio?.url,
      duration: result.data.audio?.duration
    }
  } catch (error) {
    console.error('TTS generation error:', error)
    return { success: false, error: error.message }
  }
}

// Remove background from image/video
export async function removeBackground({ mediaUrl, type = 'image' }) {
  try {
    const result = await fal.subscribe('fal-ai/background-removal', {
      input: {
        image_url: mediaUrl
      }
    })
    return {
      success: true,
      imageUrl: result.data.image?.url
    }
  } catch (error) {
    console.error('Background removal error:', error)
    return { success: false, error: error.message }
  }
}

// Generate batch visuals for video scenes
export async function generateSceneVisuals({ scenes, style = 'photorealistic' }) {
  const visuals = []
  
  for (const scene of scenes) {
    const visual = await generateVisual({
      prompt: `${style} style: ${scene.visualPrompt || scene.text}`,
      width: 1080,
      height: 1920
    })
    visuals.push({ ...scene, ...visual })
  }
  
  return visuals
}