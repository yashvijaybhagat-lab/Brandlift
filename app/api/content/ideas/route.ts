import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { type BusinessProfile } from '@/lib/claude'
import { requireAiAccess } from '@/lib/planGate'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Platform = 'tiktok' | 'instagram' | 'youtube'
type Format = 'talking-head' | 'b-roll' | 'tutorial' | 'text-overlay'
type Trend = 'trending' | 'rising' | 'classic'

interface ContentIdea {
  id: string
  hook: string
  format: Format
  platforms: Platform[]
  trend: Trend
  reach: string
}

// ─────────────────────────────────────────────
// Default profile for unauthenticated requests
// ─────────────────────────────────────────────

const DEFAULT_PROFILE: BusinessProfile = {
  businessName: 'Local Business',
  description: 'A small local business serving the community',
  audience: 'Local customers',
  location: 'Local area',
  services: ['Core service'],
  differentiator: 'Personal service and quality',
  tone: 'friendly',
  platforms: ['tiktok', 'instagram'],
  style: 'authentic',
}

// ─────────────────────────────────────────────
// System prompt for structured JSON output
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a social media content strategist for small businesses. Generate content ideas as structured JSON only. No prose. No markdown. Pure JSON array.

Rules:
- hooks must feel human, specific, and conversational — never corporate
- each hook is the opening 3 seconds of a video (first line the viewer hears or reads)
- vary formats across ideas
- reach estimates should be realistic for a small business account (500–50K range)
- trends: "trending" for hot formats, "rising" for growing ones, "classic" for evergreen
- platforms array must contain only: "tiktok", "instagram", "youtube"
- format must be one of: "talking-head", "b-roll", "tutorial", "text-overlay"
- id must be a unique string`

function buildUserPrompt(profile: BusinessProfile): string {
  return `Generate 12 unique content ideas for this business:
Business: ${profile.businessName}
What they do: ${profile.description}
Audience: ${profile.audience}
Location: ${profile.location}
Services: ${profile.services.join(', ')}
What makes them different: ${profile.differentiator}
Tone: ${profile.tone}
Style: ${profile.style}
Active platforms: ${profile.platforms.join(', ')}

Return ONLY a JSON array with this exact shape (no wrapper object, no markdown, just the array):
[
  {
    "id": "1",
    "hook": "the opening line",
    "format": "talking-head",
    "platforms": ["tiktok"],
    "trend": "trending",
    "reach": "1.2K–8K"
  },
  ...
]`
}

// ─────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const gate = await requireAiAccess()
  if (gate.denied) return gate.response

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Parse optional business profile from query params
    const { searchParams } = new URL(request.url)
    const profileParam = searchParams.get('profile')

    let profile: BusinessProfile = DEFAULT_PROFILE
    if (profileParam) {
      try {
        profile = JSON.parse(decodeURIComponent(profileParam)) as BusinessProfile
      } catch {
        // Fall back to default profile
      }
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(profile),
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response type from Claude' },
        { status: 500 }
      )
    }

    // Claude may wrap the JSON in markdown fences — strip them
    const raw = content.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let ideas: ContentIdea[]
    try {
      ideas = JSON.parse(raw) as ContentIdea[]
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response', raw: content.text },
        { status: 500 }
      )
    }

    // Validate and sanitize
    const validFormats: Format[] = ['talking-head', 'b-roll', 'tutorial', 'text-overlay']
    const validTrends: Trend[] = ['trending', 'rising', 'classic']
    const validPlatforms: Platform[] = ['tiktok', 'instagram', 'youtube']

    const sanitized: ContentIdea[] = ideas
      .filter((idea) => idea && typeof idea.hook === 'string')
      .map((idea, index) => ({
        id: String(idea.id ?? index + 1),
        hook: String(idea.hook),
        format: validFormats.includes(idea.format) ? idea.format : 'talking-head',
        platforms: Array.isArray(idea.platforms)
          ? (idea.platforms.filter((p) => validPlatforms.includes(p)) as Platform[])
          : ['tiktok'],
        trend: validTrends.includes(idea.trend) ? idea.trend : 'rising',
        reach: typeof idea.reach === 'string' ? idea.reach : '1K–5K',
      }))

    return NextResponse.json({ ideas: sanitized })
  } catch (error) {
    console.error('[/api/content/ideas] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content ideas' },
      { status: 500 }
    )
  }
}
