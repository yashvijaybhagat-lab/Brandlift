import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put, list } from '@vercel/blob'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  text: string
  postedAt: number
}

function commentKey(postId: string) {
  return `community/comments/${postId}.json`
}

async function readComments(postId: string): Promise<Comment[]> {
  try {
    const { blobs } = await list({ prefix: commentKey(postId), limit: 1 })
    if (!blobs.length) return []
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const comments = await readComments(id)
  return NextResponse.json({ comments })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getIp(req)
  const rl = await rateLimit(`community-comment:${ip}`, 30, 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to comment' }, { status: 401 })
  }

  let body: { text?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const text = body.text?.trim().slice(0, 300)
  if (!text) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })

  const { id } = await params
  const comment: Comment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: session.user.email,
    userName: session.user.name ?? session.user.email.split('@')[0],
    userAvatar: session.user.image ?? undefined,
    text,
    postedAt: Date.now(),
  }

  const comments = await readComments(id)
  const updated = [...comments, comment].slice(-200)

  await put(commentKey(id), JSON.stringify(updated), {
    access: 'public', contentType: 'application/json', allowOverwrite: true,
  })

  return NextResponse.json({ comment })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get('commentId')
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 })

  const { id } = await params
  const comments = await readComments(id)
  const comment = comments.find(c => c.id === commentId)
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.userId !== session.user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await put(commentKey(id), JSON.stringify(comments.filter(c => c.id !== commentId)), {
    access: 'public', contentType: 'application/json', allowOverwrite: true,
  })

  return NextResponse.json({ ok: true })
}
