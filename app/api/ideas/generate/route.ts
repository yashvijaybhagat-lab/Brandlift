import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { list } from '@vercel/blob'
import { geminiGenerate } from '@/lib/gemini'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST() {
  // Load business profile for this user
  let profileContext = 'A small local business looking to grow on social media.'
  try {
    const session = await getServerSession()
    const email = session?.user?.email
    if (email) {
      const { blobs } = await list({ prefix: `user-data/${encodeURIComponent(email)}/profile.json`, limit: 1 })
      if (blobs.length) {
        const res = await fetch(blobs[0].url, { cache: 'no-store' })
        const data = await res.json()
        const p = data.profile
        if (p?.businessName) {
          profileContext = [
            `Business: ${p.businessName}.`,
            p.description && `What they do: ${p.description}.`,
            p.audience && `Target audience: ${p.audience}.`,
            p.location && `Location: ${p.location}.`,
            p.services?.length && `Services: ${p.services.join(', ')}.`,
            p.differentiator && `What makes them different: ${p.differentiator}.`,
            p.tone && `Brand tone: ${p.tone}.`,
          ].filter(Boolean).join(' ')
        }
      }
    }
  } catch { /* use default context */ }

  const prompt = `You are a social media content strategist. Generate 18 fresh short-form video content ideas for this business.

${profileContext}

Rules:
- Hooks must be SPECIFIC to this business — never generic filler
- Sound like a real person talking, not corporate copy
- Mix: POV-style, educational, story-based, controversial takes, behind-the-scenes
- Use Gen Z language naturally (not forced)
- Vary formats and platforms

Return ONLY a valid JSON array with no markdown fences. Each object:
{
  "id": "g1" (unique, increment),
  "hook": "The opening line/concept — 1-2 sentences max",
  "format": "talking-head" | "b-roll" | "tutorial" | "text-overlay",
  "platforms": ["tiktok"] (array, 1-3 of: tiktok, instagram, youtube),
  "trend": "trending" | "rising" | "classic",
  "reach": "2K–15K" (realistic range)
}`

  try {
    const raw = await geminiGenerate({
      messages: [{ role: 'user', parts: [{ text: prompt }] }],
      maxTokens: 2500,
    })

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const ideas = JSON.parse(cleaned)
    if (!Array.isArray(ideas) || ideas.length === 0) throw new Error('Invalid format')

    return NextResponse.json({ ideas })
  } catch (err) {
    console.error('[ideas/generate]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
