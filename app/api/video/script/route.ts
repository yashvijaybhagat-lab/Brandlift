import { NextRequest, NextResponse } from 'next/server'
import { geminiStream } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { idea, format } = await req.json() as { idea: string; format?: string }

  if (!idea?.trim()) {
    return NextResponse.json({ error: 'idea is required' }, { status: 400 })
  }

  const formatHint =
    format === 'talking-head' ? 'This is a talking-head video — write it as if speaking directly to camera.'
    : format === 'b-roll' ? 'This will play over b-roll footage — write a short voiceover narration.'
    : format === 'tutorial' ? 'This is a tutorial video — write clear step-by-step narration.'
    : format === 'text-overlay' ? 'This will appear as text overlay — write punchy, short phrases.'
    : 'Write it as a natural spoken script.'

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  const stream = geminiStream({
    system: 'You write short, punchy video scripts for small businesses. Write in a natural, conversational tone — like the business owner is speaking directly to potential customers. No stage directions, no labels, no titles. Just the spoken words. Keep it to 4–6 sentences maximum.',
    messages: [{ role: 'user', parts: [{ text: `Write a video script based on this content idea:\n"${idea}"\n\n${formatHint}` }] }],
    maxTokens: 220,
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
