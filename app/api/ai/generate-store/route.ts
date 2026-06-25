import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, theme } = await req.json()
  if (!prompt || prompt.length < 10) return NextResponse.json({ error: 'Prompt too short' }, { status: 400 })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a store design AI. Given a product description, generate a JSON store configuration.

Product description: ${prompt}
Theme preference: ${theme ?? 'minimal'}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "name": "short catchy store name",
  "description": "1-2 sentence store tagline",
  "theme": "minimal|bold|luxury|tech",
  "page_sections": [
    {
      "id": "hero",
      "type": "hero",
      "order": 0,
      "content": {
        "headline": "main headline (punchy, under 8 words)",
        "subheadline": "supporting text (1-2 sentences)",
        "cta": "button text"
      }
    },
    {
      "id": "features",
      "type": "features",
      "order": 1,
      "content": {
        "headline": "why choose us headline",
        "items": [
          { "title": "feature 1", "desc": "1 sentence" },
          { "title": "feature 2", "desc": "1 sentence" },
          { "title": "feature 3", "desc": "1 sentence" }
        ]
      }
    },
    {
      "id": "cta",
      "type": "cta",
      "order": 2,
      "content": {
        "headline": "closing CTA headline",
        "cta": "button text"
      }
    }
  ]
}`
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const config = JSON.parse(text)
    return NextResponse.json({ config })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
