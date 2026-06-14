import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

// lucataco/real-esrgan-video — accepts video URL, outputs 4× upscaled video
// Pinned version hash for stability
const REALESRGAN_VIDEO_VERSION = 'c23768236472c41b7a121ee735c8073e29080c01b32907740cfada61bff75320'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const ip = getIp(req)
  const rl = await rateLimit(`enhance:${ip}`, 5, 60 * 60_000)  // 5/hour — each run costs real credits
  if (!rl.success) return tooManyRequests(rl.reset)

  const token = process.env.REPLICATE_API_TOKEN
  if (!token || token === 'your_replicate_token') {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN not configured — add it to your Vercel environment variables', code: 'ENHANCE_UNAVAILABLE' },
      { status: 503 },
    )
  }

  let body: { videoUrl: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { videoUrl } = body
  if (!videoUrl || typeof videoUrl !== 'string') {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  let parsed: URL
  try { parsed = new URL(videoUrl) } catch {
    return NextResponse.json({ error: 'Invalid videoUrl' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'videoUrl must be HTTPS' }, { status: 400 })
  }

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=5',
    },
    body: JSON.stringify({
      version: REALESRGAN_VIDEO_VERSION,
      input: {
        video_path: videoUrl,
        model: 'RealESRGAN_x4plus',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const status = res.status
    const outStatus = status >= 500 ? 502 : status
    const message = err.detail ?? 'Replicate API error'
    return NextResponse.json({ error: message, code: status }, { status: outStatus })
  }

  const prediction = await res.json()

  // Returned synchronously (rare for video but handle it)
  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    return NextResponse.json({ id: prediction.id, status: 'succeeded', progress: 100, outputUrl })
  }

  return NextResponse.json({
    id: prediction.id,
    status: prediction.status,
    stage: 'upscale',
    progress: 5,
  })
}
