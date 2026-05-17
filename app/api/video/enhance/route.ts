import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { videoUrl } = await req.json()

  if (!videoUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  const token = process.env.REPLICATE_API_TOKEN
  if (!token || token === 'your_replicate_token') {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not configured. Add it in Vercel → Settings → Environment Variables.' },
      { status: 503 },
    )
  }

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
          model: 'realesr-animevideov3',
        },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    return NextResponse.json(
      { error: err.detail ?? 'Replicate API error' },
      { status: res.status },
    )
  }

  const prediction = await res.json()
  return NextResponse.json({ id: prediction.id, status: prediction.status })
}
