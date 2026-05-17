'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import {
  Upload,
  Video,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  X,
} from 'lucide-react'

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Stage = 'idle' | 'selecting-style' | 'uploading' | 'enhancing' | 'polling' | 'done' | 'error'

interface VideoRecord {
  id: string
  name: string
  style: string
  originalUrl: string
  enhancedUrl: string
  createdAt: number
}

/* ─── Style options ───────────────────────────────────────────────────────── */
const STYLES = [
  {
    id: 'professional',
    label: 'Clean & Professional',
    desc: '4× upscale, sharp, neutral grade',
    icon: '✨',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    desc: '2× upscale, smooth, film-quality',
    icon: '🎬',
  },
  {
    id: 'vibrant',
    label: 'Bold & Vibrant',
    desc: '4× upscale, punchy colors',
    icon: '🔥',
  },
]

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 13, color: '#A1A1AA' }}>{label}</span>
        <span style={{ fontSize: 13, color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(value)}%
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#18181C' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 0 8px rgba(99,102,241,0.5)',
          }}
        />
      </div>
    </div>
  )
}

const POLL_INTERVAL = 4000

/* ─── Inner (needs Suspense for useSearchParams) ──────────────────────────── */
function VideosInner() {
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [stage, setStage] = useState<Stage>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pollProgress, setPollProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [predictionId, setPredictionId] = useState('')
  const [originalUrl, setOriginalUrl] = useState('')
  const [enhancedUrl, setEnhancedUrl] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string>('professional')
  const [dragging, setDragging] = useState(false)
  const [videos, setVideos] = useState<VideoRecord[]>([])

  // Load saved videos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bl_videos_v2')
      if (saved) setVideos(JSON.parse(saved))
    } catch {}
  }, [])

  // Auto-open file picker if navigated here with ?upload=1
  useEffect(() => {
    if (searchParams.get('upload') === '1') {
      fileInputRef.current?.click()
    }
  }, [searchParams])

  /* ── Poll Replicate ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (stage !== 'polling' || !predictionId) return
    let cancelled = false

    const tick = async () => {
      try {
        const res = await fetch(`/api/video/status/${predictionId}`)
        const data = await res.json()
        if (cancelled) return

        if (data.status === 'succeeded' && data.output) {
          const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output
          setEnhancedUrl(outputUrl)
          setStage('done')
          const record: VideoRecord = {
            id: predictionId,
            name: pendingFile?.name ?? 'video.mp4',
            style: selectedStyle,
            originalUrl,
            enhancedUrl: outputUrl,
            createdAt: Date.now(),
          }
          setVideos((prev) => {
            const next = [record, ...prev]
            try { localStorage.setItem('bl_videos_v2', JSON.stringify(next)) } catch {}
            return next
          })
        } else if (data.status === 'failed' || data.error) {
          setErrorMsg(data.error ?? 'Enhancement failed on Replicate.')
          setStage('error')
        } else {
          setPollProgress((p) => Math.min(p + 3, 92))
          setTimeout(tick, POLL_INTERVAL)
        }
      } catch {
        if (!cancelled) {
          setTimeout(tick, POLL_INTERVAL)
        }
      }
    }

    tick()
    return () => { cancelled = true }
  }, [stage, predictionId, pendingFile, selectedStyle, originalUrl])

  /* ── Upload & enhance ─────────────────────────────────────────────────────── */
  const startEnhancement = useCallback(async (file: File, style: string) => {
    setUploadProgress(0)
    setPollProgress(0)
    setErrorMsg('')
    setStage('uploading')

    try {
      // 1. Upload directly to Vercel Blob (bypasses 4.5MB API route limit)
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/video/upload',
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      })
      setOriginalUrl(blob.url)

      // 2. Send just the URL to the enhance API (tiny JSON payload, no size issue)
      setStage('enhancing')
      const res = await fetch('/api/video/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: blob.url, style }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to start enhancement')

      setPredictionId(data.id)
      setStage('polling')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStage('error')
    }
  }, [])

  const pickStyle = useCallback((file: File) => {
    setPendingFile(file)
    setStage('selecting-style')
  }, [])

  const confirmStyle = useCallback(() => {
    if (pendingFile) startEnhancement(pendingFile, selectedStyle)
  }, [pendingFile, selectedStyle, startEnhancement])

  /* ── File handlers ─────────────────────────────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please upload a video file (MP4, MOV, etc.)')
      setStage('error')
      return
    }
    pickStyle(file)
  }, [pickStyle])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const reset = () => {
    setStage('idle')
    setUploadProgress(0)
    setPollProgress(0)
    setErrorMsg('')
    setPredictionId('')
    setOriginalUrl('')
    setEnhancedUrl('')
    setPendingFile(null)
    setSelectedStyle('professional')
  }

  const isProcessing = stage === 'uploading' || stage === 'enhancing' || stage === 'polling'

  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-medium text-[#FAFAFA]">My Videos</h1>
              <p className="text-[14px] text-[#71717A] mt-0.5">
                {videos.length === 0 ? 'Upload raw footage and AI will enhance it' : `${videos.length} video${videos.length !== 1 ? 's' : ''} enhanced`}
              </p>
            </div>
            {stage === 'idle' && (
              <Button variant="primary" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
                <Sparkles className="w-3.5 h-3.5" />
                Enhance video
              </Button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />

          {/* ── Style selector ── */}
          {stage === 'selecting-style' && pendingFile && (
            <div
              className="flex flex-col gap-5 p-6 rounded-2xl"
              style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}
            >
              <div>
                <p className="text-[15px] font-semibold text-[#FAFAFA]">Choose your enhancement style</p>
                <p className="text-[13px] text-[#52525B] mt-1">{pendingFile.name} · {formatBytes(pendingFile.size)}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className="flex flex-col gap-2 p-4 rounded-xl text-left transition-all duration-150"
                    style={{
                      background: selectedStyle === s.id ? 'rgba(99,102,241,0.1)' : '#18181C',
                      border: selectedStyle === s.id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#FAFAFA]">{s.label}</p>
                      <p className="text-[11px] text-[#52525B] mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="primary" size="sm" onClick={confirmStyle} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Enhance now
                </Button>
                <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
              </div>
            </div>
          )}

          {/* ── Processing ── */}
          {isProcessing && pendingFile && (
            <div
              className="flex flex-col gap-6 p-8 rounded-2xl"
              style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}
                >
                  <Sparkles className="w-6 h-6 text-[#6366f1] animate-pulse" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[#FAFAFA]">{pendingFile.name}</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">
                    {STYLES.find(s => s.id === selectedStyle)?.label} · {formatBytes(pendingFile.size)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <ProgressBar value={uploadProgress} label={stage === 'uploading' ? 'Uploading…' : 'Uploaded ✓'} />
                {stage === 'polling' && (
                  <ProgressBar value={pollProgress} label="AI Enhancement (Real-ESRGAN)" />
                )}
              </div>

              <p className="text-[13px] text-[#52525B] text-center">
                {stage === 'uploading' && 'Uploading your video…'}
                {stage === 'polling' && 'Enhancing with AI — this takes a few minutes…'}
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {stage === 'error' && (
            <div
              className="flex flex-col gap-4 p-6 rounded-2xl"
              style={{ background: 'rgba(239,68,68,0.05)', border: '0.5px solid rgba(239,68,68,0.2)' }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-red-300">Enhancement failed</p>
                  <p className="text-[13px] text-red-400/70 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
                <button onClick={reset} className="text-red-400/50 hover:text-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="self-start">Try again</Button>
            </div>
          )}

          {/* ── Result ── */}
          {stage === 'done' && enhancedUrl && (
            <div
              className="flex flex-col gap-6 p-6 rounded-2xl"
              style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[#FAFAFA]">{pendingFile?.name} — enhanced</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">
                    {STYLES.find(s => s.id === selectedStyle)?.label} · Real-ESRGAN AI
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={enhancedUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.3)' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                  <Button variant="ghost" size="sm" onClick={reset}>Enhance another</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-[#52525B]">Before</p>
                  {originalUrl && (
                    <video src={originalUrl} controls className="w-full rounded-xl"
                      style={{ border: '0.5px solid rgba(255,255,255,0.08)' }} />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-[#6366f1]">After — AI Enhanced</p>
                  <video src={enhancedUrl} controls className="w-full rounded-xl"
                    style={{ border: '0.5px solid rgba(99,102,241,0.25)', boxShadow: '0 0 20px rgba(99,102,241,0.1)' }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Drop zone / empty state ── */}
          {stage === 'idle' && (
            <div
              ref={dropRef}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center text-center py-24 rounded-2xl gap-6 cursor-pointer transition-all duration-200"
              style={{
                border: dragging ? '1.5px dashed rgba(99,102,241,0.6)' : '0.5px dashed rgba(255,255,255,0.09)',
                background: dragging ? 'rgba(99,102,241,0.05)' : 'rgba(17,17,19,0.5)',
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: dragging ? 'rgba(99,102,241,0.12)' : '#18181C',
                  border: dragging ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                }}
              >
                {dragging ? <Upload className="w-8 h-8 text-[#6366f1]" /> : <Video className="w-8 h-8 text-[#3f3f46]" />}
              </div>

              <div>
                <h2 className="text-[18px] font-semibold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.02em' }}>
                  {dragging ? 'Drop to enhance' : 'No videos yet'}
                </h2>
                <p className="text-[14px] text-[#71717A] max-w-[38ch] mx-auto leading-relaxed">
                  {dragging
                    ? 'Release to pick your enhancement style'
                    : 'Upload raw iPhone footage — pick a style and AI will enhance it to the highest quality.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)',
                    boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)',
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Upload video
                </button>
                <span style={{ fontSize: 13, color: '#3f3f46' }}>or drag &amp; drop here</span>
              </div>

              <div className="flex items-center gap-6 mt-2">
                {[
                  { icon: '📱', label: 'iPhone footage' },
                  { icon: '✨', label: 'Pick a style' },
                  { icon: '📲', label: 'Download & post' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <span className="text-xl">{icon}</span>
                    <span style={{ fontSize: 11, color: '#52525B', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Video library ── */}
          {videos.length > 0 && stage !== 'done' && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-medium text-[#FAFAFA]">Enhanced videos</h2>
              {videos.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-4 p-4 rounded-[12px]"
                  style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#6366f1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#FAFAFA] truncate">{v.name}</p>
                    <p className="text-[11px] text-[#52525B] mt-0.5">
                      {STYLES.find(s => s.id === v.style)?.label ?? v.style} · {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={v.enhancedUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#A1A1AA] hover:text-white transition-colors"
                    style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}
                  >
                    <Download className="w-3.5 h-3.5" />
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
