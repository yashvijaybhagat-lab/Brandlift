import Anthropic from '@anthropic-ai/sdk'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type BusinessProfile = {
  businessName: string
  description: string
  audience: string
  location: string
  services: string[]
  differentiator: string
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'playful'
  platforms: Array<'tiktok' | 'instagram' | 'youtube' | 'website' | 'google'>
  style: 'minimal' | 'bold' | 'warm' | 'premium' | 'authentic'
}

// ─────────────────────────────────────────────
// Anthropic client (server-side only)
// ─────────────────────────────────────────────

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }
  return new Anthropic({ apiKey })
}

// ─────────────────────────────────────────────
// System prompt builders
// ─────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are a digital presence expert for small businesses. You write copy that is direct, confident, and never generic. You understand that small business owners are busy and skeptical of AI — your output must feel human, specific, and immediately useful.

Guidelines:
- Be specific. Use numbers, locations, and concrete details when available.
- Never use filler phrases like "In today's digital landscape" or "As a small business owner."
- Action-first language. Lead with the value, not the setup.
- Match the tone requested exactly. Casual means casual. Professional means professional.
- Keep it concise. Small business owners don't have time to edit walls of text.
- When writing social media posts, make them feel native to the platform — not copy-pasted from a newsletter.`

export function buildBusinessSystemPrompt(profile: BusinessProfile): string {
  const platformList = profile.platforms.join(', ')
  const serviceList = profile.services.join(', ')

  return `${BASE_SYSTEM_PROMPT}

Business Context:
- Business Name: ${profile.businessName}
- What they do: ${profile.description}
- Target audience: ${profile.audience}
- Location: ${profile.location}
- Services/Products: ${serviceList}
- What makes them different: ${profile.differentiator}
- Tone: ${profile.tone}
- Content style: ${profile.style}
- Active platforms: ${platformList}

Always write as if you know this business intimately. Reference their differentiator and audience naturally. Never mention "AI" or "generated content" in the output.`
}

// ─────────────────────────────────────────────
// Streaming content generation
// ─────────────────────────────────────────────

export async function streamText(
  prompt: string,
  systemPrompt: string,
  onToken: (token: string) => void
): Promise<string> {
  const client = getClient()
  let fullText = ''

  const stream = client.messages.stream({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      const token = chunk.delta.text
      fullText += token
      onToken(token)
    }
  }

  return fullText
}

// ─────────────────────────────────────────────
// Non-streaming content generation
// ─────────────────────────────────────────────

export async function generateContent(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const client = getClient()

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API')
  }

  return content.text
}

// ─────────────────────────────────────────────
// Convenience: generate with business profile
// ─────────────────────────────────────────────

export async function generateForBusiness(
  prompt: string,
  profile: BusinessProfile
): Promise<string> {
  const systemPrompt = buildBusinessSystemPrompt(profile)
  return generateContent(prompt, systemPrompt)
}

export async function streamForBusiness(
  prompt: string,
  profile: BusinessProfile,
  onToken: (token: string) => void
): Promise<string> {
  const systemPrompt = buildBusinessSystemPrompt(profile)
  return streamText(prompt, systemPrompt, onToken)
}
