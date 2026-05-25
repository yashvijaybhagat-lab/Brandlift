import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { list } from '@vercel/blob'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ conversations: [] })
  }

  const key = `community/inbox/${encodeURIComponent(session.user.email)}.json`
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    if (!blobs.length) return NextResponse.json({ conversations: [] })
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ conversations: [] })
    const conversations = await res.json()
    return NextResponse.json({ conversations })
  } catch {
    return NextResponse.json({ conversations: [] })
  }
}
