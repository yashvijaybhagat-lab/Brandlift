/**
 * Founder-only: Lyra system prompt override.
 * Stored in Vercel Blob at admin/system-prompt.json
 */
import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'
import { put, head } from '@vercel/blob'
import { DEFAULT_SYSTEM } from '@/lib/lyraSystem'

export const dynamic = 'force-dynamic'

const BLOB_PATH = 'admin/system-prompt.json'

async function readPrompt(): Promise<string | null> {
  try {
    const info = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN })
    if (!info) return null
    const res = await fetch(info.url)
    const data = await res.json()
    return typeof data.prompt === 'string' ? data.prompt : null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const override = await readPrompt()
  return NextResponse.json({ prompt: override ?? DEFAULT_SYSTEM, isOverridden: override !== null, default: DEFAULT_SYSTEM })
}

export async function POST(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { prompt } = await req.json().catch(() => ({}))
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  if (prompt.length > 8000) return NextResponse.json({ error: 'Prompt too long (max 8000 chars)' }, { status: 400 })

  await put(BLOB_PATH, JSON.stringify({ prompt: prompt.trim(), updatedAt: new Date().toISOString() }), {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    contentType: 'application/json',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { del } = await import('@vercel/blob')
    await del(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN })
  } catch {}

  return NextResponse.json({ ok: true, prompt: DEFAULT_SYSTEM })
}
