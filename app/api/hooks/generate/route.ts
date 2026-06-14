import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`hooks:${ip}`, 30, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  const { script, businessName } = await req.json().catch(() => ({ script: '', businessName: '' }))
  if (!script?.trim()) return NextResponse.json({ error: 'script is required' }, { status: 400 })

  const prompt = `Generate exactly 5 viral video hooks for this script${businessName ? ` from ${businessName}` : ''}. Each hook must be under 12 words, grab attention in the first 2 seconds, and use one of these styles:
- question: A compelling question that creates curiosity
- pov: A "POV:" style hook describing a relatable scenario
- stat: A surprising statistic or bold claim
- story: A micro-story opener that creates tension
- challenge: A direct challenge or controversial statement

Script: "${script.slice(0, 600)}"

Return ONLY valid JSON array, no markdown, no explanation:
[{"text":"hook text","style":"question","emoji":"🤔"},...]`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.9 },
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const hooks = JSON.parse(cleaned)
    return NextResponse.json({ hooks: Array.isArray(hooks) ? hooks.slice(0, 5) : [] })
  } catch {
    return NextResponse.json({ hooks: [] }, { status: 500 })
  }
}
