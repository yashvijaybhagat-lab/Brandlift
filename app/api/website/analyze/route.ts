import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ─── HTML Extraction ───────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]{1,8};/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractText(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  return Array.from(html.matchAll(regex))
    .map(m => stripTags(m[1]))
    .filter(t => t.length > 1 && t.length < 300)
}

function extractMeta(html: string, name: string): string {
  for (const pattern of [
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'),
  ]) {
    const m = html.match(pattern)
    if (m?.[1]) return m[1].trim()
  }
  return ''
}

function extractOG(html: string, prop: string): string {
  for (const pattern of [
    new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${prop}["']`, 'i'),
  ]) {
    const m = html.match(pattern)
    if (m?.[1]) return m[1].trim()
  }
  return ''
}

function extractFromHTML(html: string, hostname: string) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const title = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/&[^;]+;/g, ' ').trim() ?? ''

  const metaDesc = extractMeta(cleaned, 'description')
  const ogTitle  = extractOG(cleaned, 'title')
  const ogImage  = extractOG(cleaned, 'image')

  const h1s = extractText(cleaned, 'h1').slice(0, 5)
  const h2s = extractText(cleaned, 'h2').slice(0, 10)
  const h3s = extractText(cleaned, 'h3').slice(0, 8)

  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHTML  = bodyMatch?.[1] ?? cleaned
  const bodyText  = stripTags(bodyHTML).slice(0, 6000)
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length

  const imgTags  = Array.from(cleaned.matchAll(/<img[^>]*>/gi))
  const withAlt  = imgTags.filter(m => /alt=["'][^"']{2,}["']/i.test(m[0])).length

  const buttons = extractText(cleaned, 'button').slice(0, 15)
  const links = Array.from(cleaned.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi))
    .map(m => stripTags(m[1]))
    .filter(t => t.length > 2 && t.length < 60)
    .slice(0, 20)

  const forms      = (cleaned.match(/<form[\s>]/gi) ?? []).length
  const hasNav     = /<nav[\s>]/i.test(cleaned)
  const hasHeader  = /<header[\s>]/i.test(cleaned)
  const hasFooter  = /<footer[\s>]/i.test(cleaned)
  const sections   = (cleaned.match(/<section[\s>]/gi) ?? []).length

  const hasPhone   = /(\+1[\s-]?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/.test(bodyText)
  const hasEmail   = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(bodyText)

  const socialLinks = Array.from(new Set(
    (cleaned.match(/(?:facebook|instagram|twitter|x\.com|linkedin|tiktok|youtube)\.com/gi) ?? [])
      .map(s => s.toLowerCase())
  )).slice(0, 6)

  const hasTestimonials = /testimonial|review|rating|star|customer say|what (our|clients|people) say/i.test(bodyText)
  const hasViewport    = /<meta[^>]*name=["']viewport["']/i.test(html)

  return {
    hostname, title, metaDesc, ogTitle, ogImage,
    h1s, h2s, h3s, bodyText,
    images: { total: imgTags.length, withAlt },
    buttons, links, forms,
    structure: { hasNav, hasHeader, hasFooter, sections },
    contact: { hasPhone, hasEmail },
    socialLinks, hasTestimonials, hasViewport, wordCount,
  }
}

// ─── AI Analysis ────────────────────────────────────────────

async function analyzeWithAI(data: ReturnType<typeof extractFromHTML>): Promise<Record<string, unknown>> {
  const d = data

  const prompt = `You are a professional website auditor. Analyze this website data and respond with ONLY a valid JSON object — no markdown fences, no explanation, nothing before or after the JSON.

Site: ${d.hostname}
Title: ${d.title || '(none)'}
Meta description: ${d.metaDesc || '(missing)'}
OG title: ${d.ogTitle || '(none)'}
H1: ${d.h1s.join(' | ') || '(none)'}
H2: ${d.h2s.slice(0, 6).join(' | ') || '(none)'}
Body text (first 3500 chars): ${d.bodyText.slice(0, 3500)}
Images: ${d.images.total} total, ${d.images.withAlt} with alt text
Has nav: ${d.structure.hasNav} | Has header: ${d.structure.hasHeader} | Has footer: ${d.structure.hasFooter} | Sections: ${d.structure.sections}
Forms: ${d.forms} | Buttons: ${d.buttons.join(', ') || '(none)'}
Links text: ${d.links.join(', ') || '(none)'}
Phone: ${d.contact.hasPhone} | Email: ${d.contact.hasEmail}
Testimonials: ${d.hasTestimonials} | Social: ${d.socialLinks.join(', ') || '(none)'}
Viewport meta: ${d.hasViewport} | Word count: ${d.wordCount}

Return exactly this JSON structure:
{
  "score": <integer 0-100 overall weighted score>,
  "scoreLabel": <"Excellent" if >=80, "Good" if >=60, "Fair" if >=40, "Poor" otherwise>,
  "headline": <"10-15 word punchy single-sentence assessment">,
  "categories": {
    "seo": {"score": <0-100>, "grade": <"A"/"B"/"C"/"D"/"F">, "note": <"max 18 words">},
    "content": {"score": <0-100>, "grade": <"A"/"B"/"C"/"D"/"F">, "note": <"max 18 words">},
    "trust": {"score": <0-100>, "grade": <"A"/"B"/"C"/"D"/"F">, "note": <"max 18 words">},
    "ctas": {"score": <0-100>, "grade": <"A"/"B"/"C"/"D"/"F">, "note": <"max 18 words">},
    "structure": {"score": <0-100>, "grade": <"A"/"B"/"C"/"D"/"F">, "note": <"max 18 words">}
  },
  "issues": [
    {"severity": <"critical"/"warning"/"tip">, "category": <"SEO"/"Content"/"Trust"/"CTAs"/"Structure">, "title": <"short title">, "description": <"1-2 sentences">, "fix": <"specific actionable fix">>}
  ],
  "sections": [
    {"name": <"Hero"/"About"/"Services"/"Testimonials"/"Contact"/"FAQ"/"Blog"/"Pricing">, "quality": <"good"/"needs-work"/"missing">, "note": <"max 18 words">, "detectedCopy": <"key detected copy or empty string">}
  ],
  "quickWins": [<"fix 1 string">, <"fix 2 string">, <"fix 3 string">],
  "summary": <"2-3 sentence plain-English overall assessment">,
  "redesignBrief": <"2-3 sentences on what an improved version of this site should prioritize">
}

Include 5-8 issues mixing all severities. Include 4-7 section objects covering the main sections. Be specific and actionable.`

  const raw = await geminiGenerate({
    system: 'You are a website auditor. Always respond with valid JSON only — no markdown, no code fences, no text before or after the JSON object.',
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 2800,
    model: 'gemini-2.5-flash-lite',
  })

  let json = raw.trim()
  // Strip markdown fences if present
  if (json.startsWith('```')) {
    json = json.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()
  }
  // Find first { to last }
  const start = json.indexOf('{')
  const end   = json.lastIndexOf('}')
  if (start !== -1 && end !== -1) json = json.slice(start, end + 1)

  return JSON.parse(json)
}

// ─── Route ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`website-analyze:${ip}`, 10, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  let body: { url?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawUrl = body.url?.trim() ?? ''
  if (!rawUrl) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  let url = rawUrl
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }

  const host = parsedUrl.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    return NextResponse.json({ error: 'Cannot analyze local or private URLs' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  let html: string

  try {
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandLiftAnalyzer/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)

    if (!res.ok) {
      return NextResponse.json({ error: `Site returned HTTP ${res.status}` }, { status: 400 })
    }
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html')) {
      return NextResponse.json({ error: 'That URL does not serve an HTML page' }, { status: 400 })
    }
    html = await res.text()
  } catch (err: unknown) {
    clearTimeout(timer)
    if ((err as Error)?.name === 'AbortError') {
      return NextResponse.json({ error: 'Site took too long to respond (>15s)' }, { status: 408 })
    }
    return NextResponse.json({ error: 'Could not reach that website — check the URL and try again' }, { status: 400 })
  }

  const extracted = extractFromHTML(html, parsedUrl.hostname)

  let analysis: Record<string, unknown>
  try {
    analysis = await analyzeWithAI(extracted)
  } catch {
    return NextResponse.json({ error: 'Analysis failed — please try again' }, { status: 500 })
  }

  return NextResponse.json({
    analysis,
    domain: parsedUrl.hostname,
    h1s: extracted.h1s,
    bodyPreview: extracted.bodyText.slice(0, 2000),
  })
}
