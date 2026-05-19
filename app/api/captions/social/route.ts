import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const maxDuration = 25

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`socialcaptions:${ip}`, 20, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const { script } = await req.json().catch(() => ({}))
  if (!script?.trim()) return NextResponse.json({ error: 'script is required' }, { status: 400 })
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  try {
    const raw = await geminiGenerate({
      system: `You are a social media copywriter. Return ONLY valid JSON, no markdown fences, no extra text.`,
      messages: [{
        role: 'user',
        parts: [{ text: `Write optimized posting captions for this video script for 3 platforms. Each caption should feel native to that platform's culture and style.

Script: "${script.slice(0, 700)}"

Return a JSON array with exactly 3 objects:
[
  { "platform": "Instagram", "caption": "..." },
  { "platform": "TikTok", "caption": "..." },
  { "platform": "LinkedIn", "caption": "..." }
]

Rules:
- Instagram: 2–3 sentences, storytelling tone, end with 3–5 relevant hashtags
- TikTok: ultra-short, punchy, 1–2 sentences, use Gen Z tone, 3 hashtags max
- LinkedIn: professional but personal, 3–4 sentences, no hashtags, end with a question to drive comments` }],
      },],
      maxTokens: 600,
    })

    const cleaned = raw.replace(/```json\n?|```\n?/g, '').replace(/```/g, '').trim()
    const captions = JSON.parse(cleaned)
    if (!Array.isArray(captions)) throw new Error('not array')
    return NextResponse.json({ captions })
  } catch {
    return NextResponse.json({ error: 'Failed to generate captions' }, { status: 500 })
  }
}
