import { NextRequest, NextResponse } from 'next/server'
import { geminiStream } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const { description, businessName } = await req.json() as { description: string; businessName: string }

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description required' }, { status: 400 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  const stream = geminiStream({
    system: "You are a business description writer. If the description is vague or unclear, rewrite it to be specific and compelling in under 15 words. If it's already good, return it unchanged. Only return the description, nothing else.",
    messages: [{ role: 'user', parts: [{ text: `Business name: ${businessName}\nDescription: ${description}` }] }],
    maxTokens: 60,
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked', 'Cache-Control': 'no-cache' },
  })
}
