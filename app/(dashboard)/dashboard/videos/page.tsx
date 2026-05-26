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
  Layers, GitMerge, Plus, Trash2, ChevronUp, ChevronDown, Film, Lock,
  Share2, Users,
} from 'lucide-react'
import {
  exportVideo, downloadBlob,
  type TransitionType, type ExportQuality, type ExportAspect,
  type CaptionStyle, type CaptionPos,
} from '@/lib/videoExport'
import { useBetaAccess } from '@/lib/betaAccess'

/* ─── Types ──────────────────────────────────────────── */
type Stage     = 'script' | 'upload' | 'uploading' | 'done' | 'error'
type StudioTab = 'grade' | 'captions' | 'music' | 'text' | 'clips' | 'transition' | 'copy'
type CopyPlatform = 'tiktok' | 'instagram' | 'youtube' | 'linkedin'
interface PostCopy { title: string; caption: string; hashtags: string[]; cta: string }
interface HookItem { text: string; style: string; emoji: string }
interface ScriptScore { score: number; grade: string; color: string; tips: string[] }
type GradeKey  = 'original' | 'teal_orange' | 'moody' | 'bleach' | 'golden' | 'noir' | 'fuji' | 'vintage' | 'arctic' | 'kodak' | 'custom'

interface VideoRecord  { id: string; name: string; script: string; originalUrl: string; enhancedUrl: string; createdAt: number }
interface Caption      { text: string; start: number; end: number }
interface Clip         { id: string; name: string; url: string; trimStart: number; trimEnd: number; duration: number }
interface PexelsResult { id: number; thumbnail: string; url: string; width: number; height: number; duration: number; photographer: string }
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
  { id: 'pov',          label: 'POV Format',        placeholder: 'e.g. POV: you finally found a barber who actually listens to what you want.' },
  { id: 'storytime',    label: 'Story Time',        placeholder: 'e.g. A customer walked in crying last week. Here\'s what happened.' },
  { id: 'hottake',      label: 'Hot Take',          placeholder: 'e.g. Most coffee shops don\'t actually care about flavor. Here\'s why mine is different.' },
  { id: 'countdown',    label: 'Countdown',         placeholder: 'e.g. 5 things about our bakery that nobody talks about.' },
  { id: 'behindscenes', label: 'Behind the Scenes', placeholder: 'e.g. A day in our kitchen — from prep at 6am to the last order.' },
  { id: 'testimonial',  label: 'Customer Story',    placeholder: "e.g. Sarah's been coming every Friday for two years. Here's what she says." },
  { id: 'custom',       label: 'Write My Own',      placeholder: 'Write your script or talking points here...' },
]

const PLATFORM_OPTIONS: { id: ExportAspect; label: string; desc: string }[] = [
  { id: '16:9', label: 'YouTube', desc: 'Landscape 16:9' },
  { id: '9:16', label: 'TikTok',  desc: 'Vertical 9:16' },
  { id: '1:1',  label: 'Square',  desc: 'Instagram 1:1' },
]

const TRANSITION_OPTIONS: { id: TransitionType; label: string; desc: string }[] = [
  { id: 'none',     label: 'Hard Cut', desc: 'Instant cut between clips' },
  { id: 'fade',     label: 'Fade',     desc: 'Fade to black' },
  { id: 'dissolve', label: 'Dissolve', desc: 'Cross-dissolve blend' },
]

/* ─── Quick Looks presets ────────────────────────────── */
interface QuickLook {
  id: string; label: string; desc: string; swatch: string
  grade: GradeKey; music: string; captionStyle: CaptionStyle; captionPos: CaptionPos; captions: boolean
  letterbox?: boolean; halation?: number
}
const QUICK_LOOKS: QuickLook[] = [
  { id: 'viral-tiktok', label: 'Viral TikTok',  desc: 'Teal/orange + hype beat',        swatch: 'linear-gradient(135deg,#003d3d 0%,#7a3000 100%)', grade: 'teal_orange', music: 'hype',      captionStyle: 'bold',    captionPos: 'center', captions: true  },
  { id: 'warm-brand',   label: 'Warm Brand',    desc: 'Golden hour + acoustic',          swatch: 'linear-gradient(135deg,#a0620f 0%,#d48a10 100%)', grade: 'golden',      music: 'acoustic',  captionStyle: 'minimal', captionPos: 'bottom', captions: true  },
  { id: 'cinematic',    label: 'Cinematic',     desc: 'Letterbox · halation · moody',   swatch: 'linear-gradient(135deg,#070a18 0%,#150510 100%)', grade: 'moody',       music: 'cinematic', captionStyle: 'film',    captionPos: 'bottom', captions: true,  letterbox: true, halation: 40 },
  { id: 'clean-pro',    label: 'Clean Pro',     desc: 'No grade + corporate',            swatch: 'linear-gradient(135deg,#3a3a3a 0%,#888 100%)',    grade: 'original',    music: 'corporate', captionStyle: 'bold',    captionPos: 'bottom', captions: false },
  { id: 'retro',        label: 'Retro',         desc: 'Vintage film + jazz',             swatch: 'linear-gradient(135deg,#5a2a10 0%,#a8703c 100%)', grade: 'vintage',     music: 'jazz',      captionStyle: 'film',    captionPos: 'bottom', captions: true,  halation: 20 },
  { id: 'noir-drama',   label: 'Noir Drama',    desc: 'B&W + tension score',             swatch: 'linear-gradient(135deg,#000 0%,#4a4a4a 100%)',    grade: 'noir',        music: 'dark',      captionStyle: 'minimal', captionPos: 'center', captions: true,  letterbox: true },
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

/* Parse Whisper output from Replicate into Caption[] */
interface WSegment { start: number; end: number; text: string }
function parseWhisperOutput(output: unknown): Caption[] {
  const o = output as { segments?: WSegment[]; transcription?: string; text?: string } | null
  if (!o) return []
  const segs = o.segments ?? []
  if (segs.length > 0) {
    const result: Caption[] = []
    let buf = '', bufStart = 0
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const merged = (buf + ' ' + seg.text.trim()).trim()
      const wordCount = merged.split(/\s+/).length
      if (wordCount >= 5 || i === segs.length - 1) {
        if (merged) result.push({ text: merged, start: bufStart || seg.start, end: seg.end })
        buf = ''; bufStart = 0
      } else {
        buf = merged
        if (!bufStart) bufStart = seg.start
      }
    }
    return result.filter(c => c.text.length > 0)
  }
  const text = o.transcription ?? o.text ?? ''
  return text ? buildCaptions(text) : []
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
  const [sharingId, setSharingId]             = useState<string | null>(null)
  const [sharedIds, setSharedIds]             = useState<Set<string>>(new Set())

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
  const [noiseReduce, setNoiseReduce]         = useState(false)
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
  const [editingCaption, setEditingCaption]   = useState<number | null>(null)
  const [newCaptionText, setNewCaptionText]   = useState('')
  const [newCaptionStart, setNewCaptionStart] = useState('')
  const [newCaptionEnd, setNewCaptionEnd]     = useState('')
  const [showAddCaption, setShowAddCaption]   = useState(false)
  const [currentCaption, setCurrentCaption]   = useState('')
  const [displayedCaption, setDisplayedCaption] = useState('')
  const [captionOpacity, setCaptionOpacity]   = useState(0)
  const [transcribing, setTranscribing]       = useState(false)
  const [transcribeError, setTranscribeError] = useState('')
  const [transition, setTransition]           = useState<TransitionType>('fade')
  const [transitionDuration, setTransitionDuration] = useState(0.6)
  const [tabVisible, setTabVisible]           = useState(true)

  // B-roll search
  const [pexelsQuery, setPexelsQuery]               = useState('')
  const [pexelsResults, setPexelsResults]           = useState<PexelsResult[]>([])
  const [pexelsSearching, setPexelsSearching]       = useState(false)
  const [pexelsTotal, setPexelsTotal]               = useState(0)

  // AI Tools
  const [hashtagsOpen, setHashtagsOpen]             = useState(false)
  const [hashtags, setHashtags]                     = useState<string[]>([])
  const [generatingHashtags, setGeneratingHashtags] = useState(false)
  const [socialOpen, setSocialOpen]                 = useState(false)
  const [socialCaptions, setSocialCaptions]         = useState<{platform: string; caption: string}[] | null>(null)
  const [generatingSocial, setGeneratingSocial]     = useState(false)

  // Quick Looks
  const [activeQuickLook, setActiveQuickLook] = useState<string | null>(null)

  // Hook Generator
  const [hooks, setHooks]                     = useState<HookItem[]>([])
  const [generatingHooks, setGeneratingHooks] = useState(false)
  const [hooksOpen, setHooksOpen]             = useState(false)

  // Script Virality Score
  const [scriptScore, setScriptScore]         = useState<ScriptScore | null>(null)
  const [scoringScript, setScoringScript]     = useState(false)
  const [scoreOpen, setScoreOpen]             = useState(false)

  // Post Copy (studio tab)
  const [copyPlatform, setCopyPlatform]       = useState<CopyPlatform>('tiktok')
  const [copyData, setCopyData]               = useState<Partial<Record<CopyPlatform, PostCopy>>>({})
  const [copyLoading, setCopyLoading]         = useState(false)

  // Cinematic FX
  const [letterbox, setLetterbox]             = useState(false)
  const [halation, setHalation]               = useState(0)

  // Export
  const [exportQuality, setExportQuality]     = useState<ExportQuality>('1080p')
  const [exportAspect, setExportAspect]       = useState<ExportAspect>('16:9')
  const [exporting, setExporting]             = useState(false)
  const [exportProgress, setExportProgress]   = useState(0)
  const [exportLabel, setExportLabel]         = useState('')

  const activeClip      = clips.find(c => c.id === activeClipId) ?? clips[0] ?? null
  const displayUrl      = activeClip?.url ?? ''
  const hasIdea         = ideaHook.length > 0
  const currentTemplate = SCRIPT_TEMPLATES.find(t => t.id === selectedTemplate)!

  /* ── Preview filter ───────────────────────────────── */
  const baseFilter = colorGrade === 'custom'
    ? buildCustomFilter(customColor)
    : GRADES[colorGrade].filter !== 'none' ? GRADES[colorGrade].filter : ''
  const previewFilter = [baseFilter, noiseReduce ? 'contrast(1.08) saturate(1.06)' : ''].filter(Boolean).join(' ') || undefined
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

  const transcribeFromAudio = useCallback(async (urlOverride?: string) => {
    const url = urlOverride ?? displayUrl
    if (!url || transcribing) return
    setTranscribing(true); setTranscribeError('')

    const fallbackToScript = () => {
      const sc = buildCaptions(scriptText)
      if (sc.length) { setCaptions(sc); setCaptionsEnabled(true) }
      else setTranscribeError('No speech detected. Add a script above to generate captions.')
    }

    try {
      const res = await fetch('/api/video/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: url }),
      })
      if (res.status === 429) { fallbackToScript(); return }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? 'Transcription start failed')
      }
      const data = await res.json()

      // Completed within Replicate's wait window
      if (data.segments?.length > 0) {
        setCaptions(data.segments); setCaptionsEnabled(true); return
      }

      // Need to poll via /api/video/status/[id]
      if (!data.id) { fallbackToScript(); return }

      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3500))
        const statusRes = await fetch(`/api/video/status/${data.id}`)
        if (!statusRes.ok) continue
        const s = await statusRes.json()
        if ((s.status === 'succeeded' || s.status === 'completed') && s.output) {
          const segs = parseWhisperOutput(s.output)
          if (segs.length) { setCaptions(segs); setCaptionsEnabled(true) }
          else fallbackToScript()
          return
        }
        if (s.status === 'failed' || s.error) { fallbackToScript(); return }
      }
      fallbackToScript() // 2.5 min timeout
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : 'Transcription failed')
      fallbackToScript()
    } finally {
      setTranscribing(false)
    }
  }, [displayUrl, scriptText, transcribing])

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

  const shareVideo = useCallback(async (v: VideoRecord) => {
    if (sharingId) return
    setSharingId(v.id)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: v.enhancedUrl || v.originalUrl,
          caption: v.script?.slice(0, 280),
          script: v.script,
        }),
      })
      if (res.ok) {
        setSharedIds(prev => new Set(prev).add(v.id))
      }
    } catch {} finally {
      setSharingId(null)
    }
  }, [sharingId])

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

  const [scriptGenMsg, setScriptGenMsg] = useState('')

  // Beta access
  const beta = useBetaAccess()
  const [showBetaPanel, setShowBetaPanel] = useState(false)
  const [betaCodeInput, setBetaCodeInput] = useState('')

  const runScriptGen = useCallback(async (idea: string, format: string) => {
    if (streamingRef.current) return
    streamingRef.current = true; setIsGenerating(true); setGenerationDone(false); setScriptText(''); setScriptGenError(false); setScriptGenMsg('')
    try {
      const res = await fetch('/api/video/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea, format }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // data.error may be an object — always coerce to string
        const msg = typeof data.error === 'string' ? data.error : (data.error?.message ?? `API error ${res.status}`)
        setScriptGenMsg(msg)
        setScriptGenError(true); return
      }
      if (data.script) { setScriptText(data.script); setGenerationDone(true) }
      else { setScriptGenMsg('Empty response from AI'); setScriptGenError(true) }
    } catch (err) {
      setScriptGenMsg(err instanceof Error ? err.message : 'Network error')
      setScriptGenError(true)
    }
    finally { streamingRef.current = false; setIsGenerating(false) }
  }, [])

  useEffect(() => {
    if (!hasIdea || writeOwn || streamingRef.current) return
    runScriptGen(ideaHook, ideaFormat)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIdea, writeOwn])

  const generateFromTemplate = useCallback(() => {
    // Use what the user typed as their idea; strip the "e.g." prefix from placeholder if empty
    const idea = scriptText.trim() || currentTemplate.placeholder.replace(/^e\.g\.\s*/i, '')
    runScriptGen(idea, selectedTemplate)
  }, [scriptText, currentTemplate.placeholder, selectedTemplate, runScriptGen])

  const generateHashtags = useCallback(async () => {
    if (!scriptText.trim() || generatingHashtags) return
    setGeneratingHashtags(true); setHashtagsOpen(true); setHashtags([])
    try {
      const res = await fetch('/api/hashtags/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: scriptText, platform: 'tiktok' }) })
      const data = await res.json()
      if (data.hashtags) setHashtags(data.hashtags)
    } catch {}
    finally { setGeneratingHashtags(false) }
  }, [scriptText, generatingHashtags])

  const generateSocialCaptions = useCallback(async () => {
    if (!scriptText.trim() || generatingSocial) return
    setGeneratingSocial(true); setSocialOpen(true); setSocialCaptions(null)
    try {
      const res = await fetch('/api/captions/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: scriptText }) })
      const data = await res.json()
      if (data.captions) setSocialCaptions(data.captions)
    } catch {}
    finally { setGeneratingSocial(false) }
  }, [scriptText, generatingSocial])

  const generateHooks = useCallback(async () => {
    if (!scriptText.trim() || generatingHooks) return
    setGeneratingHooks(true); setHooksOpen(true); setHooks([])
    try {
      const res = await fetch('/api/hooks/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: scriptText }) })
      const data = await res.json()
      if (data.hooks) setHooks(data.hooks)
    } catch {}
    finally { setGeneratingHooks(false) }
  }, [scriptText, generatingHooks])

  const scoreScript = useCallback(async () => {
    if (!scriptText.trim() || scoringScript) return
    setScoringScript(true); setScoreOpen(true); setScriptScore(null)
    try {
      const res = await fetch('/api/script/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: scriptText }) })
      const data = await res.json()
      if (typeof data.score === 'number') setScriptScore(data)
    } catch {}
    finally { setScoringScript(false) }
  }, [scriptText, scoringScript])

  const generatePostCopy = useCallback(async (platform: CopyPlatform) => {
    if (!scriptText.trim() || copyLoading) return
    setCopyLoading(true)
    try {
      const res = await fetch('/api/video/post-copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: scriptText, platform }) })
      const data = await res.json()
      if (data.copy) setCopyData(prev => ({ ...prev, [platform]: data.copy }))
    } catch {}
    finally { setCopyLoading(false) }
  }, [scriptText, copyLoading])

  const searchPexels = useCallback(async (q: string) => {
    if (!q.trim() || pexelsSearching) return
    setPexelsSearching(true); setPexelsResults([])
    try {
      const res = await fetch(`/api/pexels/search?q=${encodeURIComponent(q)}&orientation=portrait&per_page=12`)
      const data = await res.json()
      setPexelsResults(data.videos ?? [])
      setPexelsTotal(data.total ?? 0)
    } catch {}
    finally { setPexelsSearching(false) }
  }, [pexelsSearching])

  const useStockVideo = useCallback((video: PexelsResult) => {
    const clip: Clip = { id: `pexels-${video.id}`, name: `Stock: ${video.photographer}`, url: video.url, trimStart: 0, trimEnd: 100, duration: video.duration }
    const record: VideoRecord = { id: clip.id, name: clip.name, script: scriptText, originalUrl: video.url, enhancedUrl: video.url, createdAt: Date.now() }
    setClips([clip]); setActiveClipId(clip.id)
    setVideos(prev => { const next = [record, ...prev]; saveVideos(next); return next })
    setStage('done')
    // Stock videos have background music/ambient audio — use script captions instead
    const sc = buildCaptions(scriptText)
    if (sc.length) { setCaptions(sc); setCaptionsEnabled(true) }
  }, [scriptText, saveVideos])

  const [enhancementStatus, setEnhancementStatus] = useState<'idle' | 'enhancing' | 'done' | 'failed'>('idle')

  const runEnhancementInBackground = useCallback(async (blobUrl: string, recordId: string) => {
    setEnhancementStatus('enhancing')
    try {
      const res = await fetch('/api/video/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: blobUrl }) })
      if (!res.ok) { setEnhancementStatus('failed'); return }
      const data = await res.json()
      if (!data.id) { setEnhancementStatus('failed'); return }
      const poll = async (): Promise<void> => {
        try {
          const r = await fetch(`/api/video/status/${data.id}`); const d = await r.json()
          if ((d.status === 'succeeded' || d.status === 'completed') && d.output) {
            const enhanced = Array.isArray(d.output) ? d.output[0] : d.output
            setVideos(prev => { const next = prev.map(v => v.id === recordId ? { ...v, enhancedUrl: enhanced } : v); saveVideos(next); return next })
            setClips(prev => prev.map(c => c.id === recordId ? { ...c, url: enhanced } : c))
            setEnhancementStatus('done')
          } else if (d.status === 'failed' || d.error) {
            setEnhancementStatus('failed')
          } else {
            await new Promise(r => setTimeout(r, POLL_INTERVAL)); return poll()
          }
        } catch { setEnhancementStatus('failed') }
      }
      await poll()
    } catch { setEnhancementStatus('failed') }
  }, [saveVideos])

  const uploadProgressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startProgressAnimation = useCallback(() => {
    let pct = 0
    uploadProgressRef.current = setInterval(() => {
      pct = Math.min(pct + (90 - pct) * 0.06, 90)
      setUploadProgress(Math.round(pct))
    }, 200)
  }, [])

  const stopProgressAnimation = useCallback((final: number) => {
    if (uploadProgressRef.current) clearInterval(uploadProgressRef.current)
    setUploadProgress(final)
  }, [])

  const uploadClip = useCallback(async (file: File): Promise<Clip | null> => {
    try {
      const tokenRes = await fetch(`/api/video/upload?filename=${encodeURIComponent(file.name)}`)
      if (!tokenRes.ok) { const e = await tokenRes.json().catch(() => ({})); throw new Error(e.error ?? `Token request failed (${tokenRes.status})`) }
      const { clientToken, pathname } = await tokenRes.json()
      startProgressAnimation()
      const blob = await put(pathname, file, { access: 'public', token: clientToken })
      stopProgressAnimation(100)
      return { id: Date.now().toString(), name: file.name, url: blob.url, trimStart: 0, trimEnd: 100, duration: 0 }
    } catch (err: unknown) {
      stopProgressAnimation(0)
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed — check your connection and try again.')
      setStage('error')
      return null
    }
  }, [startProgressAnimation, stopProgressAnimation])

  const startUpload = useCallback(async (file: File) => {
    setUploadProgress(0); setErrorMsg(''); setStage('uploading')
    const clip = await uploadClip(file)
    if (!clip) return
    const record: VideoRecord = { id: clip.id, name: file.name, script: scriptText, originalUrl: clip.url, enhancedUrl: clip.url, createdAt: Date.now() }
    setClips([clip]); setActiveClipId(clip.id)
    setVideos(prev => { const next = [record, ...prev]; saveVideos(next); return next })
    setStage('done')
    // Auto-transcribe from actual audio (fires in bg; falls back to script if no speech)
    setTimeout(() => transcribeFromAudio(clip.url), 400)
  }, [uploadClip, scriptText, saveVideos, runEnhancementInBackground, transcribeFromAudio])

  const addClip = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) return
    setAddingClip(true); setAddClipProgress(0)
    try {
      const tokenRes = await fetch(`/api/video/upload?filename=${encodeURIComponent(file.name)}`)
      const { clientToken, pathname } = await tokenRes.json()
      const blob = await put(pathname, file, { access: 'public', token: clientToken })
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
        letterbox,
        halation,
        captionsEnabled, captions,
        captionStyle, captionPos, captionSize,
        showHook, hookText,
        showCta, ctaText,
        musicUrl, musicVolume: 0.4,
        transition, transitionDuration,
        quality: exportQuality,
        aspect:  exportAspect,
        onProgress: (pct, label) => { setExportProgress(pct); setExportLabel(label) },
      })
      downloadBlob(blob, `brandlift-${Date.now()}.webm`)
    } catch (err) {
      console.error('[export]', err)
      alert('Export failed — try a shorter clip or reload the page.')
    } finally { setExporting(false); setExportProgress(0); setExportLabel('') }
  }, [clips, exporting, colorGrade, customColor, grain, letterbox, halation, selectedMusic, captionsEnabled, captions, captionStyle, captionPos, captionSize, showHook, hookText, showCta, ctaText, transition, transitionDuration, exportQuality, exportAspect])

  const reset = () => {
    setStage('script'); setUploadProgress(0); setErrorMsg(''); setClips([]); setActiveClipId(null)
    setScriptText(''); setGenerationDone(false); setWriteOwn(false); setScriptGenError(false)
    setSelectedTemplate('promo'); streamingRef.current = false
    setColorGrade('original'); setCustomColor(DEFAULT_CUSTOM); setGrain(0); setNoiseReduce(false)
    setHookText(''); setCtaText(''); setShowHook(false); setShowCta(false)
    setSelectedMusic('none'); setCaptions([]); setCaptionsEnabled(false); setCurrentCaption('')
    setCaptionStyle('bold'); setCaptionPos('bottom'); setCaptionSize(1.0)
    setEditingCaption(null); setShowAddCaption(false); setNewCaptionText(''); setNewCaptionStart(''); setNewCaptionEnd('')
    setExportAspect('16:9'); setEnhancementStatus('idle'); setShowBetaPanel(false); setBetaCodeInput('')
    setLetterbox(false); setHalation(0)
    setTransition('fade'); setActiveTab('grade'); setTranscribing(false); setTranscribeError('')
    setDisplayedCaption(''); setCaptionOpacity(0); setExporting(false)
    setHashtagsOpen(false); setHashtags([]); setGeneratingHashtags(false)
    setSocialOpen(false); setSocialCaptions(null); setGeneratingSocial(false)
    setHooks([]); setGeneratingHooks(false); setHooksOpen(false)
    setScriptScore(null); setScoringScript(false); setScoreOpen(false)
    setCopyPlatform('tiktok'); setCopyData({}); setCopyLoading(false)
    setPexelsQuery(''); setPexelsResults([]); setPexelsSearching(false); setPexelsTotal(0)
    setActiveQuickLook(null)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current.load() }
  }

  const applyQuickLook = useCallback((look: QuickLook) => {
    setActiveQuickLook(look.id)
    setColorGrade(look.grade)
    setCaptionStyle(look.captionStyle)
    setCaptionPos(look.captionPos)
    setCaptionsEnabled(look.captions)
    setLetterbox(look.letterbox ?? false)
    setHalation(look.halation ?? 0)
    const prev = selectedMusic
    setSelectedMusic(look.music)
    if (look.music !== 'none' && look.music !== prev && audioRef.current) {
      const track = MUSIC_MOODS.find(m => m.id === look.music)
      if (track?.url) {
        audioRef.current.src = track.url
        audioRef.current.volume = 0.35
        audioRef.current.loop = true
        audioRef.current.play().catch(() => {})
      }
    }
    setActiveTab('grade')
    switchTab('grade')
  }, [selectedMusic, switchTab])

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
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-0.5">
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
                {scriptGenError && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
                    <p style={{ fontSize: 12, color: '#f87171', lineHeight: 1.5 }}>
                      {scriptGenMsg || 'Generation failed — write your own or retry below'}
                    </p>
                    <button
                      onClick={() => {
                        setScriptGenError(false)
                        if (hasIdea) { setWriteOwn(false); streamingRef.current = false }
                        else generateFromTemplate()
                      }}
                      style={{ fontSize: 12, color: '#818cf8', textDecoration: 'underline', cursor: 'pointer', alignSelf: 'flex-start' }}>
                      retry
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="primary" size="md" onClick={() => setStage('upload')} className="flex items-center gap-2">
                  Continue to upload <ChevronRight className="w-4 h-4" />
                </Button>
                {!hasIdea && !isGenerating && (
                  <Button
                    variant="ghost" size="md"
                    onClick={generateFromTemplate}
                    className="flex items-center gap-1.5"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                    <Sparkles className="w-3.5 h-3.5" />Generate with AI
                  </Button>
                )}
                {!writeOwn && !isGenerating && (
                  <button onClick={() => setWriteOwn(true)} className="flex items-center gap-1 transition-colors" style={{ fontSize: 13, color: '#52525B' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                    <PenLine className="w-3 h-3" />Write my own
                  </button>
                )}
              </div>

              {/* ── AI Tools ───────────────────────────── */}
              {scriptText.trim().length > 20 && !isGenerating && (
                <div className="flex flex-col gap-3 pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 11, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>AI Tools</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={generateHashtags}
                      disabled={generatingHashtags}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                      style={{ background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.25)', color: '#a5b4fc', cursor: generatingHashtags ? 'default' : 'pointer', opacity: generatingHashtags ? 0.6 : 1 }}
                    >
                      <span style={{ fontWeight: 700 }}>#</span>
                      {generatingHashtags ? 'Generating…' : 'Hashtags'}
                    </button>
                    <button
                      onClick={generateSocialCaptions}
                      disabled={generatingSocial}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '0.5px solid rgba(139,92,246,0.25)', color: '#c4b5fd', cursor: generatingSocial ? 'default' : 'pointer', opacity: generatingSocial ? 0.6 : 1 }}
                    >
                      <MessageSquare className="w-3 h-3" />
                      {generatingSocial ? 'Generating…' : 'Social Captions'}
                    </button>
                    <button
                      onClick={generateHooks}
                      disabled={generatingHooks}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                      style={{ background: 'rgba(251,146,60,0.08)', border: '0.5px solid rgba(251,146,60,0.25)', color: '#fdba74', cursor: generatingHooks ? 'default' : 'pointer', opacity: generatingHooks ? 0.6 : 1 }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {generatingHooks ? 'Generating…' : 'Hook Ideas'}
                    </button>
                    <button
                      onClick={scoreScript}
                      disabled={scoringScript}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                      style={{ background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.2)', color: '#86efac', cursor: scoringScript ? 'default' : 'pointer', opacity: scoringScript ? 0.6 : 1 }}
                    >
                      <ChevronRight className="w-3 h-3" />
                      {scoringScript ? 'Scoring…' : 'Virality Score'}
                    </button>
                  </div>

                  {/* Hashtags panel */}
                  {hashtagsOpen && (
                    <div className="flex flex-col gap-2.5 p-3 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center justify-between">
                        <p style={{ fontSize: 11, color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hashtags</p>
                        <div className="flex items-center gap-3">
                          {hashtags.length > 0 && (
                            <button onClick={() => navigator.clipboard.writeText(hashtags.join(' '))}
                              style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer', background: 'none', border: 'none' }}>
                              Copy all
                            </button>
                          )}
                          <button onClick={() => setHashtagsOpen(false)} style={{ fontSize: 13, color: '#52525B', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}>✕</button>
                        </div>
                      </div>
                      {generatingHashtags ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {[10,14,8,12,9,11,7,13,10,8,12,9,11,7,10].map((w,i) => (
                            <div key={i} className="h-6 rounded-lg animate-pulse" style={{ width: w * 7, background: 'rgba(255,255,255,0.06)' }} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {hashtags.map(tag => (
                            <button key={tag} onClick={() => navigator.clipboard.writeText(tag)} title="Click to copy"
                              className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all duration-150"
                              style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '0.5px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)' }}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social captions panel */}
                  {socialOpen && (
                    <div className="flex flex-col gap-2.5 p-3 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center justify-between">
                        <p style={{ fontSize: 11, color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Social Captions</p>
                        <button onClick={() => setSocialOpen(false)} style={{ fontSize: 13, color: '#52525B', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}>✕</button>
                      </div>
                      {generatingSocial ? (
                        <div className="flex flex-col gap-2">
                          {[56, 40, 48].map((h,i) => (
                            <div key={i} className="rounded-lg animate-pulse" style={{ height: h, background: 'rgba(255,255,255,0.04)' }} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {socialCaptions?.map(({ platform, caption }) => (
                            <div key={platform} className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <div className="flex items-center justify-between">
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{platform}</span>
                                <button onClick={() => navigator.clipboard.writeText(caption)}
                                  style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer', background: 'none', border: 'none' }}>
                                  Copy
                                </button>
                              </div>
                              <p style={{ fontSize: 12, color: '#E4E4E7', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{caption}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hook Ideas panel */}
                  {hooksOpen && (
                    <div className="flex flex-col gap-2.5 p-3 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(251,146,60,0.15)' }}>
                      <div className="flex items-center justify-between">
                        <p style={{ fontSize: 11, color: '#fb923c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hook Ideas</p>
                        <button onClick={() => setHooksOpen(false)} style={{ fontSize: 13, color: '#52525B', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}>✕</button>
                      </div>
                      {generatingHooks ? (
                        <div className="flex flex-col gap-2">
                          {[44, 36, 44, 36, 44].map((h,i) => (
                            <div key={i} className="rounded-lg animate-pulse" style={{ height: h, background: 'rgba(255,255,255,0.04)' }} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {hooks.map((hook, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg group" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <span style={{ fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>{hook.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 12, color: '#E4E4E7', lineHeight: 1.6 }}>{hook.text}</p>
                                <span style={{ fontSize: 10, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{hook.style}</span>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => { setScriptText(hook.text); }}
                                  className="px-2 py-1 rounded text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ background: 'rgba(251,146,60,0.1)', color: '#fdba74', border: '0.5px solid rgba(251,146,60,0.25)' }}>
                                  Use
                                </button>
                                <button
                                  onClick={() => navigator.clipboard.writeText(hook.text)}
                                  className="px-2 py-1 rounded text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                                  Copy
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Virality Score panel */}
                  {scoreOpen && (
                    <div className="flex flex-col gap-3 p-3 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(74,222,128,0.12)' }}>
                      <div className="flex items-center justify-between">
                        <p style={{ fontSize: 11, color: '#4ADE80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Virality Score</p>
                        <button onClick={() => setScoreOpen(false)} style={{ fontSize: 13, color: '#52525B', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }}>✕</button>
                      </div>
                      {scoringScript ? (
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }} />
                          <div className="flex flex-col gap-1.5 flex-1">
                            {[80, 60, 70].map((w,i) => (
                              <div key={i} className="rounded animate-pulse" style={{ height: 10, width: `${w}%`, background: 'rgba(255,255,255,0.04)' }} />
                            ))}
                          </div>
                        </div>
                      ) : scriptScore ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke={scriptScore.color} strokeWidth="3"
                                  strokeDasharray={`${scriptScore.score} 100`} strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span style={{ fontSize: 16, fontWeight: 800, color: scriptScore.color, lineHeight: 1 }}>{scriptScore.grade}</span>
                                <span style={{ fontSize: 9, color: '#52525B' }}>{scriptScore.score}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA' }}>
                                {scriptScore.score >= 85 ? 'High viral potential' : scriptScore.score >= 70 ? 'Good script' : scriptScore.score >= 55 ? 'Needs improvement' : 'Weak hook'}
                              </p>
                              <p style={{ fontSize: 11, color: '#52525B' }}>Score out of 100</p>
                            </div>
                          </div>
                          {scriptScore.tips.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {scriptScore.tips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span style={{ fontSize: 10, color: scriptScore.color, flexShrink: 0, marginTop: 2 }}>→</span>
                                  <p style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>{tip}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

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

          {/* ── B-ROLL SEARCH (shown in upload stage) ──── */}
          {stage === 'upload' && (
            <div className="flex flex-col gap-4">
              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 12, color: '#3f3f46', whiteSpace: 'nowrap' }}>or search free stock footage</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Search bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pexelsQuery}
                  onChange={e => setPexelsQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchPexels(pexelsQuery) }}
                  placeholder="coffee shop, yoga, restaurant kitchen…"
                  className="flex-1 px-3 py-2.5 rounded-xl text-[13px]"
                  style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)', color: '#E4E4E7', outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
                <button
                  onClick={() => searchPexels(pexelsQuery)}
                  disabled={pexelsSearching || !pexelsQuery.trim()}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 flex-shrink-0"
                  style={{ background: pexelsSearching || !pexelsQuery.trim() ? '#18181C' : 'rgba(99,102,241,0.15)', color: pexelsSearching || !pexelsQuery.trim() ? '#52525B' : '#a5b4fc', border: '0.5px solid rgba(99,102,241,0.2)', cursor: pexelsSearching || !pexelsQuery.trim() ? 'not-allowed' : 'pointer' }}
                >
                  {pexelsSearching ? 'Searching…' : 'Search'}
                </button>
              </div>

              {/* Quick tags */}
              {pexelsResults.length === 0 && !pexelsSearching && (
                <div className="flex gap-2 flex-wrap">
                  {['barber shop', 'coffee shop', 'yoga', 'restaurant', 'gym', 'retail store', 'food prep', 'city street'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => { setPexelsQuery(tag); searchPexels(tag) }}
                      className="px-2.5 py-1 rounded-lg text-[12px] transition-all duration-150"
                      style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.07)', color: '#71717A', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A1A1AA'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading skeletons */}
              {pexelsSearching && (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl animate-pulse" style={{ aspectRatio: '9/16', background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              )}

              {/* Results grid */}
              {pexelsResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p style={{ fontSize: 11, color: '#52525B' }}>
                    {pexelsTotal.toLocaleString()} results — click to use
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {pexelsResults.map(video => (
                      <button
                        key={video.id}
                        onClick={() => useStockVideo(video)}
                        className="relative rounded-xl overflow-hidden group"
                        style={{ aspectRatio: '9/16', cursor: 'pointer', background: '#18181C' }}
                        title={`By ${video.photographer} · ${video.duration}s`}
                      >
                        <img
                          src={video.thumbnail}
                          alt={`Stock footage by ${video.photographer}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Hover overlay */}
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ background: 'rgba(10,10,11,0.75)', backdropFilter: 'blur(4px)' }}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.9)' }}>
                            <Plus className="w-4 h-4 text-white" />
                          </div>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Use clip</span>
                        </div>
                        {/* Duration badge */}
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                          style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
                          {video.duration}s
                        </div>
                        {/* Pexels attribution */}
                        <div className="absolute bottom-1.5 left-1.5 text-[8px]"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Pexels
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#FAFAFA' }} className="truncate">
                    {clips.length === 1 ? clips[0].name : `${clips.length} clips ready`}
                  </p>
                  {enhancementStatus === 'enhancing' && (
                    <span className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                      <Sparkles className="w-3 h-3 animate-pulse" />AI enhancing…
                    </span>
                  )}
                  {enhancementStatus === 'done' && (
                    <span className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'rgba(74,222,128,0.08)', border: '0.5px solid rgba(74,222,128,0.3)', color: '#4ADE80' }}>
                      ✦ Enhanced
                    </span>
                  )}
                  {enhancementStatus === 'failed' && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                      title="Enhancement failed — check REPLICATE_API_TOKEN">
                      Enhancement unavailable
                    </span>
                  )}
                  {beta.has('enhancement') && (enhancementStatus === 'idle' || enhancementStatus === 'failed') && (
                    <button
                      onClick={() => { if (activeClip) runEnhancementInBackground(activeClip.url, activeClip.id) }}
                      className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] transition-colors"
                      style={{ background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                      <Sparkles className="w-2.5 h-2.5" />{enhancementStatus === 'failed' ? 'Retry enhance' : 'Enhance'}
                    </button>
                  )}
                  {!beta.has('enhancement') && enhancementStatus === 'idle' && (
                    <button onClick={() => setShowBetaPanel(true)}
                      className="flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] transition-colors"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '0.5px solid rgba(139,92,246,0.25)', color: '#8b5cf6' }}>
                      <Lock className="w-2.5 h-2.5" />AI Enhancement
                    </button>
                  )}
                  {beta.unlocked && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest" style={{ background: 'rgba(99,102,241,0.12)', border: '0.5px solid rgba(99,102,241,0.3)', color: '#6366f1', letterSpacing: '0.1em' }}>
                      BETA
                    </span>
                  )}
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
                    const vw = videoRef.current.videoWidth
                    const vh = videoRef.current.videoHeight
                    if (vw && vh) {
                      const r = vw / vh
                      setExportAspect(r < 0.8 ? '9:16' : r > 1.2 ? '16:9' : '1:1')
                    }
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

                {/* Letterbox bars — 2.39:1 cinema ratio preview (~12.8% each side for 16:9 video) */}
                {letterbox && (
                  <>
                    <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: '12.8%', background: '#000000', zIndex: 8 }} />
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '12.8%', background: '#000000', zIndex: 8 }} />
                  </>
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

              {/* Quick Looks row */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Looks</p>
                  {activeQuickLook && (
                    <button onClick={() => { setActiveQuickLook(null); setColorGrade('original'); setSelectedMusic('none'); setCaptionsEnabled(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' } }}
                      style={{ fontSize: 11, color: '#52525B', cursor: 'pointer', background: 'none', border: 'none' }}>
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
                  {QUICK_LOOKS.map(look => {
                    const active = activeQuickLook === look.id
                    return (
                      <button
                        key={look.id}
                        onClick={() => applyQuickLook(look)}
                        className="flex flex-col items-start gap-2 p-2.5 rounded-xl flex-shrink-0 transition-all duration-150"
                        style={{
                          width: 104,
                          background: active ? 'rgba(99,102,241,0.1)' : '#111113',
                          border: active ? '1px solid rgba(99,102,241,0.45)' : '0.5px solid rgba(255,255,255,0.07)',
                          boxShadow: active ? '0 0 0 1px rgba(99,102,241,0.15)' : 'none',
                        }}
                      >
                        <div className="w-full h-12 rounded-lg flex-shrink-0" style={{ background: look.swatch, boxShadow: active ? `0 2px 8px rgba(0,0,0,0.4)` : 'none' }} />
                        <div className="flex flex-col gap-0.5 w-full">
                          <p style={{ fontSize: 11, fontWeight: 700, color: active ? '#a5b4fc' : '#E4E4E7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{look.label}</p>
                          <p style={{ fontSize: 10, color: '#52525B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{look.desc}</p>
                        </div>
                        {active && <div className="w-full h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Studio panel */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>

                {/* Tab bar */}
                <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {([
                    { id: 'grade'      as StudioTab, label: 'Color', Icon: Palette },
                    { id: 'captions'   as StudioTab, label: 'Captions', Icon: Type },
                    { id: 'music'      as StudioTab, label: 'Music', Icon: Music },
                    { id: 'text'       as StudioTab, label: 'Text', Icon: MessageSquare },
                    { id: 'clips'      as StudioTab, label: 'Clips', Icon: Layers },
                    { id: 'transition' as StudioTab, label: 'Cuts', Icon: GitMerge },
                    { id: 'copy'       as StudioTab, label: 'Post Copy', Icon: PenLine },
                  ] as const).map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => switchTab(id)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-[11px] font-semibold tracking-wide uppercase transition-all duration-150 relative whitespace-nowrap"
                      style={{ color: activeTab === id ? '#FAFAFA' : '#3f3f46', background: 'transparent', letterSpacing: '0.05em' }}>
                      <Icon className="w-3 h-3 flex-shrink-0" />{label}
                      {activeTab === id && (
                        <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', boxShadow: '0 0 8px rgba(99,102,241,0.7)' }} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-5" style={{ opacity: tabVisible ? 1 : 0, transform: tabVisible ? 'translateY(0)' : 'translateY(4px)', transition: 'opacity 120ms ease, transform 120ms ease' }}>

                  {/* ── COLOR GRADE ─────────────────────── */}
                  {activeTab === 'grade' && (
                    <div className="flex flex-col gap-5">

                      {/* Active grade label */}
                      <div className="flex items-baseline justify-between">
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.02em' }}>
                          {GRADE_META.find(g => g.key === colorGrade)?.label ?? 'Color Grade'}
                        </p>
                        <p style={{ fontSize: 11, color: '#3f3f46', fontFamily: 'monospace' }}>
                          {GRADE_META.find(g => g.key === colorGrade)?.desc ?? ''}
                        </p>
                      </div>

                      {/* Film strip swatches — cinematic 2:1 aspect */}
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                        {GRADE_META.map(({ key, label, swatch }) => (
                          <button key={key} onClick={() => setColorGrade(key)}
                            className="flex-shrink-0 flex flex-col gap-2 transition-all duration-200"
                            style={{ width: 82 }}>
                            {/* Swatch — 2:1 cinematic ratio */}
                            <div className="w-full relative overflow-hidden transition-all duration-200"
                              style={{
                                height: 46,
                                borderRadius: 8,
                                background: swatch,
                                outline: colorGrade === key ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                outlineOffset: colorGrade === key ? 2 : 0,
                                boxShadow: colorGrade === key ? '0 0 16px rgba(99,102,241,0.4), 0 2px 8px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.3)',
                              }}>
                              {/* Letterbox bars — cinematic look */}
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: 'rgba(0,0,0,0.55)' }} />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(0,0,0,0.55)' }} />
                              {colorGrade === key && (
                                <div style={{ position: 'absolute', top: 6, right: 5, width: 12, height: 12, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: 7, color: '#fff', fontWeight: 900 }}>✓</span>
                                </div>
                              )}
                            </div>
                            <p style={{ fontSize: 10, fontWeight: colorGrade === key ? 700 : 500, color: colorGrade === key ? '#a5b4fc' : '#52525B', textAlign: 'center', letterSpacing: '0.02em' }}>{label}</p>
                          </button>
                        ))}
                      </div>

                      {/* Noise reduction — beta feature */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: '#0d0d10', border: `0.5px solid ${noiseReduce ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA' }}>Noise Reduction</span>
                            {!beta.has('noise_reduce') && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '0.5px solid rgba(139,92,246,0.25)' }}>
                                <Lock className="w-2 h-2" />BETA
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: '#3f3f46' }}>
                            {noiseReduce ? 'Active — sharpening applied' : 'Reduce visual noise and boost clarity'}
                          </span>
                        </div>
                        {beta.has('noise_reduce') ? (
                          <Toggle on={noiseReduce} onToggle={() => setNoiseReduce(p => !p)} />
                        ) : (
                          <button onClick={() => setShowBetaPanel(true)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{ background: 'rgba(139,92,246,0.1)', border: '0.5px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}>
                            Unlock
                          </button>
                        )}
                      </div>

                      {/* Film grain — with presets */}
                      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA', letterSpacing: '0.02em' }}>Film Grain</span>
                          <div className="flex items-center gap-2">
                            {[{ label: 'None', v: 0 }, { label: 'Light', v: 22 }, { label: 'Medium', v: 48 }, { label: 'Heavy', v: 80 }].map(p => (
                              <button key={p.label} onClick={() => setGrain(p.v)}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150"
                                style={{
                                  background: grain === p.v ? 'rgba(99,102,241,0.15)' : 'transparent',
                                  color: grain === p.v ? '#818cf8' : '#3f3f46',
                                  border: grain === p.v ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid transparent',
                                }}>
                                {p.label}
                              </button>
                            ))}
                            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6366f1', minWidth: 28, textAlign: 'right' }}>{grain}</span>
                          </div>
                        </div>
                        <input type="range" min={0} max={100} value={grain}
                          onChange={e => setGrain(Number(e.target.value))}
                          className="w-full" style={{ accentColor: '#6366f1', cursor: 'pointer', height: 3 }} />
                      </div>

                      {/* Cinematic FX */}
                      <div className="flex flex-col gap-4 p-4 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cinematic FX</p>

                        {/* Letterbox */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA' }}>Letterbox</p>
                            <p style={{ fontSize: 11, color: '#3f3f46' }}>2.39:1 cinema crop bars</p>
                          </div>
                          <Toggle on={letterbox} onToggle={() => setLetterbox(p => !p)} />
                        </div>

                        {/* Halation / Glow */}
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA' }}>Halation</p>
                              <p style={{ fontSize: 11, color: '#3f3f46' }}>Light bloom around highlights</p>
                            </div>
                            <span style={{ fontSize: 10, fontFamily: 'monospace', color: halation > 0 ? '#6366f1' : '#3f3f46', minWidth: 26, textAlign: 'right' }}>{halation}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            {[{ label: 'Off', v: 0 }, { label: 'Subtle', v: 25 }, { label: 'Film', v: 55 }, { label: 'Dream', v: 85 }].map(p => (
                              <button key={p.label} onClick={() => setHalation(p.v)}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150"
                                style={{ background: halation === p.v ? 'rgba(99,102,241,0.15)' : 'transparent', color: halation === p.v ? '#818cf8' : '#3f3f46', border: halation === p.v ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid transparent' }}>
                                {p.label}
                              </button>
                            ))}
                          </div>
                          <input type="range" min={0} max={100} value={halation}
                            onChange={e => setHalation(Number(e.target.value))}
                            className="w-full" style={{ accentColor: '#6366f1', cursor: 'pointer', height: 3 }} />
                        </div>
                      </div>

                      {/* Custom controls */}
                      {colorGrade === 'custom' && (
                        <div className="flex flex-col gap-4 p-4 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(99,102,241,0.15)' }}>
                          <div className="flex items-center justify-between">
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tone</p>
                            <button onClick={() => setCustomColor(DEFAULT_CUSTOM)} style={{ fontSize: 10, fontWeight: 600, color: '#3f3f46', cursor: 'pointer', letterSpacing: '0.04em' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#3f3f46'}>
                              RESET
                            </button>
                          </div>
                          <RangeSlider label="Exposure"   value={customColor.exposure}   min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, exposure: v }))} />
                          <RangeSlider label="Contrast"   value={customColor.contrast}   min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, contrast: v }))} />
                          <RangeSlider label="Highlights" value={customColor.highlights} min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, highlights: v }))} />
                          <RangeSlider label="Shadows"    value={customColor.shadows}    min={-100} max={100} onChange={v => setCustomColor(p => ({ ...p, shadows: v }))} />
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '2px 0' }} />
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Color</p>
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
                          <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>Auto-generate or add your own at any timestamp</p>
                        </div>
                        <Toggle on={captionsEnabled} onToggle={() => setCaptionsEnabled(p => !p)} />
                      </div>

                      {/* Generate buttons */}
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {/* From audio — Whisper AI */}
                          <button onClick={() => transcribeFromAudio()} disabled={transcribing}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
                            style={{ background: transcribing ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: transcribing ? '#52525B' : '#a5b4fc' }}>
                            {transcribing
                              ? <><Sparkles className="w-3.5 h-3.5 animate-pulse" />Transcribing…</>
                              : <><Sparkles className="w-3.5 h-3.5" />From audio (AI)</>}
                          </button>
                          {/* From script — instant timing estimate */}
                          <button
                            onClick={() => { const sc = buildCaptions(scriptText); if (sc.length) { setCaptions(sc); setCaptionsEnabled(true) } }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
                            style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.08)', color: '#71717A' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#71717A'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)' }}>
                            From script
                          </button>
                        </div>
                        {transcribing && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.05)', border: '0.5px solid rgba(99,102,241,0.15)' }}>
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#6366f1' }} />
                            <p style={{ fontSize: 12, color: '#818cf8' }}>
                              AI is reading your audio — this takes 30–90 seconds. You can keep editing.
                            </p>
                          </div>
                        )}
                        {transcribeError && (
                          <p style={{ fontSize: 12, color: '#f87171', lineHeight: 1.5 }}>{transcribeError}</p>
                        )}
                        <p style={{ fontSize: 11, color: '#3f3f46', lineHeight: 1.5 }}>
                          <span style={{ color: '#52525B' }}>From audio</span> uses Whisper AI for accurate real-time sync.
                          {' '}<span style={{ color: '#52525B' }}>From script</span> estimates timing instantly.
                        </p>
                      </div>

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

                      {/* Caption list + manual editor */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                            Caption lines {captions.length > 0 && `· ${captions.length}`}
                          </p>
                          <button
                            onClick={() => { setShowAddCaption(p => !p); setNewCaptionText(''); setNewCaptionStart(''); setNewCaptionEnd('') }}
                            style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', cursor: 'pointer' }}>
                            {showAddCaption ? 'Cancel' : '+ Add'}
                          </button>
                        </div>

                        {/* Add caption form */}
                        {showAddCaption && (
                          <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <input
                              value={newCaptionText} onChange={e => setNewCaptionText(e.target.value)}
                              placeholder="Caption text…"
                              className="w-full px-3 py-2 rounded-lg text-[13px] text-[#FAFAFA] outline-none"
                              style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.08)' }} />
                            <div className="flex gap-2 items-center">
                              <input
                                value={newCaptionStart} onChange={e => setNewCaptionStart(e.target.value)}
                                placeholder="Start (s)"
                                className="flex-1 px-3 py-2 rounded-lg text-[12px] text-[#FAFAFA] outline-none"
                                style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.08)', fontFamily: 'monospace' }} />
                              <span style={{ fontSize: 12, color: '#3f3f46' }}>→</span>
                              <input
                                value={newCaptionEnd} onChange={e => setNewCaptionEnd(e.target.value)}
                                placeholder="End (s)"
                                className="flex-1 px-3 py-2 rounded-lg text-[12px] text-[#FAFAFA] outline-none"
                                style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.08)', fontFamily: 'monospace' }} />
                              <button
                                onClick={() => {
                                  const start = parseFloat(newCaptionStart)
                                  const end   = parseFloat(newCaptionEnd)
                                  if (!newCaptionText.trim() || isNaN(start) || isNaN(end) || end <= start) return
                                  setCaptions(prev => [...prev, { text: newCaptionText.trim(), start, end }].sort((a, b) => a.start - b.start))
                                  setCaptionsEnabled(true)
                                  setShowAddCaption(false); setNewCaptionText(''); setNewCaptionStart(''); setNewCaptionEnd('')
                                }}
                                className="px-3 py-2 rounded-lg text-[12px] font-semibold"
                                style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', flexShrink: 0 }}>
                                Add
                              </button>
                            </div>
                            <p style={{ fontSize: 10, color: '#3f3f46' }}>Enter timestamps in seconds, e.g. 2.5 → 5.0</p>
                          </div>
                        )}

                        {/* Caption rows */}
                        {captions.length > 0 ? (
                          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                            {captions.map((c, i) => (
                              <div key={i} className="group flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#3f3f46', flexShrink: 0, paddingTop: 2, minWidth: 36 }}>
                                  {c.start.toFixed(1)}s
                                </span>
                                {editingCaption === i ? (
                                  <input
                                    autoFocus
                                    defaultValue={c.text}
                                    className="flex-1 bg-transparent text-[12px] text-[#FAFAFA] outline-none border-b"
                                    style={{ borderColor: 'rgba(99,102,241,0.4)' }}
                                    onBlur={e => {
                                      const txt = e.target.value.trim()
                                      if (txt) setCaptions(prev => prev.map((cap, idx) => idx === i ? { ...cap, text: txt } : cap))
                                      setEditingCaption(null)
                                    }}
                                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingCaption(null) }} />
                                ) : (
                                  <p
                                    onClick={() => setEditingCaption(i)}
                                    style={{ fontSize: 12, color: '#71717A', lineHeight: 1.5, flex: 1, cursor: 'text' }}
                                    title="Click to edit">
                                    {c.text}
                                  </p>
                                )}
                                <button
                                  onClick={() => setCaptions(prev => prev.filter((_, idx) => idx !== i))}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                                  style={{ color: '#52525B', fontSize: 12 }}>
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 rounded-xl text-center" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.04)' }}>
                            <p style={{ fontSize: 12, color: '#3f3f46' }}>No captions — generate from audio or add manually above</p>
                          </div>
                        )}
                        {captions.length > 0 && (
                          <button onClick={() => setCaptions([])} style={{ fontSize: 11, color: '#52525B', textAlign: 'right', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525B'}>
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── MUSIC ───────────────────────────── */}
                  {activeTab === 'music' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-baseline justify-between">
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.02em' }}>Background Music</p>
                        <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#3f3f46', letterSpacing: '0.04em' }}>40% MIX · ROYALTY-FREE</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {MUSIC_MOODS.map(m => {
                          const isPlaying = selectedMusic === m.id && m.id !== 'none'
                          return (
                            <button key={m.id} onClick={() => playMusic(m.id)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
                              style={{
                                background: selectedMusic === m.id ? 'rgba(99,102,241,0.07)' : 'transparent',
                                borderLeft: selectedMusic === m.id ? '2px solid #6366f1' : '2px solid transparent',
                              }}>
                              {/* Waveform bars / icon */}
                              <div style={{ width: 26, height: 18, display: 'flex', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                                {isPlaying ? (
                                  [0.4, 1, 0.6, 0.85, 0.5].map((h, i) => (
                                    <div key={i} style={{
                                      flex: 1,
                                      borderRadius: 1,
                                      background: '#4ADE80',
                                      height: `${h * 100}%`,
                                      animation: `musicBar ${0.6 + i * 0.13}s ease-in-out infinite alternate`,
                                      transformOrigin: 'bottom',
                                    }} />
                                  ))
                                ) : (
                                  [0.25, 0.55, 0.35, 0.65, 0.3].map((h, i) => (
                                    <div key={i} style={{ flex: 1, borderRadius: 1, background: m.id === 'none' ? '#1f1f23' : '#27272a', height: `${h * 100}%` }} />
                                  ))
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 13, fontWeight: 600, color: selectedMusic === m.id ? '#FAFAFA' : '#71717A' }}>{m.label}</p>
                                {m.desc && <p style={{ fontSize: 10, color: '#3f3f46', marginTop: 1 }}>{m.desc}</p>}
                              </div>
                              {m.bpm && (
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: selectedMusic === m.id ? '#52525B' : '#27272a', flexShrink: 0 }}>{m.bpm}bpm</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <style>{`
                        @keyframes musicBar {
                          from { transform: scaleY(0.3); }
                          to   { transform: scaleY(1); }
                        }
                      `}</style>
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

                  {/* ── POST COPY ───────────────────────── */}
                  {activeTab === 'copy' && (
                    <div className="flex flex-col gap-5">
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Post Copy</p>
                        <p style={{ fontSize: 12, color: '#52525B', marginTop: 2 }}>AI-written captions, hashtags & CTAs ready to post</p>
                      </div>

                      {/* Platform selector */}
                      <div className="flex gap-2">
                        {(['tiktok', 'instagram', 'youtube', 'linkedin'] as const).map(p => (
                          <button key={p} onClick={() => setCopyPlatform(p)}
                            className="flex-1 py-2 rounded-lg text-[11px] font-bold capitalize transition-all duration-150"
                            style={{
                              background: copyPlatform === p ? 'rgba(99,102,241,0.15)' : '#18181C',
                              color: copyPlatform === p ? '#a5b4fc' : '#52525B',
                              border: copyPlatform === p ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.06)',
                            }}>
                            {p === 'tiktok' ? 'TikTok' : p === 'instagram' ? 'Instagram' : p === 'youtube' ? 'YouTube' : 'LinkedIn'}
                          </button>
                        ))}
                      </div>

                      {/* Generate button */}
                      <button
                        onClick={() => generatePostCopy(copyPlatform)}
                        disabled={copyLoading || !scriptText.trim()}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 disabled:opacity-40"
                        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                        <Sparkles className="w-3.5 h-3.5" />
                        {copyLoading ? 'Generating…' : `Generate ${copyPlatform === 'tiktok' ? 'TikTok' : copyPlatform === 'instagram' ? 'Instagram' : copyPlatform === 'youtube' ? 'YouTube' : 'LinkedIn'} copy`}
                      </button>

                      {/* Copy results */}
                      {copyData[copyPlatform] ? (() => {
                        const c = copyData[copyPlatform]!
                        return (
                          <div className="flex flex-col gap-3">
                            {/* Title */}
                            <div className="flex flex-col gap-1.5 p-3 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <div className="flex items-center justify-between">
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Title / Hook</span>
                                <button onClick={() => navigator.clipboard.writeText(c.title)} style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer', background: 'none', border: 'none' }}>Copy</button>
                              </div>
                              <p style={{ fontSize: 13, color: '#FAFAFA', fontWeight: 600, lineHeight: 1.4 }}>{c.title}</p>
                            </div>
                            {/* Caption */}
                            <div className="flex flex-col gap-1.5 p-3 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <div className="flex items-center justify-between">
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Caption</span>
                                <button onClick={() => navigator.clipboard.writeText(c.caption)} style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer', background: 'none', border: 'none' }}>Copy</button>
                              </div>
                              <p style={{ fontSize: 12, color: '#E4E4E7', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{c.caption}</p>
                            </div>
                            {/* Hashtags */}
                            {c.hashtags?.length > 0 && (
                              <div className="flex flex-col gap-1.5 p-3 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center justify-between">
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hashtags</span>
                                  <button onClick={() => navigator.clipboard.writeText(c.hashtags.join(' '))} style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer', background: 'none', border: 'none' }}>Copy all</button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {c.hashtags.map(tag => (
                                    <button key={tag} onClick={() => navigator.clipboard.writeText(tag)}
                                      className="px-2 py-0.5 rounded text-[11px] transition-all"
                                      style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '0.5px solid rgba(99,102,241,0.2)' }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)' }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)' }}>
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* CTA */}
                            {c.cta && (
                              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex flex-col gap-0.5">
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.07em' }}>CTA</span>
                                  <p style={{ fontSize: 12, color: '#E4E4E7' }}>{c.cta}</p>
                                </div>
                                <button onClick={() => navigator.clipboard.writeText(c.cta)} style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer', background: 'none', border: 'none', flexShrink: 0 }}>Copy</button>
                              </div>
                            )}
                            {/* Copy everything */}
                            <button
                              onClick={() => navigator.clipboard.writeText(`${c.title}\n\n${c.caption}\n\n${c.hashtags?.join(' ') ?? ''}\n\n${c.cta}`)}
                              className="w-full py-2 rounded-xl text-[12px] font-semibold transition-all"
                              style={{ background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
                              Copy everything
                            </button>
                          </div>
                        )
                      })() : (
                        !copyLoading && (
                          <div className="flex flex-col items-center gap-2 py-6" style={{ color: '#3f3f46' }}>
                            <PenLine className="w-7 h-7 opacity-30" />
                            <p style={{ fontSize: 12 }}>Select a platform and generate your post copy</p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Export panel */}
              <div className="flex flex-col gap-4 p-5 rounded-2xl" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                {exporting ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA' }}>Rendering {exportQuality}…</p>
                        <p style={{ fontSize: 11, color: '#52525B', marginTop: 2 }}>
                          Frame-accurate · 30fps · {exportQuality === '4K' ? '100Mbps' : exportQuality === '1440p' ? '60Mbps' : exportQuality === '1080p' ? '25Mbps' : '8Mbps'}
                          {letterbox ? ' · Letterbox' : ''}{halation > 0 ? ' · Halation' : ''}
                        </p>
                      </div>
                      <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{Math.round(exportProgress)}%</span>
                    </div>
                    <ProgressBar value={exportProgress} label={exportLabel || 'Rendering…'} />
                    <p style={{ fontSize: 11, color: '#3f3f46', textAlign: 'center', letterSpacing: '0.02em' }}>
                      All effects baked in · don&apos;t close this tab
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Quality + Platform selectors */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quality</p>
                        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                          {([
                            { q: '720p'  as ExportQuality, short: '720',  beta: false },
                            { q: '1080p' as ExportQuality, short: '1080', beta: false },
                            { q: '1440p' as ExportQuality, short: '2K',   beta: true  },
                            { q: '4K'    as ExportQuality, short: '4K',   beta: true  },
                          ]).map(({ q, short, beta: needsBeta }, i) => {
                            const locked = needsBeta && !beta.unlocked
                            return (
                              <button key={q}
                                onClick={() => {
                                  if (locked) { setShowBetaPanel(true); return }
                                  setExportQuality(q)
                                }}
                                className="flex-1 py-2 text-[11px] font-bold transition-all duration-150 flex items-center justify-center gap-1 relative"
                                title={locked ? 'Beta access required' : q}
                                style={{
                                  background: exportQuality === q && !locked ? '#6366f1' : 'transparent',
                                  color: locked ? '#27272a' : exportQuality === q ? '#fff' : '#3f3f46',
                                  borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                                }}>
                                {locked && <Lock className="w-2.5 h-2.5" style={{ color: '#27272a' }} />}
                                {short}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Platform</p>
                        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                          {PLATFORM_OPTIONS.map((p, i) => (
                            <button key={p.id} onClick={() => setExportAspect(p.id)}
                              className="flex-1 py-2 text-[11px] font-bold transition-all duration-150"
                              title={p.desc}
                              style={{
                                background: exportAspect === p.id ? '#6366f1' : 'transparent',
                                color: exportAspect === p.id ? '#fff' : '#3f3f46',
                                borderRight: i < PLATFORM_OPTIONS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                              }}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Beta unlock panel */}
                    {showBetaPanel && !beta.unlocked && (
                      <div className="flex flex-col gap-4 p-4 rounded-xl" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#c4b5fd' }}>Unlock Beta Features</p>
                          </div>
                          <button onClick={() => { setShowBetaPanel(false); setBetaCodeInput('') }} style={{ color: '#52525B' }}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Feature list */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { icon: '✦', label: '4K & 2K export', desc: 'Ultra-high resolution output' },
                            { icon: '⬆', label: 'AI Enhancement', desc: 'Replicate upscaling on every video' },
                            { icon: '🎙', label: 'Audio Captions', desc: 'Whisper AI auto-sync to speech' },
                            { icon: '✦', label: 'Noise Reduction', desc: 'Clarity boost in Color tab' },
                          ].map(f => (
                            <div key={f.label} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.06)', border: '0.5px solid rgba(139,92,246,0.12)' }}>
                              <span style={{ fontSize: 13, color: '#8b5cf6', flexShrink: 0, lineHeight: 1.4 }}>{f.icon}</span>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd' }}>{f.label}</p>
                                <p style={{ fontSize: 10, color: '#52525B', lineHeight: 1.4 }}>{f.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            value={betaCodeInput}
                            onChange={e => setBetaCodeInput(e.target.value.toUpperCase())}
                            onKeyDown={async e => { if (e.key === 'Enter') await beta.unlock(betaCodeInput) }}
                            placeholder="ENTER BETA CODE"
                            className="flex-1 px-3 py-2 rounded-lg text-[13px] font-mono uppercase outline-none tracking-widest"
                            style={{ background: '#18181C', border: '0.5px solid rgba(139,92,246,0.3)', color: '#c4b5fd', letterSpacing: '0.15em' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)' }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)' }}
                            autoFocus
                          />
                          <button
                            onClick={() => beta.unlock(betaCodeInput)}
                            disabled={beta.loading || !betaCodeInput.trim()}
                            className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 disabled:opacity-40"
                            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd' }}>
                            {beta.loading ? '…' : 'Unlock'}
                          </button>
                        </div>
                        {beta.error && (
                          <p style={{ fontSize: 11, color: '#f87171' }}>{beta.error}</p>
                        )}
                      </div>
                    )}

                    {/* Success state after unlock */}
                    {beta.unlocked && showBetaPanel && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.2)' }}>
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <p style={{ fontSize: 12, color: '#4ADE80' }}>Beta access active — 2K, 4K, and AI Enhancement unlocked</p>
                        <button onClick={() => setShowBetaPanel(false)} className="ml-auto flex-shrink-0" style={{ color: '#52525B' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Export CTA */}
                    <button onClick={handleExport}
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-200"
                      style={{ background: 'linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)', boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 8px 32px rgba(99,102,241,0.25)', letterSpacing: '-0.01em' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.6), 0 16px 40px rgba(99,102,241,0.35)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 8px 32px rgba(99,102,241,0.25)' }}>
                      <Sparkles className="w-4 h-4" />
                      Export {exportQuality} · {exportAspect}{clips.length > 1 ? ` · ${clips.length} clips` : ''}
                    </button>

                    <div className="flex items-center justify-between">
                      <p style={{ fontSize: 10, color: '#27272a', letterSpacing: '0.04em' }}>
                        {exportQuality === '4K' ? '3840×2160 · 100Mbps' : exportQuality === '1440p' ? '2560×1440 · 60Mbps' : exportQuality === '1080p' ? '1920×1080 · 25Mbps' : '1280×720 · 8Mbps'}
                        {' '}· 30fps · WebM{letterbox ? ' · Letterbox' : ''}{halation > 0 ? ' · Halation' : ''}
                      </p>
                      {!beta.unlocked && (
                        <button onClick={() => setShowBetaPanel(p => !p)}
                          className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
                          style={{ color: showBetaPanel ? '#8b5cf6' : '#3f3f46', letterSpacing: '0.06em' }}>
                          <Lock className="w-2.5 h-2.5" />BETA ACCESS
                        </button>
                      )}
                      {beta.unlocked && (
                        <button onClick={beta.revoke} style={{ fontSize: 10, color: '#27272a', letterSpacing: '0.04em' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#27272a'}>
                          revoke
                        </button>
                      )}
                    </div>
                  </>
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => shareVideo(v)}
                      disabled={sharingId === v.id || sharedIds.has(v.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        color: sharedIds.has(v.id) ? '#22c55e' : '#818cf8',
                        border: `0.5px solid ${sharedIds.has(v.id) ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                        background: sharedIds.has(v.id) ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.06)',
                        opacity: sharingId === v.id ? 0.6 : 1,
                        cursor: sharingId === v.id || sharedIds.has(v.id) ? 'default' : 'pointer',
                      }}
                    >
                      {sharedIds.has(v.id) ? (
                        <><Users className="w-3 h-3" /> Shared</>
                      ) : sharingId === v.id ? (
                        <><Share2 className="w-3 h-3" /> Sharing…</>
                      ) : (
                        <><Share2 className="w-3 h-3" /> Share</>
                      )}
                    </button>
                    <a href={v.enhancedUrl || v.originalUrl} download target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                      style={{ color: '#71717A', border: '0.5px solid rgba(255,255,255,0.08)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FAFAFA'}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#71717A'}>
                      Download
                    </a>
                  </div>
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
