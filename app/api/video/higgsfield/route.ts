import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'
import { hfStartImage, hfStartVideo } from '@/lib/higgsfield'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = founderRequired(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Founder access required' }, { status: 403 })
  }
  if (!process.env.HIGGSFIELD_CREDENTIALS) {
    return NextResponse.json({ error: 'Higgsfield not configured — add HIGGSFIELD_CREDENTIALS to env' }, { status: 503 })
  }

  const { mode, prompt, imageUrl, aspect = '9:16' } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  try {
    if (mode === 'image') {
      const job = await hfStartImage(prompt.trim(), aspect)
      return NextResponse.json({ requestId: job.request_id, status: job.status, type: 'image' })
    }
    if (mode === 'video') {
      if (!imageUrl) return NextResponse.json({ error: 'imageUrl required for video mode' }, { status: 400 })
      const job = await hfStartVideo(prompt.trim(), imageUrl)
      return NextResponse.json({ requestId: job.request_id, status: job.status, type: 'video' })
    }
    return NextResponse.json({ error: 'mode must be "image" or "video"' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
