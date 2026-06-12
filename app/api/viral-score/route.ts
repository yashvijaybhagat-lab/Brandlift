import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export interface ViralScoreResult {
  totalScore: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  verdict: string
  summary: string
  dimensions: {
    hook:      { score: number; max: 20; label: string; tip: string; icon: string }
    retention: { score: number; max: 20; label: string; tip: string; icon: string }
    emotion:   { score: number; max: 20; label: string; tip: string; icon: string }
    cta:       { score: number; max: 20; label: string; tip: string; icon: string }
    trend:     { score: number; max: 20; label: string; tip: string; icon: string }
  }
  improvedHook: string
  quickFixes: string[]
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl  = rateLimit(`viral-score:${ip}`, 12, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  let body: { script?: string; platform?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const script = body.script?.trim().slice(0, 4000)
  if (!script) return NextResponse.json({ error: 'Script required' }, { status: 400 })
  const platform = body.platform || 'TikTok'

  const prompt = `You are a viral content strategist. Analyze this ${platform} video script and score it. Return ONLY valid JSON.

Script:
"""
${script}
"""

Score each dimension 0-20 based on real viral video patterns. Be honest — most scripts score 50-75 total.

Return exactly this JSON:
{
  "totalScore": <integer 0-100, sum of all dimension scores>,
  "grade": <"S" if >=90, "A" if >=80, "B" if >=65, "C" if >=50, "D" otherwise>,
  "verdict": <"10-12 word punchy verdict like 'Strong hook but loses steam by the middle'>">,
  "summary": <"2-3 sentences explaining what works and what doesn't">,
  "dimensions": {
    "hook": {
      "score": <0-20>,
      "max": 20,
      "label": "Hook Power",
      "tip": <"specific 1 sentence improvement for the hook">,
      "icon": "⚡"
    },
    "retention": {
      "score": <0-20>,
      "max": 20,
      "label": "Retention",
      "tip": <"specific 1 sentence improvement for keeping viewers watching">,
      "icon": "👁"
    },
    "emotion": {
      "score": <0-20>,
      "max": 20,
      "label": "Emotional Pull",
      "tip": <"specific 1 sentence improvement for emotional resonance">,
      "icon": "💥"
    },
    "cta": {
      "score": <0-20>,
      "max": 20,
      "label": "Call to Action",
      "tip": <"specific 1 sentence improvement for the CTA">,
      "icon": "🎯"
    },
    "trend": {
      "score": <0-20>,
      "max": 20,
      "label": "Trend Fit",
      "tip": <"specific 1 sentence improvement for trend alignment">,
      "icon": "🔥"
    }
  },
  "improvedHook": <"a rewritten first 1-2 sentences that would dramatically improve the hook score">,
  "quickFixes": [<"actionable fix 1">, <"actionable fix 2">, <"actionable fix 3">]
}`

  const raw = await geminiGenerate({
    system: 'You are a viral content analyst. Always respond with valid JSON only.',
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 2000,
    model: 'gemini-2.5-flash-lite',
  })

  let json = raw.trim()
  if (json.startsWith('```')) json = json.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()
  const start = json.indexOf('{'); const end = json.lastIndexOf('}')
  if (start !== -1 && end !== -1) json = json.slice(start, end + 1)

  return NextResponse.json({ result: JSON.parse(json) })
}
