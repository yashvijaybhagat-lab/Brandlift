import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const LTX_BASE = 'https://api.ltx.video'

export async function POST(req: NextRequest) {
  const key = process.env.LTX_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'LTX_API_KEY not configured' }, { status: 503 })
  }

  const { videoUrl } = await req.json()
  if (!videoUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  // Detect orientation from URL hints (default landscape)
  const isPortrait = videoUrl.includes('9x16') || videoUrl.includes('portrait') || videoUrl.includes('vertical')
  const resolution = isPortrait ? '1080x1920' : '1920x1080'

  const res = await fetch(`${LTX_BASE}/v2/video-to-video-hdr`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_uri: videoUrl,
      prompt: 'Enhance video quality: improve sharpness, clarity, and color grading. Make it look polished and cinematic.',
      model: 'ltx-2-3-pro',
      resolution,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    return NextResponse.json({ error: err.message ?? 'LTX API error' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ id: data.id, status: data.status ?? 'pending' })
}
