import { NextRequest, NextResponse } from 'next/server'

const LTX_BASE = 'https://api.ltx.video'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const key = process.env.LTX_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'LTX_API_KEY not configured' }, { status: 503 })
  }

  const res = await fetch(
    `${LTX_BASE}/v2/video-to-video-hdr/${params.id}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    },
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: res.status })
  }

  const data = await res.json()

  // Map LTX response → shape the frontend expects
  // LTX statuses: pending, processing, succeeded, failed
  const output = data.output?.video_uri ?? data.output ?? null

  return NextResponse.json({
    id:     data.id,
    status: data.status,
    output,
    error:  data.error?.message ?? data.error ?? null,
  })
}
