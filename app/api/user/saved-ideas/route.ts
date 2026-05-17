import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, list } from '@vercel/blob'

export const dynamic = 'force-dynamic'

function key(email: string) {
  return `user-data/${encodeURIComponent(email)}/saved-ideas.json`
}

export async function GET() {
  const session = await getServerSession()
  const email = session?.user?.email
  if (!email) return NextResponse.json({ ideas: [] })

  try {
    const { blobs } = await list({ prefix: key(email), limit: 1 })
    if (!blobs.length) return NextResponse.json({ ideas: [] })
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ ideas: [] })
    const data = await res.json()
    return NextResponse.json({ ideas: data.ideas ?? [] })
  } catch {
    return NextResponse.json({ ideas: [] })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ideas } = await req.json()

  try {
    await put(key(email), JSON.stringify({ ideas }), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[user/saved-ideas PUT]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
