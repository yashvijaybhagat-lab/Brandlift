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
  FileText,
  ChevronRight,
} from 'lucide-react'

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Stage =
  | 'idle'           // show script picker
  | 'uploading'      // blob upload in progress
  | 'enhancing'      // calling enhance API
  | 'polling'        // waiting on Replicate
  | 'done'
  | 'error'

interface VideoRecord {
  id: string
  name: string
  script: string
  enhancedUrl: string
  createdAt: number
}

/* ─── Script templates ────────────────────────────────────────────────────── */
const SCRIPT_TEMPLATES = [
  {
    id: 'promo',
    label: 'Business promo',
    icon: '🏪',
    placeholder: "e.g. We make the best tacos in Austin — fresh ingredients, made to order, open late. Come try us at 4th & Lamar.",
  },
  {
    id: 'behindscenes',
    label: 'Behind the scenes',
    icon: '🎬',
    placeholder: "e.g. A day in our kitchen — from prep at 6am to the last order. This is what goes into every dish we serve.",
  },
  {
    id: 'testimonial',
    label: 'Customer story',
    icon: '⭐',
    placeholder: "e.g. Sarah's been coming here every Friday for two years. Here's what she says about us.",
  },
  {
    id: 'custom',
    label: 'Write my own',
    icon: '✍️',
    placeholder: "Write your own script or talking points here...",
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

/* ─── Inner component ─────────────────────────────────────────────────────── */
function VideosInner() {
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [stage, setStage] = useState<Stage>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pollProgress, setPollProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [predictionId, setPredictionId] = useState('')
  const [enhancedUrl, setEnhancedUrl] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [videos, setVideos] = useState<VideoRecord[]>([])

  // Script state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('promo')
  const [scriptText, setScriptText] = useState('')
  const [scriptConfirmed, setScriptConfirmed] = useState(false)

  const currentTemplate = SCRIPT_TEMPLATES.find(t => t.id === selectedTemplate)!
  const canConfirmScript = scriptText.trim().length > 10

  // Load saved videos
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bl_videos_v3')
      if (saved) setVideos(JSON.parse(saved))
    } catch {}
  }, [])

  // Auto-trigger file picker if ?upload=1
  useEffect(() => {
    if (searchParams.get('upload') === '1' && scriptConfirmed) {
      fileInputRef.current?.click()
    }
  }, [searchParams, scriptConfirmed])

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
            script: scriptText,
            enhancedUrl: outputUrl,
            createdAt: Date.now(),
          }
          setVideos(prev => {
            const next = [record, ...prev]
            try { localStorage.setItem('bl_videos_v3', JSON.stringify(next)) } catch {}
            return next
          })
        } else if (data.status === 'failed' || data.error) {
          setErrorMsg(data.error ?? 'Enhancement failed on Replicate.')
          setStage('error')
        } else {
          setPollProgress(p => Math.min(p + 3, 92))
          setTimeout(tick, POLL_INTERVAL)
        }
      } catch {
        if (!cancelled) setTimeout(tick, POLL_INTERVAL)
      }
    }

    tick()
    return () => { cancelled = true }
  }, [stage, predictionId, pendingFile, scriptText])

  /* ── Upload & enhance ─────────────────────────────────────────────────────── */
  const startEnhancement = useCallback(async (file: File) => {
    setUploadProgress(0)
    setPollProgress(0)
    setErrorMsg('')
    setStage('uploading')

    try {
      // Upload directly to Vercel Blob (browser → Blob, bypasses 4.5MB API limit)
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/video/upload',
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      })

      // Send blob URL + script to enhance API (tiny JSON payload)
      setStage('enhancing')
      const res = await fetch('/api/video/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: blob.url, script: scriptText }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to start enhancement')

      setPredictionId(data.id)
      setStage('polling')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setStage('error')
    }
  }, [scriptText])

  /* ── File handlers ─────────────────────────────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please upload a video file (MP4, MOV, etc.)')
      setStage('error')
      return
    }
    setPendingFile(file)
    startEnhancement(file)
  }, [startEnhancement])

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
    setEnhancedUrl('')
    setPendingFile(null)
    setScriptConfirmed(false)
    setScriptText('')
    setSelectedTemplate('promo')
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
                {videos.length === 0
                  ? 'Write your script, upload your footage, get a polished video'
                  : `${videos.length} video${videos.length !== 1 ? 's' : ''} created`}
              </p>
            </div>
            {(stage === 'idle' && scriptConfirmed) && (
              <Button variant="ghost" size="sm" onClick={reset}>← Change script</Button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />

          {/* ── STEP 1: Script ── */}
          {stage === 'idle' && !scriptConfirmed && (
            <div className="flex flex-col gap-5">
              {/* Step indicator */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                >1</div>
                <span className="text-[14px] font-medium text-[#FAFAFA]">Write your script</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                  style={{ background: '#18181C', color: '#3f3f46', border: '0.5px solid rgba(255,255,255,0.07)' }}
                >2</div>
                <span className="text-[13px] text-[#3f3f46]">Upload video</span>
              </div>

              <div
                className="flex flex-col gap-5 p-6 rounded-2xl"
                style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}
              >
                <div>
                  <p className="text-[15px] font-semibold text-[#FAFAFA] mb-1">What type of video is this?</p>
                  <p className="text-[13px] text-[#52525B]">Pick a template or write your own script below</p>
                </div>

                {/* Template pills */}
                <div className="flex flex-wrap gap-2">
                  {SCRIPT_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTemplate(t.id); setScriptText('') }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                      style={{
                        background: selectedTemplate === t.id ? 'rgba(99,102,241,0.12)' : '#18181C',
                        border: selectedTemplate === t.id ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)',
                        color: selectedTemplate === t.id ? '#a5b4fc' : '#71717A',
                      }}
                    >
                      <span>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Script textarea */}
                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>
                    {selectedTemplate === 'custom' ? 'Your script' : 'Customize the script'}
                  </label>
                  <textarea
                    rows={5}
                    value={scriptText}
                    onChange={e => setScriptText(e.target.value)}
                    placeholder={currentTemplate.placeholder}
                    className="w-full rounded-xl px-4 py-3 text-[14px] text-[#FAFAFA] resize-none outline-none"
                    style={{
                      background: 'rgba(24,24,28,0.7)',
                      border: '0.5px solid rgba(255,255,255,0.1)',
                      lineHeight: 1.6,
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <p style={{ fontSize: 12, color: '#3f3f46' }}>
                      This script will be used to guide your video content
                    </p>
                    <span style={{ fontSize: 12, color: '#52525B', fontVariantNumeric: 'tabular-nums' }}>
                      {scriptText.length} chars
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canConfirmScript}
                  onClick={() => setScriptConfirmed(true)}
                  className="gap-1.5 self-start"
                >
                  Continue to upload
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Upload drop zone ── */}
          {stage === 'idle' && scriptConfirmed && (
            <div className="flex flex-col gap-5">
              {/* Step indicator */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                  style={{ background: '#18181C', color: '#4ADE80', border: '0.5px solid rgba(74,222,128,0.3)' }}
                >✓</div>
                <span className="text-[13px] text-[#52525B]">Script ready</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                >2</div>
                <span className="text-[14px] font-medium text-[#FAFAFA]">Upload your footage</span>
              </div>

              {/* Script preview */}
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}
              >
                <FileText className="w-4 h-4 text-[#6366f1] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#A1A1AA] leading-relaxed line-clamp-2">{scriptText}</p>
              </div>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center text-center py-20 rounded-2xl gap-5 cursor-pointer transition-all duration-200"
                style={{
                  border: dragging ? '1.5px dashed rgba(99,102,241,0.6)' : '0.5px dashed rgba(255,255,255,0.09)',
                  background: dragging ? 'rgba(99,102,241,0.05)' : 'rgba(17,17,19,0.5)',
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: dragging ? 'rgba(99,102,241,0.12)' : '#18181C',
                    border: dragging ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {dragging ? <Upload className="w-7 h-7 text-[#6366f1]" /> : <Video className="w-7 h-7 text-[#3f3f46]" />}
                </div>

                <div>
                  <p className="text-[16px] font-semibold text-[#FAFAFA] mb-1">
                    {dragging ? 'Drop your video' : 'Upload your footage'}
                  </p>
                  <p className="text-[13px] text-[#71717A]">
                    MP4, MOV, AVI — drag & drop or click to browse
                  </p>
                </div>

                <button
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)',
                    boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)',
                  }}
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  <Upload className="w-4 h-4" />
                  Choose video
                </button>
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
                  <p className="text-[12px] text-[#52525B] mt-0.5">{formatBytes(pendingFile.size)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <ProgressBar value={uploadProgress} label={stage === 'uploading' ? 'Uploading to storage…' : 'Upload complete ✓'} />
                {(stage === 'enhancing' || stage === 'polling') && (
                  <ProgressBar value={stage === 'enhancing' ? 5 : pollProgress} label="AI Enhancement (Real-ESRGAN 4×)" />
                )}
              </div>

              <p className="text-[13px] text-[#52525B] text-center">
                {stage === 'uploading' && 'Uploading your video…'}
                {stage === 'enhancing' && 'Starting AI enhancement…'}
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
                  <p className="text-[14px] font-medium text-red-300">Something went wrong</p>
                  <p className="text-[13px] text-red-400/70 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
                <button onClick={reset} className="text-red-400/50 hover:text-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setStage('idle'); setErrorMsg('') }} className="self-start">
                Try again
              </Button>
            </div>
          )}

          {/* ── Done / result ── */}
          {stage === 'done' && enhancedUrl && (
            <div
              className="flex flex-col gap-6 p-6 rounded-2xl"
              style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[#FAFAFA]">{pendingFile?.name} — enhanced</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">Real-ESRGAN 4× AI upscaling</p>
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
                  <Button variant="ghost" size="sm" onClick={reset}>New video</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-[#52525B]">Before</p>
                  <video controls className="w-full rounded-xl" style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <source src={enhancedUrl} />
                  </video>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-[#6366f1]">After — AI Enhanced</p>
                  <video src={enhancedUrl} controls className="w-full rounded-xl"
                    style={{ border: '0.5px solid rgba(99,102,241,0.25)', boxShadow: '0 0 20px rgba(99,102,241,0.1)' }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Video library ── */}
          {videos.length > 0 && stage === 'idle' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-[#FAFAFA]">Previous videos</h2>
              </div>
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
                    <p className="text-[12px] text-[#52525B] mt-0.5 truncate">{v.script}</p>
                  </div>
                  <a
                    href={v.enhancedUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#A1A1AA] hover:text-white transition-colors flex-shrink-0"
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
