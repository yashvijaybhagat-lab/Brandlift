import { NextRequest, NextResponse } from 'next/server'
import { geminiStream } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { sanitizeText } from '@/lib/sanitize'

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`onboard-desc:${ip}`, 20, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: { description?: unknown; businessName?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { description, businessName } = body

  if (!description || typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ error: 'Description required' }, { status: 400 })
  }

  const descResult = sanitizeText(description, 500)
  if (!descResult.clean) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const nameResult = sanitizeText(businessName, 100)
  if (!nameResult.clean) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  const stream = geminiStream({
    system: "You are a business description writer. If the description is vague or unclear, rewrite it to be specific and compelling in under 15 words. If it's already good, return it unchanged. Only return the description, nothing else.",
    messages: [{ role: 'user', parts: [{ text: `Business name: ${nameResult.value}\nDescription: ${descResult.value}` }] }],
    maxTokens: 60,
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked', 'Cache-Control': 'no-cache' },
  })
}
