/**
 * Browser-native video export engine.
 * Canvas 2D + MediaRecorder + Web Audio API — no external packages.
 *
 * Key architecture:
 * - captureStream(0) + requestFrame() → frame-perfect capture (no timer drift)
 * - requestVideoFrameCallback → hooks into each decoded frame for accurate timing
 * - Seek-based fallback for browsers without RVFC
 * - Cinematic FX: letterbox (2.39:1), halation (light bloom), film grain
 */

export type TransitionType = 'none' | 'fade' | 'dissolve'
export type ExportQuality  = '720p' | '1080p' | '1440p' | '4K'
export type CaptionStyle   = 'bold' | 'minimal' | 'neon' | 'film'
export type CaptionPos     = 'top' | 'center' | 'bottom'

export interface ExportClip {
  url: string
  trimStart: number  // 0–100
  trimEnd:   number  // 0–100
}

export interface CaptionSegment {
  text:  string
  start: number
  end:   number
}

export interface ColorOverlay {
  bg:      string
  blend:   string
  opacity: number
}

export type ExportAspect = '16:9' | '9:16' | '1:1'

export interface ExportOptions {
  clips: ExportClip[]
  // Color
  colorFilter:      string
  colorOverlay?:    ColorOverlay
  vignetteOpacity?: number
  grain?:           number    // 0–100
  // Cinematic FX
  letterbox?:       boolean   // 2.39:1 cinema bars
  halation?:        number    // 0–100 light bloom on highlights
  // Text
  captionsEnabled:  boolean
  captions:         CaptionSegment[]
  captionStyle?:    CaptionStyle
  captionPos?:      CaptionPos
  captionSize?:     number
  captionColor?:    string   // hex e.g. '#FFFFFF'
  captionFont?:     string   // 'inter' | 'impact' | 'serif' | 'mono' | 'display'
  showHook:         boolean
  hookText:         string
  showCta:          boolean
  ctaText:          string
  // Audio
  musicUrl:         string | null
  musicVolume:      number
  // Transitions
  transition:       TransitionType
  transitionDuration: number
  // Quality
  quality:  ExportQuality
  aspect?:  ExportAspect
  onProgress?: (pct: number, label: string) => void
}

/* ── Resolution & quality tables ─────────────────────────── */

const RESOLUTIONS: Record<ExportQuality, { w: number; h: number }> = {
  '720p':  { w: 1280,  h: 720  },
  '1080p': { w: 1920,  h: 1080 },
  '1440p': { w: 2560,  h: 1440 },
  '4K':    { w: 3840,  h: 2160 },
}

const BITRATES: Record<ExportQuality, number> = {
  '720p':  8_000_000,
  '1080p': 25_000_000,
  '1440p': 60_000_000,
  '4K':    100_000_000,
}

// All qualities at 30fps — smooth cinematic output
const FPS = 30

const FONT_FAMILIES: Record<string, string> = {
  inter:   'Inter, Arial, sans-serif',
  impact:  'Impact, "Arial Narrow", sans-serif',
  serif:   'Georgia, "Times New Roman", serif',
  mono:    '"Courier New", Courier, monospace',
  display: '"Playfair Display", Georgia, serif',
}

function getCanvasSize(quality: ExportQuality, aspect: ExportAspect = '16:9'): { w: number; h: number } {
  const base = RESOLUTIONS[quality]
  if (aspect === '9:16') return { w: base.h, h: base.w }
  if (aspect === '1:1')  return { w: base.h, h: base.h }
  return base
}

/* ── Media utilities ─────────────────────────────────────── */

async function toBlobUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors', cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return URL.createObjectURL(await res.blob())
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'auto'; v.playsInline = true; v.muted = true; v.crossOrigin = 'anonymous'
    v.src = src
    v.addEventListener('loadedmetadata', () => resolve(v), { once: true })
    v.addEventListener('error', reject, { once: true })
    v.load()
  })
}

function loadAudio(src: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const a = document.createElement('audio')
    a.preload = 'auto'; a.crossOrigin = 'anonymous'; a.src = src
    a.addEventListener('canplaythrough', () => resolve(a), { once: true })
    a.addEventListener('error', reject, { once: true })
    a.load()
  })
}

function seekTo(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise(resolve => {
    if (Math.abs(v.currentTime - t) < 0.02) { resolve(); return }
    v.addEventListener('seeked', () => resolve(), { once: true })
    v.currentTime = t
  })
}

function pickMimeType(): string {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return 'video/webm'
}

/* ── Cinematic FX ────────────────────────────────────────── */

/** 2.39:1 cinema letterbox bars — drawn on top of everything */
function drawLetterbox(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cinemaH = Math.round(w / 2.39)
  if (cinemaH >= h) return
  const barH = Math.round((h - cinemaH) / 2)
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, w, barH)
  ctx.fillRect(0, h - barH, w, barH)
  ctx.restore()
}

/**
 * Halation — cinematic light bloom around bright areas.
 * Isolates highlights on a tiny offscreen canvas, blurs them,
 * then blends back with 'screen' composite (brightens without clipping).
 * Working at 1/4 resolution keeps this fast even at 4K.
 */
function drawHalation(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number, h: number,
  amount: number,
) {
  if (amount <= 0) return
  const GW = Math.max(160, Math.round(w / 4))
  const GH = Math.max(90,  Math.round(h / 4))
  const gc = document.createElement('canvas')
  gc.width = GW; gc.height = GH
  const gctx = gc.getContext('2d')!
  // Extract highlights — warm orange shift mimics real film halation
  gctx.filter = `brightness(${2 + amount * 0.028}) contrast(3.8) saturate(2.4) hue-rotate(-22deg) blur(${Math.round(GW * 0.08)}px)`
  gctx.drawImage(video, 0, 0, GW, GH)
  // Blend back — 'screen' only brightens (safe, no clipping)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = Math.min(0.62, amount * 0.006)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.filter = `blur(${Math.round(w * 0.018)}px)`
  ctx.drawImage(gc, 0, 0, w, h)
  ctx.restore()
}

/**
 * Film grain — uses a relative-sized offscreen canvas blended with 'overlay'.
 * Relative sizing (w/3, h/3) keeps grain fine at 4K instead of blocky.
 * The `seed` parameter ensures different grain every frame (organic flicker).
 */
function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number) {
  if (amount <= 0) return
  // Use finer grain at higher quality (w/4 instead of w/3 gives denser noise at same canvas size)
  const GW = Math.max(480, Math.round(w / 2.5)), GH = Math.max(270, Math.round(h / 2.5))
  const intensity = (amount / 100) * 55
  const gc = document.createElement('canvas')
  gc.width = GW; gc.height = GH
  const gctx = gc.getContext('2d', { willReadFrequently: true })!
  const imgData = gctx.createImageData(GW, GH)
  const data = imgData.data
  // Seeded noise for per-frame variation
  let rng = seed * 1664525 + 1013904223
  for (let i = 0; i < data.length; i += 4) {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff
    const n = Math.abs(((rng >>> 0) % 256) / 255 - 0.5) * intensity
    data[i] = data[i+1] = data[i+2] = 128
    data[i+3] = Math.min(255, Math.round(n * 2.8))
  }
  gctx.putImageData(imgData, 0, 0)
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.45
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(gc, 0, 0, w, h)
  ctx.restore()
}

/* ── Video drawing ───────────────────────────────────────── */

function captionY(h: number, pos: CaptionPos = 'bottom', size: number): number {
  if (pos === 'top')    return h * 0.10 + size
  if (pos === 'center') return h * 0.50
  return h * 0.87
}

function drawVideoFit(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) {
  const vw = video.videoWidth  || w
  const vh = video.videoHeight || h
  const srcAspect = vw / vh
  const dstAspect = w / h
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (Math.abs(srcAspect - dstAspect) < 0.02) {
    ctx.drawImage(video, 0, 0, w, h)
  } else if (dstAspect < srcAspect) {
    const drawH = h
    const drawW = h * srcAspect
    ctx.drawImage(video, (w - drawW) / 2, 0, drawW, drawH)
  } else {
    const drawW = w
    const drawH = w / srcAspect
    ctx.drawImage(video, 0, (h - drawH) / 2, drawW, drawH)
  }
}

function drawStyledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  color: string,
  style: CaptionStyle = 'bold',
) {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0

  if (style === 'bold') {
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 12
    for (const [dx, dy] of [[-2,-2],[2,-2],[-2,2],[2,2]]) {
      ctx.shadowOffsetX = dx; ctx.shadowOffsetY = dy
      ctx.fillStyle = 'rgba(0,0,0,0.85)'
      ctx.fillText(text, x, y, maxWidth)
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0
    ctx.fillStyle = color
    ctx.fillText(text, x, y, maxWidth)
  } else if (style === 'minimal') {
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2
    ctx.fillStyle = color
    ctx.fillText(text, x, y, maxWidth)
  } else if (style === 'neon') {
    ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 24
    ctx.fillStyle = '#c4b5fd'
    ctx.fillText(text, x, y, maxWidth)
    ctx.shadowBlur = 0
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(text, x, y, maxWidth)
  } else if (style === 'film') {
    const metrics = ctx.measureText(text)
    const padX = 14, padY = 9
    const bw = Math.min(metrics.width + padX * 2, maxWidth + padX * 2)
    const bh = (parseFloat(ctx.font) || 18) + padY * 2
    ctx.fillStyle = 'rgba(0,0,0,0.78)'
    ctx.fillRect(x - bw / 2, y - bh + padY, bw, bh)
    ctx.fillStyle = color
    ctx.fillText(text, x, y, maxWidth)
  } else {
    ctx.fillStyle = color
    ctx.fillText(text, x, y, maxWidth)
  }
}

function parseGradientToCanvas(ctx: CanvasRenderingContext2D, bg: string, w: number, h: number): CanvasGradient | string {
  const m = bg.match(/^linear-gradient\(\s*(\d+)deg\s*,(.+)\)$/)
  if (!m) return '#888'
  const deg = parseInt(m[1])
  const rad = ((deg - 90) * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const x1 = w/2 - cos*w/2, y1 = h/2 - sin*h/2
  const x2 = w/2 + cos*w/2, y2 = h/2 + sin*h/2
  const grad = ctx.createLinearGradient(x1, y1, x2, y2)
  const raw = m[2].trim()
  const stops: string[] = []
  let depth = 0, cur = ''
  for (const ch of raw) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) { stops.push(cur.trim()); cur = '' }
    else cur += ch
  }
  stops.push(cur.trim())
  stops.forEach((s, i) => {
    const pm = s.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/)
    if (pm) grad.addColorStop(parseFloat(pm[2]) / 100, pm[1].trim())
    else grad.addColorStop(i / Math.max(stops.length - 1, 1), s.trim())
  })
  return grad
}

/** Draw a single frame to the canvas. */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  opts: Pick<ExportOptions,
    'colorFilter' | 'colorOverlay' | 'vignetteOpacity' | 'grain' | 'halation' |
    'captionsEnabled' | 'captionStyle' | 'captionPos' | 'captionSize' | 'captionColor' | 'captionFont' |
    'showHook' | 'hookText' | 'showCta' | 'ctaText'>,
  clipTime: number,
  captions: CaptionSegment[],
  overlayAlpha: number,
  frameIndex = 0,
) {
  ctx.save()
  ctx.globalAlpha = overlayAlpha

  const fontFamilyStr = FONT_FAMILIES[opts.captionFont ?? 'inter'] ?? 'Inter, Arial, sans-serif'
  const capColor = opts.captionColor ?? '#FFFFFF'

  // Clarity boost: contrast/saturation lift gives perceived sharpness without blurring
  const clarityBoost = 'contrast(1.12) saturate(1.08) brightness(1.01)'
  const baseFilter   = opts.colorFilter && opts.colorFilter !== 'none' ? opts.colorFilter : 'none'
  ctx.filter = baseFilter !== 'none' ? `${baseFilter} ${clarityBoost}` : clarityBoost
  drawVideoFit(ctx, video, w, h)
  ctx.filter = 'none'

  // Halation — draw before color overlay so it bleeds through the grade
  if ((opts.halation ?? 0) > 0) {
    drawHalation(ctx, video, w, h, opts.halation!)
  }

  // Color overlay
  if (opts.colorOverlay) {
    const { bg, blend, opacity } = opts.colorOverlay
    ctx.globalCompositeOperation = blend as GlobalCompositeOperation
    ctx.globalAlpha = overlayAlpha * opacity
    ctx.fillStyle = parseGradientToCanvas(ctx, bg, w, h)
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = overlayAlpha
  }

  // Vignette — crush corners more aggressively for filmic feel
  const vig = opts.vignetteOpacity ?? 0
  if (vig > 0) {
    const cx = w / 2, cy = h / 2
    const r = Math.sqrt(cx * cx + cy * cy)
    const vg = ctx.createRadialGradient(cx, cy, r * 0.32, cx, cy, r * 1.05)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(0.7, `rgba(0,0,0,${vig * overlayAlpha * 0.4})`)
    vg.addColorStop(1, `rgba(0,0,0,${vig * overlayAlpha})`)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = overlayAlpha

  // Film grain — per-frame seed for organic flicker
  if ((opts.grain ?? 0) > 0) {
    drawGrain(ctx, w, h, opts.grain!, frameIndex)
  }

  // Hook
  if (opts.showHook && opts.hookText) {
    const sz = Math.round(w * 0.032 * (opts.captionSize ?? 1))
    ctx.font = `700 ${sz}px ${fontFamilyStr}`
    ctx.textAlign = 'center'
    drawStyledText(ctx, opts.hookText, w / 2, h * 0.06 + sz, w * 0.85, '#FAFAFA', opts.captionStyle ?? 'bold')
  }

  // Captions
  if (opts.captionsEnabled) {
    const cap = captions.find(c => clipTime >= c.start && clipTime < c.end)
    if (cap) {
      const sz = Math.round(w * 0.028 * (opts.captionSize ?? 1))
      const y = captionY(h, opts.captionPos, sz)
      ctx.font = `${opts.captionStyle === 'minimal' ? 500 : 700} ${sz}px ${fontFamilyStr}`
      ctx.textAlign = 'center'
      drawStyledText(ctx, cap.text, w / 2, y, w * 0.80, capColor, opts.captionStyle ?? 'bold')
    }
  }

  // CTA
  if (opts.showCta && opts.ctaText) {
    const sz = Math.round(w * 0.025 * (opts.captionSize ?? 1))
    ctx.font = `600 ${sz}px ${fontFamilyStr}`
    ctx.textAlign = 'center'
    drawStyledText(ctx, opts.ctaText, w / 2, h * 0.94, w * 0.80, '#a5b4fc', opts.captionStyle ?? 'bold')
  }

  ctx.restore()
}

/* ── requestVideoFrameCallback support ───────────────────── */

type RVFCCallback = (now: DOMHighResTimeStamp, meta: { mediaTime: number; presentedFrames: number }) => void

function hasRVFC(v: HTMLVideoElement): boolean {
  return 'requestVideoFrameCallback' in v
}

function requestVFC(v: HTMLVideoElement, cb: RVFCCallback): number {
  return (v as unknown as { requestVideoFrameCallback: (cb: RVFCCallback) => number })
    .requestVideoFrameCallback(cb)
}

function cancelVFC(v: HTMLVideoElement, id: number) {
  ;(v as unknown as { cancelVideoFrameCallback: (id: number) => void })
    .cancelVideoFrameCallback(id)
}

/* ── Frame-accurate clip rendering ──────────────────────── */

/**
 * Renders one clip using requestVideoFrameCallback.
 * Video plays at real-time speed — audio stays in sync.
 * requestFrame() is called for each decoded frame — no drops, no timer drift.
 */
function renderClipRVFC(
  v: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  videoTrack: CanvasCaptureMediaStreamTrack,
  w: number, h: number,
  opts: ExportOptions,
  startT: number,
  endT: number,
  onFrame: (frameIndex: number) => void,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let frame = 0
    let rafId = -1

    const step: RVFCCallback = (_now, meta) => {
      const t = meta.mediaTime ?? v.currentTime
      if (t >= endT - 0.04 || v.ended || v.paused) {
        resolve()
        return
      }
      ctx.clearRect(0, 0, w, h)
      drawFrame(ctx, v, w, h, opts, t - startT, opts.captions, 1, frame)
      if (opts.letterbox) drawLetterbox(ctx, w, h)
      videoTrack.requestFrame()
      onFrame(frame)
      frame++
      rafId = requestVFC(v, step)
    }

    rafId = requestVFC(v, step)
    v.play().catch(() => {})

    // Safety: resolve if video ends naturally
    v.addEventListener('ended', () => { cancelVFC(v, rafId); resolve() }, { once: true })
  })
}

/**
 * Seek-based fallback for browsers without requestVideoFrameCallback.
 * Audio is disconnected here (video is paused), but frame accuracy is perfect.
 */
async function renderClipSeekBased(
  v: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  videoTrack: CanvasCaptureMediaStreamTrack,
  w: number, h: number,
  opts: ExportOptions,
  startT: number,
  endT: number,
  onFrame: (frameIndex: number) => void,
): Promise<void> {
  v.pause()
  const clipFrames = Math.round((endT - startT) * FPS)
  for (let f = 0; f <= clipFrames; f++) {
    const t = Math.min(startT + f / FPS, endT - 0.005)
    await seekTo(v, t)
    ctx.clearRect(0, 0, w, h)
    drawFrame(ctx, v, w, h, opts, t - startT, opts.captions, 1, f)
    if (opts.letterbox) drawLetterbox(ctx, w, h)
    videoTrack.requestFrame()
    // One microtask yield — lets MediaRecorder process the frame
    await new Promise(r => setTimeout(r, 0))
    onFrame(f)
  }
}

/* ── Transition rendering ────────────────────────────────── */

async function renderTransitionFrames(
  ctx: CanvasRenderingContext2D,
  videoTrack: CanvasCaptureMediaStreamTrack,
  outV: HTMLVideoElement,
  inV:  HTMLVideoElement | null,
  w: number, h: number,
  type: TransitionType,
  dur: number,
  opts: ExportOptions,
  outTime: number,
  inTime: number,
  baseFrame: number,
  onFrame: (f: number) => void,
) {
  if (type === 'none' || dur <= 0) return
  const frames = Math.round(dur * FPS)
  const FRAME_MS = 1000 / FPS

  for (let f = 0; f <= frames; f++) {
    const t = f / frames
    ctx.clearRect(0, 0, w, h)

    if (type === 'fade') {
      // Fade to black, then fade in next clip
      if (t <= 0.5) {
        // Fade out
        const a = 1 - t * 2
        drawFrame(ctx, outV, w, h, opts, outTime, opts.captions, a, baseFrame + f)
        ctx.fillStyle = `rgba(0,0,0,${1 - a})`
        ctx.fillRect(0, 0, w, h)
      } else if (inV) {
        // Fade in
        const a = (t - 0.5) * 2
        drawFrame(ctx, inV, w, h, opts, inTime, opts.captions, a, baseFrame + f)
        ctx.fillStyle = `rgba(0,0,0,${1 - a})`
        ctx.fillRect(0, 0, w, h)
      }
    } else if (type === 'dissolve' && inV) {
      // Cross-dissolve — draw outgoing at (1-t), incoming at t
      drawFrame(ctx, outV, w, h, opts, outTime, opts.captions, 1, baseFrame + f)
      ctx.save()
      ctx.globalAlpha = t
      drawFrame(ctx, inV, w, h, opts, inTime, opts.captions, 1, baseFrame + f)
      ctx.restore()
    }

    if (opts.letterbox) drawLetterbox(ctx, w, h)
    videoTrack.requestFrame()
    await new Promise(r => setTimeout(r, FRAME_MS))
    onFrame(f)
  }
}

/* ── Main export function ────────────────────────────────── */

export async function exportVideo(opts: ExportOptions): Promise<Blob> {
  const { w, h } = getCanvasSize(opts.quality, opts.aspect ?? '16:9')
  const report = opts.onProgress ?? (() => {})
  const FRAME_MS = 1000 / FPS

  // Must be created synchronously before any await — browsers suspend AudioContext
  // created outside a user-gesture activation window.
  const audioCtx = new AudioContext({ sampleRate: 48000 })
  await audioCtx.resume()
  const dest = audioCtx.createMediaStreamDestination()

  report(0, 'Fetching clips…')
  const objectUrls: string[] = []
  const clipBlobUrls = await Promise.all(opts.clips.map(async c => {
    const u = await toBlobUrl(c.url); objectUrls.push(u); return u
  }))

  let musicBlobUrl: string | null = null
  if (opts.musicUrl) {
    musicBlobUrl = await toBlobUrl(opts.musicUrl)
    objectUrls.push(musicBlobUrl)
  }

  report(5, 'Loading media…')
  const videoEls = await Promise.all(clipBlobUrls.map(loadVideo))

  // Canvas setup
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: false })!

  // Connect video elements to audio graph
  videoEls.forEach(v => {
    v.muted = false
    try {
      const src = audioCtx.createMediaElementSource(v)
      const gain = audioCtx.createGain(); gain.gain.value = 1
      src.connect(gain); gain.connect(dest)
    } catch {}
  })

  let musicEl: HTMLAudioElement | null = null
  if (musicBlobUrl) {
    try {
      musicEl = await loadAudio(musicBlobUrl)
      musicEl.loop = true
      const ms = audioCtx.createMediaElementSource(musicEl)
      const mg = audioCtx.createGain(); mg.gain.value = opts.musicVolume
      ms.connect(mg); mg.connect(dest)
      musicEl.play().catch(() => {})
    } catch {}
  }

  // Frame-perfect capture: captureStream(0) + manual requestFrame()
  const videoStream = canvas.captureStream(0)
  const videoTrack = videoStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
  const combined = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()])

  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: BITRATES[opts.quality],
    audioBitsPerSecond: 192_000,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.start(100)

  // Calculate total frames for progress
  let totalFrames = 0
  for (let ci = 0; ci < videoEls.length; ci++) {
    const v = videoEls[ci]; const c = opts.clips[ci]
    totalFrames += Math.round((v.duration * (c.trimEnd - c.trimStart) / 100) * FPS)
  }
  const transFrameCount = Math.round(opts.transitionDuration * FPS)
  if (opts.transition !== 'none' && opts.transitionDuration > 0) {
    totalFrames += transFrameCount * 2  // fade-in + fade-out
    totalFrames += transFrameCount * Math.max(0, videoEls.length - 1)  // between clips
  }

  report(10, 'Rendering…')
  let renderedFrames = 0
  const useRVFC = hasRVFC(videoEls[0])

  const onFrame = (fi: number) => {
    renderedFrames++
    report(
      Math.min(10 + (renderedFrames / Math.max(totalFrames, 1)) * 80, 89),
      `Rendering · frame ${renderedFrames} of ~${totalFrames}`
    )
    void fi  // suppress unused
  }

  /* Fade-in for first clip */
  if (opts.transition !== 'none' && opts.transitionDuration > 0 && videoEls.length > 0) {
    const v = videoEls[0]; const c = opts.clips[0]
    const startT = v.duration * (c.trimStart / 100)
    await seekTo(v, startT)
    const frames = transFrameCount
    for (let f = 0; f <= frames; f++) {
      const alpha = f / frames
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h)
      drawFrame(ctx, v, w, h, opts, 0, opts.captions, alpha, f)
      if (opts.letterbox) drawLetterbox(ctx, w, h)
      videoTrack.requestFrame()
      await new Promise(r => setTimeout(r, FRAME_MS))
      onFrame(f)
    }
  }

  /* Main clip loop */
  for (let ci = 0; ci < videoEls.length; ci++) {
    const v = videoEls[ci]; const clip = opts.clips[ci]
    const startT = v.duration * (clip.trimStart / 100)
    const endT   = v.duration * (clip.trimEnd   / 100)
    await seekTo(v, startT)

    if (useRVFC) {
      await renderClipRVFC(v, ctx, videoTrack, w, h, opts, startT, endT, onFrame)
    } else {
      await renderClipSeekBased(v, ctx, videoTrack, w, h, opts, startT, endT, onFrame)
    }
    v.pause()

    /* Transition to next clip */
    if (ci < videoEls.length - 1 && opts.transition !== 'none' && opts.transitionDuration > 0) {
      const nextV = videoEls[ci + 1]; const nextClip = opts.clips[ci + 1]
      const nextStartT = nextV.duration * (nextClip.trimStart / 100)
      await seekTo(nextV, nextStartT)
      const outT = endT - startT
      await renderTransitionFrames(
        ctx, videoTrack, v, nextV, w, h,
        opts.transition, opts.transitionDuration, opts,
        outT, 0, renderedFrames, onFrame
      )
    }
  }

  /* Fade-out for last clip */
  if (opts.transition !== 'none' && opts.transitionDuration > 0 && videoEls.length > 0) {
    const lv = videoEls[videoEls.length - 1]
    const lc = opts.clips[videoEls.length - 1]
    const lEndT   = lv.duration * (lc.trimEnd   / 100)
    const lStartT = lv.duration * (lc.trimStart / 100)
    const frames = transFrameCount
    await seekTo(lv, lEndT)
    for (let f = 0; f <= frames; f++) {
      const alpha = 1 - f / frames
      ctx.clearRect(0, 0, w, h)
      drawFrame(ctx, lv, w, h, opts, lEndT - lStartT, opts.captions, alpha, renderedFrames + f)
      ctx.fillStyle = `rgba(0,0,0,${1 - alpha})`; ctx.fillRect(0, 0, w, h)
      if (opts.letterbox) drawLetterbox(ctx, w, h)
      videoTrack.requestFrame()
      await new Promise(r => setTimeout(r, FRAME_MS))
      onFrame(f)
    }
  }

  report(92, 'Encoding…')
  musicEl?.pause()
  for (const v of videoEls) { v.pause(); v.src = '' }

  await new Promise<void>(resolve => { recorder.onstop = () => resolve(); recorder.stop() })
  audioCtx.close().catch(() => {})
  objectUrls.forEach(u => URL.revokeObjectURL(u))

  report(100, 'Done!')
  return new Blob(chunks, { type: mimeType })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
