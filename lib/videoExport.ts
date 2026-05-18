/**
 * Browser-native video export engine.
 * Canvas 2D + MediaRecorder + Web Audio API — no external packages.
 */

export type TransitionType = 'none' | 'fade' | 'dissolve'
export type ExportQuality  = '720p' | '1080p'
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

export interface ExportOptions {
  clips: ExportClip[]
  // Color
  colorFilter:     string
  colorOverlay?:   ColorOverlay
  vignetteOpacity?: number
  grain?:          number   // 0–100 film grain
  // Text
  captionsEnabled: boolean
  captions:        CaptionSegment[]
  captionStyle?:   CaptionStyle
  captionPos?:     CaptionPos
  captionSize?:    number   // relative multiplier 0.5–2
  showHook:        boolean
  hookText:        string
  showCta:         boolean
  ctaText:         string
  // Audio
  musicUrl:        string | null
  musicVolume:     number
  // Transitions
  transition:      TransitionType
  transitionDuration: number
  // Quality
  quality: ExportQuality
  onProgress?: (pct: number, label: string) => void
}

const RESOLUTIONS: Record<ExportQuality, { w: number; h: number }> = {
  '720p':  { w: 1280, h: 720  },
  '1080p': { w: 1920, h: 1080 },
}

const BITRATES: Record<ExportQuality, number> = {
  '720p':  4_000_000,
  '1080p': 10_000_000,
}

/* Fetch remote → local object URL (bypasses canvas CORS) */
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
    if (Math.abs(v.currentTime - t) < 0.01) { resolve(); return }
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

/* Film grain — adds luminance noise per-frame */
function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0) return
  const intensity = (amount / 100) * 40
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * intensity
    data[i]   = Math.max(0, Math.min(255, data[i]   + n))
    data[i+1] = Math.max(0, Math.min(255, data[i+1] + n))
    data[i+2] = Math.max(0, Math.min(255, data[i+2] + n))
  }
  ctx.putImageData(imgData, 0, 0)
}

/* Resolve caption Y position */
function captionY(h: number, pos: CaptionPos = 'bottom', size: number): number {
  if (pos === 'top')    return h * 0.10 + size
  if (pos === 'center') return h * 0.50
  return h * 0.87  // bottom (default)
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  opts: Pick<ExportOptions,
    'colorFilter' | 'colorOverlay' | 'vignetteOpacity' | 'grain' |
    'captionsEnabled' | 'captionStyle' | 'captionPos' | 'captionSize' |
    'showHook' | 'hookText' | 'showCta' | 'ctaText'>,
  clipTime: number,
  captions: CaptionSegment[],
  overlayAlpha: number,
) {
  ctx.save()
  ctx.globalAlpha = overlayAlpha

  // Video frame + color filter
  ctx.filter = (opts.colorFilter && opts.colorFilter !== 'none') ? opts.colorFilter : 'none'
  ctx.drawImage(video, 0, 0, w, h)
  ctx.filter = 'none'

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

  // Vignette
  const vig = opts.vignetteOpacity ?? 0
  if (vig > 0) {
    const cx = w / 2, cy = h / 2
    const r = Math.sqrt(cx * cx + cy * cy)
    const vg = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, `rgba(0,0,0,${vig * overlayAlpha})`)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = overlayAlpha

  // Grain
  if ((opts.grain ?? 0) > 0) {
    drawGrain(ctx, w, h, opts.grain!)
  }

  // Hook
  if (opts.showHook && opts.hookText) {
    const sz = Math.round(w * 0.032 * (opts.captionSize ?? 1))
    ctx.font = `700 ${sz}px Inter, sans-serif`
    ctx.textAlign = 'center'
    drawStyledText(ctx, opts.hookText, w / 2, h * 0.06 + sz, w * 0.85, '#FAFAFA', opts.captionStyle ?? 'bold')
  }

  // Captions
  if (opts.captionsEnabled) {
    const cap = captions.find(c => clipTime >= c.start && clipTime < c.end)
    if (cap) {
      const sz = Math.round(w * 0.028 * (opts.captionSize ?? 1))
      const y = captionY(h, opts.captionPos, sz)
      ctx.font = `${opts.captionStyle === 'minimal' ? 500 : 700} ${sz}px Inter, sans-serif`
      ctx.textAlign = 'center'
      drawStyledText(ctx, cap.text, w / 2, y, w * 0.80, '#FFFFFF', opts.captionStyle ?? 'bold')
    }
  }

  // CTA
  if (opts.showCta && opts.ctaText) {
    const sz = Math.round(w * 0.025 * (opts.captionSize ?? 1))
    ctx.font = `600 ${sz}px Inter, sans-serif`
    ctx.textAlign = 'center'
    drawStyledText(ctx, opts.ctaText, w / 2, h * 0.94, w * 0.80, '#a5b4fc', opts.captionStyle ?? 'bold')
  }

  ctx.restore()
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
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  if (style === 'bold') {
    ctx.shadowColor = 'rgba(0,0,0,0.95)'
    ctx.shadowBlur = 10
    for (const [dx, dy] of [[-2,-2],[2,-2],[-2,2],[2,2]]) {
      ctx.shadowOffsetX = dx; ctx.shadowOffsetY = dy
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.fillText(text, x, y, maxWidth)
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0
    ctx.fillStyle = color
    ctx.fillText(text, x, y, maxWidth)
  } else if (style === 'minimal') {
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2
    ctx.fillStyle = color
    ctx.fillText(text, x, y, maxWidth)
  } else if (style === 'neon') {
    ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 20
    ctx.fillStyle = '#c4b5fd'
    ctx.fillText(text, x, y, maxWidth)
    ctx.shadowBlur = 0
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(text, x, y, maxWidth)
  } else if (style === 'film') {
    // White on dark letterbox strip
    const metrics = ctx.measureText(text)
    const padX = 12, padY = 8
    const bw = Math.min(metrics.width + padX * 2, maxWidth + padX * 2)
    const bh = (parseFloat(ctx.font) || 18) + padY * 2
    ctx.fillStyle = 'rgba(0,0,0,0.72)'
    ctx.fillRect(x - bw / 2, y - bh + padY, bw, bh)
    ctx.fillStyle = color
    ctx.fillText(text, x, y, maxWidth)
  } else {
    ctx.fillStyle = color
    ctx.fillText(text, x, y, maxWidth)
  }
}

function parseGradientToCanvas(
  ctx: CanvasRenderingContext2D,
  bg: string,
  w: number,
  h: number,
): CanvasGradient | string {
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

async function renderTransition(
  ctx: CanvasRenderingContext2D,
  outV: HTMLVideoElement,
  inV:  HTMLVideoElement,
  w: number, h: number,
  type: TransitionType,
  dur: number,
  opts: Pick<ExportOptions, 'colorFilter' | 'colorOverlay' | 'vignetteOpacity' | 'grain' |
    'captionsEnabled' | 'captionStyle' | 'captionPos' | 'captionSize' |
    'showHook' | 'hookText' | 'showCta' | 'ctaText'>,
  captions: CaptionSegment[],
  clipTime: number,
  fps: number,
) {
  if (type === 'none') return
  const totalFrames = Math.round(dur * fps)
  const frameMs = 1000 / fps
  for (let f = 0; f <= totalFrames; f++) {
    const t = f / totalFrames
    ctx.clearRect(0, 0, w, h)
    if (type === 'fade') {
      drawFrame(ctx, outV, w, h, opts, clipTime, captions, 1 - t)
      ctx.fillStyle = `rgba(0,0,0,${t})`; ctx.fillRect(0, 0, w, h)
    } else {
      drawFrame(ctx, outV, w, h, opts, clipTime, captions, 1 - t)
      ctx.globalCompositeOperation = 'source-over'
      drawFrame(ctx, inV,  w, h, opts, 0,        captions, t)
      ctx.globalCompositeOperation = 'source-over'
    }
    await new Promise(r => setTimeout(r, frameMs))
  }
}

export async function exportVideo(opts: ExportOptions): Promise<Blob> {
  const { w, h } = RESOLUTIONS[opts.quality]
  const FPS = 30, FRAME_MS = 1000 / FPS
  const report = opts.onProgress ?? (() => {})

  report(0, 'Fetching clips…')
  const objectUrls: string[] = []
  const clipBlobUrls = await Promise.all(opts.clips.map(async c => {
    const u = await toBlobUrl(c.url); objectUrls.push(u); return u
  }))

  let musicBlobUrl: string | null = null
  if (opts.musicUrl) { musicBlobUrl = await toBlobUrl(opts.musicUrl); objectUrls.push(musicBlobUrl) }

  report(5, 'Loading media…')
  const videoEls = await Promise.all(clipBlobUrls.map(loadVideo))

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: (opts.grain ?? 0) > 0 })!

  const audioCtx = new AudioContext({ sampleRate: 48000 })
  const dest = audioCtx.createMediaStreamDestination()
  videoEls.forEach(v => {
    v.muted = false
    const src = audioCtx.createMediaElementSource(v)
    const gain = audioCtx.createGain(); gain.gain.value = 1
    src.connect(gain); gain.connect(dest)
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
    } catch { /* optional */ }
  }

  const videoStream = canvas.captureStream(FPS)
  const combined = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()])
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: BITRATES[opts.quality], audioBitsPerSecond: 192_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.start(100)

  report(10, 'Rendering…')

  let totalDuration = 0
  for (const v of videoEls)
    totalDuration += v.duration * ((opts.clips[videoEls.indexOf(v)].trimEnd - opts.clips[videoEls.indexOf(v)].trimStart) / 100)

  let renderedSec = 0

  for (let ci = 0; ci < videoEls.length; ci++) {
    const v = videoEls[ci]
    const clip = opts.clips[ci]
    const startT = v.duration * (clip.trimStart / 100)
    const endT   = v.duration * (clip.trimEnd   / 100)

    await seekTo(v, startT)
    v.play().catch(() => {})

    // Fade-in on first clip
    if (ci === 0 && opts.transition !== 'none' && opts.transitionDuration > 0) {
      const frames = Math.round(opts.transitionDuration * FPS)
      for (let f = 0; f <= frames; f++) {
        const alpha = f / frames
        ctx.clearRect(0, 0, w, h)
        drawFrame(ctx, v, w, h, opts, v.currentTime - startT, opts.captions, alpha)
        ctx.fillStyle = `rgba(0,0,0,${1 - alpha})`; ctx.fillRect(0, 0, w, h)
        await new Promise(r => setTimeout(r, FRAME_MS))
      }
    }

    await new Promise<void>(resolve => {
      const loop = () => {
        const t = v.currentTime
        if (t >= endT - 0.05 || v.ended || v.paused) { resolve(); return }
        drawFrame(ctx, v, w, h, opts, t - startT, opts.captions, 1)
        renderedSec += FRAME_MS / 1000
        report(Math.min(10 + (renderedSec / totalDuration) * 80, 89), `Rendering clip ${ci+1}/${videoEls.length}…`)
        setTimeout(loop, FRAME_MS)
      }
      setTimeout(loop, FRAME_MS)
    })

    v.pause()

    if (ci < videoEls.length - 1 && opts.transition !== 'none' && opts.transitionDuration > 0) {
      const nextV = videoEls[ci + 1]
      await seekTo(nextV, nextV.duration * (opts.clips[ci + 1].trimStart / 100))
      await renderTransition(ctx, v, nextV, w, h, opts.transition, opts.transitionDuration, opts, opts.captions, endT - startT, FPS)
    }
  }

  // Fade-out
  if (opts.transition !== 'none' && opts.transitionDuration > 0 && videoEls.length > 0) {
    const lv = videoEls[videoEls.length - 1]
    const lc = opts.clips[videoEls.length - 1]
    const fadeFrames = Math.round(opts.transitionDuration * FPS)
    for (let f = 0; f <= fadeFrames; f++) {
      const alpha = 1 - f / fadeFrames
      ctx.clearRect(0, 0, w, h)
      drawFrame(ctx, lv, w, h, opts, lv.duration * lc.trimEnd / 100 - lv.duration * lc.trimStart / 100, opts.captions, alpha)
      ctx.fillStyle = `rgba(0,0,0,${1 - alpha})`; ctx.fillRect(0, 0, w, h)
      await new Promise(r => setTimeout(r, FRAME_MS))
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
