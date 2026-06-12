import { NextRequest } from 'next/server'
import { geminiStream } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`website-improve:${ip}`, 20, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: { sectionName?: string; currentCopy?: string; context?: string; domain?: string }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
  }

  const { sectionName = 'Section', currentCopy = '', context = '', domain = '' } = body

  const prompt = `Rewrite the "${sectionName}" section of a website${domain ? ` (${domain})` : ''}.

Site context: ${context || 'Small business website'}

Current copy on this section:
"${currentCopy || '(no copy detected — write suggested copy from scratch)'}"

Write improved copy for this ${sectionName} section. Be specific, direct, and compelling. No filler phrases. No AI-speak. Write like a top-tier copywriter who knows this business.

Format your response as:

**Headline:** <improved headline or title>

**Body:** <improved main body copy — 2-4 sentences max>

**CTA:** <improved call-to-action button text or closing line>

**Why this works:** <1-2 sentences explaining what makes this better>`

  const stream = geminiStream({
    system: 'You are a professional copywriter specializing in small business websites. You write copy that converts — specific, benefit-led, and never generic. Never use phrases like "in today\'s digital world", "as a business owner", or "we are dedicated to". Write like a human who knows the business intimately.',
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 700,
    model: 'gemini-2.5-flash-lite',
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
