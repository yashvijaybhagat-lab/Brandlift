import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export interface PlannerDay {
  day: string
  date: string
  platform: string
  contentType: string
  topic: string
  hook: string
  script: string
  hashtags: string[]
  bestTime: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedViews: string
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`planner:${ip}`, 6, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  let body: { businessName?: string; niche?: string; audience?: string; platforms?: string[]; goals?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const platforms = (body.platforms ?? ['TikTok', 'Instagram']).join(', ')

  // Get dates for next 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'long' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })

  const prompt = `You are a content strategist for small businesses. Create a 7-day content plan. Return ONLY valid JSON.

Business: ${body.businessName || 'small business'}
Niche: ${body.niche || 'general'}
Target audience: ${body.audience || 'general consumers'}
Platforms: ${platforms}
Goals: ${body.goals || 'grow audience and drive sales'}

Days: ${days.map(d => `${d.day} ${d.date}`).join(', ')}

Create a varied 7-day plan. Mix content types: educational, entertaining, behind-the-scenes, testimonial, product/service showcase, trending, personal story.

Return exactly this JSON (array of 7 days):
[
  {
    "day": "${days[0].day}",
    "date": "${days[0].date}",
    "platform": <"TikTok" or "Instagram" or "LinkedIn" etc.>,
    "contentType": <"Educational" | "Behind the Scenes" | "Trend" | "Testimonial" | "Product Showcase" | "Personal Story" | "Tutorial">,
    "topic": <"specific topic for this business, 8-12 words">,
    "hook": <"first 5-8 words that grab attention">,
    "script": <"full 80-120 word video script for this content">,
    "hashtags": ["<tag1>","<tag2>","<tag3>","<tag4>","<tag5>"],
    "bestTime": <"e.g. 7pm" — optimal posting time for this platform/day>,
    "difficulty": <"easy" | "medium" | "hard">,
    "estimatedViews": <"e.g. 500-2K" — realistic estimate for a small account>
  }
  ... (7 items total, one per day listed above)
]`

  const raw = await geminiGenerate({
    system: 'You are a content strategist. Always respond with valid JSON only.',
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 3500,
    model: 'gemini-2.5-flash-lite',
  })

  let json = raw.trim()
  if (json.startsWith('```')) json = json.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()
  const start = json.indexOf('['); const end = json.lastIndexOf(']')
  if (start !== -1 && end !== -1) json = json.slice(start, end + 1)

  const plan: PlannerDay[] = JSON.parse(json)
  return NextResponse.json({ plan })
}
