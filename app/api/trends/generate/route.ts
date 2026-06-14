import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`trends:${ip}`, 10, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  const { description, platforms } = await req.json().catch(() => ({ description: '', platforms: [] }))
  const bizDesc = description?.trim() || 'a local small business'
  const platformList = Array.isArray(platforms) && platforms.length > 0 ? platforms.join(', ') : 'TikTok, Instagram'

  const prompt = `Generate 6 specific, actionable trending content angles for ${bizDesc} targeting ${platformList}.

Each trend should be something real small businesses are doing RIGHT NOW to go viral. Not generic advice.

Return ONLY valid JSON array, no markdown:
[{
  "topic": "Short topic title (4-6 words)",
  "angle": "One sentence on how to execute this (max 15 words)",
  "platform": "TikTok",
  "difficulty": "easy",
  "emoji": "🔥",
  "reach": "5K–50K views"
}]

Use difficulty: "easy", "medium", or "hard". Vary the platforms across entries.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.85 },
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const trends = JSON.parse(cleaned)
    return NextResponse.json({ trends: Array.isArray(trends) ? trends.slice(0, 6) : [] })
  } catch {
    return NextResponse.json({ trends: [] }, { status: 500 })
  }
}
