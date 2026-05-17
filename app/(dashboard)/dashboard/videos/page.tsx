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
type Stage =
  | 'idle'
  | 'uploading'
  | 'enhancing'
  | 'polling'
  | 'done'
  | 'error'

interface VideoRecord {
  id: string
  name: string
  originalUrl: string
  enhancedUrl: string
  createdAt: number
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ─── Progress bar ─────────────────────────────────────────────────────────── */
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

/* ─── Stage label ─────────────────────────────────────────────────────────── */
const STAGE_LABELS: Record<Stage, string> = {
  idle: '',
  uploading: 'Uploading your video…',
  enhancing: 'Starting AI enhancement…',
  polling: 'Enhancing with AI — this takes a few minutes…',
  done: 'Enhancement complete!',
  error: 'Something went wrong',
}

const POLL_INTERVAL = 4000

/* ─── Inner component (needs Suspense for useSearchParams) ────────────────── */
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
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [videos, setVideos] = useState<VideoRecord[]>([])

  // Load saved videos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bl_videos')
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
      const res = await fetch(`/api/video/status/${predictionId}`)
      const data = await res.json()

      if (cancelled) return

      if (data.status === 'succeeded' && data.output) {
        const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output
        setEnhancedUrl(outputUrl)
        setStage('done')
        const record: VideoRecord = {
          id: predictionId,
          name: fileName,
          originalUrl,
          enhancedUrl: outputUrl,
          createdAt: Date.now(),
        }
        setVideos((prev) => {
          const next = [record, ...prev]
          localStorage.setItem('bl_videos', JSON.stringify(next))
          return next
        })
      } else if (data.status === 'failed' || data.error) {
        setErrorMsg(data.error ?? 'Enhancement failed on Replicate.')
        setStage('error')
      } else {
        // still processing — increment fake progress
        setPollProgress((p) => Math.min(p + 3, 92))
        setTimeout(tick, POLL_INTERVAL)
      }
    }

    tick()
    return () => { cancelled = true }
  }, [stage, predictionId, fileName, originalUrl])

  /* ── Process file ─────────────────────────────────────────────────────────── */
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please upload a video file (MP4, MOV, etc.)')
      setStage('error')
      return
    }

    setFileName(file.name)
    setFileSize(file.size)
    setUploadProgress(0)
    setPollProgress(0)
    setErrorMsg('')
    setStage('uploading')

    // 1. Upload to Vercel Blob
    let blobUrl: string
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/video/upload',
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      })
      blobUrl = blob.url
      setOriginalUrl(blobUrl)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(
        msg.includes('BLOB_READ_WRITE_TOKEN')
          ? 'Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel → Settings → Environment Variables.'
          : `Upload failed: ${msg}`,
      )
      setStage('error')
      return
    }

    // 2. Start Replicate enhancement
    setStage('enhancing')
    try {
      const res = await fetch('/api/video/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: blobUrl }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Failed to start enhancement')
        setStage('error')
        return
      }

      setPredictionId(data.id)
      setStage('polling')
    } catch {
      setErrorMsg('Could not reach the enhancement API.')
      setStage('error')
    }
  }, [])

  /* ── Drag & drop handlers ───────────────────────────────────────────────── */
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
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
    setFileName('')
    setFileSize(0)
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
                  ? 'Your video library is empty — upload your first one'
                  : `${videos.length} video${videos.length !== 1 ? 's' : ''} enhanced`}
              </p>
            </div>
            {stage === 'idle' && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </Button>
                <Button variant="primary" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Enhance video
                </Button>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onFileChange}
          />

          {/* ── Processing state ── */}
          {isProcessing && (
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
                  <p className="text-[15px] font-medium text-[#FAFAFA]">{fileName}</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">{formatBytes(fileSize)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <ProgressBar
                  value={uploadProgress}
                  label={stage === 'uploading' ? 'Uploading' : 'Upload complete'}
                />
                {(stage === 'enhancing' || stage === 'polling') && (
                  <ProgressBar
                    value={stage === 'enhancing' ? 5 : pollProgress}
                    label="AI Enhancement (Real-ESRGAN 4×)"
                  />
                )}
              </div>

              <p className="text-[13px] text-[#52525B] text-center">{STAGE_LABELS[stage]}</p>
            </div>
          )}

          {/* ── Error state ── */}
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
              <Button variant="ghost" size="sm" onClick={reset} className="self-start">
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
                  <p className="text-[15px] font-medium text-[#FAFAFA]">{fileName} — enhanced</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">4× AI upscaling via Real-ESRGAN</p>
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
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Enhance another
                  </Button>
                </div>
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-[#52525B]">Before</p>
                  <video
                    src={originalUrl}
                    controls
                    className="w-full rounded-xl"
                    style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-[#6366f1]">After — AI Enhanced</p>
                  <video
                    src={enhancedUrl}
                    controls
                    className="w-full rounded-xl"
                    style={{ border: '0.5px solid rgba(99,102,241,0.25)', boxShadow: '0 0 20px rgba(99,102,241,0.1)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Drag & drop / empty state (shown when idle) ── */}
          {stage === 'idle' && (
            <div
              ref={dropRef}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center text-center py-24 rounded-2xl gap-6 cursor-pointer transition-all duration-200"
              style={{
                border: dragging
                  ? '1.5px dashed rgba(99,102,241,0.6)'
                  : '0.5px dashed rgba(255,255,255,0.09)',
                background: dragging
                  ? 'rgba(99,102,241,0.05)'
                  : 'rgba(17,17,19,0.5)',
                boxShadow: dragging ? '0 0 0 4px rgba(99,102,241,0.08) inset' : 'none',
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-200"
                style={{
                  background: dragging ? 'rgba(99,102,241,0.12)' : '#18181C',
                  border: dragging ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
                }}
              >
                {dragging
                  ? <Upload className="w-8 h-8 text-[#6366f1]" />
                  : <Video className="w-8 h-8 text-[#3f3f46]" />}
              </div>

              <div>
                <h2 className="text-[18px] font-semibold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.02em' }}>
                  {dragging ? 'Drop to enhance' : 'No videos yet'}
                </h2>
                <p className="text-[14px] text-[#71717A] max-w-[38ch] mx-auto leading-relaxed">
                  {dragging
                    ? 'Release to start AI enhancement'
                    : 'Upload raw iPhone footage and BrandLift will enhance it to the highest quality using Real-ESRGAN 4× AI upscaling.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-150"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)',
                    boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 12px 32px rgba(99,102,241,0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)'
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Upload your first video
                </button>
                <span style={{ fontSize: 13, color: '#3f3f46' }}>or drag &amp; drop a file here</span>
              </div>

              <div className="flex items-center gap-6 mt-2">
                {[
                  { icon: '📱', label: 'iPhone footage' },
                  { icon: '✨', label: '4× AI upscaled' },
                  { icon: '📲', label: 'Ready to post' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <span className="text-xl">{icon}</span>
                    <span style={{ fontSize: 11, color: '#52525B', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Previously enhanced videos library ── */}
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
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={v.enhancedUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#A1A1AA] hover:text-white transition-colors"
                    style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}
                    onClick={(e) => e.stopPropagation()}
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

/* ─── Page export ─────────────────────────────────────────────────────────── */
export default function VideosPage() {
  return (
    <Suspense fallback={<div className="flex flex-col h-full"><TopBar /></div>}>
      <VideosInner />
    </Suspense>
  )
}
