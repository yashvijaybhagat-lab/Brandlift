import { NextRequest, NextResponse } from 'next/server'
import { put, list } from '@vercel/blob'
export const dynamic = 'force-dynamic'

const FEED_KEY = 'community/feed.json'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { blobs } = await list({ prefix: FEED_KEY, limit: 1 })
    if (!blobs.length) return NextResponse.json({ ok: true })
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ ok: true })
    const feed: Array<Record<string, unknown>> = await res.json()
    const idx = feed.findIndex(p => p.id === params.id)
    if (idx === -1) return NextResponse.json({ ok: true })
    feed[idx] = { ...feed[idx], viewCount: ((feed[idx].viewCount as number) ?? 0) + 1 }
    await put(FEED_KEY, JSON.stringify(feed), { access: 'public', contentType: 'application/json', allowOverwrite: true })
  } catch {}
  return NextResponse.json({ ok: true })
}
