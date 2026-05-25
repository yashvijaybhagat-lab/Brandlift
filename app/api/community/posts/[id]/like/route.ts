import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, list } from '@vercel/blob'
import type { CommunityPost } from '../../route'

export const dynamic = 'force-dynamic'

const FEED_KEY = 'community/feed.json'

async function readFeed(): Promise<CommunityPost[]> {
  try {
    const { blobs } = await list({ prefix: FEED_KEY, limit: 1 })
    if (!blobs.length) return []
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to like' }, { status: 401 })
  }

  const email = session.user.email
  const feed = await readFeed()
  const idx = feed.findIndex(p => p.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const post = feed[idx]
  const alreadyLiked = post.likedBy.includes(email)

  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter(u => u !== email)
    post.likeCount = Math.max(0, post.likeCount - 1)
  } else {
    post.likedBy.push(email)
    post.likeCount += 1
  }

  feed[idx] = post
  await put(FEED_KEY, JSON.stringify(feed), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
  })

  return NextResponse.json({ liked: !alreadyLiked, likeCount: post.likeCount })
}
