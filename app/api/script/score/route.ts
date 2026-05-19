import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`score:${ip}`, 30, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  const { script } = await req.json().catch(() => ({ script: '' }))
  if (!script?.trim() || script.trim().length < 20) {
    return NextResponse.json({ score: 0, grade: 'F', tips: [] }, { status: 400 })
  }

  const prompt = `Rate this short-form video script's viral potential for TikTok/Instagram Reels/YouTube Shorts.

Script: "${script.slice(0, 800)}"

Evaluate on: hook strength (first line), clarity, emotional pull, call to action, and ideal length (15–60 sec).

Return ONLY valid JSON, no markdown:
{"score":72,"grade":"B","color":"#f59e0b","tips":["Specific tip 1 under 12 words","Specific tip 2","Specific tip 3"]}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 256, temperature: 0.3 },
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)
    const score = Math.min(100, Math.max(0, Number(result.score) || 0))
    const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
    const color = score >= 85 ? '#4ADE80' : score >= 70 ? '#a78bfa' : score >= 55 ? '#f59e0b' : '#f87171'
    return NextResponse.json({ score, grade, color, tips: result.tips?.slice(0, 3) ?? [] })
  } catch {
    return NextResponse.json({ score: 0, grade: 'F', color: '#f87171', tips: [] }, { status: 500 })
  }
}
