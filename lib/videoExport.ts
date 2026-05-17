/**
 * Browser-native video export engine.
 * Uses Canvas 2D + MediaRecorder + Web Audio API — no external packages needed.
 */

export type TransitionType = 'none' | 'fade' | 'dissolve'
export type ExportQuality = '720p' | '1080p'

export interface ExportClip {
  url: string        // Vercel Blob public URL
  trimStart: number  // 0–100
  trimEnd: number    // 0–100
}

export interface CaptionSegment {
  text: string
  start: number  // seconds from clip start
  end: number
}

export interface ColorOverlay {
  bg: string   // CSS gradient/color
  blend: string
  opacity: number
}

export interface ExportOptions {
  clips: ExportClip[]
  // Color
  colorFilter: string
  colorOverlay?: ColorOverlay
  vignetteOpacity?: number
  // Text
  captionsEnabled: boolean
  captions: CaptionSegment[]
  showHook: boolean
  hookText: string
  showCta: boolean
  ctaText: string
  // Audio
  musicUrl: string | null
  musicVolume: number
  // Transitions
  transition: TransitionType
  transitionDuration: number  // seconds
  // Quality
  quality: ExportQuality
  onProgress?: (pct: number, label: string) => void
}

const RESOLUTIONS: Record<ExportQuality, { w: number; h: number }> = {
  '720p':  { w: 1280, h: 720 },
  '1080p': { w: 1920, h: 1080 },
}

const BITRATES: Record<ExportQuality, number> = {
  '720p':  4_000_000,
  '1080p': 10_000_000,
}

/* Fetch a remote URL and return a local object URL (bypasses canvas CORS) */
async function toBlobUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors', cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

/* Load a video element and resolve once metadata is ready */
function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'auto'
    v.playsInline = true
    v.muted = true           // allow autoplay without gesture
    v.crossOrigin = 'anonymous'
    v.src = src
    v.addEventListener('loadedmetadata', () => resolve(v), { once: true })
    v.addEventListener('error', reject, { once: true })
    v.load()
  })
}

/* Load an audio element */
function loadAudio(src: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const a = document.createElement('audio')
    a.preload = 'auto'
    a.crossOrigin = 'anonymous'
    a.src = src
    a.addEventListener('canplaythrough', () => resolve(a), { once: true })
    a.addEventListener('error', reject, { once: true })
    a.load()
  })
}

/* Wait for video.seeked after setting currentTime */
function seekTo(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise(resolve => {
    if (Math.abs(v.currentTime - t) < 0.01) { resolve(); return }
    v.addEventListener('seeked', () => resolve(), { once: true })
    v.currentTime = t
  })
}

/* Choose a supported MIME type */
function pickMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return 'video/webm'
}

/* Draw a single frame to canvas with all effects applied */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  opts: Pick<ExportOptions, 'colorFilter' | 'colorOverlay' | 'vignetteOpacity' |
    'captionsEnabled' | 'showHook' | 'hookText' | 'showCta' | 'ctaText'>,
  clipTime: number,        // current time within clip (seconds from clip start)
  captions: CaptionSegment[],
  overlayAlpha: number,    // 0–1 for transition fade
) {
  ctx.save()
  ctx.globalAlpha = overlayAlpha

  // Base video frame + color filter
  ctx.filter = opts.colorFilter !== 'none' && opts.colorFilter ? opts.colorFilter : 'none'
  ctx.drawImage(video, 0, 0, w, h)
  ctx.filter = 'none'

  // Color overlay (teal/orange/warm etc.)
  if (opts.colorOverlay) {
    const { bg, blend, opacity } = opts.colorOverlay
    ctx.globalCompositeOperation = blend as GlobalCompositeOperation
    ctx.globalAlpha = overlayAlpha * opacity
    const grad = parseGradientToCanvas(ctx, bg, w, h)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = overlayAlpha
  }

  // Vignette
  const vig = opts.vignetteOpacity ?? 0
  if (vig > 0) {
    const cx = w / 2, cy = h / 2
    const r = Math.sqrt(cx * cx + cy * cy)
    const vgrad = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r)
    vgrad.addColorStop(0, 'rgba(0,0,0,0)')
    vgrad.addColorStop(1, `rgba(0,0,0,${vig * overlayAlpha})`)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = vgrad
    ctx.fillRect(0, 0, w, h)
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = overlayAlpha

  // Hook (top overlay)
  if (opts.showHook && opts.hookText) {
    const size = Math.round(w * 0.032)
    ctx.font = `700 ${size}px Inter, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    const pad = h * 0.06
    drawTextWithShadow(ctx, opts.hookText, w / 2, pad + size, w * 0.85, '#FAFAFA')
  }

  // Caption
  if (opts.captionsEnabled) {
    const cap = captions.find(c => clipTime >= c.start && clipTime < c.end)
    if (cap) {
      const size = Math.round(w * 0.028)
      ctx.font = `600 ${size}px Inter, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      const y = h * 0.87
      drawTextWithShadow(ctx, cap.text, w / 2, y, w * 0.80, '#FFFFFF')
    }
  }

  // CTA (bottom)
  if (opts.showCta && opts.ctaText) {
    const size = Math.round(w * 0.025)
    ctx.font = `600 ${size}px Inter, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    const y = h * 0.94
    drawTextWithShadow(ctx, opts.ctaText, w / 2, y, w * 0.80, '#a5b4fc')
  }

  ctx.restore()
}

/* Draw text with multi-directional shadow (no background box) */
function drawTextWithShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  color: string,
) {
  // Shadows
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 8
  for (const [dx, dy] of [[-2,-2],[2,-2],[-2,2],[2,2],[0,0]]) {
    ctx.shadowOffsetX = dx
    ctx.shadowOffsetY = dy
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillText(text, x, y, maxWidth)
  }
  // Actual text
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.fillStyle = color
  ctx.fillText(text, x, y, maxWidth)
}

/* CSS gradient → canvas gradient. Handles commas inside rgb() correctly. */
function parseGradientToCanvas(
  ctx: CanvasRenderingContext2D,
  bg: string,
  w: number,
  h: number,
): CanvasGradient | string {
  const m = bg.match(/^linear-gradient\(\s*(\d+)deg\s*,(.+)\)$/)
  if (!m) return '#888888'

  const deg = parseInt(m[1])
  const rad = ((deg - 90) * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const x1 = w / 2 - cos * w / 2, y1 = h / 2 - sin * h / 2
  const x2 = w / 2 + cos * w / 2, y2 = h / 2 + sin * h / 2
  const grad = ctx.createLinearGradient(x1, y1, x2, y2)

  // Split stops on commas NOT inside parentheses
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
    const pctMatch = s.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/)
    if (pctMatch) grad.addColorStop(parseFloat(pctMatch[2]) / 100, pctMatch[1].trim())
    else grad.addColorStop(i / Math.max(stops.length - 1, 1), s.trim())
  })

  return grad
}

/* Render a transition frame — black fade or dissolve */
async function renderTransition(
  ctx: CanvasRenderingContext2D,
  outVideo: HTMLVideoElement,
  inVideo: HTMLVideoElement,
  w: number,
  h: number,
  type: TransitionType,
  durationSec: number,
  opts: Pick<ExportOptions, 'colorFilter' | 'colorOverlay' | 'vignetteOpacity' |
    'captionsEnabled' | 'showHook' | 'hookText' | 'showCta' | 'ctaText'>,
  captions: CaptionSegment[],
  clipTime: number,
  fps: number,
  recorder: MediaRecorder,
) {
  if (type === 'none') return

  const totalFrames = Math.round(durationSec * fps)
  const frameMs = 1000 / fps

  for (let f = 0; f <= totalFrames; f++) {
    const t = f / totalFrames  // 0 → 1

    if (type === 'fade') {
      // Out: fade to black; In: black to clip (handled in main loop)
      const alpha = 1 - t
      ctx.clearRect(0, 0, w, h)
      drawFrame(ctx, outVideo, w, h, opts, clipTime, captions, alpha)
      ctx.fillStyle = `rgba(0,0,0,${t})`
      ctx.fillRect(0, 0, w, h)
    } else if (type === 'dissolve') {
      // Draw outgoing at 1-t, incoming at t
      ctx.clearRect(0, 0, w, h)
      drawFrame(ctx, outVideo, w, h, opts, clipTime, captions, 1 - t)
      ctx.globalCompositeOperation = 'source-over'
      drawFrame(ctx, inVideo, w, h, opts, 0, captions, t)
      ctx.globalCompositeOperation = 'source-over'
    }

    await new Promise(r => setTimeout(r, frameMs))
  }
}

/* Main export function */
export async function exportVideo(opts: ExportOptions): Promise<Blob> {
  const { w, h } = RESOLUTIONS[opts.quality]
  const FPS = 30
  const FRAME_MS = 1000 / FPS
  const report = opts.onProgress ?? (() => {})

  report(0, 'Fetching clips…')

  // ── 1. Fetch all clip blobs locally ────────────────────────────────────────
  const objectUrls: string[] = []
  const clipBlobUrls = await Promise.all(
    opts.clips.map(async (c) => {
      const local = await toBlobUrl(c.url)
      objectUrls.push(local)
      return local
    })
  )

  // Fetch music if selected
  let musicBlobUrl: string | null = null
  if (opts.musicUrl) {
    musicBlobUrl = await toBlobUrl(opts.musicUrl)
    objectUrls.push(musicBlobUrl)
  }

  report(5, 'Loading media…')

  // ── 2. Load video elements ─────────────────────────────────────────────────
  const videoEls = await Promise.all(clipBlobUrls.map(u => loadVideo(u)))

  // ── 3. Set up canvas ───────────────────────────────────────────────────────
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false })!

  // ── 4. Set up audio mixing ─────────────────────────────────────────────────
  const audioCtx = new AudioContext({ sampleRate: 48000 })
  const dest = audioCtx.createMediaStreamDestination()

  // Route each video's audio through WebAudio
  const videoSources = videoEls.map(v => {
    v.muted = false  // unmute so WebAudio captures audio
    const src = audioCtx.createMediaElementSource(v)
    const gain = audioCtx.createGain()
    gain.gain.value = 1.0  // full video audio
    src.connect(gain)
    gain.connect(dest)
    return gain
  })

  // Background music
  let musicEl: HTMLAudioElement | null = null
  if (musicBlobUrl) {
    try {
      musicEl = await loadAudio(musicBlobUrl)
      musicEl.loop = true
      const musicSrc = audioCtx.createMediaElementSource(musicEl)
      const musicGain = audioCtx.createGain()
      musicGain.gain.value = opts.musicVolume
      musicSrc.connect(musicGain)
      musicGain.connect(dest)
      musicEl.play().catch(() => {})
    } catch { /* music optional */ }
  }

  // ── 5. Set up MediaRecorder ────────────────────────────────────────────────
  const videoStream = canvas.captureStream(FPS)
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ])

  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: BITRATES[opts.quality],
    audioBitsPerSecond: 192_000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.start(100)  // collect chunks every 100ms

  report(10, 'Rendering…')

  // ── 6. Render each clip ────────────────────────────────────────────────────
  let totalDuration = 0
  for (const v of videoEls) totalDuration += v.duration * ((opts.clips[videoEls.indexOf(v)].trimEnd - opts.clips[videoEls.indexOf(v)].trimStart) / 100)

  let renderedSec = 0

  for (let ci = 0; ci < videoEls.length; ci++) {
    const v = videoEls[ci]
    const clip = opts.clips[ci]
    const startT = v.duration * (clip.trimStart / 100)
    const endT   = v.duration * (clip.trimEnd   / 100)

    await seekTo(v, startT)
    v.play().catch(() => {})

    // Transition in: fade from black at start of first clip
    if (ci === 0 && opts.transition !== 'none' && opts.transitionDuration > 0) {
      const fadInFrames = Math.round(opts.transitionDuration * FPS)
      for (let f = 0; f <= fadInFrames; f++) {
        const alpha = f / fadInFrames
        ctx.clearRect(0, 0, w, h)
        drawFrame(ctx, v, w, h, opts, v.currentTime - startT, opts.captions, alpha)
        ctx.fillStyle = `rgba(0,0,0,${1 - alpha})`
        ctx.fillRect(0, 0, w, h)
        await new Promise(r => setTimeout(r, FRAME_MS))
      }
    }

    // Main render loop for this clip
    await new Promise<void>(resolve => {
      const loop = () => {
        const t = v.currentTime

        if (t >= endT - 0.05 || v.ended || v.paused) {
          resolve()
          return
        }

        drawFrame(ctx, v, w, h, opts, t - startT, opts.captions, 1)
        renderedSec = renderedSec + FRAME_MS / 1000
        const pct = 10 + (renderedSec / totalDuration) * 80
        report(Math.min(pct, 89), `Rendering clip ${ci + 1}/${videoEls.length}… ${Math.round((t - startT) * 10) / 10}s`)

        setTimeout(loop, FRAME_MS)
      }
      setTimeout(loop, FRAME_MS)
    })

    v.pause()

    // Transition between clips
    if (ci < videoEls.length - 1 && opts.transition !== 'none' && opts.transitionDuration > 0) {
      const nextV = videoEls[ci + 1]
      const nextClip = opts.clips[ci + 1]
      await seekTo(nextV, nextV.duration * (nextClip.trimStart / 100))
      await renderTransition(ctx, v, nextV, w, h, opts.transition, opts.transitionDuration, opts, opts.captions, endT - startT, FPS, recorder)
    }
  }

  // Fade to black at end
  if (opts.transition !== 'none' && opts.transitionDuration > 0 && videoEls.length > 0) {
    const lastV = videoEls[videoEls.length - 1]
    const lastClip = opts.clips[videoEls.length - 1]
    const lastEndT = lastV.duration * (lastClip.trimEnd / 100)
    const fadeFrames = Math.round(opts.transitionDuration * FPS)
    for (let f = 0; f <= fadeFrames; f++) {
      const alpha = 1 - f / fadeFrames
      ctx.clearRect(0, 0, w, h)
      drawFrame(ctx, lastV, w, h, opts, lastEndT - (lastEndT - lastV.duration * lastClip.trimStart / 100), opts.captions, alpha)
      ctx.fillStyle = `rgba(0,0,0,${1 - alpha})`
      ctx.fillRect(0, 0, w, h)
      await new Promise(r => setTimeout(r, FRAME_MS))
    }
  }

  report(92, 'Encoding…')

  // ── 7. Stop recording ──────────────────────────────────────────────────────
  musicEl?.pause()
  for (const v of videoEls) { v.pause(); v.src = '' }

  // Flush + stop recorder
  await new Promise<void>(resolve => {
    recorder.onstop = () => resolve()
    recorder.stop()
  })

  // Close AudioContext
  audioCtx.close().catch(() => {})

  // ── 8. Clean up object URLs ────────────────────────────────────────────────
  objectUrls.forEach(u => URL.revokeObjectURL(u))

  report(100, 'Done!')

  return new Blob(chunks, { type: mimeType })
}

/* Trigger a browser download from a Blob */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
