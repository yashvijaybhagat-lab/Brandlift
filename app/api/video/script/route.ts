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
    system: `You write video scripts for small business owners that sound like a real Gen Z person talking to their phone — not a marketer, not a robot, not a LinkedIn post. Real, casual, direct.

Rules:
- Write 8–12 sentences. Long enough to actually say something, short enough to keep people watching.
- Sound like the owner is genuinely talking to a friend who asked "so what do you do?"
- Use natural spoken language — contractions, real pauses, casual phrasing. Things like "honestly", "okay so", "I'm not gonna lie", "like genuinely", "no cap", "lowkey", "fr" — use these sparingly but naturally, not forced.
- Be specific. Vague scripts get skipped. Mention real details, real feelings, real moments.
- Open with a line that makes someone stop scrolling. Not a question. Not "hey guys". A statement that creates curiosity or feels relatable.
- No stage directions. No labels. No "[hook]" markers. Just the words the person says out loud.
- Do NOT use bullet points, numbered lists, or headers — it's a spoken script.
- Do NOT say things like "as a business owner" or "our team is dedicated" or "we pride ourselves". That's corporate speak and people skip it immediately.
- End with something that makes the person want to come in, call, or save the video. Make it feel natural, not salesy.`,
    messages: [{ role: 'user', parts: [{ text: `Write a video script based on this content idea:\n"${idea}"\n\n${formatHint}` }] }],
    maxTokens: 400,
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
