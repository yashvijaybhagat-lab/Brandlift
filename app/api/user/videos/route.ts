import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put, list } from '@vercel/blob'

export const dynamic = 'force-dynamic'

function userKey(email: string) {
  return `user-data/${encodeURIComponent(email)}/videos.json`
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ videos: [] })

  try {
    const { blobs } = await list({ prefix: userKey(email), limit: 1 })
    if (!blobs.length) return NextResponse.json({ videos: [] })
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ videos: [] })
    const data = await res.json()
    return NextResponse.json({ videos: data.videos ?? [] })
  } catch {
    return NextResponse.json({ videos: [] })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { videos } = await req.json()

  try {
    await put(userKey(email), JSON.stringify({ videos }), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[user/videos PUT]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
