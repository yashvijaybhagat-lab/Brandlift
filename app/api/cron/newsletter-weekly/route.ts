import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { sendProductUpdateEmail } from '@/lib/email'
import { geminiGenerate } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

const TOPICS = [
  'content marketing tips for small businesses on TikTok and Instagram',
  'how to grow a local business with short-form video',
  'writing hooks that stop the scroll on social media',
  'repurposing one piece of content across multiple platforms',
  'building a consistent brand voice on social media',
  'using AI to save time on content creation',
  'what makes videos go viral for small businesses',
  'growing your email list and social following simultaneously',
]

async function generateWeeklyEmail(weekIndex: number): Promise<{
  subject: string
  headline: string
  body: string
  ctaLabel: string
}> {
  const topic = TOPICS[weekIndex % TOPICS.length]

  const prompt = `You are writing a weekly email newsletter for BrandLift subscribers — small business owners who use AI tools to create social media content (videos, scripts, hooks, captions, websites).

This week's theme: ${topic}

Write a genuinely useful, actionable email. Rules:
- Subject line: punchy, specific, under 60 chars, use one emoji
- Headline: bold statement or question, under 12 words
- Body: 3-4 short paragraphs in HTML using <p> and optionally <ul>/<li> and <strong>. Be direct and practical. Give one concrete tip or insight they can act on today. End with a sentence inviting them to try it in BrandLift.
- CTA button label: 4-6 words, action-oriented

Respond with ONLY a JSON object, no markdown fences:
{"subject":"...","headline":"...","body":"...","ctaLabel":"..."}`

  const raw = await geminiGenerate({
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 1024,
  })

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(cleaned)

  return {
    subject: String(parsed.subject).slice(0, 200),
    headline: String(parsed.headline).slice(0, 200),
    body: String(parsed.body).slice(0, 5000),
    ctaLabel: String(parsed.ctaLabel || 'Try it in BrandLift →').slice(0, 60),
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch active subscribers
  const supabase = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('subscribers')
    .select('email')
    .eq('unsubscribed', false)

  if (error) {
    console.error('[cron/newsletter-weekly] fetch subscribers:', error.message)
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  const emails: string[] = (data ?? []).map((r: { email: string }) => r.email)
  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No subscribers yet' })
  }

  // Use week number to rotate topics
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))

  let email: { subject: string; headline: string; body: string; ctaLabel: string }
  try {
    email = await generateWeeklyEmail(weekIndex)
  } catch (err) {
    console.error('[cron/newsletter-weekly] AI generation failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Email generation failed' }, { status: 500 })
  }

  try {
    await sendProductUpdateEmail(emails, email.subject, email.headline, email.body, email.ctaLabel)
    return NextResponse.json({ sent: emails.length, subject: email.subject })
  } catch (err) {
    console.error('[cron/newsletter-weekly] send failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
