/**
 * Founder-only: live API health check.
 * Pings Gemini, Replicate, Pexels, and Vercel Blob and reports status + latency.
 */
import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'

export const dynamic = 'force-dynamic'

async function ping(name: string, fn: () => Promise<void>): Promise<{ name: string; ok: boolean; ms: number; error?: string }> {
  const start = Date.now()
  try {
    await fn()
    return { name, ok: true, ms: Date.now() - start }
  } catch (e) {
    return { name, ok: false, ms: Date.now() - start, error: String(e) }
  }
}

export async function GET(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const results = await Promise.all([
    ping('Gemini', async () => {
      if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set')
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    ping('Replicate', async () => {
      if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN not set')
      const res = await fetch('https://api.replicate.com/v1/account', {
        headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    ping('Pexels', async () => {
      if (!process.env.PEXELS_API_KEY) throw new Error('PEXELS_API_KEY not set')
      const res = await fetch('https://api.pexels.com/v1/curated?per_page=1', {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    ping('Vercel Blob', async () => {
      if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not set')
      const { list } = await import('@vercel/blob')
      await list({ token: process.env.BLOB_READ_WRITE_TOKEN, limit: 1 })
    }),
  ])

  const env = {
    GEMINI_API_KEY:       !!process.env.GEMINI_API_KEY,
    REPLICATE_API_TOKEN:  !!process.env.REPLICATE_API_TOKEN,
    PEXELS_API_KEY:       !!process.env.PEXELS_API_KEY,
    BLOB_READ_WRITE_TOKEN:!!process.env.BLOB_READ_WRITE_TOKEN,
    BETA_CODES_COUNT:     (process.env.BETA_CODES ?? '').split(',').filter(Boolean).length,
    NEXTAUTH_URL:         process.env.NEXTAUTH_URL ?? '(not set)',
    NODE_ENV:             process.env.NODE_ENV ?? 'unknown',
  }

  return NextResponse.json({ apis: results, env, checkedAt: new Date().toISOString() })
}
