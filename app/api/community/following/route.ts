import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { list } from '@vercel/blob'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ following: [] })

  const key = `community/following/${encodeURIComponent(session.user.email)}.json`
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    if (!blobs.length) return NextResponse.json({ following: [] })
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ following: [] })
    return NextResponse.json({ following: await res.json() })
  } catch {
    return NextResponse.json({ following: [] })
  }
}
