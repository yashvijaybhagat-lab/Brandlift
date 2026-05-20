/**
 * Founder-only: dynamic beta code management.
 * Codes are stored in Vercel Blob at admin/beta-codes.json.
 * Combined with env-var BETA_CODES in the validate endpoint.
 */
import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'
import { put, head, del } from '@vercel/blob'

export const dynamic = 'force-dynamic'

const BLOB_PATH = 'admin/beta-codes.json'

async function readCodes(): Promise<string[]> {
  try {
    const info = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN })
    if (!info) return []
    const res = await fetch(info.url)
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

async function writeCodes(codes: string[]) {
  await put(BLOB_PATH, JSON.stringify(codes), {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}

export async function GET(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const envCodes = (process.env.BETA_CODES ?? '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
  const dynamicCodes = await readCodes()

  return NextResponse.json({
    env: envCodes.map(c => ({ code: c, source: 'env' })),
    dynamic: dynamicCodes.map(c => ({ code: c, source: 'dynamic' })),
  })
}

export async function POST(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { code } = await req.json().catch(() => ({}))
  if (!code?.trim()) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

  const normalized = (code as string).trim().toUpperCase()
  if (!/^[A-Z0-9_-]{4,32}$/.test(normalized)) {
    return NextResponse.json({ error: 'Code must be 4–32 uppercase alphanumeric chars/dashes/underscores' }, { status: 400 })
  }

  const existing = await readCodes()
  if (existing.includes(normalized)) {
    return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
  }

  await writeCodes([...existing, normalized])
  return NextResponse.json({ ok: true, code: normalized })
}

export async function DELETE(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { code } = await req.json().catch(() => ({}))
  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

  const normalized = (code as string).trim().toUpperCase()
  const existing = await readCodes()
  const updated = existing.filter(c => c !== normalized)

  if (updated.length === 0) {
    try { await del(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN }) } catch {}
  } else {
    await writeCodes(updated)
  }

  return NextResponse.json({ ok: true })
}
