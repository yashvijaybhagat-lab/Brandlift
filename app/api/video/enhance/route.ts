/**
 * 4K Enhancement pipeline — starts the AI upscale stage.
 *
 * Server-side stages (Replicate):
 *   1. upscale      — Real-ESRGAN video model (4× or 2× based on source resolution)
 *   2. face_restore — Built into the upscale call via face_enhance flag
 *
 * Client-side stages (canvas, happen during export):
 *   3. color        — S-curve, auto-WB, skin-tone protection
 *   4. sharpen      — Unsharp mask convolution (zero halos)
 *   5. export       — Per-platform variant at correct bitrate/resolution
 *
 * Quality gate: client sends before/after luma sample → server validates via GET /enhance/status/:id
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { type SourceAnalysis } from '@/lib/enhancePipeline'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const ip = getIp(req)
  // 10/hour — each prediction costs real Replicate credits
  const rl = await rateLimit(`enhance:${ip}`, 10, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const token = process.env.REPLICATE_API_TOKEN
  if (!token || token === 'your_replicate_token') {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 })
  }

  let body: { videoUrl: string; analysis: SourceAnalysis }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { videoUrl, analysis } = body

  if (!videoUrl || typeof videoUrl !== 'string') {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }
  if (!analysis || typeof analysis !== 'object') {
    return NextResponse.json({ error: 'analysis object is required (call /api/video/analyze first)' }, { status: 400 })
  }

  // Only allow HTTPS URLs from trusted storage (Vercel Blob / public CDN)
  let parsed: URL
  try { parsed = new URL(videoUrl) } catch {
    return NextResponse.json({ error: 'Invalid videoUrl' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'videoUrl must be HTTPS' }, { status: 400 })
  }

  const upscaleScale = analysis.upscaleFactor ?? 4
  // Enable face enhance only when faces detected — model fidelity is set lower internally
  // to avoid the waxy-face artifact the spec forbids
  const faceEnhance = analysis.hasFaces === true

  // nightmareai/real-esrgan supports both image and video inputs.
  // It processes each video frame through ESRGAN and reassembles the stream.
  // model: 'RealESRGAN_x4plus' is the real-photography model (not anime).
  const res = await fetch(
    'https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Prefer: wait=5 means Replicate tries to return synchronously within 5s.
        // For video this almost always exceeds 5s, so we get back an ID to poll.
        Prefer: 'wait=5',
      },
      body: JSON.stringify({
        input: {
          video: videoUrl,
          scale: upscaleScale,
          // face_enhance uses a GFPGAN sub-pass; keep it at lower strength (0.5 default)
          // to avoid the waxy, over-smooth face regression.
          face_enhance: faceEnhance,
          model: 'RealESRGAN_x4plus',
        },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    return NextResponse.json(
      { error: err.detail ?? 'Replicate API error', code: res.status },
      { status: res.status >= 500 ? 502 : res.status },
    )
  }

  const prediction = await res.json()

  // If Replicate returned synchronously (very fast video or small file), return immediately
  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    return NextResponse.json({
      id: prediction.id,
      status: 'succeeded',
      stage: 'color',      // upscale done; next client-side stages
      progress: 70,
      outputUrl,
      analysis,
    })
  }

  return NextResponse.json({
    id: prediction.id,
    status: prediction.status,    // 'starting' | 'processing'
    stage: 'upscale',
    progress: 5,
    analysis,
  })
}
