import { NextRequest, NextResponse } from 'next/server'
import { geminiStream, ALLOWED_MODELS } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { isFounderCode } from '@/lib/founderAuth'
import { DEFAULT_SYSTEM } from '@/lib/lyraSystem'

export const dynamic = 'force-dynamic'

interface Message { role: 'user' | 'assistant'; content: string }
interface Attachment { name: string; url: string; type: string }

export async function POST(req: NextRequest) {
  const ip = getIp(req)

  // Founders bypass rate limits
  const founderCode = req.headers.get('x-founder-code')
  const founder = isFounderCode(founderCode)
  if (!founder.valid) {
    const rl = rateLimit(`chat:${ip}`, 30, 60_000)
    if (!rl.success) return tooManyRequests(rl.reset)
  }

  let body: {
    message: string
    history?: Message[]
    attachments?: Attachment[]
    webSearch?: boolean
    pageContext?: string
    // Founder-only overrides
    customSystem?: string
    model?: string
    maxTokens?: number
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, history = [], attachments = [], webSearch = false, pageContext = '', customSystem, model, maxTokens } = body
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  // Resolve system prompt — founders can override it
  let baseSystem = DEFAULT_SYSTEM
  if (founder.valid && customSystem?.trim()) {
    baseSystem = customSystem.trim()
  }
  const systemWithContext = pageContext ? `${baseSystem}\n\nCurrent page context: ${pageContext}` : baseSystem

  // Resolve model — founders can choose; everyone else gets the default
  const resolvedModel = founder.valid && ALLOWED_MODELS.includes(model as typeof ALLOWED_MODELS[number])
    ? model
    : undefined  // undefined → gemini library uses DEFAULT_MODEL

  // Resolve max tokens — founders can bump this up to 4096
  const resolvedMaxTokens = founder.valid && maxTokens && maxTokens > 0 && maxTokens <= 8192
    ? maxTokens
    : 1024

  // Build message text with attachment context
  let userText = message
  if (attachments.length > 0) {
    const attList = attachments.map(a => `• ${a.name} (${a.type}) — ${a.url}`).join('\n')
    userText += `\n\n[Attached files]\n${attList}`
  }

  const messages = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    })),
    { role: 'user' as const, parts: [{ text: userText }] },
  ]

  const tools = webSearch ? [{ google_search: {} }] : undefined

  const stream = geminiStream({
    system: systemWithContext,
    messages,
    maxTokens: resolvedMaxTokens,
    tools,
    model: resolvedModel,
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      'X-Used-Search': webSearch ? '1' : '0',
      'X-Model': resolvedModel ?? 'gemini-2.5-flash-lite',
      'X-Founder': founder.valid ? '1' : '0',
    },
  })
}
