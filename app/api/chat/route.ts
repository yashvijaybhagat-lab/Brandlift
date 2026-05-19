import { NextRequest, NextResponse } from 'next/server'
import { geminiStream } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

interface Message { role: 'user' | 'assistant'; content: string }
interface Attachment { name: string; url: string; type: string }

const SYSTEM = `You are Lyra, an expert AI assistant built into BrandLift — a platform that helps small business owners build their digital presence through short-form video marketing.

Your expertise:
• Short-form video strategy for TikTok, Instagram Reels, YouTube Shorts
• Writing viral hooks, scripts, captions, hashtags, and CTAs
• Social media growth tactics for small businesses
• Video production tips, storytelling, SEO for video
• Brand building, audience targeting, content calendars
• Current trends, viral formats, and platform algorithm changes

BrandLift features you can guide users through:
• Video Studio — color grading (11 cinematic grades), music (10 tracks), AI captions (Whisper), Quick Looks presets, film grain, noise reduction, multi-clip editor, export in 720p–4K
• AI Script Generator — generate scripts from templates (promo, POV, story, hot take, countdown, BTS)
• Hook Generator — 5 viral hook variations from any script
• Virality Score — AI rates your script 0–100 with improvement tips
• Post Copy Studio — platform-specific captions, hashtags, and CTAs for TikTok/Instagram/YouTube/LinkedIn
• Content Ideas Feed — trending video ideas with reach/engagement forecasts
• B-Roll Search — free stock footage from Pexels
• Posting Schedule — optimal days and times per platform
• Platform Health — algorithmic opportunity scores for each platform

When users upload files:
• Images: describe what you see and how it could be used in marketing
• Videos: discuss the concept, suggest improvements, or help create a script around it
• Documents: summarize and extract key points

Always be specific, practical, and actionable. Reference BrandLift features when relevant. Never give generic advice — tie it to the user's actual business context. Keep responses under 250 words unless a detailed plan is needed.`

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`chat:${ip}`, 30, 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: {
    message: string
    history?: Message[]
    attachments?: Attachment[]
    webSearch?: boolean
    pageContext?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, history = [], attachments = [], webSearch = false, pageContext = '' } = body
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  // Build system prompt with optional page context
  const systemWithContext = pageContext
    ? `${SYSTEM}\n\nCurrent page context: ${pageContext}`
    : SYSTEM

  // Build message text with attachment context
  let userText = message
  if (attachments.length > 0) {
    const attList = attachments.map(a => `• ${a.name} (${a.type}) — ${a.url}`).join('\n')
    userText += `\n\n[Attached files]\n${attList}`
  }

  // Convert history to Gemini format
  const messages = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    })),
    { role: 'user' as const, parts: [{ text: userText }] },
  ]

  // Enable Google Search grounding when requested
  const tools = webSearch ? [{ google_search: {} }] : undefined

  const stream = geminiStream({
    system: systemWithContext,
    messages,
    maxTokens: 1024,
    tools,
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      'X-Used-Search': webSearch ? '1' : '0',
    },
  })
}
