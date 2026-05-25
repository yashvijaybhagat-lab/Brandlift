import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { list, put } from '@vercel/blob'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit } from '@/lib/rateLimit'

export interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  addedAt: string
  helpful: number
}

const FAQ_KEY = 'faq/items.json'

const DEFAULT_FAQ: FAQItem[] = [
  {
    id: 'faq_default_1',
    question: 'How do I create my first video script?',
    answer: 'Head to My Videos in the sidebar and click "Generate with AI". Enter your business topic and niche — BrandLift will write a complete, platform-optimized script. You can edit it, download it, or share it directly to the Feed.',
    category: 'Getting Started',
    addedAt: '2026-01-01T00:00:00Z',
    helpful: 0,
  },
  {
    id: 'faq_default_2',
    question: 'What does the Viral Score actually measure?',
    answer: 'Viral Score grades your script on five dimensions: Hook Strength, Retention, Emotional Resonance, Call to Action clarity, and Trend Alignment. Each is scored out of 20 for a total of 100, with specific tips to improve before you film.',
    category: 'Features',
    addedAt: '2026-01-01T00:00:00Z',
    helpful: 0,
  },
  {
    id: 'faq_default_3',
    question: 'How does the Repurpose Studio work?',
    answer: 'Paste any video script into Repurpose Studio and it instantly reformats it for TikTok, Instagram, LinkedIn, Twitter/X, YouTube, and email — each with the right tone, length, hashtags, and structure for that platform.',
    category: 'Features',
    addedAt: '2026-01-01T00:00:00Z',
    helpful: 0,
  },
  {
    id: 'faq_default_4',
    question: 'Can I share my videos with other BrandLift users?',
    answer: 'Yes! In My Videos, each generated video has a Share button. Once shared, it appears in the Feed where other users can watch, like, comment, and message you directly.',
    category: 'Features',
    addedAt: '2026-01-01T00:00:00Z',
    helpful: 0,
  },
  {
    id: 'faq_default_5',
    question: 'What is the 7-Day Content Planner?',
    answer: 'The Content Planner generates a full week of content ideas tailored to your business, niche, and target audience. Each day includes a platform pick, content type, hook, full script, hashtags, and optimal posting time.',
    category: 'Features',
    addedAt: '2026-01-01T00:00:00Z',
    helpful: 0,
  },
  {
    id: 'faq_default_6',
    question: 'What are the best times to post on TikTok?',
    answer: 'For most niches, 6–9 PM and 9–11 PM in your audience\'s timezone perform best on TikTok. The Content Planner accounts for your specific niche and generates optimal posting times automatically.',
    category: 'Tips & Tricks',
    addedAt: '2026-01-01T00:00:00Z',
    helpful: 0,
  },
]

async function getFAQ(): Promise<FAQItem[]> {
  try {
    const { blobs } = await list({ prefix: 'faq/items' })
    if (!blobs.length) return DEFAULT_FAQ
    const res = await fetch(blobs[0].url)
    if (!res.ok) return DEFAULT_FAQ
    const items = await res.json()
    return Array.isArray(items) && items.length > 0 ? items : DEFAULT_FAQ
  } catch {
    return DEFAULT_FAQ
  }
}

export async function GET() {
  const items = await getFAQ()
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = rateLimit(`faq:${session.user.email}`, 8, 60 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded — try again in an hour' }, { status: 429 })
  }

  const { question } = await req.json()
  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  const existingItems = await getFAQ()
  const existingQs = existingItems.map(i => `- ${i.question}`).join('\n')

  const prompt = `You are the FAQ curator for BrandLift — a platform that helps small businesses create viral short-form video content, manage their website, repurpose content across platforms, and grow their brand online. Features include: AI video script generation, a shared community Feed, Repurpose Studio, Viral Score analyzer, 7-Day Content Planner, and website analysis.

A user submitted this question:
"${question}"

Existing FAQ (check for duplicates or near-duplicates):
${existingQs}

Evaluate and respond with valid JSON only (no markdown, no code blocks):
{
  "appropriate": boolean,
  "reason": "brief reason if NOT appropriate — e.g. 'too personal', 'duplicate of existing question', 'off-topic', 'spam'",
  "answer": "helpful 2–3 sentence answer in a friendly, concise tone — always provide this regardless",
  "category": "one of: Getting Started, Content Creation, Features, Account, Tips & Tricks",
  "improvedQuestion": "cleaner, generalized phrasing of the question for the FAQ (or unchanged if already good)"
}

Guidelines for appropriateness:
- Mark true if it's a genuine question about BrandLift features, content strategy, or how to use the platform that other users would also benefit from
- Mark false if it's a personal support issue (specific account problems), spam, inappropriate, or is already clearly covered in the existing FAQ
- Be generous — new angles on existing topics are fine`

  try {
    const raw = await geminiGenerate({
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 800,
    model: 'gemini-2.5-flash-lite',
  })
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    let added = false
    if (parsed.appropriate) {
      const newItem: FAQItem = {
        id: `faq_${Date.now()}`,
        question: parsed.improvedQuestion || question.trim(),
        answer: parsed.answer,
        category: parsed.category || 'General',
        addedAt: new Date().toISOString(),
        helpful: 0,
      }
      const updated = [newItem, ...existingItems]
      await put(FAQ_KEY, JSON.stringify(updated), { access: 'public', allowOverwrite: true })
      added = true
    }

    return NextResponse.json({
      answer: parsed.answer,
      added,
      category: parsed.category,
      reason: parsed.reason,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to process your question' }, { status: 500 })
  }
}
