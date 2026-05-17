import { NextRequest, NextResponse } from 'next/server'
import { geminiStream } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

interface Message { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  let body: { message: string; context?: string; history?: Message[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, context = '', history = [] } = body
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  const system = `You are a friendly, expert AI assistant built into BrandLift — a platform that helps small business owners build their digital presence. Help with content strategy, video ideas, social media captions, website copy, and marketing. Be concise, practical, and specific. Speak like a knowledgeable friend.${context ? `\n\nCurrent context: ${context}` : ''}\n\nKeep responses under 200 words unless the user needs a detailed plan. Always end with something actionable.`

  // Convert history to Gemini format (alternating user/model)
  const messages = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    })),
    { role: 'user' as const, parts: [{ text: message }] },
  ]

  const stream = geminiStream({ system, messages, maxTokens: 512 })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked', 'Cache-Control': 'no-cache, no-transform' },
  })
}
