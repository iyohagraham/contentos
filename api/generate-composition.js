/**
 * Generate HyperFrames composition from script
 * Wraps the openmontage-bridge functionality for serverless use
 */

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { script, options = {} } = req.body

    if (!script) {
      return res.status(400).json({ error: 'Script is required' })
    }

    const composition = createComposition(script, options)
    const html = generateHyperFramesHTML(composition)

    return res.status(200).json({
      success: true,
      composition,
      html
    })
  } catch (error) {
    console.error('Composition generation error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function createComposition(script, options = {}) {
  const {
    brandName = 'ContentOS',
    primaryColor = '#06b6d4',
    fontFamily = 'Inter',
    captionStyle = 'word-highlight'
  } = options

  const composition = {
    id: `contentos-${Date.now()}`,
    name: `${brandName} - ${script.hook?.substring(0, 30) || 'Video'}`,
    duration: estimateDuration(script.fullScript),
    width: 1080,
    height: 1920,
    backgroundColor: '#0f172a',
    clips: buildClipsFromScript(script, options)
  }

  return composition
}

function estimateDuration(text) {
  const words = text.split(/\s+/).length
  return Math.ceil(words / 2.5) + 2
}

function buildClipsFromScript(script, options) {
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
}

function generateHyperFramesHTML(comp) {
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
  <script src="https://cdn.gsap.in/hyperframes-core.js"></script>
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
}
