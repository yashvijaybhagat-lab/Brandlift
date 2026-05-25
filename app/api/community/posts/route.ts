import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, list } from '@vercel/blob'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export interface CommunityPost {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  businessName?: string
  videoUrl: string
  caption?: string
  script?: string
  likeCount: number
  likedBy: string[]
  sharedAt: number
}

const FEED_KEY = 'community/feed.json'

async function readFeed(): Promise<CommunityPost[]> {
  try {
    const { blobs } = await list({ prefix: FEED_KEY, limit: 1 })
    if (!blobs.length) return []
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function writeFeed(posts: CommunityPost[]): Promise<void> {
  await put(FEED_KEY, JSON.stringify(posts), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
  })
}

export async function GET() {
  try {
    const posts = await readFeed()
    return NextResponse.json({ posts })
  } catch {
    return NextResponse.json({ posts: [] })
  }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`community-share:${ip}`, 5, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)

  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to share' }, { status: 401 })
  }

  let body: { videoUrl?: string; caption?: string; script?: string; businessName?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.videoUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  const post: CommunityPost = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: session.user.email,
    userName: session.user.name ?? session.user.email.split('@')[0],
    userAvatar: session.user.image ?? undefined,
    businessName: body.businessName,
    videoUrl: body.videoUrl,
    caption: body.caption?.slice(0, 280),
    script: body.script?.slice(0, 500),
    likeCount: 0,
    likedBy: [],
    sharedAt: Date.now(),
  }

  const feed = await readFeed()
  const updated = [post, ...feed].slice(0, 200)
  await writeFeed(updated)

  return NextResponse.json({ post })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('id')
  if (!postId) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

  const feed = await readFeed()
  const post = feed.find(p => p.id === postId)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.userId !== session.user.email) {
    return NextResponse.json({ error: 'Not your post' }, { status: 403 })
  }

  await writeFeed(feed.filter(p => p.id !== postId))
  return NextResponse.json({ ok: true })
}
