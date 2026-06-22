#!/usr/bin/env node

/**
 * OpenMontage + ContentOS Integration
 * 
 * This script bridges ContentOS with OpenMontage for video production.
 * It takes generated scripts and creates HyperFrames compositions.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const ContentOS = {
  name: 'ContentOS',
  version: '1.0.0',
  description: 'Multi-platform video content engine with AI script generation and HyperFrames integration',
  
  // Video production pipeline
  pipeline: {
    steps: [
      { name: 'script', tool: 'openai', output: 'narrator_scripts.json' },
      { name: 'voiceover', tool: 'fal-ai/kokoro', output: 'assets/voice/' },
      { name: 'visuals', tool: 'fal-ai/flux', output: 'assets/images/' },
      { name: 'motion', tool: 'fal-ai/wan', output: 'assets/video/' },
      { name: 'compose', tool: 'hyperframes', output: 'renders/' }
    ]
  },

  // HyperFrames composition template
  compositionTemplate: {
    id: 'contentos-composition',
    name: 'ContentOS Video',
    duration: 30,
    width: 1080,
    height: 1920,
    backgroundColor: '#0f172a',
    clips: []
  },

  // Create HyperFrames composition from script
  createComposition(script, options = {}) {
    const {
      brandName = 'ContentOS',
      primaryColor = '#06b6d4',
      fontFamily = 'Inter',
      captionStyle = 'word-highlight'
    } = options

    const composition = {
      ...this.compositionTemplate,
      name: `${brandName} - ${script.hook?.substring(0, 30) || 'Video'}`,
      duration: this.estimateDuration(script.fullScript),
      clips: this.buildClipsFromScript(script, options)
    }

    return composition
  },

  // Estimate video duration from script word count
  estimateDuration(text) {
    const words = text.split(/\s+/).length
    // Average speaking rate: 150 words per minute = 2.5 words per second
    return Math.ceil(words / 2.5) + 2 // +2 for intro/outro
  },

  // Build clips array from script
  buildClipsFromScript(script, options) {
    const clips = []
    let currentTime = 0
    const { primaryColor = '#06b6d4', fontFamily = 'Inter' } = options

    // Intro clip
    clips.push({
      id: 'intro',
      type: 'text',
      start: 0,
      duration: 2,
      track: 0,
      content: options.brandName || 'ContentOS',
      style: {
        fontSize: 72,
        fontWeight: 'bold',
        color: primaryColor,
        fontFamily,
        textAlign: 'center'
      }
    })
    currentTime = 2

    // Hook clip
    if (script.hook) {
      clips.push({
        id: 'hook',
        type: 'text',
        start: currentTime,
        duration: 3,
        track: 0,
        content: script.hook,
        style: {
          fontSize: 48,
          fontWeight: 'bold',
          color: '#ffffff',
          fontFamily,
          textAlign: 'center'
        }
      })
      currentTime += 3
    }

    // Body clips
    if (script.body && Array.isArray(script.body)) {
      script.body.forEach((point, index) => {
        clips.push({
          id: `body-${index}`,
          type: 'text',
          start: currentTime,
          duration: 4,
          track: 0,
          content: point,
          style: {
            fontSize: 42,
            fontWeight: '500',
            color: '#ffffff',
            fontFamily,
            textAlign: 'center'
          }
        })
        currentTime += 4
      })
    }

    // CTA clip
    if (script.cta) {
      clips.push({
        id: 'cta',
        type: 'text',
        start: currentTime,
        duration: 3,
        track: 0,
        content: script.cta,
        style: {
          fontSize: 48,
          fontWeight: 'bold',
          color: primaryColor,
          fontFamily,
          textAlign: 'center'
        }
      })
      currentTime += 3
    }

    return clips
  },

  // Export composition to HyperFrames HTML
  exportToHyperFrames(composition, outputPath) {
    const html = this.generateHyperFramesHTML(composition)
    
    // Ensure directory exists
    const dir = outputPath.substring(0, outputPath.lastIndexOf('/'))
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(outputPath, html)
    console.log(`✓ HyperFrames composition written to: ${outputPath}`)
    return { success: true, path: outputPath }
  },

  // Generate HyperFrames HTML
  generateHyperFramesHTML(comp) {
    const clipsHTML = comp.clips.map(clip => `
    <div class="clip" 
         data-start="${clip.start}" 
         data-duration="${clip.duration}" 
         data-track-index="0"
         data-composition-src="">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: ${clip.style.fontSize}px;
        font-weight: ${clip.style.fontWeight};
        color: ${clip.style.color};
        font-family: ${clip.style.fontFamily};
        text-align: ${clip.style.textAlign};
        padding: 20px;
        max-width: 90%;
      ">${clip.content}</div>
    </div>`).join('\n')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${comp.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.gsap.in Equation/hyperframes-core.js"></script>
</head>
<body class="bg-slate-950">
  <div id="composition" 
       class="composition" 
       data-id="${comp.id}" 
       data-duration="${comp.duration}"
       style="width: ${comp.width}px; height: ${comp.height}px; background: ${comp.backgroundColor};">
    ${clipsHTML}
  </div>
  <script>
    window.__timelines = window.__timelines || {}
    window.__timelines["${comp.id}"] = gsap.timeline({ paused: true })
  </script>
</body>
</html>`
  },

  // Run full pipeline
  async runPipeline(script, options) {
    console.log('🎬 Starting ContentOS → OpenMontage pipeline...')
    
    // Step 1: Generate composition
    const composition = this.createComposition(script, options)
    console.log(`✓ Composition created: ${composition.name} (${composition.duration}s)`)
    
    // Step 2: Export to HyperFrames
    const outputPath = options.outputPath || `compositions/${Date.now()}-index.html`
    this.exportToHyperFrames(composition, outputPath)
    
    // Step 3: Generate assets (if fal.ai configured)
    if (process.env.FAL_AI_API_KEY) {
      console.log('🎨 Generating AI visuals...')
      // Visual generation would happen here
    }
    
    return { composition, outputPath }
  }
}

// CLI command handling
const args = process.argv.slice(2)
const command = args[0]

if (command === 'create') {
  const script = JSON.parse(args[1] || '{}')
  const options = JSON.parse(args[2] || '{}')
  ContentOS.runPipeline(script, options)
} else if (command === 'help' || !command) {
  console.log(`
ContentOS + OpenMontage Integration

Usage:
  node openmontage-bridge.js create '<script-json>' '<options-json>'
  node openmontage-bridge.js help

Commands:
  create    Generate HyperFrames composition from script
  help      Show this help message

Example:
  node openmontage-bridge.js create '{"hook":"Stop making this mistake","body":["Point 1","Point 2"],"cta":"Follow for more"}' '{"brandName":"MyBrand"}'
`)
}

export default ContentOS