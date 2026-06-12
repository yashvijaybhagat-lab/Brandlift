import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  tiktok:    'TikTok: punchy Gen-Z tone, 1-3 lines, trending slang OK, 3-5 hashtags, strong CTA like "follow for more"',
  instagram: 'Instagram: storytelling caption 2-4 lines + line break, 5-8 hashtags, emoji accents, CTA like "save this"',
  youtube:   'YouTube Shorts: keyword-rich title (max 60 chars) + 2-3 line description for SEO, 3-5 tags',
  linkedin:  'LinkedIn: professional tone, insight-led opener, 3-4 lines, no hashtag spam (2 max), end with question',
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`post-copy:${ip}`, 20, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  const { script, platform } = await req.json().catch(() => ({ script: '', platform: 'tiktok' }))
  if (!script?.trim()) return NextResponse.json({ error: 'script is required' }, { status: 400 })

  const instruction = PLATFORM_INSTRUCTIONS[platform] ?? PLATFORM_INSTRUCTIONS.tiktok
  const prompt = `Write ready-to-post copy for ${platform.toUpperCase()} based on this video script.

Instructions: ${instruction}

Script: "${script.slice(0, 600)}"

Return ONLY valid JSON, no markdown:
{"title":"Post title or hook (max 60 chars)","caption":"Full post caption with line breaks where appropriate","hashtags":["#tag1","#tag2"],"cta":"Call to action text"}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.75 },
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const copy = JSON.parse(cleaned)
    return NextResponse.json({ copy })
  } catch {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
