import { NextRequest } from 'next/server'
import { geminiStream } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

interface Analysis {
  score: number
  headline: string
  summary: string
  redesignBrief: string
  quickWins: string[]
  issues: Array<{ severity: string; title: string; fix: string }>
  sections: Array<{ name: string; quality: string; detectedCopy?: string }>
  categories: Record<string, { score: number; note: string }>
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl  = rateLimit(`website-redesign:${ip}`, 5, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: { domain?: string; analysis?: Analysis; h1s?: string[]; bodyPreview?: string }
  try { body = await req.json() } catch {
    return new Response('Invalid request', { status: 400 })
  }

  const { domain = '', analysis, h1s = [], bodyPreview = '' } = body
  if (!analysis) return new Response('Analysis data required', { status: 400 })

  const presentSections   = analysis.sections.filter(s => s.quality !== 'missing').map(s => s.name)
  const missingSections   = analysis.sections.filter(s => s.quality === 'missing').map(s => s.name)
  const criticalIssues    = analysis.issues.filter(i => i.severity === 'critical').map(i => `${i.title}: ${i.fix}`)
  const warningIssues     = analysis.issues.filter(i => i.severity === 'warning').map(i => `${i.title}: ${i.fix}`)
  const detectedCopy      = analysis.sections
    .filter(s => s.detectedCopy)
    .map(s => `${s.name}: "${s.detectedCopy}"`)
    .join('\n')

  const prompt = `You are a world-class web designer. Generate a complete, standalone HTML page redesign for this business website.

Website: ${domain}
Current site headline: ${h1s.join(' | ') || '(unknown)'}
Detected content: ${detectedCopy || bodyPreview.slice(0, 1500)}

Audit results:
- Overall score: ${analysis.score}/100
- Summary: ${analysis.summary}
- Redesign priorities: ${analysis.redesignBrief}
- Quick wins: ${analysis.quickWins.join(' | ')}

Critical issues to fix:
${criticalIssues.map(i => `- ${i}`).join('\n') || '- None'}

Warnings to address:
${warningIssues.map(i => `- ${i}`).join('\n') || '- None'}

Sections present: ${presentSections.join(', ') || 'unknown'}
Sections to add (missing): ${missingSections.join(', ') || 'none'}

Generate a complete, standalone HTML redesign that:
1. Fixes every critical issue and warning listed above
2. Includes all missing sections
3. Uses modern, professional dark design with CSS custom properties
4. Is fully responsive (mobile-first with media queries)
5. Uses ONLY inline CSS — no external stylesheets, no CDN, no JavaScript frameworks
6. Has realistic, specific placeholder content based on what we detected (not lorem ipsum)
7. Includes a sticky nav, hero with a clear H1 and CTA, service cards, trust/testimonials section, and a contact section
8. Uses a color palette of #0a0a0b background, #6366f1 accent, #FAFAFA text — unless the site clearly has a different brand color

Return ONLY the complete HTML document. Start with <!DOCTYPE html> and end with </html>. No explanation, no markdown, no code fences.`

  const stream = geminiStream({
    system: 'You are an expert web designer and front-end developer. When asked to generate HTML, return ONLY the complete HTML document — no markdown, no explanation, no code fences. Start directly with <!DOCTYPE html>.',
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 8000,
    model: 'gemini-2.5-flash-lite',
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
