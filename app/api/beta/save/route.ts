/**
 * Persists a user's beta/founder code to their account (Vercel Blob, keyed by email).
 * Called after successful validation so the code survives browser clears and new devices.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, head } from '@vercel/blob'

export const dynamic = 'force-dynamic'

function blobKey(email: string) {
  // Simple slug — not secret, but not guessable without the email
  const slug = Buffer.from(email.toLowerCase()).toString('base64url').replace(/[^a-z0-9_-]/gi, '')
  return `user-beta/${slug}.json`
}

async function getSession(req: NextRequest) {
  // getServerSession needs the NextAuth options; import lazily to avoid circular deps
  const { default: NextAuth } = await import('next-auth')
  void NextAuth // suppress unused warning — we just need getServerSession below
  // In App Router we pass req/res headers manually
  const session = await getServerSession()
  return session
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.user?.email) return NextResponse.json({ saved: null })

  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ saved: null })

  try {
    const key  = blobKey(session.user.email)
    const info = await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => null)
    if (!info) return NextResponse.json({ saved: null })
    const res  = await fetch(info.url)
    const data = await res.json()
    return NextResponse.json({ saved: data })
  } catch {
    return NextResponse.json({ saved: null })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.user?.email) return NextResponse.json({ ok: false, reason: 'not signed in' })

  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: false, reason: 'blob not configured' })

  const body = await req.json().catch(() => ({}))
  if (!body.code) return NextResponse.json({ ok: false, reason: 'no code' }, { status: 400 })

  try {
    const key = blobKey(session.user.email)
    await put(key, JSON.stringify({
      code:      body.code,
      role:      body.role      ?? 'beta',
      ownerName: body.ownerName ?? null,
      features:  body.features  ?? [],
      savedAt:   new Date().toISOString(),
    }), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      contentType: 'application/json',
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, reason: 'blob write failed' })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.user?.email) return NextResponse.json({ ok: false })

  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: false })

  try {
    const { del } = await import('@vercel/blob')
    await del(blobKey(session.user.email), { token: process.env.BLOB_READ_WRITE_TOKEN })
  } catch {}
  return NextResponse.json({ ok: true })
}
