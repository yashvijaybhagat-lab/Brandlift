import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, list } from '@vercel/blob'

export const dynamic = 'force-dynamic'

function followKey(email: string) {
  return `community/following/${encodeURIComponent(email)}.json`
}

async function readFollowing(email: string): Promise<string[]> {
  try {
    const { blobs } = await list({ prefix: followKey(email), limit: 1 })
    if (!blobs.length) return []
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const me = session.user.email
  const { userId } = await params
  const target = userId
  if (me === target) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  const following = await readFollowing(me)
  const isFollowing = following.includes(target)

  const updated = isFollowing
    ? following.filter(u => u !== target)
    : [...following, target]

  await put(followKey(me), JSON.stringify(updated), {
    access: 'public', contentType: 'application/json', allowOverwrite: true,
  })

  return NextResponse.json({ following: !isFollowing })
}
