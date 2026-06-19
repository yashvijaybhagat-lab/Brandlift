'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TopBar } from '@/components/dashboard/TopBar'
import {
  Wand2, Upload, Download, Loader2, CheckCircle2, AlertCircle,
  Film, RefreshCw, Copy, Sparkles,
} from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────────────── */

type Mode      = 'auto' | 'upload'
type Aspect    = '9:16' | '1:1' | '16:9'
type StepState = 'idle' | 'uploading' | 'generating-image' | 'animating' | 'done' | 'error'

interface HistoryItem {
  id: string
  prompt: string
  imageUrl: string
  videoUrl: string
  aspect: Aspect
  createdAt: number
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const ASPECTS: { id: Aspect; label: string; desc: string }[] = [
  { id: '9:16', label: '9:16', desc: 'TikTok · Reels' },
  { id: '1:1',  label: '1:1',  desc: 'Instagram' },
  { id: '16:9', label: '16:9', desc: 'YouTube' },
]

const MOTION_SUGGESTIONS = [
  'Slow cinematic push in, shallow depth of field',
  'Gentle pan right, golden hour light',
  'Dramatic dolly zoom, high contrast',
  'Sweeping crane shot, wide angle',
  'Handheld documentary feel, natural light',
  'Smooth orbit around subject, bokeh background',
]

const SCENE_EXAMPLES = [
  'A small coffee shop at dawn, warm lighting, cozy atmosphere',
  'Entrepreneur working at a sleek desk, city skyline behind them',
  'A luxury product on marble, dramatic studio lighting',
  'Vibrant street food market, people and neon signs',
  'A brand logo reveal on dark glass, premium feel',
]

/* ─── Main component ─────────────────────────────────────────────────── */

export default function HiggsfieldPage() {
  /* Inputs */
  const [mode,          setMode]         = useState<Mode>('auto')
  const [scenePrompt,   setScenePrompt]  = useState('')
  const [motionPrompt,  setMotionPrompt] = useState('')
  const [aspect,        setAspect]       = useState<Aspect>('9:16')
  const [uploadFile,    setUploadFile]   = useState<File | null>(null)
  const [uploadPreview, setUploadPreview]= useState<string | null>(null)

  /* Generation state */
  const [step,       setStep]      = useState<StepState>('idle')
  const [stepLabel,  setStepLabel] = useState('')
  const [genImage,   setGenImage]  = useState<string | null>(null)
  const [genVideo,   setGenVideo]  = useState<string | null>(null)
  const [errorMsg,   setErrorMsg]  = useState('')

  /* History */
  const [history, setHistory] = useState<HistoryItem[]>([])

  const dropRef   = useRef<HTMLDivElement>(null)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('hf_history')
    if (saved) { try { setHistory(JSON.parse(saved)) } catch {} }
  }, [])

  const saveHistory = (item: HistoryItem) => {
    setHistory(prev => {
      const next = [item, ...prev].slice(0, 20)
      sessionStorage.setItem('hf_history', JSON.stringify(next))
      return next
    })
  }

  /* ── Poll a job until done ── */
  const pollJob = useCallback((
    requestId: string,
    type: 'image' | 'video',
    onDone: (url: string) => void,
    onFail: (err: string) => void,
  ) => {
    let attempts = 0

    const tick = async () => {
      try {
        const res  = await fetch(`/api/video/higgsfield/status/${requestId}`)
        const data = await res.json()

        if (data.status === 'completed') {
          const url = type === 'image' ? data.images?.[0]?.url : data.video?.url
          if (url) { onDone(url); return }
          onFail('No output URL in response'); return
        }
        if (data.status === 'failed' || data.status === 'nsfw') {
          onFail(data.error ?? `Generation ${data.status}`); return
        }
      } catch { /* network hiccup — keep polling */ }

      if (++attempts >= 120) { onFail('Timed out after 6 minutes'); return }
      pollTimer.current = setTimeout(tick, 3000)
    }

    pollTimer.current = setTimeout(tick, 3000)
  }, [])

  /* ── Generate ── */
  const handleGenerate = useCallback(async () => {
    if (!scenePrompt.trim()) return
    if (pollTimer.current) clearTimeout(pollTimer.current)

    setStep('idle'); setGenImage(null); setGenVideo(null); setErrorMsg('')

    const motion = motionPrompt.trim() || 'Cinematic slow push in, shallow depth of field, 4K quality'
    let sourceImageUrl: string | null = null

    /* Upload mode — upload image first */
    if (mode === 'upload') {
      if (!uploadFile) { setErrorMsg('Upload an image first'); return }
      setStep('uploading'); setStepLabel('Uploading image…')

      const form = new FormData()
      form.append('file', uploadFile)
      const upRes = await fetch('/api/video/higgsfield/upload', { method: 'POST', body: form })
      if (!upRes.ok) {
        const d = await upRes.json()
        setStep('error'); setErrorMsg(d.error ?? 'Upload failed'); return
      }
      sourceImageUrl = (await upRes.json()).url
      setGenImage(sourceImageUrl)
    }

    /* Auto mode — generate scene image first */
    if (mode === 'auto') {
      setStep('generating-image'); setStepLabel('Generating scene with Flux Pro…')

      const res  = await fetch('/api/video/higgsfield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'image', prompt: scenePrompt.trim(), aspect }),
      })
      const data = await res.json()

      if (!res.ok || !data.requestId) {
        setStep('error'); setErrorMsg(data.error ?? 'Image generation failed'); return
      }

      const imageUrl = await new Promise<string | null>(resolve => {
        pollJob(data.requestId, 'image', resolve, err => { setStep('error'); setErrorMsg(err); resolve(null) })
      })
      if (!imageUrl) return
      setGenImage(imageUrl)
      sourceImageUrl = imageUrl
    }

    /* Animate with DoP */
    setStep('animating'); setStepLabel('Animating with Higgsfield DoP…')

    const vidRes  = await fetch('/api/video/higgsfield', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'video', prompt: motion, imageUrl: sourceImageUrl, aspect }),
    })
    const vidData = await vidRes.json()

    if (!vidRes.ok || !vidData.requestId) {
      setStep('error'); setErrorMsg(vidData.error ?? 'Video generation failed'); return
    }

    pollJob(vidData.requestId, 'video', url => {
      setGenVideo(url); setStep('done'); setStepLabel('')
      if (sourceImageUrl) {
        saveHistory({ id: vidData.requestId, prompt: scenePrompt.trim(), imageUrl: sourceImageUrl, videoUrl: url, aspect, createdAt: Date.now() })
      }
    }, err => { setStep('error'); setErrorMsg(err) })
  }, [mode, scenePrompt, motionPrompt, aspect, uploadFile, pollJob])

  /* ── File drop ── */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)) }
  }
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setUploadFile(file); setUploadPreview(URL.createObjectURL(file)) }
  }

  const isGenerating = ['uploading', 'generating-image', 'animating'].includes(step)

  const reset = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current)
    setStep('idle'); setGenImage(null); setGenVideo(null); setErrorMsg(''); setStepLabel('')
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0c0c0e' }}>
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: controls ── */}
        <div className="w-[380px] flex-shrink-0 flex flex-col gap-4 p-5 overflow-y-auto"
          style={{ borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(124, 92, 255,0.12)' }}>
                <Sparkles className="w-4 h-4 text-[#7C5CFF]" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>AI Video Studio</p>
                <p style={{ fontSize: 11, color: '#52525B' }}>Higgsfield DoP · cinematic AI</p>
              </div>
            </div>
          </div>

          {/* Mode */}
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: '#1A1530' }}>
            {(['auto', 'upload'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150"
                style={{ background: mode === m ? '#7C5CFF' : 'transparent', color: mode === m ? '#fff' : '#52525B' }}>
                {m === 'auto' ? 'Text → Video' : 'Image → Video'}
              </button>
            ))}
          </div>

          {/* Scene prompt */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>
              {mode === 'auto' ? 'Scene description' : 'Camera motion'}
            </label>
            <textarea rows={4} value={scenePrompt} onChange={e => setScenePrompt(e.target.value)}
              placeholder={mode === 'auto'
                ? SCENE_EXAMPLES[Math.floor(Date.now() / 30000) % SCENE_EXAMPLES.length]
                : MOTION_SUGGESTIONS[0]}
              className="w-full resize-none px-3.5 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: '#1A1530', border: '0.5px solid rgba(255,255,255,0.07)', color: '#FAFAFA', lineHeight: 1.5 }}
            />
            <div className="flex flex-wrap gap-1.5">
              {(mode === 'auto' ? SCENE_EXAMPLES : MOTION_SUGGESTIONS).slice(0, 3).map(s => (
                <button key={s} onClick={() => setScenePrompt(s)}
                  className="text-[10px] px-2 py-0.5 rounded-md transition-colors"
                  style={{ background: 'rgba(124, 92, 255,0.07)', color: '#7C5CFF', border: '0.5px solid rgba(124, 92, 255,0.15)' }}>
                  {s.slice(0, 32)}…
                </button>
              ))}
            </div>
          </div>

          {/* Motion prompt (auto mode) */}
          {mode === 'auto' && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Camera motion <span style={{ fontWeight: 400, color: '#3f3f46' }}>(optional)</span></label>
              <textarea rows={2} value={motionPrompt} onChange={e => setMotionPrompt(e.target.value)}
                placeholder="Slow cinematic push in, shallow depth of field…"
                className="w-full resize-none px-3.5 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background: '#1A1530', border: '0.5px solid rgba(255,255,255,0.07)', color: '#FAFAFA', lineHeight: 1.5 }}
              />
            </div>
          )}

          {/* Image upload */}
          {mode === 'upload' && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Source image</label>
              <div ref={dropRef} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
                onClick={() => document.getElementById('hf-img-input')?.click()}
                className="relative flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
                style={{ height: 160, border: '1.5px dashed rgba(124, 92, 255,0.3)', background: uploadPreview ? 'transparent' : 'rgba(124, 92, 255,0.04)', overflow: 'hidden' }}>
                {uploadPreview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={uploadPreview} alt="preview" className="w-full h-full object-cover" />
                  : <>
                      <Upload className="w-7 h-7 text-[#3f3f46]" />
                      <p style={{ fontSize: 12, color: '#52525B', textAlign: 'center' }}>
                        Drop an image or click to browse<br />
                        <span style={{ color: '#3f3f46' }}>JPEG · PNG · WebP · max 20 MB</span>
                      </p>
                    </>}
                <input id="hf-img-input" type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
              </div>
              {uploadFile && (
                <button onClick={() => { setUploadFile(null); setUploadPreview(null) }}
                  className="text-[11px] text-[#52525B] hover:text-[#FAFAFA] transition-colors self-end">
                  Remove
                </button>
              )}
            </div>
          )}

          {/* Aspect ratio */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#71717A' }}>Aspect ratio</label>
            <div className="flex gap-2">
              {ASPECTS.map(a => (
                <button key={a.id} onClick={() => setAspect(a.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[12px] font-medium transition-all"
                  style={{
                    background: aspect === a.id ? 'rgba(124, 92, 255,0.12)' : '#1A1530',
                    border: aspect === a.id ? '1px solid rgba(124, 92, 255,0.35)' : '0.5px solid rgba(255,255,255,0.06)',
                    color: aspect === a.id ? '#818cf8' : '#52525B',
                  }}>
                  <span style={{ fontWeight: 700 }}>{a.label}</span>
                  <span style={{ fontSize: 10, color: aspect === a.id ? '#7C5CFF' : '#3f3f46' }}>{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button onClick={isGenerating ? undefined : handleGenerate}
            disabled={isGenerating || !scenePrompt.trim() || (mode === 'upload' && !uploadFile)}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-[14px] transition-all"
            style={{
              background: isGenerating ? 'rgba(124, 92, 255,0.25)' : '#7C5CFF',
              color: isGenerating ? '#818cf8' : '#fff',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: !scenePrompt.trim() || (mode === 'upload' && !uploadFile) ? 0.5 : 1,
            }}>
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" />{stepLabel}</>
              : <><Wand2 className="w-4 h-4" />Generate Video</>}
          </button>

          {step === 'error' && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#f87171' }}>Generation failed</p>
                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: output ── */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6">

          {(isGenerating || step === 'done') && (
            <div className="flex items-center gap-3">
              <StepChip label="Scene"   done={!!genImage}    active={step === 'generating-image' || step === 'uploading'} skip={mode === 'upload'} />
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <StepChip label="Animate" done={step === 'done'} active={step === 'animating'} />
            </div>
          )}

          {step === 'done' && genVideo ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p style={{ fontSize: 15, fontWeight: 700, color: '#FAFAFA' }}>Your video is ready</p>
                <button onClick={reset} className="flex items-center gap-1.5 text-[12px] text-[#52525B] hover:text-[#FAFAFA] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />New generation
                </button>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="flex flex-col gap-2" style={{ flex: '1 1 320px', maxWidth: 480 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Video</p>
                  <video src={genVideo} controls autoPlay loop playsInline className="rounded-2xl w-full"
                    style={{ border: '0.5px solid rgba(255,255,255,0.08)', maxHeight: 480, objectFit: 'contain', background: '#0c0c0e' }} />
                  <div className="flex gap-2">
                    <a href={genVideo} download={`brandlift-${Date.now()}.mp4`} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity"
                      style={{ background: '#7C5CFF', color: '#fff' }}>
                      <Download className="w-4 h-4" />Download
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(genVideo)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-[#1A1530] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: '#71717A' }}>
                      <Copy className="w-4 h-4" />URL
                    </button>
                  </div>
                </div>

                {genImage && (
                  <div className="flex flex-col gap-2" style={{ flex: '0 0 auto', width: 200 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scene frame</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={genImage} alt="Generated scene" className="rounded-2xl w-full"
                      style={{ border: '0.5px solid rgba(255,255,255,0.08)', maxHeight: 300, objectFit: 'cover' }} />
                    <a href={genImage} download={`brandlift-scene-${Date.now()}.jpg`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold hover:bg-[#1A1530] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: '#71717A' }}>
                      <Download className="w-3.5 h-3.5" />Image
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-10 h-10 text-[#7C5CFF] animate-spin" />
                <p style={{ fontSize: 14, color: '#71717A' }}>{stepLabel}</p>
                <p style={{ fontSize: 12, color: '#3f3f46' }}>This typically takes 1–3 minutes</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(124, 92, 255,0.08)', border: '0.5px solid rgba(124, 92, 255,0.15)' }}>
                  <Film className="w-7 h-7 text-[#3f3f46]" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#3f3f46' }}>Ready to generate</p>
                  <p style={{ fontSize: 13, color: '#2a2a2e', marginTop: 4 }}>
                    Describe your scene and hit Generate — Higgsfield DoP will animate it with cinematic camera motion
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* History */}
          {history.length > 0 && step === 'idle' && (
            <div className="flex flex-col gap-3">
              <p style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session history</p>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {history.map(h => (
                  <div key={h.id} className="flex flex-col gap-2 rounded-2xl overflow-hidden"
                    style={{ border: '0.5px solid rgba(255,255,255,0.07)', background: '#110E1C' }}>
                    <div className="relative overflow-hidden" style={{ aspectRatio: h.aspect === '9:16' ? '9/16' : h.aspect === '1:1' ? '1' : '16/9', maxHeight: 220 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.imageUrl} alt={h.prompt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.6)' }}>
                        <a href={h.videoUrl} download={`brandlift-${h.id}.mp4`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                          style={{ background: '#7C5CFF', color: '#fff' }}>
                          <Download className="w-3.5 h-3.5" />Download
                        </a>
                      </div>
                    </div>
                    <div className="px-3 pb-3">
                      <p style={{ fontSize: 12, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.prompt}</p>
                      <p style={{ fontSize: 10, color: '#3f3f46', marginTop: 2 }}>{h.aspect} · {new Date(h.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Step chip ──────────────────────────────────────────────────────── */

function StepChip({ label, done, active, skip }: { label: string; done: boolean; active: boolean; skip?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: done || skip ? 'rgba(34,197,94,0.12)' : active ? 'rgba(124, 92, 255,0.2)' : 'rgba(255,255,255,0.04)',
          border: done || skip ? '1px solid rgba(34,197,94,0.4)' : active ? '1px solid rgba(124, 92, 255,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
        }}>
        {done || skip
          ? <CheckCircle2 className="w-3 h-3 text-green-400" />
          : active
            ? <Loader2 className="w-3 h-3 text-[#7C5CFF] animate-spin" />
            : <div className="w-1.5 h-1.5 rounded-full bg-[#3f3f46]" />}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: done || skip ? '#22c55e' : active ? '#818cf8' : '#3f3f46' }}>{label}</span>
    </div>
  )
}
