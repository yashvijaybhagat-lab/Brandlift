import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`enhance:${ip}`, 10, 60 * 60_000)  // 10/hour — Replicate costs money
  if (!rl.success) return tooManyRequests(rl.reset)

  const token = process.env.REPLICATE_API_TOKEN
  if (!token || token === 'your_replicate_token') {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 })
  }

  const { videoUrl } = await req.json()
  if (!videoUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  // RealESRGAN_x4plus — real-world footage upscaler (4x: 1080p → 4K)
  // NOT the anime model which was previously used by mistake
  const res = await fetch(
    'https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=5',
      },
      body: JSON.stringify({
        input: {
          video: videoUrl,
          scale: 4,
          face_enhance: false,
          model: 'RealESRGAN_x4plus',
        },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    return NextResponse.json({ error: err.detail ?? 'Replicate API error' }, { status: res.status })
  }

  const prediction = await res.json()
  return NextResponse.json({ id: prediction.id, status: prediction.status })
}
