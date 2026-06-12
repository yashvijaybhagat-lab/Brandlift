import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, list } from '@vercel/blob'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  sentAt: number
}

export interface Thread {
  participants: { id: string; name: string; avatar?: string }[]
  messages: ChatMessage[]
}

function threadKey(a: string, b: string): string {
  const sorted = [encodeURIComponent(a), encodeURIComponent(b)].sort()
  return `community/threads/${sorted[0]}--${sorted[1]}.json`
}

async function readThread(key: string): Promise<Thread> {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    if (!blobs.length) return { participants: [], messages: [] }
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return { participants: [], messages: [] }
    return await res.json()
  } catch { return { participants: [], messages: [] } }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const key = threadKey(session.user.email, params.userId)
  const thread = await readThread(key)
  return NextResponse.json({ thread })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const ip = getIp(req)
  const rl = await rateLimit(`community-msg:${ip}`, 60, 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to message' }, { status: 401 })
  }

  let body: { content?: string; recipientName?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const content = body.content?.trim().slice(0, 1000)
  if (!content) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })

  const senderEmail = session.user.email
  const senderName = session.user.name ?? senderEmail.split('@')[0]
  const receiverEmail = params.userId

  const key = threadKey(senderEmail, receiverEmail)
  const thread = await readThread(key)

  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId: senderEmail,
    senderName,
    senderAvatar: session.user.image ?? undefined,
    content,
    sentAt: Date.now(),
  }

  // Keep participants up to date
  const existingSender = thread.participants.find(p => p.id === senderEmail)
  if (!existingSender) {
    thread.participants.push({ id: senderEmail, name: senderName, avatar: session.user.image ?? undefined })
  }
  const existingReceiver = thread.participants.find(p => p.id === receiverEmail)
  if (!existingReceiver) {
    thread.participants.push({ id: receiverEmail, name: body.recipientName ?? receiverEmail.split('@')[0] })
  }

  thread.messages = [...thread.messages, message].slice(-200)

  await put(key, JSON.stringify(thread), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
  })

  // Update inbox for both participants
  await updateInbox(senderEmail, receiverEmail, body.recipientName ?? receiverEmail.split('@')[0], content)
  await updateInbox(receiverEmail, senderEmail, senderName, content)

  return NextResponse.json({ message })
}

async function updateInbox(ownerEmail: string, otherEmail: string, otherName: string, lastMessage: string) {
  const key = `community/inbox/${encodeURIComponent(ownerEmail)}.json`
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    let inbox: { userId: string; userName: string; lastMessage: string; lastAt: number }[] = []
    if (blobs.length) {
      const res = await fetch(blobs[0].url, { cache: 'no-store' })
      if (res.ok) inbox = await res.json()
    }

    const existing = inbox.findIndex(c => c.userId === otherEmail)
    const entry = { userId: otherEmail, userName: otherName, lastMessage: lastMessage.slice(0, 60), lastAt: Date.now() }

    if (existing >= 0) inbox[existing] = entry
    else inbox.unshift(entry)

    inbox = inbox.sort((a, b) => b.lastAt - a.lastAt).slice(0, 50)

    await put(key, JSON.stringify(inbox), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    })
  } catch {}
}
