import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token || token === 'your_replicate_token') {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not configured.' },
      { status: 503 },
    )
  }

  const { videoUrl, style } = await req.json()
  if (!videoUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  const scale = style === 'cinematic' ? 2 : 4

  const predRes = await fetch(
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
          scale,
          face_enhance: false,
          model: 'realesr-animevideov3',
        },
      }),
    },
  )

  if (!predRes.ok) {
    const err = await predRes.json().catch(() => ({ detail: predRes.statusText }))
    return NextResponse.json(
      { error: err.detail ?? 'Replicate API error' },
      { status: predRes.status },
    )
  }

  const prediction = await predRes.json()
  return NextResponse.json({ id: prediction.id, status: prediction.status })
}
