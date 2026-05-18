'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { put } from '@vercel/blob/client'
import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import {
  Upload, Video, CheckCircle2, AlertCircle, Sparkles, X,
  ChevronRight, PenLine, Music, Type, Palette, MessageSquare,
  Layers, GitMerge, Plus, Trash2, ChevronUp, ChevronDown, Film,
} from 'lucide-react'
import {
  exportVideo, downloadBlob,
  type TransitionType, type ExportQuality,
  type CaptionStyle, type CaptionPos,
} from '@/lib/videoExport'

/* ─── Types ──────────────────────────────────────────── */
type Stage     = 'script' | 'upload' | 'uploading' | 'done' | 'error'
type StudioTab = 'grade' | 'captions' | 'music' | 'text' | 'clips' | 'transition'
type GradeKey  = 'original' | 'teal_orange' | 'moody' | 'bleach' | 'golden' | 'noir' | 'fuji' | 'vintage' | 'arctic' | 'kodak' | 'custom'

interface VideoRecord { id: string; name: string; script: string; originalUrl: string; enhancedUrl: string; createdAt: number }
interface Caption     { text: string; start: number; end: number }
interface Clip        { id: string; name: string; url: string; trimStart: number; trimEnd: number; duration: number }
interface CustomColor { exposure: number; contrast: number; saturation: number; temperature: number; highlights: number; shadows: number; tint: number }

const DEFAULT_CUSTOM: CustomColor = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, highlights: 0, shadows: 0, tint: 0 }

/* ─── Grade system ───────────────────────────────────── */
interface GradeLook { filter: string; color?: { bg: string; blend: string; opacity: number }; vignette?: number }

const GRADES: Record<GradeKey, GradeLook> = {
  original:    { filter: 'none' },
  teal_orange: { filter: 'contrast(1.18) brightness(0.82) saturate(0.62)', color: { bg: 'linear-gradient(135deg,rgb(0,90,90) 0%,rgb(110,40,0) 100%)', blend: 'color', opacity: 0.28 }, vignette: 0.72 },
  moody:       { filter: 'contrast(1.35) brightness(0.72) saturate(0.42)', color: { bg: 'linear-gradient(180deg,rgb(10,15,35) 0%,rgb(25,8,18) 100%)', blend: 'color', opacity: 0.38 }, vignette: 0.85 },
  bleach:      { filter: 'contrast(1.55) brightness(0.88) saturate(0.22)', color: { bg: 'linear-gradient(180deg,rgb(230,235,240) 0%,rgb(25,25,25) 100%)', blend: 'soft-light', opacity: 0.14 }, vignette: 0.48 },
  golden:      { filter: 'brightness(1.1) contrast(1.05) saturate(1.3)', color: { bg: 'linear-gradient(135deg,rgb(255,200,50) 0%,rgb(200,90,0) 100%)', blend: 'soft-light', opacity: 0.3 }, vignette: 0.32 },
  noir:        { filter: 'grayscale(1) contrast(1.45) brightness(0.78)', vignette: 0.88 },
  fuji:        { filter: 'brightness(1.04) contrast(1.08) saturate(0.88)', color: { bg: 'linear-gradient(135deg,rgb(180,220,170) 0%,rgb(245,215,175) 100%)', blend: 'soft-light', opacity: 0.18 }, vignette: 0.28 },
  vintage:     { filter: 'brightness(0.94) contrast(1.08) saturate(0.72) sepia(0.28)', color: { bg: 'linear-gradient(135deg,rgb(175,125,75) 0%,rgb(100,60,30) 100%)', blend: 'soft-light', opacity: 0.22 }, vignette: 0.58 },
  arctic:      { filter: 'brightness(1.14) contrast(1.06) saturate(0.52)', color: { bg: 'linear-gradient(180deg,rgb(195,228,255) 0%,rgb(95,148,220) 100%)', blend: 'color', opacity: 0.2 }, vignette: 0.22 },
  kodak:       { filter: 'brightness(1.05) contrast(1.12) saturate(1.08)', color: { bg: 'linear-gradient(135deg,rgb(255,198,112) 0%,rgb(195,155,78) 100%)', blend: 'soft-light', opacity: 0.2 }, vignette: 0.38 },
  custom:      { filter: 'none' },
}

const GRADE_META: { key: GradeKey; label: string; swatch: string; desc: string }[] = [
  { key: 'original',    label: 'Original',      swatch: 'linear-gradient(160deg,#3a3a3a 0%,#888 100%)',                    desc: 'No grade' },
  { key: 'teal_orange', label: 'Teal & Orange', swatch: 'linear-gradient(160deg,#003d3d 30%,#7a3000 100%)',               desc: 'Blockbuster' },
  { key: 'moody',       label: 'Moody',         swatch: 'linear-gradient(160deg,#070a18 0%,#150510 100%)',                desc: 'Dark drama' },
  { key: 'bleach',      label: 'Bleach',        swatch: 'linear-gradient(160deg,#d0d8e0 0%,#444 70%,#0a0a0a 100%)',      desc: 'Bypass' },
  { key: 'golden',      label: 'Golden',        swatch: 'linear-gradient(160deg,#a0620f 0%,#d48a10 55%,#b84f00 100%)',   desc: 'Sunset' },
  { key: 'noir',        label: 'Noir',          swatch: 'linear-gradient(160deg,#000 0%,#4a4a4a 55%,#0d0d0d 100%)',      desc: 'B&W' },
  { key: 'fuji',        label: 'Fuji',          swatch: 'linear-gradient(160deg,#4a7a4e 0%,#a8cc90 55%,#e8c880 100%)',   desc: 'Film stock' },
  { key: 'vintage',     label: 'Vintage',       swatch: 'linear-gradient(160deg,#5a2a10 0%,#a8703c 55%,#c89858 100%)',   desc: 'Faded warm' },
  { key: 'arctic',      label: 'Arctic',        swatch: 'linear-gradient(160deg,#90b8d8 0%,#6898c8 55%,#3868a8 100%)',   desc: 'Icy cool' },
  { key: 'kodak',       label: 'Kodak',         swatch: 'linear-gradient(160deg,#d8900c 0%,#e0a840 55%,#b86010 100%)',   desc: 'Warm stock' },
  { key: 'custom',      label: 'Custom',        swatch: 'linear-gradient(160deg,#4040c0 0%,#8050d8 55%,#6030b0 100%)',   desc: 'Manual' },
]

function buildCustomFilter(c: CustomColor): string {
  const brightness = 1 + (c.exposure + c.highlights * 0.3) / 200
  const shadowsAdj = c.shadows < 0 ? c.shadows / 400 : 0
  const contrast   = 1 + c.contrast / 200
  const saturate   = Math.max(0, 1 + c.saturation / 100)
  const parts = [
    `brightness(${(brightness + shadowsAdj).toFixed(2)})`,
    `contrast(${contrast.toFixed(2)})`,
    `saturate(${saturate.toFixed(2)})`,
  ]
  if (c.temperature > 0) parts.push(`sepia(${(c.temperature / 400).toFixed(3)})`)
  else if (c.temperature < 0) parts.push(`hue-rotate(${(c.temperature / 5).toFixed(1)}deg)`)
  if (c.tint !== 0) parts.push(`hue-rotate(${(c.tint / 20).toFixed(1)}deg)`)
  return parts.join(' ')
}

/* ─── Music ──────────────────────────────────────────── */
const MUSIC_MOODS = [
  { id: 'none',       label: 'No Music',   genre: '',            bpm: null, desc: 'Clean audio only',           url: null },
  { id: 'cinematic',  label: 'Cinematic',  genre: 'Orchestral',  bpm: 76,   desc: 'Epic emotional build',       url: 'https://assets.mixkit.co/music/preview/mixkit-epic-classical-music-intro-116.mp3' },
  { id: 'hype',       label: 'Hype',       genre: 'Hip-Hop',     bpm: 142,  desc: 'High energy, viral-ready',   url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3' },
  { id: 'lofi',       label: 'Lo-Fi',      genre: 'Chillhop',    bpm: 84,   desc: 'Relaxed study vibes',        url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3' },
  { id: 'corporate',  label: 'Corporate',  genre: 'Business',    bpm: 108,  desc: 'Professional & motivating',  url: 'https://assets.mixkit.co/music/preview/mixkit-corporate-achievement-27.mp3' },
  { id: 'emotional',  label: 'Emotional',  genre: 'Piano',       bpm: 68,   desc: 'Heartfelt storytelling',     url: 'https://assets.mixkit.co/music/preview/mixkit-sad-piano-loop-565.mp3' },
  { id: 'electronic', label: 'Electronic', genre: 'EDM',         bpm: 128,  desc: 'Future-forward energy',      url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3' },
  { id: 'ambient',    label: 'Ambient',    genre: 'Atmospheric', bpm: 60,   desc: 'Calm & meditative',          url: 'https://assets.mixkit.co/music/preview/mixkit-ambient-piano-562.mp3' },
  { id: 'acoustic',   label: 'Acoustic',   genre: 'Folk',        bpm: 96,   desc: 'Warm & authentic',           url: 'https://assets.mixkit.co/music/preview/mixkit-guitar-ambient-temple-553.mp3' },
  { id: 'dark',       label: 'Dark',       genre: 'Thriller',    bpm: 90,   desc: 'Tension & suspense',         url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3' },
  { id: 'jazz',       label: 'Jazz',       genre: 'Smooth Jazz', bpm: 112,  desc: 'Cool & sophisticated',       url: 'https://assets.mixkit.co/music/preview/mixkit-smooth-jazz-piano-209.mp3' },
]

/* ─── Caption metadata ───────────────────────────────── */
const CAPTION_STYLE_META: { id: CaptionStyle; label: string }[] = [
  { id: 'bold',    label: 'Bold' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'neon',    label: 'Neon' },
  { id: 'film',    label: 'Film' },
]

const CAPTION_SIZES: { id: number; label: string }[] = [
  { id: 0.7,  label: 'S' },
  { id: 1.0,  label: 'M' },
  { id: 1.35, label: 'L' },
  { id: 1.7,  label: 'XL' },
]

const CAPTION_POSITIONS: { id: CaptionPos; label: string; icon: string }[] = [
  { id: 'top',    label: 'Top',    icon: '↑' },
  { id: 'center', label: 'Center', icon: '↕' },
  { id: 'bottom', label: 'Bottom', icon: '↓' },
]

const SCRIPT_TEMPLATES = [
  { id: 'promo',        label: 'Business Promo',    placeholder: 'e.g. We make the best tacos in Austin — fresh ingredients, made to order, open late.' },
  { id: 'behindscenes', label: 'Behind the Scenes', placeholder: 'e.g. A day in our kitchen — from prep at 6am to the last order.' },
  { id: 'testimonial',  label: 'Customer Story',    placeholder: "e.g. Sarah's been coming every Friday for two years. Here's what she says." },
  { id: 'custom',       label: 'Write My Own',      placeholder: 'Write your script or talking points here...' },
]

const TRANSITION_OPTIONS: { id: TransitionType; label: string; desc: string }[] = [
  { id: 'none',     label: 'Hard Cut', desc: 'Instant cut between clips' },
  { id: 'fade',     label: 'Fade',     desc: 'Fade to black' },
  { id: 'dissolve', label: 'Dissolve', desc: 'Cross-dissolve blend' },
]

const POLL_INTERVAL = 4000

/* ─── Helpers ────────────────────────────────────────── */
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

/* ─── Sub-components ─────────────────────────────────── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, background: on ? '#6366f1' : '#27272a', border: on ? '0.5px solid rgba(99,102,241,0.5)' : '0.5px solid rgba(255,255,255,0.08)', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.18s' }} />
    </button>
  )
}

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
      <span style={{ fontSize: 13, color: stage === 'upload' ? '#FAFAFA' : s2done ? '#52525B' : '#3f3f46' }}>Upload</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <StepDot n={3} active={stage === 'uploading' || stage === 'done'} done={false} />
      <span style={{ fontSize: 13, color: stage === 'uploading' || stage === 'done' ? '#FAFAFA' : '#3f3f46' }}>Studio</span>
    </div>
  )
}

function RangeSlider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, color: '#71717A', letterSpacing: '0.01em' }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: value === 0 ? '#3f3f46' : '#818cf8' }}>
          {value > 0 && min < 0 ? '+' : ''}{value}{unit ?? ''}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full" style={{ accentColor: '#6366f1', height: 3, cursor: 'pointer' }} />
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────── */
function VideosInner() {
  const searchParams       = useSearchParams()
  const { data: session }  = useSession()
  const ideaHook   = searchParams.get('idea')   ?? ''
  const ideaFormat = searchParams.get('format') ?? ''

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const addClipInputRef = useRef<HTMLInputElement>(null)
  const dropRef         = useRef<HTMLDivElement>(null)
  const videoRef        = useRef<HTMLVideoElement>(null)
  const audioRef        = useRef<HTMLAudioElement>(null)
  const streamingRef    = useRef(false)

  // Flow
  const [stage, setStage]                     = useState<Stage>('script')
  const [uploadProgress, setUploadProgress]   = useState(0)
  const [errorMsg, setErrorMsg]               = useState('')
  const [dragging, setDragging]               = useState(false)
  const [videos, setVideos]                   = useState<VideoRecord[]>([])
  const [videosLoaded, setVideosLoaded]       = useState(false)

  // Clips
  const [clips, setClips]                     = useState<Clip[]>([])
  const [activeClipId, setActiveClipId]       = useState<string | null>(null)
  const [addingClip, setAddingClip]           = useState(false)
  const [addClipProgress, setAddClipProgress] = useState(0)

  // Script
  const [scriptText, setScriptText]           = useState('')
  const [isGenerating, setIsGenerating]       = useState(false)
  const [generationDone, setGenerationDone]   = useState(false)
  const [scriptGenError, setScriptGenError]   = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('promo')
  const [writeOwn, setWriteOwn]               = useState(false)

  // Studio
  const [activeTab, setActiveTab]             = useState<StudioTab>('grade')
  const [colorGrade, setColorGrade]           = useState<GradeKey>('original')
  const [customColor, setCustomColor]         = useState<CustomColor>(DEFAULT_CUSTOM)
  const [grain, setGrain]                     = useState(0)
  const [hookText, setHookText]               = useState('')
  const [ctaText, setCtaText]                 = useState('')
  const [showHook, setShowHook]               = useState(false)
  const [showCta, setShowCta]                 = useState(false)
  const [selectedMusic, setSelectedMusic]     = useState('none')
  const [captions, setCaptions]               = useState<Caption[]>([])
  const [captionsEnabled, setCaptionsEnabled] = useState(false)
  const [captionStyle, setCaptionStyle]       = useState<CaptionStyle>('bold')
  const [captionPos, setCaptionPos]           = useState<CaptionPos>('bottom')
  const [captionSize, setCaptionSize]         = useState(1.0)
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

  const activeClip      = clips.find(c => c.id === activeClipId) ?? clips[0] ?? null
  const displayUrl      = activeClip?.url ?? ''
  const hasIdea         = ideaHook.length > 0
  const currentTemplate = SCRIPT_TEMPLATES.find(t => t.id === selectedTemplate)!

  /* ── Preview filter ───────────────────────────────── */
  const previewFilter = colorGrade === 'custom'
    ? buildCustomFilter(customColor)
    : GRADES[colorGrade].filter !== 'none' ? GRADES[colorGrade].filter : undefined
  const previewGrade = GRADES[colorGrade]

  /* ── Caption overlay position ─────────────────────── */
  const captionOverlayStyle: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0,
    display: 'flex', justifyContent: 'center',
    padding: '0 10%',
    opacity: captionOpacity,
    transition: 'opacity 0.1s ease',
    ...(captionPos === 'top'    ? { top: '8%' }    : {}),
    ...(captionPos === 'center' ? { top: '45%', transform: 'translateY(-50%)' } : {}),
    ...(captionPos === 'bottom' ? { bottom: '12%' } : {}),
  }

  const captionTextStyle: React.CSSProperties = {
    textAlign: 'center',
    fontWeight: captionStyle === 'minimal' ? 500 : 700,
    fontSize: `clamp(${11 * captionSize}px,${2.6 * captionSize}vw,${18 * captionSize}px)`,
    lineHeight: 1.4,
    color: captionStyle === 'neon' ? '#a5b4fc' : '#FFFFFF',
    padding: captionStyle === 'film' ? '3px 12px' : undefined,
    background: captionStyle === 'film' ? 'rgba(0,0,0,0.7)' : undefined,
    borderRadius: captionStyle === 'film' ? 3 : undefined,
    textShadow:
      captionStyle === 'bold'    ? '-2px -2px 4px #000,2px -2px 4px #000,-2px 2px 4px #000,2px 2px 4px #000,0 0 8px rgba(0,0,0,0.8)' :
      captionStyle === 'minimal' ? '0 1px 3px rgba(0,0,0,0.9)' :
      captionStyle === 'neon'    ? '0 0 12px rgba(99,102,241,0.9),0 0 24px rgba(99,102,241,0.5)' : undefined,
  }

  /* ── Effects ──────────────────────────────────────── */
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

  const switchTab = useCallback((tab: StudioTab) => {
    setTabVisible(false)
    setTimeout(() => { setActiveTab(tab); setTabVisible(true) }, 120)
  }, [])

  const playMusic = useCallback((moodId: string) => {
    setSelectedMusic(moodId)
    const audio = audioRef.current
    if (!audio) return
    const mood = MUSIC_MOODS.find(m => m.id === moodId)
    audio.pause()
    if (!mood?.url) { audio.src = ''; audio.load(); return }
    audio.volume = 0.45; audio.loop = true; audio.crossOrigin = 'anonymous'
    audio.src = mood.url; audio.load()
    const p = audio.play()
    if (p) p.catch((e: Error) => { if (e.name !== 'AbortError') console.warn('[music]', e.name, e.message) })
  }, [])

  const transcribeFromAudio = useCallback(async () => {
    if (!displayUrl) return
    setTranscribing(true); setTranscribeError('')
    try {
      const res  = await fetch('/api/video/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: displayUrl }) })
      const data = await res.json()
      if (res.status === 429 || data.fallback) {
        const sc = buildCaptions(scriptText)
        if (sc.length) { setCaptions(sc); setCaptionsEnabled(true) } else setTranscribeError('Rate limited. Add a script to generate captions.')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
      if (data.segments?.length > 0) { setCaptions(data.segments); setCaptionsEnabled(true) }
      else setTranscribeError('No speech detected — add a script above to generate captions.')
    } catch {
      const sc = buildCaptions(scriptText)
      if (sc.length) { setCaptions(sc); setCaptionsEnabled(true) } else setTranscribeError('Transcription failed. Add a script to generate captions.')
    } finally { setTranscribing(false) }
  }, [displayUrl, scriptText])

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
          if (session?.user?.email && parsed.length > 0)
            fetch('/api/user/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videos: parsed }) }).catch(() => {})
        }
      } catch {}
      setVideosLoaded(true)
    }
    if (session !== undefined) load()
  }, [session, videosLoaded])

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

  const uploadClip = useCallback(async (file: File): Promise<Clip | null> => {
    try {
      const tokenRes = await fetch(`/api/video/upload?filename=${encodeURIComponent(file.name)}`)
      if (!tokenRes.ok) { const e = await tokenRes.json().catch(() => ({})); throw new Error(e.error ?? `Token request failed (${tokenRes.status})`) }
      const { clientToken, pathname } = await tokenRes.json()
      const blob = await put(pathname, file, { access: 'public', token: clientToken, onUploadProgress: ({ percentage }) => setUploadProgress(percentage) })
      return { id: Date.now().toString(), name: file.name, url: blob.url, trimStart: 0, trimEnd: 100, duration: 0 }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed — check your connection and try again.')
      setStage('error')
      return null
    }
  }, [])

  const startUpload = useCallback(async (file: File) => {
    setUploadProgress(0); setErrorMsg(''); setStage('uploading')
    const clip = await uploadClip(file)
    if (!clip) return
    const record: VideoRecord = { id: clip.id, name: file.name, script: scriptText, originalUrl: clip.url, enhancedUrl: clip.url, createdAt: Date.now() }
    setClips([clip]); setActiveClipId(clip.id)
    setVideos(prev => { const next = [record, ...prev]; saveVideos(next); return next })
    setStage('done')
    runEnhancementInBackground(clip.url, clip.id)
  }, [uploadClip, scriptText, saveVideos, runEnhancementInBackground])

  const addClip = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) return
    setAddingClip(true); setAddClipProgress(0)
    try {
      const tokenRes = await fetch(`/api/video/upload?filename=${encodeURIComponent(file.name)}`)
      const { clientToken, pathname } = await tokenRes.json()
      const blob = await put(pathname, file, { access: 'public', token: clientToken, onUploadProgress: ({ percentage }) => setAddClipProgress(percentage) })
      const newClip: Clip = { id: Date.now().toString(), name: file.name, url: blob.url, trimStart: 0, trimEnd: 100, duration: 0 }
      setClips(prev => [...prev, newClip]); setActiveClipId(newClip.id)
    } catch {}
    finally { setAddingClip(false) }
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) { setErrorMsg('Please upload a video file (MP4, MOV, etc.)'); setStage('error'); return }
    startUpload(file)
  }, [startUpload])

  const onDrop         = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }
  const onFileChange   = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }
  const onAddClipChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) addClip(f); e.target.value = '' }

  const updateClipTrim = (id: string, field: 'trimStart' | 'trimEnd', value: number) =>
    setClips(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))

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

  const handleExport = useCallback(async () => {
    if (clips.length === 0 || exporting) return
    setExporting(true); setExportProgress(0); setExportLabel('Preparing…')
    const grade    = GRADES[colorGrade]
    const musicUrl = MUSIC_MOODS.find(m => m.id === selectedMusic)?.url ?? null
    try {
      const blob = await exportVideo({
        clips: clips.map(c => ({ url: c.url, trimStart: c.trimStart, trimEnd: c.trimEnd })),
        colorFilter:     colorGrade === 'custom' ? buildCustomFilter(customColor) : grade.filter,
        colorOverlay:    colorGrade === 'custom' ? undefined : grade.color,
        vignetteOpacity: colorGrade === 'custom' ? 0 : grade.vignette,
        grain,
        captionsEnabled, captions,
        captionStyle, captionPos, captionSize,
        showHook, hookText,
        showCta, ctaText,
        musicUrl, musicVolume: 0.4,
        transition, transitionDuration,
        quality: exportQuality,
        onProgress: (pct, label) => { setExportProgress(pct); setExportLabel(label) },
      })
      downloadBlob(blob, `brandlift-${Date.now()}.webm`)
    } catch (err) {
      console.error('[export]', err)
      alert('Export failed — try a shorter clip or reload the page.')
    } finally { setExporting(false); setExportProgress(0); setExportLabel('') }
  }, [clips, exporting, colorGrade, customColor, grain, selectedMusic, captionsEnabled, captions, captionStyle, captionPos, captionSize, showHook, hookText, showCta, ctaText, transition, transitionDuration, exportQuality])

  const reset = () => {
    setStage('script'); setUploadProgress(0); setErrorMsg(''); setClips([]); setActiveClipId(null)
    setScriptText(''); setGenerationDone(false); setWriteOwn(false); setScriptGenError(false)
    setSelectedTemplate('promo'); streamingRef.current = false
    setColorGrade('original'); setCustomColor(DEFAULT_CUSTOM); setGrain(0)
    setHookText(''); setCtaText(''); setShowHook(false); setShowCta(false)
    setSelectedMusic('none'); setCaptions([]); setCaptionsEnabled(false); setCurrentCaption('')
    setCaptionStyle('bold'); setCaptionPos('bottom'); setCaptionSize(1.0)
    setTransition('fade'); setActiveTab('grade'); setTranscribing(false); setTranscribeError('')
    setDisplayedCaption(''); setCaptionOpacity(0); setExporting(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current.load() }
  }

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.02em' }}>Video Studio</h1>
              <p style={{ fontSize: 13, color: '#52525B', marginTop: 2 }}>
                {stage === 'done'
                  ? `${clips.length} clip${clips.length !== 1 ? 's' : ''} — grade, mix, and export`
                  : 'Write a script, upload footage, export a polished video'}
              </p>
            </div>
            {stage !== 'script' && stage !== 'done' && <Button variant="ghost" size="sm" onClick={reset}>← Start over</Button>}
          </div>

          <input ref={fileInputRef}    type="file" accept="video/*" className="hidden" onChange={onFileChange} />
          <input ref={addClipInputRef} type="file" accept="video/*" className="hidden" onChange={onAddClipChange} />

          {stage !== 'uploading' && stage !== 'done' && stage !== 'error' && <StepBar stage={stage} />}

          {/* ── STEP 1: SCRIPT ──────────────────────────── */}
          {stage === 'script' && (
            <div className="flex flex-col gap-5 p-6 rounded-2xl" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              {hasIdea && !writeOwn && (
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Sparkles className="w-4 h-4 text-[#6366f1] flex-shrink-0 mt-0.5" />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>AI Script</p>
                    <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }} className="italic">&ldquo;{ideaHook}&rdquo;</p>
                  </div>
                </div>
              )}

              {!writeOwn && !hasIdea && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#52525B', letterSpacing: '0.06em', textTransform: 'uppercase' }} className="mb-3">Template</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SCRIPT_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                        className="flex items-center gap-2 p-3 rounded-xl text-left transition-all duration-150"
                        style={{ background: selectedTemplate === t.id ? 'rgba(99,102,241,0.1)' : '#18181C', border: selectedTemplate === t.id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: selectedTemplate === t.id ? '#a5b4fc' : '#71717A' }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#A1A1AA' }}>
                    {hasIdea ? 'Generated script' : 'Your script / talking points'}
                  </label>
                  {isGenerating && <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#6366f1' }}><Sparkles className="w-3 h-3 animate-pulse" />Writing…</span>}
                  {generationDone && <span style={{ fontSize: 12, color: '#4ADE80' }}>✓ Script ready</span>}
                </div>
                <textarea
                  value={scriptText} onChange={e => setScriptText(e.target.value)}
                  rows={6} placeholder={currentTemplate.placeholder}
                  className="w-full px-3 py-2.5 rounded-[10px] text-[14px] resize-none leading-relaxed"
                  style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.08)', color: '#E4E4E7', outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }} />
                {scriptGenError && <p style={{ fontSize: 12, color: '#f87171' }}>Couldn&apos;t generate — write your own script above.</p>}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="primary" size="md" onClick={() => setStage('upload')} className="flex items-center gap-2">
                  Continue to upload <ChevronRight className="w-4 h-4" />
                </Button>
                {!writeOwn && (
                  <button onClick={() => setWriteOwn(true)} className="flex items-center gap-1 transition-colors" style={{ fontSize: 13, color: '#52525B' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                    <PenLine className="w-3 h-3" />Write my own
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: UPLOAD ──────────────────────────── */}
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
                <p style={{ fontSize: 15, fontWeight: 600, color: '#FAFAFA' }}>Drop your video here</p>
                <p style={{ fontSize: 13, color: '#52525B', marginTop: 4 }}>MP4, MOV, WebM — up to 500 MB</p>
              </div>
              <Button variant="primary" size="sm" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
                Browse files
              </Button>
            </div>
          )}

          {/* ── UPLOADING ────────────────────────────────── */}
          {stage === 'uploading' && (
            <div className="p-6 rounded-2xl flex flex-col gap-4" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <Video className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div className="flex-1">
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#FAFAFA' }}>Uploading video…</p>
                  <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>Hang tight — this only takes a moment</p>
                </div>
              </div>
              <ProgressBar value={uploadProgress} label="Upload progress" />
            </div>
          )}

          {/* ── ERROR ────────────────────────────────────── */}
          {stage === 'error' && (
            <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ background: 'rgba(239,68,68,0.05)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#fca5a5' }}>Upload failed</p>
                  <p style={{ fontSize: 13, color: 'rgba(248,113,113,0.7)', marginTop: 4, lineHeight: 1.5 }}>{errorMsg}</p>
                </div>
                <button onClick={reset} style={{ color: 'rgba(248,113,113,0.5)' }}><X className="w-4 h-4" /></button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStage('upload')} className="self-start">Try again</Button>
            </div>
          )}

          {/* ── STUDIO ───────────────────────────────────── */}
          {stage === 'done' && displayUrl && (
            <div className="flex flex-col gap-5">

              {/* Done bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#FAFAFA' }}>
                    {clips.length === 1 ? clips[0].name : `${clips.length} clips ready`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {addingClip ? (
                    <span style={{ fontSize: 12, color: '#818cf8' }}>Uploading… {Math.round(addClipProgress)}%</span>
                  ) : (
                    <button onClick={() => addClipInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                      style={{ color: '#71717A', border: '0.5px solid rgba(255,255,255,0.08)', background: '#111113' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#818cf8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#71717A'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)' }}>
                      <Plus className="w-3.5 h-3.5" />Add clip
                    </button>
                  )}
                  <Button variant="ghost" size="sm" onClick={reset}>New video</Button>
                </div>
              </div>

              {/* Clip tabs */}
              {clips.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {clips.map((c, i) => (
                    <button key={c.id} onClick={() => setActiveClipId(c.id)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                      style={{ background: activeClip?.id === c.id ? 'rgba(99,102,241,0.1)' : '#18181C', border: activeClip?.id === c.id ? '1px solid rgba(99,102,241,0.3)' : '0.5px solid rgba(255,255,255,0.06)', color: activeClip?.id === c.id ? '#a5b4fc' : '#52525B' }}>
                      <Film className="w-3 h-3" />Clip {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Video preview */}
              <div className="relative w-full rounded-2xl overflow-hidden"
                style={{ border: '0.5px solid rgba(255,255,255,0.08)', boxShadow: '0 0 32px rgba(0,0,0,0.6), 0 0 1px rgba(99,102,241,0.15)' }}>

                {/* Preview label */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Preview</span>
                </div>

                <video
                  ref={videoRef} src={displayUrl} controls className="w-full block"
                  style={{ filter: previewFilter, display: 'block' }}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => {
                    if (!videoRef.current || !activeClip) return
                    const dur = videoRef.current.duration
                    setClips(prev => prev.map(c => c.id === activeClip.id ? { ...c, duration: dur } : c))
                  }} />

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

                {/* Hook */}
                {showHook && hookText && (
                  <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none" style={{ padding: '6% 10% 0' }}>
                    <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 'clamp(12px,3.5vw,20px)', color: '#FAFAFA', textShadow: '-1px -1px 3px #000,1px -1px 3px #000,-1px 1px 3px #000,1px 1px 3px #000', lineHeight: 1.35 }}>
                      {hookText}
                    </p>
                  </div>
                )}

                {/* Captions */}
                {captionsEnabled && displayedCaption && (
                  <div style={captionOverlayStyle} className="pointer-events-none">
                    <p style={captionTextStyle}>{displayedCaption}</p>
                  </div>
                )}

                {/* CTA */}
                {showCta && ctaText && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none" style={{ padding: '0 10% 5%' }}>
                    <p style={{ textAlign: 'center', fontWeight: 600, fontSize: 'clamp(11px,2.8vw,16px)', color: '#a5b4fc', textShadow: '-1px -1px 3px #000,1px -1px 3px #000,-1px 1px 3px #000,1px 1px 3px #000' }}>
                      {ctaText}
                    </p>
                  </div>
                )}
              </div>

              <audio ref={audioRef} />

              {/* Studio panel */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>

                {/* Tab bar */}
                <div className="flex overflow-x-auto" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  {([
                    { id: 'grade'      as StudioTab, label: 'Color', Icon: Palette },
                    { id: 'captions'   as StudioTab, label: 'Captions', Icon: Type },
                    { id: 'music'      as StudioTab, label: 'Music', Icon: Music },
                    { id: 'text'       as StudioTab, label: 'Text', Icon: MessageSquare },
                    { id: 'clips'      as StudioTab, label: 'Clips', Icon: Layers },
                    { id: 'transition' as StudioTab, label: 'Transitions', Icon: GitMerge },
                  ] as const).map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => switchTab(id)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium transition-colors duration-150 relative whitespace-nowrap"
                      style={{ color: activeTab === id ? '#FAFAFA' : '#52525B', background: 'transparent', minWidth: 0 }}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />{label}
                      {activeTab === id && (
                        <span className="absolute bottom-0 left-0 right-0 h-px" style={{ background: '#6366f1', boxShadow: '0 0 6px rgba(99,102,241,0.6)' }} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-5" style={{ opacity: tabVisible ? 1 : 0, transform: tabVisible ? 'translateY(0)' : 'translateY(4px)', transition: 'opacity 120ms ease, transform 120ms ease' }}>

                  {/* ── COLOR GRADE ─────────────────────── */}
                  {activeTab === 'grade' && (
                    <div className="flex flex-col gap-5">
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Color Grade</p>
                        <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>Cinematic film looks — applied live and baked into export</p>
                      </div>

                      {/* Film strip swatches */}
                      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
                        {GRADE_META.map(({ key, label, swatch, desc }) => (
                          <button key={key} onClick={() => setColorGrade(key)}
                            className="flex-shrink-0 flex flex-col gap-1.5 transition-all duration-150"
                            style={{ width: 76 }}>
                            <div className="w-full rounded-xl overflow-hidden transition-all duration-200"
                              style={{
                                height: 50,
                                background: swatch,
                                outline: colorGrade === key ? '2px solid #6366f1' : '1.5px solid rgba(255,255,255,0.06)',
                                outlineOffset: colorGrade === key ? 2 : 0,
                                boxShadow: colorGrade === key ? '0 0 14px rgba(99,102,241,0.35)' : 'none',
                              }}>
                              {colorGrade === key && (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', borderRadius: 999, padding: '1px 6px', fontSize: 8, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.08em' }}>
                                    ON
                                  </div>
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ fontSize: 10.5, fontWeight: 600, color: colorGrade === key ? '#a5b4fc' : '#71717A' }}>{label}</p>
                              <p style={{ fontSize: 9.5, color: '#3f3f46', marginTop: 1 }}>{desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Film grain */}
                      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#A1A1AA' }}>Film Grain</span>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: grain > 0 ? '#818cf8' : '#3f3f46' }}>{grain}%</span>
                        </div>
                        <input type="range" min={0} max={100} value={grain}
                          onChange={e => setGrain(Number(e.target.value))}
                          className="w-full" style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                        <div className="flex justify-between">
                          <span style={{ fontSize: 10, color: '#3f3f46' }}>Clean</span>
                          <span style={{ fontSize: 10, color: '#3f3f46' }}>Heavy grain</span>
                        </div>
                      </div>

                      {/* Custom controls */}
                      {colorGrade === 'custom' && (
                        <div className="flex flex-col gap-4 p-4 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(99,102,241,0.15)' }}>
                          <div className="flex items-center justify-between">
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Tone</p>
                            <button onClick={() => setCustomColor(DEFAULT_CUSTOM)} style={{ fontSize: 11, color: '#52525B', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                              Reset
                            </button>
                          </div>
                          <RangeSlider label="Exposure"   value={customColor.exposure}   min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, exposure: v }))} />
                          <RangeSlider label="Contrast"   value={customColor.contrast}   min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, contrast: v }))} />
                          <RangeSlider label="Highlights" value={customColor.highlights} min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, highlights: v }))} />
                          <RangeSlider label="Shadows"    value={customColor.shadows}    min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, shadows: v }))} />
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Color</p>
                          <RangeSlider label="Saturation"  value={customColor.saturation}  min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, saturation: v }))} />
                          <RangeSlider label="Temperature" value={customColor.temperature} min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, temperature: v }))} />
                          <RangeSlider label="Tint"        value={customColor.tint}        min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, tint: v }))} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── CAPTIONS ────────────────────────── */}
                  {activeTab === 'captions' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Captions</p>
                          <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>Auto-generated from audio or script</p>
                        </div>
                        <Toggle on={captionsEnabled} onToggle={() => setCaptionsEnabled(p => !p)} />
                      </div>

                      <button onClick={transcribeFromAudio} disabled={transcribing}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
                        style={{ background: transcribing ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: transcribing ? '#52525B' : '#a5b4fc' }}>
                        {transcribing ? <><Sparkles className="w-3.5 h-3.5 animate-pulse" />Transcribing… ~30s</> : <><Sparkles className="w-3.5 h-3.5" />Generate from audio</>}
                      </button>
                      {transcribeError && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>{transcribeError}</p>}

                      {/* Caption style */}
                      <div className="flex flex-col gap-2">
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Style</p>
                        <div className="grid grid-cols-4 gap-2">
                          {CAPTION_STYLE_META.map(s => (
                            <button key={s.id} onClick={() => setCaptionStyle(s.id)}
                              className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all duration-150"
                              style={{ background: captionStyle === s.id ? 'rgba(99,102,241,0.1)' : '#18181C', border: captionStyle === s.id ? '1px solid rgba(99,102,241,0.35)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                              <span style={{
                                fontSize: 13,
                                fontWeight: s.id === 'bold' ? 900 : s.id === 'minimal' ? 400 : 700,
                                color: s.id === 'neon' ? '#a5b4fc' : '#FAFAFA',
                                textShadow: s.id === 'bold' ? '-1px -1px 2px #000,1px 1px 2px #000' : s.id === 'neon' ? '0 0 8px rgba(99,102,241,0.8)' : 'none',
                                background: s.id === 'film' ? 'rgba(0,0,0,0.65)' : 'none',
                                padding: s.id === 'film' ? '0 4px' : 0,
                                borderRadius: s.id === 'film' ? 2 : 0,
                                display: 'inline-block',
                              }}>Aa</span>
                              <span style={{ fontSize: 10.5, fontWeight: 600, color: captionStyle === s.id ? '#a5b4fc' : '#52525B' }}>{s.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Position + Size */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Position</p>
                          <div className="flex flex-col gap-1">
                            {CAPTION_POSITIONS.map(p => (
                              <button key={p.id} onClick={() => setCaptionPos(p.id)}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-150"
                                style={{ background: captionPos === p.id ? 'rgba(99,102,241,0.1)' : 'transparent', border: captionPos === p.id ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid transparent' }}>
                                <span style={{ fontSize: 11, color: captionPos === p.id ? '#818cf8' : '#3f3f46', width: 14 }}>{p.icon}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: captionPos === p.id ? '#a5b4fc' : '#71717A' }}>{p.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Size</p>
                          <div className="flex flex-col gap-1">
                            {CAPTION_SIZES.map(s => (
                              <button key={s.id} onClick={() => setCaptionSize(s.id)}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-150"
                                style={{ background: captionSize === s.id ? 'rgba(99,102,241,0.1)' : 'transparent', border: captionSize === s.id ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid transparent' }}>
                                <span style={{ fontSize: Math.round(s.id * 11), fontWeight: 700, color: captionSize === s.id ? '#818cf8' : '#3f3f46', lineHeight: 1, minWidth: 14, textAlign: 'center' }}>A</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: captionSize === s.id ? '#a5b4fc' : '#71717A' }}>{s.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Caption list */}
                      {captions.length > 0 ? (
                        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                          {captions.map((c, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#3f3f46', flexShrink: 0, paddingTop: 1 }}>
                                {Math.floor(c.start / 60).toString().padStart(2,'0')}:{(c.start % 60).toFixed(0).padStart(2,'0')}
                              </span>
                              <p style={{ fontSize: 12, color: '#71717A', lineHeight: 1.5 }}>{c.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 rounded-xl text-center" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.04)' }}>
                          <p style={{ fontSize: 12, color: '#3f3f46' }}>No captions yet — click above to transcribe</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── MUSIC ───────────────────────────── */}
                  {activeTab === 'music' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Background Music</p>
                        <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>Royalty-free — mixed in at 40% volume on export</p>
                      </div>
                      <div className="flex flex-col">
                        {MUSIC_MOODS.map((m, i) => (
                          <button key={m.id} onClick={() => playMusic(m.id)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                            style={{
                              background: selectedMusic === m.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                              border: selectedMusic === m.id ? '0.5px solid rgba(99,102,241,0.25)' : '0.5px solid transparent',
                              marginBottom: i < MUSIC_MOODS.length - 1 ? 1 : 0,
                            }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: selectedMusic === m.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {selectedMusic === m.id && m.id !== 'none' ? (
                                <span className="relative flex w-2 h-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
                                  <span className="relative inline-flex rounded-full w-2 h-2 bg-[#4ADE80]" />
                                </span>
                              ) : (
                                <Music style={{ width: 14, height: 14, color: m.id === 'none' ? '#3f3f46' : '#52525B' }} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p style={{ fontSize: 13, fontWeight: 600, color: selectedMusic === m.id ? '#FAFAFA' : '#A1A1AA' }}>{m.label}</p>
                              {m.desc && <p style={{ fontSize: 11, color: '#52525B' }}>{m.desc}</p>}
                            </div>
                            {m.genre && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#52525B', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px' }}>{m.genre}</span>
                                {m.bpm && <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#3f3f46' }}>{m.bpm}</span>}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── TEXT OVERLAYS ────────────────────── */}
                  {activeTab === 'text' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Text Overlays</p>
                        <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>Hook at the top, call-to-action at the bottom</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        {[
                          { label: 'Opening hook (top)', key: 'hook' as const, text: hookText, setText: setHookText, on: showHook, setOn: setShowHook, placeholder: 'e.g. This changed everything for my business…' },
                          { label: 'Call to action (bottom)', key: 'cta' as const, text: ctaText, setText: setCtaText, on: showCta, setOn: setShowCta, placeholder: 'e.g. Follow for more tips!' },
                        ].map(item => (
                          <div key={item.key} className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA' }}>{item.label}</span>
                              <Toggle on={item.on} onToggle={() => item.setOn(p => !p)} />
                            </div>
                            <input type="text" value={item.text} onChange={e => item.setText(e.target.value)}
                              placeholder={item.placeholder}
                              className="w-full rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] outline-none"
                              style={{ background: 'rgba(10,10,11,0.8)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── CLIPS ───────────────────────────── */}
                  {activeTab === 'clips' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Clip Manager</p>
                          <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>Reorder, trim, or remove individual clips</p>
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
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
                              <Film className="w-4 h-4 text-[#6366f1]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p style={{ fontSize: 13, fontWeight: 500, color: '#FAFAFA' }} className="truncate">{c.name}</p>
                              {c.duration > 0 && (
                                <p style={{ fontSize: 11, color: '#52525B' }}>
                                  {fmtSec(c.duration * (c.trimEnd - c.trimStart) / 100)} selected · {fmtSec(c.duration)} total
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setActiveClipId(c.id)} className="text-[11px] px-2 py-1 rounded transition-colors"
                                style={{ color: activeClip?.id === c.id ? '#818cf8' : '#52525B', background: activeClip?.id === c.id ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                                Preview
                              </button>
                              <button onClick={() => moveClip(c.id, -1)} disabled={i === 0} className="p-1 rounded transition-colors disabled:opacity-20" style={{ color: '#52525B' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => moveClip(c.id, 1)} disabled={i === clips.length - 1} className="p-1 rounded transition-colors disabled:opacity-20" style={{ color: '#52525B' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removeClip(c.id)} className="p-1 rounded transition-colors" style={{ color: '#52525B' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {c.duration > 0 && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span style={{ fontSize: 11, color: '#52525B' }}>Trim start</span>
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#818cf8' }}>{fmtSec((c.trimStart / 100) * c.duration)}</span>
                              </div>
                              <input type="range" min={0} max={c.trimEnd - 1} value={c.trimStart}
                                onChange={e => updateClipTrim(c.id, 'trimStart', Number(e.target.value))}
                                className="w-full" style={{ accentColor: '#6366f1' }} />
                              <div className="flex items-center justify-between">
                                <span style={{ fontSize: 11, color: '#52525B' }}>Trim end</span>
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#818cf8' }}>{fmtSec((c.trimEnd / 100) * c.duration)}</span>
                              </div>
                              <input type="range" min={c.trimStart + 1} max={100} value={c.trimEnd}
                                onChange={e => updateClipTrim(c.id, 'trimEnd', Number(e.target.value))}
                                className="w-full" style={{ accentColor: '#6366f1' }} />
                            </div>
                          )}
                        </div>
                      ))}

                      {clips.length === 0 && (
                        <p style={{ fontSize: 13, color: '#52525B', textAlign: 'center', padding: '16px 0' }}>No clips — add some above.</p>
                      )}
                    </div>
                  )}

                  {/* ── TRANSITIONS ─────────────────────── */}
                  {activeTab === 'transition' && (
                    <div className="flex flex-col gap-5">
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Transitions</p>
                        <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>Applied between clips on export</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {TRANSITION_OPTIONS.map(t => (
                          <button key={t.id} onClick={() => setTransition(t.id)}
                            className="flex flex-col gap-2 p-4 rounded-xl transition-all duration-150"
                            style={{ background: transition === t.id ? 'rgba(99,102,241,0.1)' : '#18181C', border: transition === t.id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: transition === t.id ? '#a5b4fc' : '#A1A1AA' }}>{t.label}</span>
                            <span style={{ fontSize: 11, color: '#52525B' }}>{t.desc}</span>
                          </button>
                        ))}
                      </div>

                      {transition !== 'none' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span style={{ fontSize: 12, color: '#A1A1AA' }}>Duration</span>
                            <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#818cf8' }}>{transitionDuration.toFixed(1)}s</span>
                          </div>
                          <input type="range" min={20} max={150} value={Math.round(transitionDuration * 100)}
                            onChange={e => setTransitionDuration(Number(e.target.value) / 100)}
                            className="w-full" style={{ accentColor: '#6366f1' }} />
                          <div className="flex justify-between" style={{ fontSize: 10, color: '#3f3f46' }}>
                            <span>0.2s</span><span>1.5s</span>
                          </div>
                        </div>
                      )}

                      {clips.length > 1 && (
                        <div className="px-3 py-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.05)', border: '0.5px solid rgba(99,102,241,0.15)' }}>
                          <p style={{ fontSize: 12, color: '#818cf8' }}>
                            {transition === 'none'
                              ? `Hard cuts between ${clips.length} clips`
                              : `${transition === 'fade' ? 'Fade to black' : 'Cross-dissolve'} between ${clips.length - 1} clip transition${clips.length > 2 ? 's' : ''}`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Export row */}
              <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                {exporting ? (
                  <div className="flex flex-col gap-3">
                    <ProgressBar value={exportProgress} label={exportLabel || 'Rendering…'} />
                    <p style={{ fontSize: 12, color: '#52525B', textAlign: 'center' }}>
                      Rendering {exportQuality} — all effects applied. Don&apos;t close this tab.
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

                    <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      {(['720p', '1080p'] as ExportQuality[]).map(q => (
                        <button key={q} onClick={() => setExportQuality(q)}
                          className="px-3 py-2 text-[12px] font-medium transition-colors duration-150"
                          style={{ background: exportQuality === q ? 'rgba(99,102,241,0.12)' : '#18181C', color: exportQuality === q ? '#a5b4fc' : '#52525B' }}>
                          {q}
                        </button>
                      ))}
                    </div>

                    <p style={{ fontSize: 12, color: '#3f3f46' }}>
                      {clips.length > 1 ? 'Merges all clips with transitions' : 'Color · Captions · Music baked in'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Video library */}
          {videos.length > 0 && stage === 'script' && (
            <div className="flex flex-col gap-3">
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#A1A1AA' }}>Previous videos</h2>
              {videos.slice(0, 5).map(v => (
                <div key={v.id} className="flex items-center gap-4 p-4 rounded-[12px]" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                    <CheckCircle2 className="w-4 h-4 text-[#6366f1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#FAFAFA' }} className="truncate">{v.name}</p>
                    <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }} className="truncate">{v.script || 'No script'}</p>
                  </div>
                  <a href={v.enhancedUrl || v.originalUrl} download target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0 transition-colors"
                    style={{ color: '#71717A', border: '0.5px solid rgba(255,255,255,0.08)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FAFAFA'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#71717A'}>
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
