import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { type BusinessProfile } from '@/lib/claude'

export const dynamic = 'force-dynamic'

type Platform = 'tiktok' | 'instagram' | 'youtube'
type Format = 'talking-head' | 'b-roll' | 'tutorial' | 'text-overlay'
type Trend = 'trending' | 'rising' | 'classic'

interface ContentIdea {
  id: string; hook: string; format: Format
  platforms: Platform[]; trend: Trend; reach: string
}

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

const SYSTEM_PROMPT = `You are a social media content strategist for small businesses. Generate content ideas as structured JSON only. No prose. No markdown. Pure JSON array.

Rules:
- hooks must feel human, specific, and conversational — never corporate
- each hook is the opening 3 seconds of a video (first line the viewer hears or reads)
- vary formats across ideas
- reach estimates should be realistic for a small business account (500–50K range)
- trends: "trending" for hot formats, "rising" for growing ones, "classic" for evergreen
- platforms array must contain only: "tiktok", "instagram", "youtube"
- format must be one of: "talking-head", "b-roll", "tutorial", "text-overlay"`

function buildPrompt(profile: BusinessProfile): string {
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

Return ONLY a JSON array (no wrapper object, no markdown):
[{"id":"1","hook":"...","format":"talking-head","platforms":["tiktok"],"trend":"trending","reach":"1.2K–8K"},...]`
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const profileParam = searchParams.get('profile')
    let profile: BusinessProfile = DEFAULT_PROFILE
    if (profileParam) {
      try { profile = JSON.parse(decodeURIComponent(profileParam)) as BusinessProfile } catch {}
    }

    const raw = await geminiGenerate({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', parts: [{ text: buildPrompt(profile) }] }],
      maxTokens: 2048,
    })

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let ideas: ContentIdea[]
    try { ideas = JSON.parse(cleaned) as ContentIdea[] } catch {
      return NextResponse.json({ error: 'Failed to parse Gemini response', raw }, { status: 500 })
    }

    const validFormats: Format[] = ['talking-head', 'b-roll', 'tutorial', 'text-overlay']
    const validTrends: Trend[] = ['trending', 'rising', 'classic']
    const validPlatforms: Platform[] = ['tiktok', 'instagram', 'youtube']

    const sanitized = ideas
      .filter(i => i && typeof i.hook === 'string')
      .map((i, idx) => ({
        id: String(i.id ?? idx + 1),
        hook: String(i.hook),
        format: validFormats.includes(i.format) ? i.format : 'talking-head' as Format,
        platforms: Array.isArray(i.platforms)
          ? i.platforms.filter(p => validPlatforms.includes(p)) as Platform[]
          : ['tiktok' as Platform],
        trend: validTrends.includes(i.trend) ? i.trend : 'rising' as Trend,
        reach: typeof i.reach === 'string' ? i.reach : '1K–5K',
      }))

    return NextResponse.json({ ideas: sanitized })
  } catch (error) {
    console.error('[/api/content/ideas] Error:', error)
    return NextResponse.json({ error: 'Failed to generate content ideas' }, { status: 500 })
  }
}
