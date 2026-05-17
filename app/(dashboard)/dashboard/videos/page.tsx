'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { put } from '@vercel/blob/client'
import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import {
  Upload, Video, CheckCircle2, AlertCircle, Sparkles, X,
  ChevronRight, Wand2, PenLine, Music, Type, Scissors,
  Palette, MessageSquare, Layers, GitMerge, Plus, Trash2,
  ChevronUp, ChevronDown, Film,
} from 'lucide-react'
import { exportVideo, downloadBlob, type TransitionType, type ExportQuality } from '@/lib/videoExport'

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Stage = 'script' | 'upload' | 'uploading' | 'done' | 'error'
type StudioTab = 'captions' | 'music' | 'grade' | 'text' | 'clips' | 'transition'
type GradeKey = 'original' | 'vivid' | 'cinematic' | 'warm' | 'cool' | 'bw' | 'custom'

interface VideoRecord {
  id: string; name: string; script: string
  originalUrl: string; enhancedUrl: string; createdAt: number
}
interface Caption { text: string; start: number; end: number }

interface Clip {
  id: string
  name: string
  url: string        // Vercel Blob public URL
  trimStart: number  // 0–100
  trimEnd: number    // 0–100
  duration: number   // seconds (filled on loadedmetadata)
}

interface CustomColor {
  exposure: number      // -100 to 100
  contrast: number      // -100 to 100
  saturation: number    // -100 to 100
  temperature: number   // -100 (cool) to 100 (warm)
  sharpness: number     // 0 to 100
  highlights: number    // -100 to 100
  shadows: number       // -100 to 100
}

const DEFAULT_CUSTOM_COLOR: CustomColor = {
  exposure: 0, contrast: 0, saturation: 0, temperature: 0,
  sharpness: 0, highlights: 0, shadows: 0,
}

/* ─── Color grades ───────────────────────────────────────────────────────────── */
interface GradeLook {
  filter: string
  color?: { bg: string; blend: string; opacity: number }
  vignette?: number
}

const GRADES: Record<GradeKey, GradeLook> = {
  original:  { filter: 'none' },
  vivid:     { filter: 'saturate(1.7) contrast(1.1) brightness(1.03)', vignette: 0.2 },
  cinematic: {
    filter: 'contrast(1.22) brightness(0.76) saturate(0.58)',
    color: { bg: 'linear-gradient(135deg, rgb(0,55,75) 0%, rgb(90,30,0) 100%)', blend: 'color', opacity: 0.22 },
    vignette: 0.65,
  },
  warm: {
    filter: 'brightness(1.07) contrast(1.08) saturate(1.35)',
    color: { bg: 'linear-gradient(180deg, rgb(255,190,70) 0%, rgb(210,80,10) 100%)', blend: 'soft-light', opacity: 0.28 },
    vignette: 0.3,
  },
  cool: {
    filter: 'brightness(0.82) contrast(1.2) saturate(0.6)',
    color: { bg: 'linear-gradient(180deg, rgb(20,70,200) 0%, rgb(0,25,90) 100%)', blend: 'color', opacity: 0.28 },
    vignette: 0.5,
  },
  bw:     { filter: 'grayscale(1) contrast(1.28) brightness(0.84)', vignette: 0.55 },
  custom: { filter: 'none' },  // dynamic — see buildCustomFilter()
}

const GRADE_META: { key: GradeKey; label: string; bg: string }[] = [
  { key: 'original',  label: 'Original',  bg: 'linear-gradient(135deg,#444 0%,#999 100%)' },
  { key: 'vivid',     label: 'Vivid',     bg: 'linear-gradient(135deg,#f97316 0%,#ec4899 100%)' },
  { key: 'cinematic', label: 'Cinematic', bg: 'linear-gradient(135deg,rgb(0,55,75) 0%,rgb(90,30,0) 100%)' },
  { key: 'warm',      label: 'Warm',      bg: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' },
  { key: 'cool',      label: 'Cool',      bg: 'linear-gradient(135deg,rgb(20,70,200) 0%,rgb(0,25,90) 100%)' },
  { key: 'bw',        label: 'B&W',       bg: 'linear-gradient(135deg,#111 0%,#ccc 100%)' },
  { key: 'custom',    label: 'Custom',    bg: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)' },
]

function buildCustomFilter(c: CustomColor): string {
  const brightness = 1 + (c.exposure  / 200)
  const contrast   = 1 + (c.contrast  / 200)
  const saturate   = Math.max(0, 1 + (c.saturation / 100))
  const parts = [
    `brightness(${brightness.toFixed(2)})`,
    `contrast(${contrast.toFixed(2)})`,
    `saturate(${saturate.toFixed(2)})`,
  ]
  if (c.temperature > 0) parts.push(`sepia(${(c.temperature / 400).toFixed(3)})`)
  else if (c.temperature < 0) parts.push(`hue-rotate(${(c.temperature / 5).toFixed(1)}deg)`)
  if (c.sharpness > 0) parts.push(`contrast(${(1 + c.sharpness / 250).toFixed(3)})`)
  return parts.join(' ')
}

const MUSIC_MOODS = [
  { id: 'none',      label: 'No music',  icon: '🔇', desc: 'Keep it clean',          url: null },
  { id: 'hype',      label: 'Hype',      icon: '🔥', desc: 'High energy, trendy',    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3' },
  { id: 'chill',     label: 'Chill',     icon: '🌊', desc: 'Lo-fi, relaxed vibes',   url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3' },
  { id: 'corporate', label: 'Corporate', icon: '💼', desc: 'Clean and professional',  url: 'https://assets.mixkit.co/music/preview/mixkit-corporate-achievement-27.mp3' },
  { id: 'emotional', label: 'Emotional', icon: '💫', desc: 'Heartfelt storytelling',  url: 'https://assets.mixkit.co/music/preview/mixkit-sad-piano-loop-565.mp3' },
  { id: 'trending',  label: 'Trending',  icon: '📈', desc: 'TikTok & Reels sounds',  url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3' },
]

const SCRIPT_TEMPLATES = [
  { id: 'promo',        label: 'Business promo',    icon: '🏪', placeholder: 'e.g. We make the best tacos in Austin — fresh ingredients, made to order, open late.' },
  { id: 'behindscenes', label: 'Behind the scenes', icon: '🎬', placeholder: 'e.g. A day in our kitchen — from prep at 6am to the last order.' },
  { id: 'testimonial',  label: 'Customer story',    icon: '⭐', placeholder: "e.g. Sarah's been coming here every Friday for two years. Here's what she says about us." },
  { id: 'custom',       label: 'Write my own',      icon: '✍️', placeholder: 'Write your own script or talking points here...' },
]

const TRANSITION_OPTIONS: { id: TransitionType; label: string; icon: string; desc: string }[] = [
  { id: 'none',    label: 'Cut',     icon: '✂️', desc: 'Hard cut between clips' },
  { id: 'fade',    label: 'Fade',    icon: '⚫', desc: 'Fade to black between clips' },
  { id: 'dissolve',label: 'Dissolve',icon: '🌊', desc: 'Cross-dissolve between clips' },
]

const POLL_INTERVAL = 4000

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function fmtSec(s: number) { return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}` }

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

/* ─── Slider ─────────────────────────────────────────────────────────────────── */
function ColorSlider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, color: '#A1A1AA' }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: value === 0 ? '#52525B' : '#818cf8' }}>{value > 0 ? '+' : ''}{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full" style={{ accentColor: '#6366f1', height: 4 }} />
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
function VideosInner() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const ideaHook   = searchParams.get('idea')   ?? ''
  const ideaFormat = searchParams.get('format') ?? ''

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const addClipInputRef = useRef<HTMLInputElement>(null)
  const dropRef         = useRef<HTMLDivElement>(null)
  const videoRef        = useRef<HTMLVideoElement>(null)
  const audioRef        = useRef<HTMLAudioElement>(null)
  const streamingRef    = useRef(false)

  // Core flow
  const [stage, setStage]                 = useState<Stage>('script')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMsg, setErrorMsg]           = useState('')
  const [dragging, setDragging]           = useState(false)
  const [videos, setVideos]               = useState<VideoRecord[]>([])
  const [videosLoaded, setVideosLoaded]   = useState(false)

  // Multi-clip state
  const [clips, setClips]                 = useState<Clip[]>([])
  const [activeClipId, setActiveClipId]   = useState<string | null>(null)
  const [addingClip, setAddingClip]       = useState(false)
  const [addClipProgress, setAddClipProgress] = useState(0)

  // Script
  const [scriptText, setScriptText]           = useState('')
  const [isGenerating, setIsGenerating]       = useState(false)
  const [generationDone, setGenerationDone]   = useState(false)
  const [scriptGenError, setScriptGenError]   = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('promo')
  const [writeOwn, setWriteOwn]               = useState(false)

  // Studio
  const [activeTab, setActiveTab]             = useState<StudioTab>('captions')
  const [colorGrade, setColorGrade]           = useState<GradeKey>('original')
  const [customColor, setCustomColor]         = useState<CustomColor>(DEFAULT_CUSTOM_COLOR)
  const [hookText, setHookText]               = useState('')
  const [ctaText, setCtaText]                 = useState('')
  const [showHook, setShowHook]               = useState(false)
  const [showCta, setShowCta]                 = useState(false)
  const [selectedMusic, setSelectedMusic]     = useState('none')
  const [captions, setCaptions]               = useState<Caption[]>([])
  const [captionsEnabled, setCaptionsEnabled] = useState(false)
  const [currentCaption, setCurrentCaption]   = useState('')
  const [displayedCaption, setDisplayedCaption] = useState('')
  const [captionOpacity, setCaptionOpacity]   = useState(0)
  const [transcribing, setTranscribing]       = useState(false)
  const [transcribeError, setTranscribeError] = useState('')
  const [transition, setTransition]           = useState<TransitionType>('fade')
  const [transitionDuration, setTransitionDuration] = useState(0.6)
  const [tabVisible, setTabVisible]           = useState(true)

  // Export
  const [exportQuality, setExportQuality]     = useState<ExportQuality>('1080p')
  const [exporting, setExporting]             = useState(false)
  const [exportProgress, setExportProgress]   = useState(0)
  const [exportLabel, setExportLabel]         = useState('')

  const activeClip = clips.find(c => c.id === activeClipId) ?? clips[0] ?? null
  const displayUrl = activeClip?.url ?? ''
  const hasIdea = ideaHook.length > 0
  const currentTemplate = SCRIPT_TEMPLATES.find(t => t.id === selectedTemplate)!

  /* ── Computed color filter for preview ─────────────────────────────────────── */
  const previewFilter = colorGrade === 'custom'
    ? buildCustomFilter(customColor)
    : GRADES[colorGrade].filter !== 'none' ? GRADES[colorGrade].filter : undefined
  const previewGrade  = GRADES[colorGrade]

  /* ── Generate captions on done ─────────────────────────────────────────────── */
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

  /* ── Music playback ─────────────────────────────────────────────────────────── */
  const playMusic = useCallback((moodId: string) => {
    setSelectedMusic(moodId)
    const audio = audioRef.current
    if (!audio) return
    const mood = MUSIC_MOODS.find(m => m.id === moodId)
    audio.pause()
    if (!mood?.url) { audio.src = ''; audio.load(); return }
    audio.volume = 0.45
    audio.loop = true
    audio.crossOrigin = 'anonymous'
    audio.src = mood.url
    audio.load()
    const p = audio.play()
    if (p) p.catch((e: Error) => { if (e.name !== 'AbortError') console.warn('[music]', e.name, e.message) })
  }, [])

  /* ── Transcribe ─────────────────────────────────────────────────────────────── */
  const transcribeFromAudio = useCallback(async () => {
    if (!displayUrl) return
    setTranscribing(true); setTranscribeError('')
    try {
      const res = await fetch('/api/video/transcribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: displayUrl }),
      })
      const data = await res.json()
      if (res.status === 429 || data.fallback) {
        const sc = buildCaptions(scriptText)
        if (sc.length) { setCaptions(sc); setCaptionsEnabled(true) }
        else setTranscribeError('Rate limited. Add a script to generate captions.')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
      if (data.segments?.length > 0) { setCaptions(data.segments); setCaptionsEnabled(true) }
      else setTranscribeError('No speech detected — add a script to generate captions.')
    } catch {
      const sc = buildCaptions(scriptText)
      if (sc.length) { setCaptions(sc); setCaptionsEnabled(true) }
      else setTranscribeError('Transcription failed. Add a script to generate captions.')
    } finally { setTranscribing(false) }
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

  /* ── Video timeupdate ──────────────────────────────────────────────────────── */
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || !activeClip) return
    const dur = video.duration
    if (!dur || isNaN(dur)) return
    const endT = (activeClip.trimEnd / 100) * dur
    if (video.currentTime >= endT) { video.pause(); video.currentTime = (activeClip.trimStart / 100) * dur }
    if (captionsEnabled) {
      const t = video.currentTime
      setCurrentCaption(captions.find(c => t >= c.start && t < c.end)?.text ?? '')
    }
  }, [activeClip, captionsEnabled, captions])

  /* ── Persist video library ──────────────────────────────────────────────────── */
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

  /* ── Enhancement in background ──────────────────────────────────────────────── */
  const runEnhancementInBackground = useCallback(async (blobUrl: string, recordId: string) => {
    try {
      const res = await fetch('/api/video/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: blobUrl }) })
      if (!res.ok) return
      const data = await res.json()
      if (!data.id) return
      const poll = async (): Promise<void> => {
        try {
          const r = await fetch(`/api/video/status/${data.id}`); const d = await r.json()
          if (d.status === 'succeeded' && d.output) {
            const enhanced = Array.isArray(d.output) ? d.output[0] : d.output
            setVideos(prev => { const next = prev.map(v => v.id === recordId ? { ...v, enhancedUrl: enhanced } : v); saveVideos(next); return next })
            setClips(prev => prev.map(c => c.id === recordId ? { ...c, url: enhanced } : c))
          } else if (d.status !== 'failed') { await new Promise(r => setTimeout(r, POLL_INTERVAL)); return poll() }
        } catch {}
      }
      await poll()
    } catch {}
  }, [saveVideos])

  /* ── Upload first clip ───────────────────────────────────────────────────────── */
  const uploadClip = useCallback(async (file: File): Promise<Clip | null> => {
    let blobUrl = ''
    try {
      const tokenRes = await fetch(`/api/video/upload?filename=${encodeURIComponent(file.name)}`)
      if (!tokenRes.ok) { const e = await tokenRes.json().catch(() => ({})); throw new Error(e.error ?? `Token request failed (${tokenRes.status})`) }
      const { clientToken, pathname } = await tokenRes.json()
      const blob = await put(pathname, file, {
        access: 'public', token: clientToken,
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      })
      blobUrl = blob.url
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed — check your connection and try again.')
      setStage('error')
      return null
    }
    return { id: Date.now().toString(), name: file.name, url: blobUrl, trimStart: 0, trimEnd: 100, duration: 0 }
  }, [])

  const startUpload = useCallback(async (file: File) => {
    setUploadProgress(0); setErrorMsg(''); setStage('uploading')
    const clip = await uploadClip(file)
    if (!clip) return

    const record: VideoRecord = { id: clip.id, name: file.name, script: scriptText, originalUrl: clip.url, enhancedUrl: clip.url, createdAt: Date.now() }
    setClips([clip])
    setActiveClipId(clip.id)
    setVideos(prev => { const next = [record, ...prev]; saveVideos(next); return next })
    setStage('done')
    runEnhancementInBackground(clip.url, clip.id)
  }, [uploadClip, scriptText, saveVideos, runEnhancementInBackground])

  /* ── Add additional clip ─────────────────────────────────────────────────────── */
  const addClip = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) return
    setAddingClip(true); setAddClipProgress(0)
    let blobUrl = ''
    try {
      const tokenRes = await fetch(`/api/video/upload?filename=${encodeURIComponent(file.name)}`)
      const { clientToken, pathname } = await tokenRes.json()
      const blob = await put(pathname, file, {
        access: 'public', token: clientToken,
        onUploadProgress: ({ percentage }) => setAddClipProgress(percentage),
      })
      blobUrl = blob.url
    } catch { setAddingClip(false); return }
    const newClip: Clip = { id: Date.now().toString(), name: file.name, url: blobUrl, trimStart: 0, trimEnd: 100, duration: 0 }
    setClips(prev => [...prev, newClip])
    setActiveClipId(newClip.id)
    setAddingClip(false)
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) { setErrorMsg('Please upload a video file (MP4, MOV, etc.)'); setStage('error'); return }
    startUpload(file)
  }, [startUpload])

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }
  const onAddClipChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) addClip(f); e.target.value = '' }

  /* ── Clip management ─────────────────────────────────────────────────────────── */
  const updateClipTrim = (id: string, field: 'trimStart' | 'trimEnd', value: number) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const removeClip = (id: string) => {
    setClips(prev => {
      const next = prev.filter(c => c.id !== id)
      if (activeClipId === id) setActiveClipId(next[0]?.id ?? null)
      if (next.length === 0) reset()
      return next
    })
  }

  const moveClip = (id: string, dir: -1 | 1) => {
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const swapIdx = idx + dir
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  /* ── Real export ─────────────────────────────────────────────────────────────── */
  const handleExport = useCallback(async () => {
    if (clips.length === 0 || exporting) return
    setExporting(true); setExportProgress(0); setExportLabel('Preparing…')

    const grade = GRADES[colorGrade]
    const musicUrl = MUSIC_MOODS.find(m => m.id === selectedMusic)?.url ?? null

    try {
      const blob = await exportVideo({
        clips: clips.map(c => ({ url: c.url, trimStart: c.trimStart, trimEnd: c.trimEnd })),
        colorFilter:     colorGrade === 'custom' ? buildCustomFilter(customColor) : grade.filter,
        colorOverlay:    colorGrade === 'custom' ? undefined : grade.color,
        vignetteOpacity: colorGrade === 'custom' ? 0 : grade.vignette,
        captionsEnabled,
        captions,
        showHook,  hookText,
        showCta,   ctaText,
        musicUrl,  musicVolume: 0.4,
        transition,
        transitionDuration,
        quality: exportQuality,
        onProgress: (pct, label) => { setExportProgress(pct); setExportLabel(label) },
      })
      downloadBlob(blob, `brandlift-${Date.now()}.webm`)
    } catch (err) {
      console.error('[export]', err)
      alert('Export failed — try a shorter clip or reload the page.')
    } finally {
      setExporting(false); setExportProgress(0); setExportLabel('')
    }
  }, [clips, exporting, colorGrade, customColor, selectedMusic, captionsEnabled, captions, showHook, hookText, showCta, ctaText, transition, transitionDuration, exportQuality])

  const reset = () => {
    setStage('script'); setUploadProgress(0); setErrorMsg(''); setClips([]); setActiveClipId(null)
    setScriptText(''); setGenerationDone(false); setWriteOwn(false); setScriptGenError(false)
    setSelectedTemplate('promo'); streamingRef.current = false
    setColorGrade('original'); setCustomColor(DEFAULT_CUSTOM_COLOR)
    setHookText(''); setCtaText(''); setShowHook(false); setShowCta(false)
    setSelectedMusic('none'); setCaptions([]); setCaptionsEnabled(false); setCurrentCaption('')
    setTransition('fade'); setActiveTab('captions'); setTranscribing(false); setTranscribeError('')
    setDisplayedCaption(''); setCaptionOpacity(0); setExporting(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current.load() }
  }

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
                {stage === 'done'
                  ? `${clips.length} clip${clips.length !== 1 ? 's' : ''} — customize and export`
                  : 'Write a script, upload your footage, export a polished video'}
              </p>
            </div>
            {stage !== 'script' && stage !== 'done' && <Button variant="ghost" size="sm" onClick={reset}>← Start over</Button>}
          </div>

          <input ref={fileInputRef}    type="file" accept="video/*" className="hidden" onChange={onFileChange} />
          <input ref={addClipInputRef} type="file" accept="video/*" className="hidden" onChange={onAddClipChange} />

          {stage !== 'uploading' && stage !== 'done' && stage !== 'error' && <StepBar stage={stage} />}

          {/* ── STEP 1: SCRIPT ─────────────────────────────────────────────────── */}
          {stage === 'script' && (
            <div className="flex flex-col gap-5 p-6 rounded-2xl" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              {hasIdea && !writeOwn && (
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Sparkles className="w-4 h-4 text-[#6366f1] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-medium text-[#818cf8]">AI Script</p>
                    <p className="text-[13px] text-[#A1A1AA] mt-0.5 italic">&ldquo;{ideaHook}&rdquo;</p>
                  </div>
                </div>
              )}

              {!writeOwn && !hasIdea && (
                <div>
                  <p className="text-[13px] font-medium text-[#A1A1AA] mb-3">Choose a template</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SCRIPT_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                        className="flex items-center gap-2 p-3 rounded-xl text-left transition-all duration-150"
                        style={{ background: selectedTemplate === t.id ? 'rgba(99,102,241,0.1)' : '#18181C', border: selectedTemplate === t.id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                        <span>{t.icon}</span>
                        <span className="text-[13px] font-medium" style={{ color: selectedTemplate === t.id ? '#a5b4fc' : '#A1A1AA' }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Script textarea */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[#A1A1AA]">
                    {hasIdea ? 'Generated script' : 'Your script / talking points'}
                  </label>
                  {isGenerating && <span className="text-[12px] text-[#6366f1] flex items-center gap-1.5"><Sparkles className="w-3 h-3 animate-pulse" />Writing…</span>}
                  {generationDone && <span className="text-[12px] text-[#4ADE80]">✓ Script ready</span>}
                </div>
                <textarea
                  value={scriptText} onChange={e => setScriptText(e.target.value)}
                  rows={6} placeholder={currentTemplate.placeholder}
                  className="w-full px-3 py-2.5 rounded-[10px] text-[14px] resize-none leading-relaxed"
                  style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.08)', color: '#E4E4E7', outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }} />
                {scriptGenError && <p className="text-[12px] text-red-400">Couldn&apos;t generate — write your own script above.</p>}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="primary" size="md" onClick={() => setStage('upload')}
                  className="flex items-center gap-2">
                  Continue to upload <ChevronRight className="w-4 h-4" />
                </Button>
                {!writeOwn && (
                  <button onClick={() => setWriteOwn(true)} className="text-[13px] text-[#52525B] hover:text-[#A1A1AA] transition-colors flex items-center gap-1">
                    <PenLine className="w-3 h-3" />Write my own
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: UPLOAD ─────────────────────────────────────────────────── */}
          {stage === 'upload' && (
            <div
              ref={dropRef}
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              className="flex flex-col items-center justify-center gap-4 p-12 rounded-2xl cursor-pointer transition-all duration-200"
              style={{ border: `1.5px dashed ${dragging ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`, background: dragging ? 'rgba(99,102,241,0.04)' : '#111113', minHeight: 240 }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Upload className="w-6 h-6 text-[#6366f1]" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-medium text-[#FAFAFA]">Drop your video here</p>
                <p className="text-[13px] text-[#52525B] mt-1">MP4, MOV, WebM — up to 500 MB</p>
              </div>
              <Button variant="primary" size="sm" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
                Browse files
              </Button>
            </div>
          )}

          {/* ── UPLOADING ─────────────────────────────────────────────────────── */}
          {stage === 'uploading' && (
            <div className="p-6 rounded-2xl flex flex-col gap-4" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <Video className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#FAFAFA]">Uploading video…</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">Hang tight — this only takes a moment</p>
                </div>
              </div>
              <ProgressBar value={uploadProgress} label="Upload progress" />
            </div>
          )}

          {/* ── ERROR ────────────────────────────────────────────────────────── */}
          {stage === 'error' && (
            <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ background: 'rgba(239,68,68,0.05)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-red-300">Upload failed</p>
                  <p className="text-[13px] text-red-400/70 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
                <button onClick={reset} className="text-red-400/50 hover:text-red-300 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStage('upload')} className="self-start">Try again</Button>
            </div>
          )}

          {/* ── DONE + ENHANCEMENT STUDIO ──────────────────────────────────────── */}
          {stage === 'done' && displayUrl && (
            <div className="flex flex-col gap-5">

              {/* Done header */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-[15px] font-medium text-[#FAFAFA]">
                      {clips.length === 1 ? clips[0].name : `${clips.length} clips ready to merge`}
                    </p>
                    <p className="text-[12px] text-[#52525B] mt-0.5">Customize with the studio below, then export</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Add clip button */}
                  {addingClip ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                      <span className="text-[12px] text-[#818cf8]">Uploading… {Math.round(addClipProgress)}%</span>
                    </div>
                  ) : (
                    <button onClick={() => addClipInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                      style={{ color: '#A1A1AA', border: '0.5px solid rgba(255,255,255,0.08)', background: '#111113' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#818cf8' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}>
                      <Plus className="w-3.5 h-3.5" />Add clip
                    </button>
                  )}
                  <Button variant="ghost" size="sm" onClick={reset}>New video</Button>
                </div>
              </div>

              {/* Clip selector tabs (if multiple clips) */}
              {clips.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {clips.map((c, i) => (
                    <button key={c.id} onClick={() => setActiveClipId(c.id)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                      style={{ background: activeClip?.id === c.id ? 'rgba(99,102,241,0.1)' : '#18181C', border: activeClip?.id === c.id ? '1px solid rgba(99,102,241,0.3)' : '0.5px solid rgba(255,255,255,0.06)', color: activeClip?.id === c.id ? '#a5b4fc' : '#71717A' }}>
                      <Film className="w-3 h-3" />Clip {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Video player with live overlays */}
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(99,102,241,0.25)', boxShadow: '0 0 24px rgba(99,102,241,0.1)' }}>
                <video
                  ref={videoRef}
                  src={displayUrl}
                  controls
                  className="w-full block"
                  style={{ filter: previewFilter, display: 'block' }}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => {
                    if (!videoRef.current || !activeClip) return
                    const dur = videoRef.current.duration
                    setClips(prev => prev.map(c => c.id === activeClip.id ? { ...c, duration: dur } : c))
                  }}
                />
                {/* Color overlay */}
                {previewGrade.color && (
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: previewGrade.color.bg,
                    mixBlendMode: previewGrade.color.blend as React.CSSProperties['mixBlendMode'],
                    opacity: previewGrade.color.opacity,
                  }} />
                )}
                {/* Vignette */}
                {(previewGrade.vignette ?? 0) > 0 && (
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: `radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,${previewGrade.vignette}) 100%)`,
                    mixBlendMode: 'multiply',
                  }} />
                )}
                {/* Hook overlay */}
                {showHook && hookText && (
                  <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none" style={{ padding: '6% 10% 0' }}>
                    <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 'clamp(12px, 3.5vw, 20px)', color: '#FAFAFA', textShadow: '-1px -1px 3px #000, 1px -1px 3px #000, -1px 1px 3px #000, 1px 1px 3px #000', lineHeight: 1.35 }}>
                      {hookText}
                    </p>
                  </div>
                )}
                {/* Caption overlay */}
                {captionsEnabled && displayedCaption && (
                  <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: '13%', padding: '0 10%', opacity: captionOpacity, transition: 'opacity 0.1s ease' }}>
                    <p style={{ textAlign: 'center', fontWeight: 600, fontSize: 'clamp(13px, 3vw, 18px)', color: '#FFFFFF', textShadow: '-2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000, 2px 2px 4px #000, 0 0 8px rgba(0,0,0,0.8)', lineHeight: 1.4 }}>
                      {displayedCaption}
                    </p>
                  </div>
                )}
                {/* CTA overlay */}
                {showCta && ctaText && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none" style={{ padding: '0 10% 5%' }}>
                    <p style={{ textAlign: 'center', fontWeight: 600, fontSize: 'clamp(11px, 2.8vw, 16px)', color: '#a5b4fc', textShadow: '-1px -1px 3px #000, 1px -1px 3px #000, -1px 1px 3px #000, 1px 1px 3px #000' }}>
                      {ctaText}
                    </p>
                  </div>
                )}
              </div>

              {/* Hidden audio element */}
              <audio ref={audioRef} />

              {/* Enhancement Studio panel */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>

                {/* Tab bar */}
                <div className="flex overflow-x-auto" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  {([
                    { id: 'captions'   as StudioTab, label: 'Captions',    Icon: Type },
                    { id: 'music'      as StudioTab, label: 'Music',       Icon: Music },
                    { id: 'grade'      as StudioTab, label: 'Color',       Icon: Palette },
                    { id: 'text'       as StudioTab, label: 'Text',        Icon: MessageSquare },
                    { id: 'clips'      as StudioTab, label: 'Clips',       Icon: Layers },
                    { id: 'transition' as StudioTab, label: 'Transitions', Icon: GitMerge },
                  ] as const).map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => switchTab(id)}
                      className="flex-shrink-0 flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors duration-150"
                      style={{ color: activeTab === id ? '#818cf8' : '#52525B', background: activeTab === id ? 'rgba(99,102,241,0.06)' : 'transparent', borderBottom: activeTab === id ? '1.5px solid #6366f1' : '1.5px solid transparent', minWidth: 70 }}>
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
                          <p className="text-[12px] text-[#52525B] mt-0.5">Generated from your video&apos;s actual audio</p>
                        </div>
                        <Toggle on={captionsEnabled} onToggle={() => setCaptionsEnabled(p => !p)} />
                      </div>
                      <button onClick={transcribeFromAudio} disabled={transcribing}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
                        style={{ background: transcribing ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: transcribing ? '#52525B' : '#a5b4fc' }}>
                        {transcribing
                          ? <><Sparkles className="w-3.5 h-3.5 animate-pulse" />Transcribing… ~30s</>
                          : <><Sparkles className="w-3.5 h-3.5" />Generate captions from audio</>
                        }
                      </button>
                      {transcribeError && <p className="text-[12px] text-red-400 text-center">{transcribeError}</p>}
                      {captions.length > 0 ? (
                        <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1">
                          {captions.map((c, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                              <span className="text-[10px] font-mono text-[#52525B] mt-0.5 flex-shrink-0 w-10">
                                {Math.floor(c.start / 60).toString().padStart(2, '0')}:{(c.start % 60).toFixed(0).padStart(2, '0')}
                              </span>
                              <p className="text-[12px] text-[#A1A1AA] leading-relaxed">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-4 rounded-xl text-center" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                          <p className="text-[12px] text-[#52525B]">Click the button above to transcribe audio from your video</p>
                        </div>
                      )}
                      <p className="text-[11px] text-[#3f3f46]">Captions show live in the preview while playing.</p>
                    </div>
                  )}

                  {/* Music */}
                  {activeTab === 'music' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#FAFAFA]">Background Music</p>
                        <p className="text-[12px] text-[#52525B] mt-0.5">Royalty-free — mixed into the exported video</p>
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
                          <p className="text-[12px] text-[#818cf8]">
                            Now previewing: <span className="font-semibold capitalize">{selectedMusic}</span> — mixed into export at 40% volume
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Color Grade */}
                  {activeTab === 'grade' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#FAFAFA]">Color Grading</p>
                        <p className="text-[12px] text-[#52525B] mt-0.5">Presets or dial in a custom look</p>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {GRADE_META.map(({ key, label, bg }) => (
                          <button key={key} onClick={() => setColorGrade(key)}
                            className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all duration-150"
                            style={{ background: colorGrade === key ? 'rgba(99,102,241,0.1)' : '#18181C', border: colorGrade === key ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                            <div className="w-full h-7 rounded-lg" style={{ background: bg }} />
                            <span className="text-[11px] font-medium" style={{ color: colorGrade === key ? '#a5b4fc' : '#A1A1AA' }}>{label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Custom color controls */}
                      {colorGrade === 'custom' && (
                        <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: '#0f0f11', border: '0.5px solid rgba(99,102,241,0.15)' }}>
                          <p className="text-[12px] font-semibold text-[#818cf8] mb-1">Custom Color Controls</p>
                          <ColorSlider label="Exposure"    value={customColor.exposure}    min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, exposure: v }))} />
                          <ColorSlider label="Contrast"    value={customColor.contrast}    min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, contrast: v }))} />
                          <ColorSlider label="Saturation"  value={customColor.saturation}  min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, saturation: v }))} />
                          <ColorSlider label="Temperature" value={customColor.temperature} min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, temperature: v }))} />
                          <ColorSlider label="Sharpness"   value={customColor.sharpness}   min={0}    max={100} onChange={v => setCustomColor(p => ({ ...p, sharpness: v }))} />
                          <button onClick={() => setCustomColor(DEFAULT_CUSTOM_COLOR)}
                            className="text-[11px] text-[#52525B] hover:text-[#A1A1AA] transition-colors mt-1">
                            Reset to defaults
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-[#3f3f46]">Applied live in preview. Baked into the exported video.</p>
                    </div>
                  )}

                  {/* Text Overlays */}
                  {activeTab === 'text' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#FAFAFA]">Text Overlays</p>
                        <p className="text-[12px] text-[#52525B] mt-0.5">Hook at the top, CTA at the bottom</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-semibold text-[#A1A1AA]">Opening hook (top)</span>
                            <Toggle on={showHook} onToggle={() => setShowHook(p => !p)} />
                          </div>
                          <input type="text" value={hookText} onChange={e => setHookText(e.target.value)}
                            placeholder="e.g. This changed everything for my business…"
                            className="w-full rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] outline-none"
                            style={{ background: 'rgba(10,10,11,0.8)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }} />
                        </div>
                        <div className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-semibold text-[#A1A1AA]">Call to action (bottom)</span>
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

                  {/* Clips manager */}
                  {activeTab === 'clips' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-medium text-[#FAFAFA]">Clip Manager</p>
                          <p className="text-[12px] text-[#52525B] mt-0.5">Reorder, trim, or remove individual clips</p>
                        </div>
                        <button onClick={() => addClipInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                          <Plus className="w-3.5 h-3.5" />Add clip
                        </button>
                      </div>

                      {clips.map((c, i) => (
                        <div key={c.id} className="flex flex-col gap-3 p-4 rounded-xl"
                          style={{ background: activeClip?.id === c.id ? 'rgba(99,102,241,0.06)' : '#18181C', border: activeClip?.id === c.id ? '1px solid rgba(99,102,241,0.25)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                          {/* Clip header */}
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
                              <Film className="w-4 h-4 text-[#6366f1]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[#FAFAFA] truncate">{c.name}</p>
                              {c.duration > 0 && (
                                <p className="text-[11px] text-[#52525B]">
                                  {fmtSec(c.duration * (c.trimEnd - c.trimStart) / 100)} selected · {fmtSec(c.duration)} total
                                </p>
                              )}
                            </div>
                            {/* Reorder + delete */}
                            <div className="flex items-center gap-1">
                              <button onClick={() => setActiveClipId(c.id)}
                                className="text-[11px] px-2 py-1 rounded transition-colors"
                                style={{ color: activeClip?.id === c.id ? '#818cf8' : '#52525B', background: activeClip?.id === c.id ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                                Preview
                              </button>
                              <button onClick={() => moveClip(c.id, -1)} disabled={i === 0} className="p-1 rounded transition-colors disabled:opacity-25" style={{ color: '#52525B' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => moveClip(c.id, 1)} disabled={i === clips.length - 1} className="p-1 rounded transition-colors disabled:opacity-25" style={{ color: '#52525B' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removeClip(c.id)} className="p-1 rounded transition-colors" style={{ color: '#52525B' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Per-clip trim */}
                          {c.duration > 0 && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-[#52525B]">Trim start</span>
                                <span className="text-[11px] font-mono" style={{ color: '#818cf8' }}>{fmtSec((c.trimStart / 100) * c.duration)}</span>
                              </div>
                              <input type="range" min={0} max={c.trimEnd - 1} value={c.trimStart}
                                onChange={e => updateClipTrim(c.id, 'trimStart', Number(e.target.value))}
                                className="w-full" style={{ accentColor: '#6366f1' }} />
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-[#52525B]">Trim end</span>
                                <span className="text-[11px] font-mono" style={{ color: '#818cf8' }}>{fmtSec((c.trimEnd / 100) * c.duration)}</span>
                              </div>
                              <input type="range" min={c.trimStart + 1} max={100} value={c.trimEnd}
                                onChange={e => updateClipTrim(c.id, 'trimEnd', Number(e.target.value))}
                                className="w-full" style={{ accentColor: '#6366f1' }} />
                            </div>
                          )}
                        </div>
                      ))}

                      {clips.length === 0 && (
                        <p className="text-[13px] text-[#52525B] text-center py-4">No clips — add some above.</p>
                      )}
                    </div>
                  )}

                  {/* Transitions */}
                  {activeTab === 'transition' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[14px] font-medium text-[#FAFAFA]">Transitions</p>
                        <p className="text-[12px] text-[#52525B] mt-0.5">Applied between clips and at the start/end of the video</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {TRANSITION_OPTIONS.map(t => (
                          <button key={t.id} onClick={() => setTransition(t.id)}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-150"
                            style={{ background: transition === t.id ? 'rgba(99,102,241,0.1)' : '#18181C', border: transition === t.id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-2xl">{t.icon}</span>
                            <span className="text-[12px] font-semibold" style={{ color: transition === t.id ? '#a5b4fc' : '#A1A1AA' }}>{t.label}</span>
                            <span className="text-[11px] text-center" style={{ color: '#52525B' }}>{t.desc}</span>
                          </button>
                        ))}
                      </div>

                      {transition !== 'none' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[#A1A1AA]">Transition duration</span>
                            <span className="text-[12px] font-mono" style={{ color: '#818cf8' }}>{transitionDuration.toFixed(1)}s</span>
                          </div>
                          <input type="range" min={20} max={150} value={Math.round(transitionDuration * 100)}
                            onChange={e => setTransitionDuration(Number(e.target.value) / 100)}
                            className="w-full" style={{ accentColor: '#6366f1' }} />
                          <div className="flex justify-between text-[10px] text-[#3f3f46]">
                            <span>0.2s</span><span>1.5s</span>
                          </div>
                        </div>
                      )}

                      {clips.length > 1 && (
                        <div className="px-3 py-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.05)', border: '0.5px solid rgba(99,102,241,0.15)' }}>
                          <p className="text-[12px] text-[#818cf8]">
                            {transition === 'none'
                              ? `Hard cuts between ${clips.length} clips`
                              : `${transition === 'fade' ? 'Fade to black' : 'Cross-dissolve'} between ${clips.length - 1} clip transition${clips.length > 2 ? 's' : ''}`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Export row */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                {exporting ? (
                  <div className="flex flex-col gap-3">
                    <ProgressBar value={exportProgress} label={exportLabel || 'Exporting…'} />
                    <p className="text-[12px] text-[#52525B] text-center">
                      Rendering {exportQuality} video with all effects applied — don&apos;t close this tab
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={handleExport}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-150"
                      style={{ background: 'linear-gradient(135deg,#6366f1 0%,#5558e8 100%)', boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 12px 32px rgba(99,102,241,0.3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.2)' }}>
                      <Sparkles className="w-4 h-4" />
                      Export {clips.length > 1 ? `${clips.length} clips →` : 'video →'}
                    </button>

                    {/* Quality selector */}
                    <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      {(['720p', '1080p'] as ExportQuality[]).map(q => (
                        <button key={q} onClick={() => setExportQuality(q)}
                          className="px-3 py-2 text-[12px] font-medium transition-colors duration-150"
                          style={{ background: exportQuality === q ? 'rgba(99,102,241,0.12)' : '#18181C', color: exportQuality === q ? '#a5b4fc' : '#52525B' }}>
                          {q}
                        </button>
                      ))}
                    </div>

                    <p className="text-[12px] text-[#52525B]">
                      {clips.length > 1 ? 'Merges all clips with transitions' : 'Effects & music baked in'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── Video library ───────────────────────────────────────────────────── */}
          {videos.length > 0 && stage === 'script' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-medium text-[#FAFAFA]">Previous videos</h2>
              {videos.slice(0, 5).map(v => (
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
                    Download
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
