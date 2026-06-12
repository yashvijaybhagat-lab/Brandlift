import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'
import { geminiGenerate } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { notes?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 2000) : ''

  const prompt = `You are writing a product update email for BrandLift — an AI-powered social media content studio for small businesses (creates videos, scripts, hooks, captions, websites).

${notes ? `Here is what was shipped recently:\n${notes}\n\n` : 'Write a general product update highlighting BrandLift\'s core capabilities.\n\n'}

Write a short, friendly newsletter email. Rules:
- Subject line: punchy, specific, under 60 chars, use an emoji
- Headline: bold statement, under 12 words
- Body: 2-4 short paragraphs in HTML (use <p>, <strong>, <ul>/<li> if listing features). Conversational tone, no corporate speak. Focus on what it means for the user, not what was built. End with one line inviting a reply or feedback.
- CTA button label: 4-6 words, action-oriented

Respond with ONLY a JSON object, no markdown, no explanation:
{
  "subject": "...",
  "headline": "...",
  "body": "...",
  "ctaLabel": "..."
}`

  try {
    const raw = await geminiGenerate({
      messages: [{ role: 'user', parts: [{ text: prompt }] }],
      maxTokens: 1024,
    })

    // Strip markdown code fences if model adds them
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned)

    if (!parsed.subject || !parsed.headline || !parsed.body) {
      throw new Error('Incomplete response')
    }

    return NextResponse.json({
      subject: String(parsed.subject).slice(0, 200),
      headline: String(parsed.headline).slice(0, 200),
      body: String(parsed.body).slice(0, 5000),
      ctaLabel: String(parsed.ctaLabel || 'See what\'s new →').slice(0, 60),
    })
  } catch (err) {
    console.error('[newsletter/generate]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Generation failed — try again' }, { status: 500 })
  }
}
