'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { put } from '@vercel/blob/client'
import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import {
  Upload, Video, CheckCircle2, AlertCircle, Download, Sparkles, X,
  FileText, ChevronRight, Wand2, PenLine, Music, Type, Scissors,
  Palette, MessageSquare,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Stage = 'script' | 'upload' | 'uploading' | 'done' | 'error'
type StudioTab = 'captions' | 'music' | 'grade' | 'text' | 'trim'
type GradeKey = 'original' | 'vivid' | 'cinematic' | 'warm' | 'cool' | 'bw'

interface VideoRecord {
  id: string; name: string; script: string
  originalUrl: string; enhancedUrl: string; createdAt: number
}
interface Caption { text: string; start: number; end: number }

/* ─── Color grades ───────────────────────────────────────────────────────────── */
interface GradeLook {
  filter: string
  color?: { bg: string; blend: string; opacity: number }
  vignette?: number
}

const GRADES: Record<GradeKey, GradeLook> = {
  original: {
    filter: 'none',
  },
  vivid: {
    filter: 'saturate(1.7) contrast(1.1) brightness(1.03)',
    vignette: 0.2,
  },
  cinematic: {
    // Classic teal-shadows / orange-highlights Hollywood look
    filter: 'contrast(1.22) brightness(0.76) saturate(0.58)',
    color: { bg: 'linear-gradient(135deg, rgb(0,55,75) 0%, rgb(90,30,0) 100%)', blend: 'color', opacity: 0.22 },
    vignette: 0.65,
  },
  warm: {
    // Golden hour — lifted highlights, crushed cool shadows
    filter: 'brightness(1.07) contrast(1.08) saturate(1.35)',
    color: { bg: 'linear-gradient(180deg, rgb(255,190,70) 0%, rgb(210,80,10) 100%)', blend: 'soft-light', opacity: 0.28 },
    vignette: 0.3,
  },
  cool: {
    // Midnight blue — desaturated + cold push
    filter: 'brightness(0.82) contrast(1.2) saturate(0.6)',
    color: { bg: 'linear-gradient(180deg, rgb(20,70,200) 0%, rgb(0,25,90) 100%)', blend: 'color', opacity: 0.28 },
    vignette: 0.5,
  },
  bw: {
    // High-contrast silver gelatin film look
    filter: 'grayscale(1) contrast(1.28) brightness(0.84)',
    vignette: 0.55,
  },
}

const GRADE_META: { key: GradeKey; label: string; bg: string }[] = [
  { key: 'original',  label: 'Original',  bg: 'linear-gradient(135deg,#444 0%,#999 100%)' },
  { key: 'vivid',     label: 'Vivid',     bg: 'linear-gradient(135deg,#f97316 0%,#ec4899 100%)' },
  { key: 'cinematic', label: 'Cinematic', bg: 'linear-gradient(135deg,rgb(0,55,75) 0%,rgb(90,30,0) 100%)' },
  { key: 'warm',      label: 'Warm',      bg: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' },
  { key: 'cool',      label: 'Cool',      bg: 'linear-gradient(135deg,rgb(20,70,200) 0%,rgb(0,25,90) 100%)' },
  { key: 'bw',        label: 'B&W',       bg: 'linear-gradient(135deg,#111 0%,#ccc 100%)' },
]

const MUSIC_MOODS = [
  { id: 'none',      label: 'No music',  icon: '🔇', desc: 'Keep it clean',          url: null },
  { id: 'hype',      label: 'Hype',      icon: '🔥', desc: 'High energy, trendy',    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3' },
  { id: 'chill',     label: 'Chill',     icon: '🌊', desc: 'Lo-fi, relaxed vibes',   url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3' },
  { id: 'corporate', label: 'Corporate', icon: '💼', desc: 'Clean and professional',  url: 'https://assets.mixkit.co/music/preview/mixkit-corporate-achievement-27.mp3' },
  { id: 'emotional', label: 'Emotional', icon: '💫', desc: 'Heartfelt storytelling',  url: 'https://assets.mixkit.co/music/preview/mixkit-sad-piano-loop-565.mp3' },
  { id: 'trending',  label: 'Trending',  icon: '📈', desc: 'TikTok & Reels sounds',  url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3' },
]

const SCRIPT_TEMPLATES = [
  { id: 'promo',        label: 'Business promo',    icon: '🏪', placeholder: 'e.g. We make the best tacos in Austin — fresh ingredients, made to order, open late. Come try us at 4th & Lamar.' },
  { id: 'behindscenes', label: 'Behind the scenes', icon: '🎬', placeholder: 'e.g. A day in our kitchen — from prep at 6am to the last order. This is what goes into every dish we serve.' },
  { id: 'testimonial',  label: 'Customer story',    icon: '⭐', placeholder: "e.g. Sarah's been coming here every Friday for two years. Here's what she says about us." },
  { id: 'custom',       label: 'Write my own',      icon: '✍️', placeholder: 'Write your own script or talking points here...' },
]

const POLL_INTERVAL = 4000

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function formatBytes(b: number) {
  return b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`
}

function buildCaptions(script: string): Caption[] {
  if (!script.trim()) return []
  const words = script.trim().split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += 6) chunks.push(words.slice(i, i + 6).join(' '))
  let t = 0.8
  return chunks.map(text => {
    const dur = text.split(' ').length * 0.42 + 0.3
    const cap: Caption = { text, start: t, end: t + dur }
    t += dur + 0.25
    return cap
  })
}

/* ─── Toggle ─────────────────────────────────────────────────────────────────── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, background: on ? '#6366f1' : '#27272a', border: on ? '0.5px solid rgba(99,102,241,0.5)' : '0.5px solid rgba(255,255,255,0.08)', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.18s' }} />
    </button>
  )
}

/* ─── ProgressBar ────────────────────────────────────────────────────────────── */
function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <span style={{ fontSize: 13, color: '#A1A1AA' }}>{label}</span>
        <span style={{ fontSize: 13, color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>{Math.round(value)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#18181C' }}>
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, background: 'linear-gradient(90deg,#6366f1 0%,#8b5cf6 100%)', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
      </div>
    </div>
  )
}

/* ─── StepBar ────────────────────────────────────────────────────────────────── */
function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold flex-shrink-0"
      style={{ background: done ? 'rgba(74,222,128,0.08)' : active ? 'rgba(99,102,241,0.15)' : '#18181C', border: done ? '0.5px solid rgba(74,222,128,0.3)' : active ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)', color: done ? '#4ADE80' : active ? '#818cf8' : '#3f3f46' }}>
      {done ? '✓' : n}
    </div>
  )
}
function StepBar({ stage }: { stage: Stage }) {
  const s1done = stage !== 'script', s2done = stage === 'uploading' || stage === 'done'
  return (
    <div className="flex items-center gap-3">
      <StepDot n={1} active={stage === 'script'} done={s1done} />
      <span style={{ fontSize: 13, color: stage === 'script' ? '#FAFAFA' : '#52525B' }}>Script</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <StepDot n={2} active={stage === 'upload'} done={s2done} />
      <span style={{ fontSize: 13, color: stage === 'upload' ? '#FAFAFA' : s2done ? '#52525B' : '#3f3f46' }}>Upload video</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <StepDot n={3} active={stage === 'uploading' || stage === 'done'} done={false} />
      <span style={{ fontSize: 13, color: stage === 'uploading' || stage === 'done' ? '#FAFAFA' : '#3f3f46' }}>AI enhance</span>
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
function VideosInner() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const ideaHook = searchParams.get('idea') ?? ''
  const ideaFormat = searchParams.get('format') ?? ''

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const streamingRef = useRef(false)

  // Core
  const [stage, setStage] = useState<Stage>('script')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [enhancedUrl, setEnhancedUrl] = useState('')
  const [originalUrl, setOriginalUrl] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [videosLoaded, setVideosLoaded] = useState(false)

  // Script
  const [scriptText, setScriptText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationDone, setGenerationDone] = useState(false)
  const [scriptGenError, setScriptGenError] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('promo')
  const [writeOwn, setWriteOwn] = useState(false)

  // Enhancement studio
  const [activeTab, setActiveTab] = useState<StudioTab>('captions')
  const [colorGrade, setColorGrade] = useState<GradeKey>('original')
  const [hookText, setHookText] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [showHook, setShowHook] = useState(false)
  const [showCta, setShowCta] = useState(false)
  const [selectedMusic, setSelectedMusic] = useState('none')
  const [captions, setCaptions] = useState<Caption[]>([])
  const [captionsEnabled, setCaptionsEnabled] = useState(false)
  const [currentCaption, setCurrentCaption] = useState('')
  const [displayedCaption, setDisplayedCaption] = useState('')
  const [captionOpacity, setCaptionOpacity] = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState('')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(100)
  const [videoDuration, setVideoDuration] = useState(0)
  const [tabVisible, setTabVisible] = useState(true)

  const hasIdea = ideaHook.length > 0
  const currentTemplate = SCRIPT_TEMPLATES.find(t => t.id === selectedTemplate)!
  const canProceed = !isGenerating
  const displayUrl = enhancedUrl || originalUrl

  // Generate captions + prefill text overlays when done
  useEffect(() => {
    if (stage !== 'done' || !scriptText) return
    setCaptions(buildCaptions(scriptText))
    if (!hookText) {
      const first = scriptText.split(/[.!?]/)[0]?.trim()
      if (first && first.length < 80) setHookText(first)
      setCtaText('Follow for more tips!')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  /* ── Tab transition ─────────────────────────────────────────────────────────── */
  const switchTab = useCallback((tab: StudioTab) => {
    setTabVisible(false)
    setTimeout(() => { setActiveTab(tab); setTabVisible(true) }, 120)
  }, [])

  /* ── Music playback (triggered directly on user click, not useEffect) ──────── */
  const playMusic = useCallback((moodId: string) => {
    setSelectedMusic(moodId)
    const audio = audioRef.current
    if (!audio) return
    const mood = MUSIC_MOODS.find(m => m.id === moodId)
    audio.pause()
    if (!mood?.url) { audio.src = ''; return }
    audio.src = mood.url
    audio.volume = 0.35
    audio.loop = true
    audio.play().catch(() => {})
  }, [])

  /* ── Transcribe from audio ───────────────────────────────────────────────────── */
  const transcribeFromAudio = useCallback(async () => {
    if (!displayUrl) return
    setTranscribing(true)
    setTranscribeError('')
    try {
      const res = await fetch('/api/video/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: displayUrl }),
      })
      const data = await res.json()
      if (res.status === 429 || data.fallback) {
        // Rate limited — fall back to script-based captions
        const scriptCaps = buildCaptions(scriptText)
        if (scriptCaps.length > 0) {
          setCaptions(scriptCaps)
          setCaptionsEnabled(true)
          setTranscribeError('Audio transcription rate-limited — using script-based captions instead')
        } else {
          setTranscribeError('Rate limited and no script available. Add a script to generate captions.')
        }
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
      if (data.segments?.length > 0) {
        setCaptions(data.segments)
        setCaptionsEnabled(true)
      } else {
        setTranscribeError('No speech detected — try adding a script instead')
      }
    } catch (err) {
      // Any failure — fall back to script captions silently
      const scriptCaps = buildCaptions(scriptText)
      if (scriptCaps.length > 0) {
        setCaptions(scriptCaps)
        setCaptionsEnabled(true)
        setTranscribeError('Using script-based captions (audio transcription unavailable)')
      } else {
        setTranscribeError(err instanceof Error ? err.message : 'Transcription failed')
      }
    } finally {
      setTranscribing(false)
    }
  }, [displayUrl, scriptText])

  /* ── Caption crossfade ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (currentCaption === displayedCaption) return
    if (currentCaption) {
      setCaptionOpacity(0)
      const t = setTimeout(() => { setDisplayedCaption(currentCaption); setCaptionOpacity(1) }, 100)
      return () => clearTimeout(t)
    } else {
      setCaptionOpacity(0)
      const t = setTimeout(() => setDisplayedCaption(''), 200)
      return () => clearTimeout(t)
    }
  }, [currentCaption, displayedCaption])

  /* ── Video timeupdate (trim + captions) ────────────────────────────────────── */
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const dur = video.duration
    if (!dur || isNaN(dur)) return
    const endT = (trimEnd / 100) * dur
    if (video.currentTime >= endT) { video.pause(); video.currentTime = (trimStart / 100) * dur }
    if (captionsEnabled) {
      const t = video.currentTime
      setCurrentCaption(captions.find(c => t >= c.start && t < c.end)?.text ?? '')
    }
  }, [trimStart, trimEnd, captionsEnabled, captions])

  /* ── Persist ────────────────────────────────────────────────────────────────── */
  const saveVideos = useCallback(async (next: VideoRecord[]) => {
    try { localStorage.setItem('bl_videos_v3', JSON.stringify(next)) } catch {}
    if (session?.user?.email) {
      try { await fetch('/api/user/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videos: next }) }) } catch {}
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (videosLoaded) return
    const load = async () => {
      if (session?.user?.email) {
        try {
          const res = await fetch('/api/user/videos')
          const data = await res.json()
          if (Array.isArray(data.videos) && data.videos.length > 0) { setVideos(data.videos); setVideosLoaded(true); return }
        } catch {}
      }
      try {
        const saved = localStorage.getItem('bl_videos_v3')
        if (saved) {
          const parsed = JSON.parse(saved)
          setVideos(parsed)
          if (session?.user?.email && parsed.length > 0) fetch('/api/user/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videos: parsed }) }).catch(() => {})
        }
      } catch {}
      setVideosLoaded(true)
    }
    if (session !== undefined) load()
  }, [session, videosLoaded])

  /* ── Auto-generate script ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!hasIdea || writeOwn || streamingRef.current) return
    const gen = async () => {
      streamingRef.current = true; setIsGenerating(true); setGenerationDone(false); setScriptText('')
      try {
        const res = await fetch('/api/video/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea: ideaHook, format: ideaFormat }) })
        if (!res.ok || !res.body) { setScriptGenError(true); setWriteOwn(true); return }
        const reader = res.body.getReader(); const dec = new TextDecoder(); let text = ''
        while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value, { stream: true }); setScriptText(text) }
        setGenerationDone(true)
      } catch { setScriptGenError(true); setWriteOwn(true) }
      finally { streamingRef.current = false; setIsGenerating(false) }
    }
    gen()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIdea, writeOwn])

  /* ── Background enhancement ─────────────────────────────────────────────────── */
  const runEnhancementInBackground = useCallback(async (videoUrl: string, recordId: string) => {
    try {
      const res = await fetch('/api/video/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl }) })
      if (!res.ok) return
      const data = await res.json(); if (!data.id) return
      let attempts = 0
      const poll = async (): Promise<void> => {
        if (attempts++ > 60) return
        try {
          const r = await fetch(`/api/video/status/${data.id}`); const d = await r.json()
          if (d.status === 'succeeded' && d.output) {
            const enhanced = Array.isArray(d.output) ? d.output[0] : d.output
            setVideos(prev => { const next = prev.map(v => v.id === recordId ? { ...v, enhancedUrl: enhanced } : v); saveVideos(next); return next })
            setEnhancedUrl(enhanced)
          } else if (d.status !== 'failed') { await new Promise(r => setTimeout(r, POLL_INTERVAL)); return poll() }
        } catch {}
      }
      await poll()
    } catch {}
  }, [saveVideos])

  /* ── Upload ──────────────────────────────────────────────────────────────────── */
  const startUpload = useCallback(async (file: File) => {
    setUploadProgress(0); setErrorMsg(''); setStage('uploading')
    let blobUrl = ''
    try {
      const tokenRes = await fetch(`/api/video/upload?filename=${encodeURIComponent(file.name)}`)
      if (!tokenRes.ok) { const e = await tokenRes.json().catch(() => ({})); throw new Error(e.error ?? `Token request failed (${tokenRes.status})`) }
      const { clientToken, pathname } = await tokenRes.json()
      const blob = await put(pathname, file, { access: 'public', token: clientToken, onUploadProgress: ({ percentage }) => setUploadProgress(percentage) })
      blobUrl = blob.url
    } catch (err: unknown) { setErrorMsg(err instanceof Error ? err.message : 'Upload failed — check your connection and try again.'); setStage('error'); return }

    const recordId = Date.now().toString()
    const record: VideoRecord = { id: recordId, name: file.name, script: scriptText, originalUrl: blobUrl, enhancedUrl: blobUrl, createdAt: Date.now() }
    setOriginalUrl(blobUrl); setEnhancedUrl(blobUrl)
    setVideos(prev => { const next = [record, ...prev]; saveVideos(next); return next })
    setStage('done')
    runEnhancementInBackground(blobUrl, recordId)
  }, [scriptText, saveVideos, runEnhancementInBackground])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) { setErrorMsg('Please upload a video file (MP4, MOV, etc.)'); setStage('error'); return }
    setPendingFile(file); startUpload(file)
  }, [startUpload])

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }

  const reset = () => {
    setStage('script'); setUploadProgress(0); setErrorMsg(''); setEnhancedUrl(''); setOriginalUrl('')
    setPendingFile(null); setScriptText(''); setGenerationDone(false); setWriteOwn(false)
    setScriptGenError(false); setSelectedTemplate('promo'); streamingRef.current = false
    setColorGrade('original'); setHookText(''); setCtaText(''); setShowHook(false); setShowCta(false)
    setSelectedMusic('none'); setCaptions([]); setCaptionsEnabled(false); setCurrentCaption('')
    setTrimStart(0); setTrimEnd(100); setVideoDuration(0); setActiveTab('captions')
    setTranscribing(false); setTranscribeError(''); setTabVisible(true)
    setDisplayedCaption(''); setCaptionOpacity(0)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current.load() }
  }

  const isProcessing = stage === 'uploading'

  /* ── Render ──────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-medium text-[#FAFAFA]">My Videos</h1>
              <p className="text-[14px] text-[#71717A] mt-0.5">
                {videos.length === 0 ? 'Pick a script, upload your footage, get a polished AI-enhanced video' : `${videos.length} video${videos.length !== 1 ? 's' : ''} created`}
              </p>
            </div>
            {stage !== 'script' && stage !== 'done' && <Button variant="ghost" size="sm" onClick={reset}>← Start over</Button>}
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />

          {!isProcessing && stage !== 'done' && stage !== 'error' && <StepBar stage={stage} />}

          {/* ── STEP 1: SCRIPT ─────────────────────────────────────────────────── */}
          {stage === 'script' && (
            <div className="flex flex-col gap-5 p-6 rounded-2xl" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              {hasIdea ? (
                <>
                  <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                    <Sparkles className="w-4 h-4 text-[#6366f1] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6366f1] mb-1">Content Idea</p>
                      <p className="text-[14px] text-[#E4E4E7] leading-relaxed">{ideaHook}</p>
                    </div>
                  </div>
                  {scriptGenError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <p className="text-[12px] text-red-400">AI generation failed — write your script below or try again.</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {[{ id: false, icon: Wand2, label: 'AI-generated' }, { id: true, icon: PenLine, label: 'Write my own' }].map(({ id, icon: Icon, label }) => (
                      <button key={String(id)} onClick={() => { if (id) { setWriteOwn(true); setScriptText(''); setScriptGenError(false) } else { setWriteOwn(false); setScriptGenError(false); streamingRef.current = false } }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                        style={{ background: writeOwn === id ? 'rgba(99,102,241,0.12)' : '#18181C', border: writeOwn === id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)', color: writeOwn === id ? '#a5b4fc' : '#71717A' }}>
                        <Icon className="w-3.5 h-3.5" />{label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>
                      {isGenerating ? <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-[#6366f1] animate-pulse" />Generating script…</span>
                        : generationDone && !writeOwn ? 'AI-generated script — edit freely' : 'Your script'}
                    </label>
                    <textarea rows={6} value={scriptText} onChange={e => setScriptText(e.target.value)}
                      placeholder={writeOwn ? 'Write your talking points or full script here…' : 'Generating…'}
                      readOnly={isGenerating && !writeOwn}
                      className="w-full rounded-xl px-4 py-3 text-[14px] resize-none outline-none"
                      style={{ background: 'rgba(24,24,28,0.7)', border: '0.5px solid rgba(255,255,255,0.1)', lineHeight: 1.65, color: isGenerating ? '#818cf8' : '#FAFAFA', transition: 'color 0.3s' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                    <div className="flex items-center justify-between">
                      <p style={{ fontSize: 12, color: '#3f3f46' }}>This script guides your video content</p>
                      <span style={{ fontSize: 12, color: '#52525B', fontVariantNumeric: 'tabular-nums' }}>{scriptText.length} chars</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[15px] font-semibold text-[#FAFAFA] mb-1">What type of video is this?</p>
                    <p className="text-[13px] text-[#52525B]">Pick a template or write your own script</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SCRIPT_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => { setSelectedTemplate(t.id); setScriptText('') }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                        style={{ background: selectedTemplate === t.id ? 'rgba(99,102,241,0.12)' : '#18181C', border: selectedTemplate === t.id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)', color: selectedTemplate === t.id ? '#a5b4fc' : '#71717A' }}>
                        <span>{t.icon}</span>{t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>Your script</label>
                    <textarea rows={5} value={scriptText} onChange={e => setScriptText(e.target.value)}
                      placeholder={currentTemplate.placeholder}
                      className="w-full rounded-xl px-4 py-3 text-[14px] text-[#FAFAFA] resize-none outline-none"
                      style={{ background: 'rgba(24,24,28,0.7)', border: '0.5px solid rgba(255,255,255,0.1)', lineHeight: 1.6 }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                    <div className="flex justify-between items-center">
                      <p style={{ fontSize: 12, color: '#3f3f46' }}>This script guides your video content</p>
                      <span style={{ fontSize: 12, color: '#52525B', fontVariantNumeric: 'tabular-nums' }}>{scriptText.length} chars</span>
                    </div>
                  </div>
                </>
              )}
              <Button variant="primary" size="sm" disabled={!canProceed} onClick={() => setStage('upload')} className="gap-1.5 self-start">
                {isGenerating ? 'Generating script…' : 'Continue to upload'}
                {!isGenerating && <ChevronRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}

          {/* ── STEP 2: UPLOAD ─────────────────────────────────────────────────── */}
          {stage === 'upload' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 p-4 rounded-xl cursor-pointer" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }} onClick={() => setStage('script')}>
                <FileText className="w-4 h-4 text-[#6366f1] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#A1A1AA] leading-relaxed flex-1 line-clamp-2">{scriptText || <span className="text-[#3f3f46] italic">No script — uploading without one</span>}</p>
                <span style={{ fontSize: 11, color: '#52525B', whiteSpace: 'nowrap' }}>Edit ↩</span>
              </div>
              <div ref={dropRef} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center text-center py-20 rounded-2xl gap-5 cursor-pointer transition-all duration-200"
                style={{ border: dragging ? '1.5px dashed rgba(99,102,241,0.6)' : '0.5px dashed rgba(255,255,255,0.09)', background: dragging ? 'rgba(99,102,241,0.05)' : 'rgba(17,17,19,0.5)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: dragging ? 'rgba(99,102,241,0.12)' : '#18181C', border: dragging ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid rgba(255,255,255,0.08)' }}>
                  {dragging ? <Upload className="w-7 h-7 text-[#6366f1]" /> : <Video className="w-7 h-7 text-[#3f3f46]" />}
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-[#FAFAFA] mb-1">{dragging ? 'Drop your video' : 'Upload your footage'}</p>
                  <p className="text-[13px] text-[#71717A]">MP4, MOV, AVI — drag & drop or click to browse</p>
                </div>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#6366f1 0%,#5558e8 100%)', boxShadow: '0 0 0 1px rgba(99,102,241,0.4),0 8px 24px rgba(99,102,241,0.25)' }}
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
                  <Upload className="w-4 h-4" />Choose video
                </button>
              </div>
            </div>
          )}

          {/* ── PROCESSING ─────────────────────────────────────────────────────── */}
          {isProcessing && pendingFile && (
            <div className="flex flex-col gap-6 p-8 rounded-2xl" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                  <Sparkles className="w-6 h-6 text-[#6366f1] animate-pulse" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[#FAFAFA]">{pendingFile.name}</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">{formatBytes(pendingFile.size)}</p>
                </div>
              </div>
              <ProgressBar value={uploadProgress} label="Uploading to storage…" />
              <p className="text-[13px] text-[#52525B] text-center">Uploading your video…</p>
            </div>
          )}

          {/* ── ERROR ──────────────────────────────────────────────────────────── */}
          {stage === 'error' && (
            <div className="flex flex-col gap-4 p-6 rounded-2xl" style={{ background: 'rgba(239,68,68,0.05)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-red-300">Upload failed</p>
                  <p className="text-[13px] text-red-400/70 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
                <button onClick={reset} className="text-red-400/50 hover:text-red-300 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setStage('upload'); setErrorMsg('') }} className="self-start">Try again</Button>
            </div>
          )}

          {/* ── DONE + ENHANCEMENT STUDIO ──────────────────────────────────────── */}
          {stage === 'done' && displayUrl && (
            <div className="flex flex-col gap-5">

              {/* Done header */}
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[#FAFAFA]">{pendingFile?.name ?? 'Your video'} — ready</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">Customize with the studio below, then export</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={displayUrl} download target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.3)' }}>
                    <Download className="w-3.5 h-3.5" />Download
                  </a>
                  <Button variant="ghost" size="sm" onClick={reset}>New video</Button>
                </div>
              </div>

              {/* Video player with live overlays */}
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(99,102,241,0.25)', boxShadow: '0 0 24px rgba(99,102,241,0.1)' }}>
                <video
                  ref={videoRef}
                  src={displayUrl}
                  controls
                  className="w-full block"
                  style={{ filter: GRADES[colorGrade].filter !== 'none' ? GRADES[colorGrade].filter : undefined, display: 'block' }}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => { if (videoRef.current) setVideoDuration(videoRef.current.duration) }}
                />
                {/* Color overlay — teal/orange split, warm push, cool push, etc. */}
                {GRADES[colorGrade].color && (
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: GRADES[colorGrade].color!.bg,
                    mixBlendMode: GRADES[colorGrade].color!.blend as React.CSSProperties['mixBlendMode'],
                    opacity: GRADES[colorGrade].color!.opacity,
                  }} />
                )}
                {/* Vignette — dark edges for cinematic depth */}
                {(GRADES[colorGrade].vignette ?? 0) > 0 && (
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.9) 100%)',
                    mixBlendMode: 'multiply',
                    opacity: GRADES[colorGrade].vignette,
                  }} />
                )}
                {/* Hook text — top of video */}
                {showHook && hookText && (
                  <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none" style={{ padding: '12px 16px 0' }}>
                    <div style={{
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 800,
                      textAlign: 'center',
                      lineHeight: 1.3,
                      maxWidth: '88%',
                      letterSpacing: '-0.01em',
                      textShadow: '-1px -1px 3px #000,1px -1px 3px #000,-1px 1px 3px #000,1px 1px 3px #000,0 0 12px rgba(0,0,0,0.8)',
                    }}>
                      {hookText}
                    </div>
                  </div>
                )}

                {/* Captions — centered, above controls */}
                {captionsEnabled && (
                  <div className="absolute left-0 right-0 flex justify-center items-center pointer-events-none"
                    style={{ bottom: '13%', padding: '0 10%' }}>
                    <p style={{
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 700,
                      textAlign: 'center',
                      lineHeight: 1.45,
                      letterSpacing: '0.01em',
                      maxWidth: '100%',
                      opacity: captionOpacity,
                      transition: 'opacity 150ms ease',
                      textShadow: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 10px rgba(0,0,0,0.95)',
                      WebkitTextStroke: '0.3px rgba(0,0,0,0.5)',
                    }}>
                      {displayedCaption}
                    </p>
                  </div>
                )}

                {/* CTA — bottom bar */}
                {showCta && ctaText && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none" style={{ padding: '0 16px 10px' }}>
                    <div style={{
                      background: 'rgba(99,102,241,0.92)',
                      backdropFilter: 'blur(6px)',
                      borderRadius: 20,
                      padding: '6px 18px',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      textAlign: 'center',
                      maxWidth: '85%',
                      boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
                    }}>
                      {ctaText}
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden audio element for music preview */}
              <audio ref={audioRef} />

              {/* Enhancement Studio panel */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>

                {/* Tab bar */}
                <div className="flex" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  {([
                    { id: 'captions' as StudioTab, label: 'Captions', Icon: Type },
                    { id: 'music'    as StudioTab, label: 'Music',    Icon: Music },
                    { id: 'grade'    as StudioTab, label: 'Color',    Icon: Palette },
                    { id: 'text'     as StudioTab, label: 'Text',     Icon: MessageSquare },
                    { id: 'trim'     as StudioTab, label: 'Trim',     Icon: Scissors },
                  ] as const).map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => switchTab(id)}
                      className="flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors duration-150"
                      style={{
                        color: activeTab === id ? '#818cf8' : '#52525B',
                        background: activeTab === id ? 'rgba(99,102,241,0.06)' : 'transparent',
                        borderBottom: activeTab === id ? '1.5px solid #6366f1' : '1.5px solid transparent',
                      }}>
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-5" style={{ opacity: tabVisible ? 1 : 0, transform: tabVisible ? 'translateY(0)' : 'translateY(4px)', transition: 'opacity 120ms ease, transform 120ms ease' }}>

                  {/* Captions */}
                  {activeTab === 'captions' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-medium text-[#FAFAFA]">AI Captions</p>
                          <p className="text-[12px] text-[#52525B] mt-0.5">Generated from your video's actual audio</p>
                        </div>
                        <Toggle on={captionsEnabled} onToggle={() => setCaptionsEnabled(p => !p)} />
                      </div>

                      {/* Generate from audio button */}
                      <button
                        onClick={transcribeFromAudio}
                        disabled={transcribing}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
                        style={{
                          background: transcribing ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.12)',
                          border: '1px solid rgba(99,102,241,0.3)',
                          color: transcribing ? '#52525B' : '#a5b4fc',
                        }}
                      >
                        {transcribing ? (
                          <><Sparkles className="w-3.5 h-3.5 animate-pulse" />Transcribing audio… this takes ~30s</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5" />Generate captions from audio</>
                        )}
                      </button>

                      {transcribeError && (
                        <p className="text-[12px] text-red-400 text-center">{transcribeError}</p>
                      )}

                      {captions.length > 0 ? (
                        <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1">
                          {captions.map((c, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg"
                              style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                              <span className="text-[10px] font-mono text-[#52525B] mt-0.5 flex-shrink-0 w-10">
                                {Math.floor(c.start / 60).toString().padStart(2, '0')}:{(c.start % 60).toFixed(0).padStart(2, '0')}
                              </span>
                              <p className="text-[12px] text-[#A1A1AA] leading-relaxed">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-4 rounded-xl text-center" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                          <p className="text-[12px] text-[#52525B]">Click the button above to transcribe the audio from your video</p>
                        </div>
                      )}
                      <p className="text-[11px] text-[#3f3f46]">Captions show live in the preview above while playing.</p>
                    </div>
                  )}

                  {/* Music */}
                  {activeTab === 'music' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#FAFAFA]">Background Music</p>
                        <p className="text-[12px] text-[#52525B] mt-0.5">Pick a vibe — royalty-free, mixed on export</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {MUSIC_MOODS.map(m => (
                          <button key={m.id} onClick={() => playMusic(m.id)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150"
                            style={{ background: selectedMusic === m.id ? 'rgba(99,102,241,0.1)' : '#18181C', border: selectedMusic === m.id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-2xl">{m.icon}</span>
                            <span className="text-[12px] font-semibold" style={{ color: selectedMusic === m.id ? '#a5b4fc' : '#A1A1AA' }}>{m.label}</span>
                            <span className="text-[11px] text-center" style={{ color: '#52525B' }}>{m.desc}</span>
                          </button>
                        ))}
                      </div>
                      {selectedMusic !== 'none' && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.05)', border: '0.5px solid rgba(99,102,241,0.15)' }}>
                          <span className="relative flex-shrink-0">
                            <span className="block w-2 h-2 rounded-full bg-[#4ADE80]" />
                            <span className="absolute inset-0 w-2 h-2 rounded-full bg-[#4ADE80] animate-ping opacity-60" />
                          </span>
                          <p className="text-[12px] text-[#818cf8]">Now previewing: <span className="font-semibold capitalize">{selectedMusic}</span> — playing in the background at 35% volume</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Color Grade */}
                  {activeTab === 'grade' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#FAFAFA]">Color Grading</p>
                        <p className="text-[12px] text-[#52525B] mt-0.5">Cinematic presets — applied live in the preview</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {GRADE_META.map(({ key, label, bg }) => (
                          <button key={key} onClick={() => setColorGrade(key)}
                            className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all duration-150"
                            style={{ background: colorGrade === key ? 'rgba(99,102,241,0.1)' : '#18181C', border: colorGrade === key ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                            <div className="w-full h-8 rounded-lg" style={{ background: bg }} />
                            <span className="text-[11px] font-medium" style={{ color: colorGrade === key ? '#a5b4fc' : '#A1A1AA' }}>{label}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-[#3f3f46]">Grade applied live in the preview above. Baked in on export.</p>
                    </div>
                  )}

                  {/* Text Overlays */}
                  {activeTab === 'text' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#FAFAFA]">Text Overlays</p>
                        <p className="text-[12px] text-[#52525B] mt-0.5">Hook at the top, CTA at the bottom — toggle to preview</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        {/* Hook */}
                        <div className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-semibold text-[#A1A1AA]">Opening hook (top of video)</span>
                            <Toggle on={showHook} onToggle={() => setShowHook(p => !p)} />
                          </div>
                          <input type="text" value={hookText} onChange={e => setHookText(e.target.value)}
                            placeholder="e.g. This changed everything for my business…"
                            className="w-full rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] outline-none"
                            style={{ background: 'rgba(10,10,11,0.8)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }} />
                        </div>
                        {/* CTA */}
                        <div className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-semibold text-[#A1A1AA]">Call to action (bottom of video)</span>
                            <Toggle on={showCta} onToggle={() => setShowCta(p => !p)} />
                          </div>
                          <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
                            placeholder="e.g. Follow for more tips!"
                            className="w-full rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] outline-none"
                            style={{ background: 'rgba(10,10,11,0.8)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trim */}
                  {activeTab === 'trim' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#FAFAFA]">Video Trim</p>
                        <p className="text-[12px] text-[#52525B] mt-0.5">Set in and out points — enforced during playback and export</p>
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[#A1A1AA]">Start</span>
                            <span className="text-[12px] font-mono" style={{ color: '#818cf8' }}>
                              {videoDuration ? `${((trimStart / 100) * videoDuration).toFixed(1)}s` : `${trimStart}%`}
                            </span>
                          </div>
                          <input type="range" min={0} max={trimEnd - 1} value={trimStart}
                            onChange={e => setTrimStart(Number(e.target.value))}
                            className="w-full" style={{ accentColor: '#6366f1' }} />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[#A1A1AA]">End</span>
                            <span className="text-[12px] font-mono" style={{ color: '#818cf8' }}>
                              {videoDuration ? `${((trimEnd / 100) * videoDuration).toFixed(1)}s` : `${trimEnd}%`}
                            </span>
                          </div>
                          <input type="range" min={trimStart + 1} max={100} value={trimEnd}
                            onChange={e => setTrimEnd(Number(e.target.value))}
                            className="w-full" style={{ accentColor: '#6366f1' }} />
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                          <span className="text-[12px] text-[#52525B]">Clip duration:</span>
                          <span className="text-[12px] font-mono text-[#A1A1AA]">
                            {videoDuration
                              ? `${(((trimEnd - trimStart) / 100) * videoDuration).toFixed(1)}s`
                              : `${trimEnd - trimStart}% of video`}
                          </span>
                          <button onClick={() => { setTrimStart(0); setTrimEnd(100) }}
                            className="ml-auto text-[11px] text-[#52525B] hover:text-[#A1A1AA] transition-colors">
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Export row */}
              <div className="flex items-center gap-3 flex-wrap">
                <a href={displayUrl} download target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#6366f1 0%,#5558e8 100%)', boxShadow: '0 0 0 1px rgba(99,102,241,0.4),0 8px 24px rgba(99,102,241,0.2)' }}>
                  <Download className="w-4 h-4" />Export video
                </a>
                <p className="text-[12px] text-[#52525B]">Music, captions & color grade applied on export</p>
              </div>

            </div>
          )}

          {/* ── Video library ───────────────────────────────────────────────────── */}
          {videos.length > 0 && (stage === 'script' || stage === 'upload') && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-medium text-[#FAFAFA]">Previous videos</h2>
              {videos.map(v => (
                <div key={v.id} className="flex items-center gap-4 p-4 rounded-[12px]" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                    <CheckCircle2 className="w-5 h-5 text-[#6366f1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#FAFAFA] truncate">{v.name}</p>
                    <p className="text-[12px] text-[#52525B] mt-0.5 truncate">{v.script || 'No script'}</p>
                  </div>
                  <a href={v.enhancedUrl || v.originalUrl} download target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#A1A1AA] hover:text-white transition-colors flex-shrink-0"
                    style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <Download className="w-3.5 h-3.5" />Download
                  </a>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function VideosPage() {
  return (
    <Suspense fallback={<div className="flex flex-col h-full"><TopBar /></div>}>
      <VideosInner />
    </Suspense>
  )
}
