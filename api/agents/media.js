/**
 * Media Agent — generates all visual and audio assets for a video.
 *
 * Inputs:  { video_id, workspace_id, mode? }
 * Outputs: { scene_images, voice_audio, motion_clips?, assets_stored }
 *
 * Pipeline:
 *   1. Load video record (must have script + title)
 *   2. Load workspace strategy (for style/brand context)
 *   3. Generate FLUX scene images (one per script section + hook + CTA)
 *   4. Generate voice narration (Qwen-3-TTS or Kokoro)
 *   5. Optionally generate Wan 2.7 motion clips (mode='full')
 *   6. Re-upload ephemeral fal.ai URLs to Vercel Blob
 *   7. Update video record with all asset URLs
 */
import { runAgent } from './_base.js'
import { generateImage, hasImageProvider } from '../_providers/image.js'
import { generateVoice, generateVoiceLocal, hasVoiceProvider } from '../_providers/voice.js'
import { imageToVideo, motionTest, hasVideoProvider } from '../_providers/video.js'
import { reuploadUrl, hasBlob } from '../_blob.js'
import { produceVideo } from '../media/engine.js'

const STYLE_LOCK = 'cinematic realism, ultra-detailed, soft studio lighting, shallow depth of field, 4K quality'

export default async function mediaAgent({ workspace_id, video_id, mode = 'images', job_id }) {
  return runAgent({
    agentType: 'media',
    workspaceId: workspace_id,
    inputs: { video_id, mode, job_id },
    task: `Generate visual and audio assets for video production`,
    run: async ({ db, ragContext }) => {
      if (!video_id) throw new Error('video_id required')

      // Load video + strategy
      const [{ data: video }, { data: strategy }] = await Promise.all([
        db.from('video_posts').select('id, title, script, topic, platform, status').eq('id', video_id).single(),
        db.from('strategies').select('brand_name, style_guide, visual_style, target_audience').eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(1).single()
      ])

      if (!video) throw new Error(`Video ${video_id} not found`)
      if (!video.script) throw new Error('Video has no script — run Writing Agent first')

      await db.from('video_posts').update({ status: 'generating_media' }).eq('id', video_id)

      const script = video.script
      const brandStyle = strategy?.visual_style || STYLE_LOCK
      const brandName = strategy?.brand_name || ''

      // Build scene prompts from script sections
      const scenes = buildSceneList(script, video.title, video.topic)

      const results = {
        scene_images: [],
        voice_audio_url: null,
        motion_clips: [],
        assets_stored: 0
      }

      // === Step 1: Generate scene images (FLUX) ===
      if (hasImageProvider()) {
        const imageResults = await Promise.allSettled(
          scenes.map((scene, i) => generateSceneImage(scene, brandStyle, i, video_id))
        )

        for (let i = 0; i < imageResults.length; i++) {
          const r = imageResults[i]
          if (r.status === 'fulfilled' && r.value) {
            const url = hasBlob()
              ? await reuploadUrl(r.value, `media/${video_id}/scene_${String(i).padStart(3, '0')}.jpg`).catch(() => r.value)
              : r.value
            results.scene_images.push(url)
            results.assets_stored++
          } else {
            console.error(`[media] Scene ${i} image failed:`, r.reason?.message)
            results.scene_images.push(null) // placeholder
          }
        }
      } else {
        console.warn('[media] No image provider — skipping scene images')
      }

      // === Step 2: Generate voice narration ===
      const narrationText = buildNarrationText(script)
      if (narrationText) {
        try {
          let audioUrl = null

          if (hasVoiceProvider()) {
            const voiceResult = await generateVoice(narrationText, {
              voice: 'Serena',
              language: 'English'
            })
            audioUrl = voiceResult?.url || null
          } else {
            // Try local Kokoro (returns a data: URL in `dataUrl`)
            const localResult = await generateVoiceLocal(narrationText, { voice: 'af_heart' }).catch(() => null)
            audioUrl = localResult?.dataUrl || localResult?.url || null
          }

          if (audioUrl) {
            results.voice_audio_url = hasBlob()
              ? await reuploadUrl(audioUrl, `media/${video_id}/narration.mp3`).catch(() => audioUrl)
              : audioUrl
            results.assets_stored++
          }
        } catch (voiceErr) {
          console.error('[media] Voice generation failed:', voiceErr.message)
        }
      }

      // === Step 3 (optional): Motion test clips via Wan 2.6 Flash ===
      if (mode === 'motion_test' && hasVideoProvider() && results.scene_images.length > 0) {
        const testImageUrl = results.scene_images[0]
        if (testImageUrl) {
          try {
            const motionResult = await motionTest(testImageUrl, scenes[0]?.motion_prompt || 'gentle camera drift')
            if (motionResult?.url) {
              results.motion_clips.push({
                scene: 0,
                url: hasBlob()
                  ? await reuploadUrl(motionResult.url, `media/${video_id}/motion_test.mp4`).catch(() => motionResult.url)
                  : motionResult.url
              })
              results.assets_stored++
            }
          } catch (motionErr) {
            console.error('[media] Motion test failed:', motionErr.message)
          }
        }
      }

      // === Step 4 (optional): Full Wan 2.7 motion clips ===
      if (mode === 'full' && hasVideoProvider() && results.scene_images.length > 0) {
        const validImages = results.scene_images.filter(Boolean)
        if (validImages.length > 0) {
          try {
            const videoResult = await imageToVideo(results.scene_images[0], {
              prompt: scenes[0]?.motion_prompt || 'slow cinematic pan, professional quality',
              reference_images: validImages.slice(0, 5),  // up to 5 for character consistency
              duration: 5
            })
            if (videoResult?.url) {
              const clipUrl = hasBlob()
                ? await reuploadUrl(videoResult.url, `media/${video_id}/clip_000.mp4`).catch(() => videoResult.url)
                : videoResult.url
              results.motion_clips.push({ scene: 0, url: clipUrl })
              results.assets_stored++
            }
          } catch (videoErr) {
            console.error('[media] Wan 2.7 clip failed:', videoErr.message)
          }
        }
      }

      // === Step 5 (optional): Render the final MP4 via the Media Engine ===
      // Triggered when the mode asks for a render (e.g. 'render' or 'full+render').
      // Assembles scene images + narration into a finished, persisted video and
      // mints a poster thumbnail — the same path the one-off render endpoint uses.
      results.final_video_url = null
      results.thumbnail_url = null
      results.video_duration = null
      const wantsRender = String(mode).includes('render')
      if (wantsRender) {
        const renderScenes = buildRenderScenes(scenes, results.scene_images)
        if (renderScenes.length === 0) {
          console.warn('[media] Render requested but no usable scene images — skipping render')
        } else {
          try {
            const produced = await produceVideo({
              scenes: renderScenes,
              audioUrl: results.voice_audio_url || undefined,
              format: '9:16',
              workspaceId: workspace_id,
              opts: { id: video_id }
            })
            results.final_video_url = produced.video_url || null
            results.thumbnail_url = produced.thumbnail_url || null
            results.video_duration = produced.durationSec ?? null
            if (results.final_video_url) results.assets_stored++
          } catch (renderErr) {
            console.error('[media] Final render failed:', renderErr.message)
          }
        }
      }

      // === Step 6: Persist all asset URLs on video record ===
      const hasScenes = results.scene_images.filter(Boolean).length > 0
      const updatePayload = {
        scene_image_urls: results.scene_images.filter(Boolean),
        voice_audio_url: results.voice_audio_url,
        status: results.final_video_url
          ? 'assembled'
          : (hasScenes ? 'media_ready' : 'media_partial'),
        media_generated_at: new Date().toISOString()
      }
      if (results.motion_clips.length > 0) {
        updatePayload.motion_clip_urls = results.motion_clips.map(c => c.url)
      }
      if (results.final_video_url) {
        updatePayload.final_video_url = results.final_video_url
        updatePayload.thumbnail_url = results.thumbnail_url
        updatePayload.assembly_completed_at = new Date().toISOString()
      }

      await db.from('video_posts').update(updatePayload).eq('id', video_id)

      return {
        video_id,
        scenes_generated: results.scene_images.filter(Boolean).length,
        scenes_total: scenes.length,
        voice_audio_url: results.voice_audio_url,
        motion_clips: results.motion_clips.length,
        final_video_url: results.final_video_url,
        thumbnail_url: results.thumbnail_url,
        video_duration: results.video_duration,
        assets_stored: results.assets_stored,
        mode,
        ready_to_assemble: !!results.voice_audio_url && hasScenes
      }
    }
  })
}

async function generateSceneImage(scene, brandStyle, index, videoId) {
  const prompt = `${scene.visual_prompt}. ${brandStyle}. Professional video production quality.`
  const result = await generateImage(prompt, {
    model: index === 0 ? 'pro' : 'dev',  // best quality for hook frame, dev for body (provider maps the tier)
    width: 1920,
    height: 1080,
    numImages: 1
  })
  return result?.url || result?.images?.[0]?.url || null
}

function buildSceneList(script, title, topic) {
  const scenes = []

  // Hook scene
  scenes.push({
    label: 'hook',
    visual_prompt: script.hook
      ? `${script.hook} — dramatic opening scene for "${title}"`
      : `Cinematic opening shot for "${title}", ${topic}`,
    motion_prompt: 'slow zoom in, dramatic atmosphere',
    narration: typeof script.hook === 'string' ? script.hook : ''
  })

  // Body sections
  if (Array.isArray(script.body)) {
    for (const section of script.body) {
      scenes.push({
        label: section.section || 'body',
        visual_prompt: section.visual_cue
          ? `${section.visual_cue} — ${section.section || 'scene'}`
          : `Illustrative scene for: "${section.script?.slice(0, 100) || section.section}"`,
        motion_prompt: 'smooth camera movement, professional quality',
        narration: section.script || ''
      })
    }
  }

  // CTA scene
  if (script.cta) {
    scenes.push({
      label: 'cta',
      visual_prompt: `Call to action scene — engagement prompt, ${topic}, audience looking at camera`,
      motion_prompt: 'direct engagement, slight zoom',
      narration: typeof script.cta === 'string' ? script.cta : ''
    })
  }

  return scenes
}

/**
 * Zip the scene metadata (from buildSceneList) with the generated image URLs
 * into the scene shape produceVideo/buildManifest expects. Scenes whose image
 * generation failed (null URL) are dropped so the renderer never sees a gap.
 * ken-burns motion + fade transitions are applied by default in the manifest
 * builder; narration text flows through so captions can be auto-derived.
 */
function buildRenderScenes(scenes, imageUrls) {
  const out = []
  for (let i = 0; i < scenes.length; i++) {
    const url = imageUrls[i]
    if (!url) continue
    out.push({
      image_url: url,
      narration: scenes[i]?.narration || '',
      motion: 'kenburns',
      transition: 'fade'
    })
  }
  return out
}

function buildNarrationText(script) {
  const parts = []
  if (script.hook) parts.push(typeof script.hook === 'string' ? script.hook : script.hook.text || '')
  if (Array.isArray(script.body)) {
    for (const s of script.body) {
      if (s.script) parts.push(s.script)
    }
  }
  if (script.cta) parts.push(typeof script.cta === 'string' ? script.cta : script.cta.text || '')
  return parts.filter(Boolean).join(' ').trim()
}
