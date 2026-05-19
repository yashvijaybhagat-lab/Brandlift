import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`hashtags:${ip}`, 30, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const { script, platform = 'tiktok' } = await req.json().catch(() => ({}))
  if (!script?.trim()) return NextResponse.json({ error: 'script is required' }, { status: 400 })
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  try {
    const raw = await geminiGenerate({
      system: `You are a social media hashtag expert. Return ONLY a JSON array of hashtag strings (with the # symbol). No markdown, no explanation, no other text.`,
      messages: [{
        role: 'user',
        parts: [{ text: `Generate exactly 20 hashtags for this ${platform} video script. Mix: 5 niche-specific (very targeted), 8 mid-size (10K–500K posts), 5 broad trending, 2 brand/location. All lowercase except acronyms.\n\nScript: "${script.slice(0, 600)}"` }],
      }],
      maxTokens: 350,
    })

    const cleaned = raw.replace(/```json\n?|```\n?/g, '').replace(/```/g, '').trim()
    let hashtags: string[] = JSON.parse(cleaned)
    if (!Array.isArray(hashtags)) throw new Error('not array')
    hashtags = hashtags
      .map(t => (typeof t === 'string' ? (t.startsWith('#') ? t : `#${t}`) : ''))
      .filter(Boolean)
      .slice(0, 25)
    return NextResponse.json({ hashtags })
  } catch {
    return NextResponse.json({ error: 'Failed to generate hashtags' }, { status: 500 })
  }
}
