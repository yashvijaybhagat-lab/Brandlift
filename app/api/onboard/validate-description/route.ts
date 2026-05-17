import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { description, businessName } = body as {
    description: string
    businessName: string
  }

  if (!description || description.trim().length === 0) {
    return NextResponse.json({ error: 'Description required' }, { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: 'claude-opus-4-5',
          max_tokens: 60,
          system:
            'You are a business description writer. If the description is vague or unclear, rewrite it to be specific and compelling in under 15 words. If it\'s already good, return it unchanged. Only return the description, nothing else.',
          messages: [
            {
              role: 'user',
              content: `Business name: ${businessName}\nDescription: ${description}`,
            },
          ],
        })

        for await (const chunk of messageStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const token = chunk.delta.text
            controller.enqueue(new TextEncoder().encode(token))
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
