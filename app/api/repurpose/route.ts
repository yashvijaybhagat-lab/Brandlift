import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export interface RepurposeResult {
  tiktok:    { caption: string; hashtags: string[]; hook: string }
  instagram: { caption: string; hashtags: string[]; hook: string }
  linkedin:  { post: string }
  twitter:   { thread: string[] }
  youtube:   { title: string; description: string; tags: string[] }
  email:     { subject: string; preview: string; body: string }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`repurpose:${ip}`, 10, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  let body: { script?: string; topic?: string; businessName?: string; niche?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const content = (body.script || body.topic || '').trim().slice(0, 3000)
  if (!content) return NextResponse.json({ error: 'Script or topic required' }, { status: 400 })

  const prompt = `You are a social media strategist for small businesses. Repurpose the following content for 6 platforms. Return ONLY valid JSON, no markdown fences.

Business: ${body.businessName || 'small business'}
Niche: ${body.niche || 'general'}
Content: ${content}

Return exactly this JSON structure:
{
  "tiktok": {
    "hook": "<first 3-5 seconds grabber, max 15 words, punchy>",
    "caption": "<150-200 char caption optimized for TikTok>",
    "hashtags": ["<tag1>","<tag2>","<tag3>","<tag4>","<tag5>"]
  },
  "instagram": {
    "hook": "<attention-grabbing first line for Reels>",
    "caption": "<150-300 char caption with line breaks, storytelling style>",
    "hashtags": ["<tag1>","<tag2>","<tag3>","<tag4>","<tag5>","<tag6>","<tag7>"]
  },
  "linkedin": {
    "post": "<400-600 char LinkedIn post, professional but personal, include 2-3 line breaks, end with a question>"
  },
  "twitter": {
    "thread": ["<tweet 1 — hook, max 280 chars>","<tweet 2 — expand, max 280 chars>","<tweet 3 — insight, max 280 chars>","<tweet 4 — CTA, max 280 chars>"]
  },
  "youtube": {
    "title": "<SEO-optimized YouTube title, 60-70 chars, include keyword>",
    "description": "<150-200 word YouTube description, first 150 chars must hook, include timestamps format, end with CTA>",
    "tags": ["<tag1>","<tag2>","<tag3>","<tag4>","<tag5>"]
  },
  "email": {
    "subject": "<email subject line, max 50 chars, curiosity-driven>",
    "preview": "<preview text, max 90 chars>",
    "body": "<email body, 150-200 words, conversational, 3-4 short paragraphs, ends with 1 clear CTA>"
  }
}`

  const raw = await geminiGenerate({
    system: 'You are a social media strategist. Always respond with valid JSON only — no markdown, no code fences.',
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 3000,
    model: 'gemini-2.5-flash-lite',
  })

  let json = raw.trim()
  if (json.startsWith('```')) json = json.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()
  const start = json.indexOf('{'); const end = json.lastIndexOf('}')
  if (start !== -1 && end !== -1) json = json.slice(start, end + 1)

  const result: RepurposeResult = JSON.parse(json)
  return NextResponse.json({ result })
}
