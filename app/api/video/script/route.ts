import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { idea, format } = await req.json() as { idea: string; format?: string }

  if (!idea?.trim()) {
    return NextResponse.json({ error: 'idea is required' }, { status: 400 })
  }

  const formatHint =
    format === 'talking-head' ? 'This is a talking-head video — write it as if speaking directly to camera.'
    : format === 'b-roll' ? 'This will play over b-roll footage — write a short voiceover narration.'
    : format === 'tutorial' ? 'This is a tutorial video — write clear step-by-step narration.'
    : format === 'text-overlay' ? 'This will appear as text overlay — write punchy, short phrases.'
    : 'Write it as a natural spoken script.'

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 220,
          system: `You write short, punchy video scripts for small businesses. Write in a natural, conversational tone — like the business owner is speaking directly to potential customers. No stage directions, no labels, no titles. Just the spoken words. Keep it to 4–6 sentences maximum.`,
          messages: [
            {
              role: 'user',
              content: `Write a video script based on this content idea:\n"${idea}"\n\n${formatHint}`,
            },
          ],
        })

        for await (const chunk of messageStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
