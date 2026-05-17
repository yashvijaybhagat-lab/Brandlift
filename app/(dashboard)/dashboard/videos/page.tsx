'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
  Wand2,
  PenLine,
} from 'lucide-react'

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Stage =
  | 'script'
  | 'upload'
  | 'uploading'
  | 'enhancing'
  | 'polling'
  | 'done'
  | 'error'

interface VideoRecord {
  id: string
  name: string
  script: string
  originalUrl: string
  enhancedUrl: string
  createdAt: number
}

/* ─── Script templates ────────────────────────────────────────────────────── */
const SCRIPT_TEMPLATES = [
  { id: 'promo',       label: 'Business promo',    icon: '🏪', placeholder: "e.g. We make the best tacos in Austin — fresh ingredients, made to order, open late. Come try us at 4th & Lamar." },
  { id: 'behindscenes',label: 'Behind the scenes', icon: '🎬', placeholder: "e.g. A day in our kitchen — from prep at 6am to the last order. This is what goes into every dish we serve." },
  { id: 'testimonial', label: 'Customer story',    icon: '⭐', placeholder: "e.g. Sarah's been coming here every Friday for two years. Here's what she says about us." },
  { id: 'custom',      label: 'Write my own',      icon: '✍️', placeholder: "Write your own script or talking points here..." },
]

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 13, color: '#A1A1AA' }}>{label}</span>
        <span style={{ fontSize: 13, color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>{Math.round(value)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#18181C' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }}
        />
      </div>
    </div>
  )
}

const POLL_INTERVAL = 4000

function StepDot({ n, active, done }: { n: number | string; active: boolean; done: boolean }) {
  return (
    <div
      className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold flex-shrink-0"
      style={{
        background: done ? 'rgba(74,222,128,0.08)' : active ? 'rgba(99,102,241,0.15)' : '#18181C',
        border: done ? '0.5px solid rgba(74,222,128,0.3)' : active ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)',
        color: done ? '#4ADE80' : active ? '#818cf8' : '#3f3f46',
      }}
    >
      {done ? '✓' : n}
    </div>
  )
}

function StepLabel({ text, active, done }: { text: string; active: boolean; done: boolean }) {
  return (
    <span style={{ fontSize: active ? 14 : 13, fontWeight: active ? 500 : 400, color: active ? '#FAFAFA' : done ? '#52525B' : '#3f3f46' }}>
      {text}
    </span>
  )
}

function StepBar({ stage }: { stage: Stage }) {
  const s1done = stage !== 'script'
  const s1active = stage === 'script'
  const s2done = stage === 'uploading' || stage === 'done'
  const s2active = stage === 'upload'
  const s3active = stage === 'uploading' || stage === 'done'
  return (
    <div className="flex items-center gap-3">
      <StepDot n={1} active={s1active} done={s1done} />
      <StepLabel text="Script" active={s1active} done={s1done} />
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <StepDot n={2} active={s2active} done={s2done} />
      <StepLabel text="Upload video" active={s2active} done={s2done} />
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <StepDot n={3} active={s3active} done={false} />
      <StepLabel text="AI enhance" active={s3active} done={false} />
    </div>
  )
}

/* ─── Main inner component ────────────────────────────────────────────────── */
function VideosInner() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const ideaHook = searchParams.get('idea') ?? ''
  const ideaFormat = searchParams.get('format') ?? ''

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const streamingRef = useRef(false)

  const [stage, setStage] = useState<Stage>('script')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [enhancedUrl, setEnhancedUrl] = useState('')
  const [originalUrl, setOriginalUrl] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [videosLoaded, setVideosLoaded] = useState(false)

  // Script state
  const [scriptText, setScriptText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationDone, setGenerationDone] = useState(false)
  const [scriptGenError, setScriptGenError] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('promo')
  const [writeOwn, setWriteOwn] = useState(false)

  const hasIdea = ideaHook.length > 0
  const currentTemplate = SCRIPT_TEMPLATES.find(t => t.id === selectedTemplate)!
  const canProceed = !isGenerating

  /* ── Persist videos to server and localStorage ───────────────────────────── */
  const saveVideos = useCallback(async (next: VideoRecord[]) => {
    try { localStorage.setItem('bl_videos_v3', JSON.stringify(next)) } catch {}
    if (session?.user?.email) {
      try {
        await fetch('/api/user/videos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videos: next }),
        })
      } catch {}
    }
  }, [session?.user?.email])

  /* ── Load videos: server first (if logged in), fallback to localStorage ──── */
  useEffect(() => {
    if (videosLoaded) return
    const loadVideos = async () => {
      if (session?.user?.email) {
        try {
          const res = await fetch('/api/user/videos')
          const data = await res.json()
          if (Array.isArray(data.videos) && data.videos.length > 0) {
            setVideos(data.videos)
            setVideosLoaded(true)
            return
          }
        } catch {}
      }
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('bl_videos_v3')
        if (saved) {
          const parsed = JSON.parse(saved)
          setVideos(parsed)
          // Sync localStorage data to server if just logged in
          if (session?.user?.email && parsed.length > 0) {
            fetch('/api/user/videos', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videos: parsed }),
            }).catch(() => {})
          }
        }
      } catch {}
      setVideosLoaded(true)
    }
    // Wait for session to load before deciding
    if (session !== undefined) loadVideos()
  }, [session, videosLoaded])

  /* ── Auto-generate script ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!hasIdea || writeOwn || streamingRef.current) return

    const generate = async () => {
      streamingRef.current = true
      setIsGenerating(true)
      setGenerationDone(false)
      setScriptText('')

      try {
        const res = await fetch('/api/video/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: ideaHook, format: ideaFormat }),
        })
        if (!res.ok || !res.body) {
          setScriptGenError(true)
          setWriteOwn(true)
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
          setScriptText(text)
        }
        setGenerationDone(true)
      } catch {
        setScriptGenError(true)
        setWriteOwn(true)
      } finally {
        streamingRef.current = false
        setIsGenerating(false)
      }
    }

    generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIdea, writeOwn])

  /* ── Background enhancement (fire-and-forget after upload completes) ─────── */
  const runEnhancementInBackground = useCallback(async (videoUrl: string, recordId: string) => {
    try {
      const res = await fetch('/api/video/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data.id) return

      // Poll until done (background, no UI stage changes)
      let attempts = 0
      const poll = async (): Promise<void> => {
        if (attempts++ > 60) return
        try {
          const r = await fetch(`/api/video/status/${data.id}`)
          const d = await r.json()
          if (d.status === 'succeeded' && d.output) {
            const enhancedUrl = Array.isArray(d.output) ? d.output[0] : d.output
            setVideos(prev => {
              const next = prev.map(v => v.id === recordId ? { ...v, enhancedUrl } : v)
              saveVideos(next)
              return next
            })
          } else if (d.status !== 'failed') {
            await new Promise(r => setTimeout(r, POLL_INTERVAL))
            return poll()
          }
        } catch { /* ignore */ }
      }
      await poll()
    } catch { /* ignore */ }
  }, [saveVideos])

  /* ── Upload ──────────────────────────────────────────────────────────────── */
  const startUpload = useCallback(async (file: File) => {
    setUploadProgress(0)
    setErrorMsg('')
    setStage('uploading')

    let blobUrl = ''
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/video/upload',
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      })
      blobUrl = blob.url
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed — check your connection and try again.')
      setStage('error')
      return
    }

    // Upload done — save record immediately and show done state
    const recordId = Date.now().toString()
    const record: VideoRecord = {
      id: recordId,
      name: file.name,
      script: scriptText,
      originalUrl: blobUrl,
      enhancedUrl: blobUrl,
      createdAt: Date.now(),
    }
    setOriginalUrl(blobUrl)
    setEnhancedUrl(blobUrl)
    setVideos(prev => {
      const next = [record, ...prev]
      saveVideos(next)
      return next
    })
    setStage('done')

    // Enhancement runs silently in background — doesn't block the UI
    runEnhancementInBackground(blobUrl, recordId)
  }, [scriptText, saveVideos, runEnhancementInBackground])

  /* ── File handlers ───────────────────────────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please upload a video file (MP4, MOV, etc.)')
      setStage('error')
      return
    }
    setPendingFile(file)
    startUpload(file)
  }, [startUpload])

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
    setStage('script')
    setUploadProgress(0)
    setErrorMsg('')
    setEnhancedUrl('')
    setOriginalUrl('')
    setPendingFile(null)
    setScriptText('')
    setGenerationDone(false)
    setWriteOwn(false)
    setScriptGenError(false)
    setSelectedTemplate('promo')
    streamingRef.current = false
  }

  const isProcessing = stage === 'uploading'
  const displayUrl = enhancedUrl || originalUrl

  /* ── Render ──────────────────────────────────────────────────────────────── */
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
                {videos.length === 0
                  ? 'Pick a script, upload your footage, get a polished AI-enhanced video'
                  : `${videos.length} video${videos.length !== 1 ? 's' : ''} created`}
              </p>
            </div>
            {stage !== 'script' && stage !== 'done' && (
              <Button variant="ghost" size="sm" onClick={reset}>← Start over</Button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />

          {!isProcessing && stage !== 'done' && stage !== 'error' && (
            <StepBar stage={stage} />
          )}

          {/* ── STEP 1: SCRIPT ── */}
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
                    <button
                      onClick={() => { setWriteOwn(false); setScriptGenError(false); streamingRef.current = false }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                      style={{
                        background: !writeOwn ? 'rgba(99,102,241,0.12)' : '#18181C',
                        border: !writeOwn ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)',
                        color: !writeOwn ? '#a5b4fc' : '#71717A',
                      }}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      AI-generated
                    </button>
                    <button
                      onClick={() => { setWriteOwn(true); setScriptText(''); setScriptGenError(false) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
                      style={{
                        background: writeOwn ? 'rgba(99,102,241,0.12)' : '#18181C',
                        border: writeOwn ? '1px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)',
                        color: writeOwn ? '#a5b4fc' : '#71717A',
                      }}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      Write my own
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>
                      {isGenerating ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#6366f1] animate-pulse" />
                          Generating script…
                        </span>
                      ) : generationDone && !writeOwn ? 'AI-generated script — edit freely' : 'Your script'}
                    </label>
                    <textarea
                      rows={6}
                      value={scriptText}
                      onChange={e => setScriptText(e.target.value)}
                      placeholder={writeOwn ? "Write your talking points or full script here…" : "Generating…"}
                      readOnly={isGenerating && !writeOwn}
                      className="w-full rounded-xl px-4 py-3 text-[14px] text-[#FAFAFA] resize-none outline-none"
                      style={{
                        background: 'rgba(24,24,28,0.7)',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        lineHeight: 1.65,
                        color: isGenerating ? '#818cf8' : '#FAFAFA',
                        transition: 'color 0.3s',
                      }}
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
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>Your script</label>
                    <textarea
                      rows={5}
                      value={scriptText}
                      onChange={e => setScriptText(e.target.value)}
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

              <Button
                variant="primary"
                size="sm"
                disabled={!canProceed}
                onClick={() => setStage('upload')}
                className="gap-1.5 self-start"
              >
                {isGenerating ? 'Generating script…' : 'Continue to upload'}
                {!isGenerating && <ChevronRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}

          {/* ── STEP 2: UPLOAD DROP ZONE ── */}
          {stage === 'upload' && (
            <div className="flex flex-col gap-5">
              <div
                className="flex items-start gap-3 p-4 rounded-xl cursor-pointer"
                style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}
                onClick={() => setStage('script')}
              >
                <FileText className="w-4 h-4 text-[#6366f1] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#A1A1AA] leading-relaxed flex-1 line-clamp-2">
                  {scriptText || <span className="text-[#3f3f46] italic">No script — uploading without one</span>}
                </p>
                <span style={{ fontSize: 11, color: '#52525B', whiteSpace: 'nowrap' }}>Edit ↩</span>
              </div>

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
                  style={{ background: dragging ? 'rgba(99,102,241,0.12)' : '#18181C', border: dragging ? '0.5px solid rgba(99,102,241,0.3)' : '0.5px solid rgba(255,255,255,0.08)' }}
                >
                  {dragging ? <Upload className="w-7 h-7 text-[#6366f1]" /> : <Video className="w-7 h-7 text-[#3f3f46]" />}
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-[#FAFAFA] mb-1">
                    {dragging ? 'Drop your video' : 'Upload your footage'}
                  </p>
                  <p className="text-[13px] text-[#71717A]">MP4, MOV, AVI — drag & drop or click to browse</p>
                </div>
                <button
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)', boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)' }}
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  <Upload className="w-4 h-4" />
                  Choose video
                </button>
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
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
              <div className="flex flex-col gap-4">
                <ProgressBar value={uploadProgress} label="Uploading to storage…" />
              </div>
              <p className="text-[13px] text-[#52525B] text-center">Uploading your video…</p>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === 'error' && (
            <div className="flex flex-col gap-4 p-6 rounded-2xl" style={{ background: 'rgba(239,68,68,0.05)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-red-300">Upload failed</p>
                  <p className="text-[13px] text-red-400/70 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
                <button onClick={reset} className="text-red-400/50 hover:text-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setStage('upload'); setErrorMsg('') }} className="self-start">
                Try again
              </Button>
            </div>
          )}

          {/* ── DONE ── */}
          {stage === 'done' && displayUrl && (
            <div className="flex flex-col gap-6 p-6 rounded-2xl" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[#FAFAFA]">{pendingFile?.name} — saved</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">
                    {enhancedUrl && enhancedUrl !== originalUrl ? 'AI enhanced 4× with Real-ESRGAN' : 'Uploaded and ready'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={displayUrl}
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

              <video src={displayUrl} controls className="w-full rounded-xl"
                style={{ border: '0.5px solid rgba(99,102,241,0.25)', boxShadow: '0 0 20px rgba(99,102,241,0.1)' }} />
            </div>
          )}

          {/* ── Video library ── */}
          {videos.length > 0 && (stage === 'script' || stage === 'upload') && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-medium text-[#FAFAFA]">Previous videos</h2>
              {videos.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-4 p-4 rounded-[12px]"
                  style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                    <CheckCircle2 className="w-5 h-5 text-[#6366f1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#FAFAFA] truncate">{v.name}</p>
                    <p className="text-[12px] text-[#52525B] mt-0.5 truncate">{v.script || 'No script'}</p>
                  </div>
                  <a
                    href={v.enhancedUrl || v.originalUrl}
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
