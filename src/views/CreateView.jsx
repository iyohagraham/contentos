import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Target, Video, Instagram, Youtube,
  Facebook, TrendingUp, DollarSign, Settings, Plus, Calendar,
  BarChart3, Layers, Zap, Sparkles, Clock, ChevronRight, Star,
  Users, Eye, MousePointerClick, ShoppingCart, FileText,
  Globe, Upload, Check, X as XIcon, Menu, ArrowUpRight,
  Film, Mic, Palette, Send, Play, Hash, Clock as ClockIcon,
  BarChart2, Copy, Trash2, Edit3, Eye as EyeIcon, Download,
  Link as LinkIcon, Package, CreditCard, TrendingDown, Calendar as CalendarIcon,
  MessageSquare, ThumbsUp, Share2, Bookmark, MoreVertical, Filter, Search,
  Smartphone, Monitor, Tv, Hash as HashIcon, Brain, Lightbulb, Wand2,
  Database, HardDrive, RefreshCw, Bot, BookOpen, GraduationCap
} from 'lucide-react'
import { StatCard, QuickActionCard, PLATFORMS } from '../lib/ui'
import { postiz } from '../lib/postizClient.js'

function CreateView({ channels = [], createVideo }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [format, setFormat] = useState('vertical')
  const [script, setScript] = useState('')
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState(null)
  const [error, setError] = useState(null)
  const [visuals, setVisuals] = useState([])
  const [audio, setAudio] = useState(null)
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState({ script: 'pending', voice: 'pending', visuals: 'pending', captions: 'pending', render: 'pending' })
  const [publishTargets, setPublishTargets] = useState([])
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState(null)
  const [composition, setComposition] = useState(null)
  const [showCompositionPreview, setShowCompositionPreview] = useState(false)
  const [isGeneratingComposition, setIsGeneratingComposition] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Render the composition via a Blob URL rather than iframe srcDoc. Safari does
  // not reliably render large srcDoc documents (Bug #5); a blob: URL does, and
  // it also gives us an "open in new tab" fallback.
  useEffect(() => {
    if (!composition?.html) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(new Blob([composition.html], { type: 'text/html' }))
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [composition])

  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic first')
      return
    }
    
    setIsGenerating(true)
    setError(null)
    setPipelineStatus(prev => ({ ...prev, script: 'current' }))
    
    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          style: 'faceless',
          length: 'short'
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.details || err.error || 'Generation failed')
      }

      const data = await response.json()
      setGeneratedScript(data.script)
      setScript(data.script.fullScript)
      setCurrentStep(2)
      setPipelineStatus(prev => ({ ...prev, script: 'complete' }))

      // Save as draft video record
      if (createVideo) {
        await createVideo({
          workspace_id: 'default',
          title: topic,
          platform: 'tiktok',
          status: 'draft',
          views: 0,
          engagement: '0%',
          posted_at: null,
          script_content: data.script.fullScript,
          visuals_count: 0,
          has_audio: false
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to generate script. Make sure OPENAI_API_KEY is set.')
      setPipelineStatus(prev => ({ ...prev, script: 'error' }))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateVisuals = async () => {
    if (!generatedScript) {
      setError('Please generate a script first')
      return
    }

    setIsGeneratingVisuals(true)
    setPipelineStatus(prev => ({ ...prev, visuals: 'current' }))
    
    try {
      // Generate visual prompts for each body point
      const visualPrompts = generatedScript.body.map((point, i) => ({
        id: i,
        text: point,
        visualPrompt: `Professional business infographic showing: ${point}. Modern flat design, clean layout, corporate colors, minimalist style`
      }))

      // Simulate visual generation (in production, this would call fal.ai)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const generatedVisuals = visualPrompts.map(v => ({
        ...v,
        imageUrl: `https://via.placeholder.com/1080x1920/1e293b/06b6d4?text=Scene+${v.id + 1}`,
        status: 'complete'
      }))

      setVisuals(generatedVisuals)
      setCurrentStep(3)
      setPipelineStatus(prev => ({ ...prev, visuals: 'complete' }))
    } catch (err) {
      setError('Failed to generate visuals: ' + err.message)
      setPipelineStatus(prev => ({ ...prev, visuals: 'error' }))
    } finally {
      setIsGeneratingVisuals(false)
    }
  }

  const handleGenerateAudio = async () => {
    if (!script) {
      setError('Please enter or generate a script first')
      return
    }

    setIsGeneratingAudio(true)
    setPipelineStatus(prev => ({ ...prev, voice: 'current' }))
    
    try {
      // Simulate TTS generation (in production, this would call fal.ai Kokoro)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const audioData = {
        audioUrl: 'https://example.com/audio.mp3',
        duration: Math.ceil(script.split(' ').length / 2.5), // ~2.5 words per second
        status: 'complete'
      }

      setAudio(audioData)
      setPipelineStatus(prev => ({ ...prev, voice: 'complete' }))
    } catch (err) {
      setError('Failed to generate audio: ' + err.message)
      setPipelineStatus(prev => ({ ...prev, voice: 'error' }))
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const handleRenderVideo = async () => {
    setPipelineStatus(prev => ({ ...prev, captions: 'current', render: 'current' }))
    
    try {
      // Simulate rendering process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setPipelineStatus(prev => ({ ...prev, captions: 'complete', render: 'complete' }))
      setCurrentStep(5)
    } catch (err) {
      setError('Failed to render video: ' + err.message)
      setPipelineStatus(prev => ({ ...prev, captions: 'error', render: 'error' }))
    }
  }

  const handleGenerateComposition = async () => {
    if (!generatedScript) {
      setError('Please generate a script first')
      return
    }

    setIsGeneratingComposition(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-composition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: generatedScript,
          options: {
            brandName: 'ContentOS',
            primaryColor: '#06b6d4',
            fontFamily: 'Inter'
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate composition')
      }

      const data = await response.json()
      setComposition(data)
      setShowCompositionPreview(true)
    } catch (err) {
      setError('Failed to generate composition: ' + err.message)
    } finally {
      setIsGeneratingComposition(false)
    }
  }

  const handleDownloadComposition = () => {
    if (!composition) return

    const blob = new Blob([composition.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${composition.composition.name.replace(/[^a-z0-9]/gi, '_')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const togglePublishTarget = (channelId) => {
    setPublishTargets(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    )
  }

  const handlePublishNow = async () => {
    if (publishTargets.length === 0) {
      setError('Select at least one channel to publish to')
      return
    }

    setIsPublishing(true)
    setPublishResult(null)
    setError(null)

    try {
      // Post to each selected channel via Postiz
      const results = []
      for (const channelId of publishTargets) {
        try {
          const result = await postiz.post({
            channelIds: [channelId],
            content: generatedScript?.fullScript || script || topic,
            mediaUrls: visuals.map(v => v.imageUrl).filter(Boolean),
            scheduledTime: null
          })
          results.push({ channelId, success: true, ...result })
        } catch (err) {
          results.push({ channelId, success: false, error: err.message })
        }
      }

      // Save video record to DB. Use the field names the display/calendar layer
      // reads: published_at (date) and target_platforms (array).
      if (createVideo) {
        await createVideo({
          workspace_id: 'default',
          title: topic || generatedScript?.hook || 'Untitled Video',
          target_platforms: publishTargets.map(id => channels.find(c => c.id === id)?.platform).filter(Boolean),
          status: 'published',
          views: 0,
          engagement: '0%',
          published_at: new Date().toISOString(),
          script_content: script,
          visuals_count: visuals.length,
          has_audio: !!audio
        })
      }

      const successCount = results.filter(r => r.success).length
      setPublishResult({
        success: successCount > 0,
        message: `Published to ${successCount}/${publishTargets.length} channel(s)`,
        results
      })
      setPipelineStatus(prev => ({ ...prev, publish: 'complete' }))
    } catch (err) {
      setError('Publish failed: ' + err.message)
      setPublishResult({ success: false, message: err.message })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSchedulePost = async () => {
    if (publishTargets.length === 0) {
      setError('Select at least one channel to schedule for')
      return
    }
    if (!scheduleDate || !scheduleTime) {
      setError('Please select a date and time to schedule')
      return
    }

    setIsPublishing(true)
    setPublishResult(null)
    setError(null)

    try {
      const scheduledTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      const results = []
      
      for (const channelId of publishTargets) {
        try {
          const result = await postiz.post({
            channelIds: [channelId],
            content: generatedScript?.fullScript || script || topic,
            mediaUrls: visuals.map(v => v.imageUrl).filter(Boolean),
            scheduledTime
          })
          results.push({ channelId, success: true, scheduledTime, ...result })
        } catch (err) {
          results.push({ channelId, success: false, error: err.message })
        }
      }

      // Save video record to DB with scheduled status. scheduled_time is the
      // field the calendar buckets by.
      if (createVideo) {
        await createVideo({
          workspace_id: 'default',
          title: topic || generatedScript?.hook || 'Untitled Video',
          target_platforms: publishTargets.map(id => channels.find(c => c.id === id)?.platform).filter(Boolean),
          status: 'scheduled',
          views: 0,
          engagement: '0%',
          scheduled_time: scheduledTime,
          script_content: script,
          visuals_count: visuals.length,
          has_audio: !!audio
        })
      }

      const successCount = results.filter(r => r.success).length
      setPublishResult({
        success: successCount > 0,
        message: `Scheduled for ${new Date(scheduledTime).toLocaleString()} on ${successCount} channel(s)`,
        results
      })
    } catch (err) {
      setError('Schedule failed: ' + err.message)
      setPublishResult({ success: false, message: err.message })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        {[{ n: 1, l: 'Script', ic: FileText }, { n: 2, l: 'Voice', ic: Mic }, { n: 3, l: 'Visuals', ic: Film }, { n: 4, l: 'Design', ic: Palette }, { n: 5, l: 'Publish', ic: Send }].map((s, i, a) => (
          <React.Fragment key={s.n}>
            <button onClick={() => setCurrentStep(s.n)} className={`flex items-center gap-2 flex-shrink-0 ${currentStep >= s.n ? 'text-cyan-400' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= s.n ? 'bg-cyan-500 text-white' : 'bg-slate-800'}`}>
                {currentStep > s.n ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <s.ic className="w-4 h-4" /><span className="text-sm font-medium hidden lg:inline">{s.l}</span>
            </button>
            {i < a.length - 1 && <div className={`w-8 h-0.5 flex-shrink-0 ${currentStep > s.n ? 'bg-cyan-500' : 'bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Film className="w-5 h-5 text-cyan-500" />Video Configuration</h2>
          <div>
            <label className="block text-sm font-semibold mb-2">Video Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ k: 'vertical', icon: '📱', label: '9:16 Vertical' }, { k: 'landscape', icon: '🖥️', label: '16:9 Landscape' }, { k: 'square', icon: '📐', label: '1:1 Square' }].map(f => (
                <button key={f.k} onClick={() => setFormat(f.k)} className={`p-3 rounded-lg text-center transition-colors ${format === f.k ? 'bg-cyan-500/20 border border-cyan-500' : 'bg-slate-950 border border-slate-800 hover:border-slate-600'}`}>
                  <div className="text-2xl mb-1">{f.icon}</div><p className="text-xs">{f.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Content Style</label>
            <select className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500">
              <option>Text-on-Screen (Faceless)</option><option>Stock Footage + Voiceover</option><option>AI-Generated Visuals</option><option>Screen Recording</option><option>Whiteboard Animation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Topic / Hook</label>
            <input 
              type="text" 
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" 
              placeholder="e.g., The tax mistake 90% of freelancers make" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Script</label>
            <textarea 
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full h-40 focus:outline-none focus:border-cyan-500 resize-none" 
              placeholder="Enter script or click 'Generate with AI'..." 
              value={script} 
              onChange={(e) => setScript(e.target.value)} 
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <button 
            onClick={handleGenerateScript} 
            disabled={isGenerating}
            className={`bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />Generate Script with AI
              </>
            )}
          </button>
          {generatedScript && (
            <div className="bg-slate-950 rounded-lg p-4 border border-cyan-500/30">
              <h4 className="font-semibold text-cyan-400 mb-2">✨ Generated Script</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Hook:</span>
                  <p className="ml-2">{generatedScript.hook}</p>
                </div>
                <div>
                  <span className="text-slate-400">Body:</span>
                  <ul className="ml-2 list-disc">
                    {generatedScript.body.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-slate-400">CTA:</span>
                  <p className="ml-2">{generatedScript.cta}</p>
                </div>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>⏱️ {generatedScript.estimatedDuration}</span>
                </div>
              </div>
              <button
                onClick={handleGenerateVisuals}
                disabled={isGeneratingVisuals}
                className={`mt-4 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors ${isGeneratingVisuals ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGeneratingVisuals ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Visuals...
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />Generate Visuals
                  </>
                )}
              </button>
              <button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio}
                className={`mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors ${isGeneratingAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGeneratingAudio ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Audio...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />Generate Voiceover
                  </>
                )}
              </button>
              {visuals.length > 0 && audio && (
                <button
                  onClick={handleRenderVideo}
                  className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors"
                >
                  <Film className="w-4 h-4" />Render Video
                </button>
              )}
              {generatedScript && (
                <button
                  onClick={handleGenerateComposition}
                  disabled={isGeneratingComposition}
                  className={`mt-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold w-full flex items-center justify-center gap-2 transition-colors ${isGeneratingComposition ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGeneratingComposition ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating Composition...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />Export HyperFrames Composition
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5 text-cyan-500" />Brand Design System</h2>
          <div>
            <label className="block text-sm font-semibold mb-2">Brand Name</label>
            <input type="text" className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500" placeholder="Your brand name" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Primary Color</label>
            <div className="flex flex-wrap gap-2">
              {['bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-pink-500', 'bg-blue-500', 'bg-emerald-500'].map((c, i) => (
                <div key={i} className={`w-10 h-10 rounded-lg ${c} cursor-pointer border-2 border-transparent hover:border-white hover:scale-110 transition-all`} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Typography</label>
            <select className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500">
              <option>Inter (Modern Sans)</option><option>Impact (Bold)</option><option>Playfair Display (Serif)</option><option>JetBrains Mono (Monospace)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Caption Style</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ n: 'Word Highlight', d: 'Karaoke style' }, { n: 'Full Subtitles', d: 'Complete lines' }, { n: 'Minimal', d: 'Bottom third' }, { n: 'Animated', d: 'Pop-in effects' }].map((s, i) => (
                <button key={i} className={`p-3 rounded-lg text-left transition-colors ${i === 0 ? 'bg-slate-950 border border-cyan-500' : 'bg-slate-950 border border-slate-800 hover:border-slate-600'}`}>
                  <p className="font-medium text-sm">{s.n}</p><p className="text-xs text-slate-400">{s.d}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <p className="text-sm font-semibold mb-2">Preview</p>
            <div className={`rounded-lg bg-slate-800 flex items-center justify-center ${format === 'vertical' ? 'aspect-[9/16]' : format === 'landscape' ? 'aspect-video' : 'aspect-square'}`}>
              <p className="text-slate-500 text-sm">Video preview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Panel - Step 5 */}
      {currentStep === 5 && pipelineStatus.render === 'complete' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Send className="w-5 h-5 text-cyan-500" />
            Publish to Channels
          </h2>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Select Channels</label>
            {channels.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-center">
                <p className="text-slate-400 text-sm">No channels connected</p>
                <p className="text-slate-500 text-xs mt-1">Add channels in the Channels view first</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {channels.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => togglePublishTarget(ch.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      publishTargets.includes(ch.id)
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${PLATFORMS[ch.platform]?.bg || 'bg-slate-700'}`}>
                        {PLATFORMS[ch.platform]?.icon || '🌐'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{ch.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{ch.platform}</p>
                      </div>
                      {publishTargets.includes(ch.id) && (
                        <Check className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Schedule Date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Schedule Time</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Publish Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePublishNow}
              disabled={isPublishing || publishTargets.length === 0}
              className={`flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                (isPublishing || publishTargets.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post Now
                </>
              )}
            </button>
            <button
              onClick={handleSchedulePost}
              disabled={isPublishing || publishTargets.length === 0 || !scheduleDate || !scheduleTime}
              className={`flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                (isPublishing || publishTargets.length === 0 || !scheduleDate || !scheduleTime) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
          </div>

          {/* Publish Result */}
          {publishResult && (
            <div className={`p-4 rounded-lg border ${
              publishResult.success
                ? 'border-green-500 bg-green-500/10'
                : 'border-red-500 bg-red-500/10'
            }`}>
              <div className="flex items-start gap-3">
                {publishResult.success ? (
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${publishResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {publishResult.message}
                  </p>
                  {publishResult.results && (
                    <div className="mt-2 space-y-1">
                      {publishResult.results.map((r, i) => (
                        <p key={i} className="text-xs text-slate-400">
                          {r.success ? '✓' : '✗'} Channel {r.channelId}: {r.success ? 'Success' : r.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4"><Zap className="w-5 h-5 text-cyan-500 inline mr-2" />Production Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { n: 1, t: 'Script', key: 'script' },
            { n: 2, t: 'Voiceover', key: 'voice' },
            { n: 3, t: 'Visuals', key: 'visuals' },
            { n: 4, t: 'Captions', key: 'captions' },
            { n: 5, t: 'Render', key: 'render' }
          ].map(step => {
            const status = pipelineStatus[step.key]
            return (
              <div key={step.n} className={`p-4 rounded-lg border ${status === 'complete' ? 'border-green-500 bg-green-500/5' : status === 'current' ? 'border-cyan-500 bg-cyan-500/5' : status === 'error' ? 'border-red-500 bg-red-500/5' : 'border-slate-800 bg-slate-950'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${status === 'complete' ? 'bg-green-500' : status === 'current' ? 'bg-cyan-500' : status === 'error' ? 'bg-red-500' : 'bg-slate-700'}`}>
                  {status === 'complete' ? <Check className="w-4 h-4" /> : status === 'current' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : step.n}
                </div>
                <p className="font-semibold">{step.t}</p>
                <p className="text-xs text-slate-400 capitalize">{status}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Composition Preview Modal */}
      {showCompositionPreview && composition && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-500" />
                HyperFrames Composition Preview
              </h2>
              <button onClick={() => setShowCompositionPreview(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Preview iframe */}
              <div>
                <p className="text-sm font-semibold mb-2 text-slate-400">Live Preview</p>
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                  <iframe
                    src={previewUrl || undefined}
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-[500px] border-0"
                    title="Composition Preview"
                  />
                </div>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <ArrowUpRight className="w-3 h-3" />Open preview in new tab
                  </a>
                )}
              </div>
              
              {/* Composition details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2 text-slate-400">Composition Info</p>
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Name:</span>
                      <span className="font-medium">{composition.composition.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-medium">{composition.duration}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Resolution:</span>
                      <span className="font-medium">{composition.composition.width}×{composition.composition.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Clips:</span>
                      <span className="font-medium">{composition.composition.clips.length}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-semibold mb-2 text-slate-400">Timeline</p>
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 space-y-2 max-h-[300px] overflow-auto">
                    {composition.composition.clips.map((clip, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-20 text-slate-500 font-mono text-xs">
                          {clip.start}s - {clip.start + clip.duration}s
                        </div>
                        <div className="flex-1 bg-slate-800 rounded px-2 py-1 truncate">
                          {clip.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadComposition}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download HTML
                  </button>
                  <button
                    onClick={() => setShowCompositionPreview(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── CONTENT ─── */

export default CreateView
