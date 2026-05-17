import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { requireAiAccess } from '@/lib/planGate'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  message: string
  context?: string
  history?: Message[]
}

// ─────────────────────────────────────────────
// POST /api/chat
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const gate = await requireAiAccess()
  if (gate.denied) return gate.response

  let body: ChatRequestBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, context = '', history = [] } = body

  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Validate message history shapes
  const safeHistory: Anthropic.MessageParam[] = history
    .filter((m) => m.role && m.content)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  const systemPrompt = `You are a friendly, expert AI assistant built into BrandLift — a platform that helps small business owners build their digital presence.

Your role: Help business owners with their content strategy, video ideas, social media captions, website copy, and general marketing guidance. Be concise, practical, and specific. Speak like a knowledgeable friend, not a consultant.

${context ? `Current context: ${context}` : ''}

Rules:
- Keep responses under 200 words unless the user needs a detailed plan
- Use bullet points or numbered lists for multi-step answers
- Always end with something actionable or a follow-up question
- Never be vague — give specific, usable suggestions
- If you don't know something about their specific business, make reasonable assumptions and invite them to correct you`

  const messages: Anthropic.MessageParam[] = [
    ...safeHistory,
    { role: 'user', content: message },
  ]

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: 'claude-opus-4-5',
          max_tokens: 512,
          system: systemPrompt,
          messages,
        })

        for await (const chunk of messageStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text))
          }
        }

        controller.close()
      } catch (err) {
        console.error('[chat/route] streaming error:', err)
        controller.error(err)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
