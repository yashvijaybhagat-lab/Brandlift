import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

interface ReviewPayload {
  name: string
  business: string
  location?: string
  result?: string
  quote: string
}

async function isPositive(quote: string): Promise<boolean> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return true
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Is this business software review positive and genuine (not spam, abusive, or negative)? Reply with only YES or NO.\n\nReview: "${quote}"` }] }],
          generationConfig: { maxOutputTokens: 4, temperature: 0 },
        }),
      }
    )
    if (!res.ok) return true
    const data = await res.json()
    const answer: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() ?? ''
    return answer.startsWith('YES')
  } catch {
    return true
  }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`reviews-submit:${ip}`, 3, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: ReviewPayload
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const name  = body.name?.trim()
  const biz   = body.business?.trim()
  const quote = body.quote?.trim()

  if (!name || !biz || !quote) {
    return NextResponse.json({ error: 'name, business, and quote are required' }, { status: 400 })
  }
  if (quote.length > 600) {
    return NextResponse.json({ error: 'Quote too long (max 600 chars)' }, { status: 400 })
  }

  // Always return success so submitters can't probe which reviews were rejected
  const positive = await isPositive(quote)
  if (!positive) return NextResponse.json({ ok: true })

  const id = crypto.randomUUID()
  const review = {
    id,
    name,
    business: biz,
    location: body.location?.trim() ?? '',
    result:   body.result?.trim()   ?? '',
    quote,
    submittedAt: Date.now(),
    status: 'published',
  }

  await put(`reviews/${id}.json`, JSON.stringify(review), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  })

  return NextResponse.json({ ok: true, published: true })
}
