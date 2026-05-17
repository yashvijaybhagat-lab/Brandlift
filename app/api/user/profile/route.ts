import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, list } from '@vercel/blob'

export const dynamic = 'force-dynamic'

function profileKey(email: string) {
  return `user-data/${encodeURIComponent(email)}/profile.json`
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession()
  const email = session?.user?.email
  if (!email) return NextResponse.json({ profile: null })

  try {
    const { blobs } = await list({ prefix: profileKey(email), limit: 1 })
    if (!blobs.length) return NextResponse.json({ profile: null })
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ profile: null })
    const data = await res.json()
    return NextResponse.json({ profile: data.profile ?? null })
  } catch {
    return NextResponse.json({ profile: null })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile } = await req.json()

  try {
    await put(profileKey(email), JSON.stringify({ profile }), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[user/profile PUT]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
