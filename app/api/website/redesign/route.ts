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

const SCHEME_TOKENS: Record<string, string> = {
  dark: `
:root {
  --bg:          #05050a;
  --bg-surface:  #0d0d14;
  --bg-elevated: #13131e;
  --bg-card:     #0f0f19;
  --border:      rgba(255,255,255,0.08);
  --border-glow: rgba(124, 92, 255,0.35);
  --text:        #f0f0ff;
  --text-2:      #9898b3;
  --text-3:      #606078;
  --accent:      #7C5CFF;
  --accent-2:    #818cf8;
  --accent-glow: rgba(124, 92, 255,0.18);
  --green:       #22c55e;
  --amber:       #f59e0b;
  --nav-bg:      rgba(5,5,10,0.7);
  --btn-primary: linear-gradient(135deg,#7C5CFF 0%,#A78BFA 100%);
  --btn-shadow:  0 4px 20px rgba(124, 92, 255,0.4);
  --card-glow:   0 0 40px rgba(124, 92, 255,0.08);
}`,
  light: `
:root {
  --bg:          #f8f8fc;
  --bg-surface:  #ffffff;
  --bg-elevated: #f0f0f8;
  --bg-card:     #ffffff;
  --border:      rgba(0,0,0,0.08);
  --border-glow: rgba(124, 92, 255,0.35);
  --text:        #09090d;
  --text-2:      #52525b;
  --text-3:      #a1a1aa;
  --accent:      #7C5CFF;
  --accent-2:    #6A45F5;
  --accent-glow: rgba(124, 92, 255,0.12);
  --green:       #16a34a;
  --amber:       #d97706;
  --nav-bg:      rgba(248,248,252,0.8);
  --btn-primary: linear-gradient(135deg,#7C5CFF 0%,#A78BFA 100%);
  --btn-shadow:  0 4px 20px rgba(124, 92, 255,0.3);
  --card-glow:   0 8px 40px rgba(0,0,0,0.06);
}`,
  midnight: `
:root {
  --bg:          #080412;
  --bg-surface:  #100820;
  --bg-elevated: #180c30;
  --bg-card:     #120a24;
  --border:      rgba(139,92,246,0.15);
  --border-glow: rgba(139,92,246,0.5);
  --text:        #ede9fe;
  --text-2:      #a78bfa;
  --text-3:      #7c3aed;
  --accent:      #A78BFA;
  --accent-2:    #a78bfa;
  --accent-glow: rgba(139,92,246,0.2);
  --green:       #34d399;
  --amber:       #fbbf24;
  --nav-bg:      rgba(8,4,18,0.75);
  --btn-primary: linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%);
  --btn-shadow:  0 4px 24px rgba(139,92,246,0.5);
  --card-glow:   0 0 50px rgba(139,92,246,0.1);
}`,
  ocean: `
:root {
  --bg:          #020c1b;
  --bg-surface:  #071829;
  --bg-elevated: #0a2038;
  --bg-card:     #061525;
  --border:      rgba(56,189,248,0.12);
  --border-glow: rgba(56,189,248,0.4);
  --text:        #e0f2fe;
  --text-2:      #7dd3fc;
  --text-3:      #38bdf8;
  --accent:      #0ea5e9;
  --accent-2:    #38bdf8;
  --accent-glow: rgba(14,165,233,0.18);
  --green:       #34d399;
  --amber:       #fbbf24;
  --nav-bg:      rgba(2,12,27,0.75);
  --btn-primary: linear-gradient(135deg,#0284c7 0%,#38bdf8 100%);
  --btn-shadow:  0 4px 24px rgba(14,165,233,0.45);
  --card-glow:   0 0 50px rgba(14,165,233,0.1);
}`,
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`website-redesign:${ip}`, 8, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: {
    domain?: string
    analysis?: Analysis
    h1s?: string[]
    bodyPreview?: string
    colorScheme?: string
    referenceUrl?: string
    featureRequest?: string
    buildFromScratch?: boolean
    businessDescription?: string
  }
  try { body = await req.json() } catch {
    return new Response('Invalid request', { status: 400 })
  }

  const {
    domain = '', analysis, h1s = [], bodyPreview = '', colorScheme = 'dark',
    referenceUrl = '', featureRequest = '',
    buildFromScratch = false, businessDescription = '',
  } = body
  if (!analysis && !buildFromScratch) return new Response('Analysis data required', { status: 400 })

  // Fetch reference site metadata if provided
  let referenceContext = ''
  if (referenceUrl) {
    try {
      const refDomain = referenceUrl.replace(/^https?:\/\//, '').split('/')[0]
      const refRes = await fetch(
        referenceUrl.startsWith('http') ? referenceUrl : `https://${referenceUrl}`,
        { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      if (refRes.ok) {
        const html = await refRes.text()
        const titleMatch     = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        const descMatch      = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)
        const h1Match        = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
        const ogTitleMatch   = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)
        const bodyTextMatch  = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 800)
        referenceContext = `
REFERENCE / INSPIRATION SITE: ${refDomain}
- Title: ${titleMatch?.[1] ?? ogTitleMatch?.[1] ?? refDomain}
- Description: ${descMatch?.[1] ?? '(none)'}
- Main headline: ${h1Match?.[1] ?? '(none)'}
- Content sample: ${bodyTextMatch}
→ STYLE DIRECTIVE: Borrow the visual language, layout patterns, interaction feel, and design DNA from ${refDomain}. Match its level of polish and use similar section structures.`
      }
    } catch {}
  }

  const scheme = SCHEME_TOKENS[colorScheme] ?? SCHEME_TOKENS.dark
  const isLight = colorScheme === 'light'

  const detectedContent = analysis?.sections
    .filter((s: { detectedCopy?: string }) => s.detectedCopy)
    .map((s: { name: string; detectedCopy?: string }) => `${s.name}: "${s.detectedCopy}"`)
    .join('\n') ?? ''

  const criticalFixes = analysis?.issues
    .filter((i: { severity: string }) => i.severity === 'critical' || i.severity === 'warning')
    .map((i: { title: string; fix: string }) => `• ${i.title} → ${i.fix}`)
    .join('\n') ?? ''

  const missingSections = analysis?.sections
    .filter((s: { quality: string }) => s.quality === 'missing')
    .map((s: { name: string }) => s.name)
    .join(', ') ?? ''

  const businessContext = buildFromScratch
    ? `BUSINESS DESCRIPTION: ${businessDescription || domain}`
    : `BUSINESS: ${domain}
DETECTED HEADLINE: ${h1s[0] || '(none)'}
DETECTED CONTENT:
${detectedContent || bodyPreview.slice(0, 2000)}

AUDIT — fixes to apply:
${criticalFixes || 'Improve overall quality and professionalism'}
Missing sections to add: ${missingSections || 'none'}
Redesign goal: ${analysis?.redesignBrief ?? 'Create a stunning, high-converting website'}`

  const prompt = `Generate a COMPLETE, PRODUCTION-QUALITY HTML website${buildFromScratch ? '' : ' redesign'}. This must be stunning — award-winning agency quality.

${businessContext}
${referenceContext}
${featureRequest ? `\nSPECIFIC FEATURE REQUESTS FROM USER: ${featureRequest}\n` : ''}

COLOR SCHEME CSS VARIABLES TO USE (inject these into :root exactly as-is):
${scheme}

FULL REQUIREMENTS:

1. STRUCTURE — use ALL these sections in order:
   <nav> sticky top with logo text, nav links, CTA button, hamburger for mobile
   <section id="hero"> — 100vh height, bold headline, sub, 2 buttons, decorative floating stats/badges
   <section id="services"> — 3-column card grid, each card has SVG icon, title, description, hover effect
   <section id="proof"> — testimonials OR stats showcase (3 metric cards: big number + label)
   <section id="process"> — numbered steps 1-3 with icons and connector line
   <section id="cta"> — email capture form OR contact prompt with headline
   <footer> — columns: brand + tagline, links, social icons (inline SVG for GitHub/X/LinkedIn/Instagram)

2. CSS — ALL in one <style> block in <head>, zero external requests:
   - Import: NONE — use only system fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
   - Use ONLY the CSS variables defined above (--bg, --text, --accent, etc.)
   - Sections: padding-top/bottom 100px min, max-width 1200px, margin: 0 auto
   - Full CSS reset: *, *::before, *::after { margin:0; padding:0; box-sizing:border-box }
   - Animations: @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
   - @keyframes slideInLeft { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:none} }
   - @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
   - @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:1} }
   - .animate class: animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both
   - .animate.delay-1: animation-delay: 0.1s  .delay-2: 0.2s  .delay-3: 0.3s  .delay-4: 0.4s
   - Cards: border-radius:20px; border:1px solid var(--border); background:var(--bg-card);
            padding:32px; transition:all 0.3s cubic-bezier(0.16,1,0.3,1);
            box-shadow: var(--card-glow);
   - Card hover: transform:translateY(-6px); border-color:var(--border-glow);
                 box-shadow:0 20px 60px var(--accent-glow)
   - Buttons primary: background:var(--btn-primary); box-shadow:var(--btn-shadow);
                      padding:14px 28px; border-radius:10px; font-weight:600;
                      transition:all 0.25s; border:none; cursor:pointer;
                      color:${isLight ? '#fff' : '#fff'}; font-size:15px
   - Button primary hover: transform:translateY(-2px); box-shadow: 0 8px 30px var(--accent-glow);
   - Nav: position:fixed; width:100%; top:0; z-index:100; backdrop-filter:blur(16px);
          background:var(--nav-bg); border-bottom:1px solid var(--border); height:64px;
          transition: background 0.3s
   - .nav-scrolled: border-bottom-color:var(--border-glow)
   - Gradient text: background:var(--btn-primary); -webkit-background-clip:text;
                    -webkit-text-fill-color:transparent; background-clip:text
   - Hero H1: font-size:clamp(48px,7vw,80px); font-weight:800; letter-spacing:-0.04em;
              line-height:1.05; margin-bottom:20px
   - Section H2: font-size:clamp(32px,4vw,48px); font-weight:700; letter-spacing:-0.03em;
                 margin-bottom:16px
   - Subtext: font-size:18px; line-height:1.7; color:var(--text-2); max-width:52ch
   - Decorative blobs: position:absolute; border-radius:50%; filter:blur(80px);
                       pointer-events:none; z-index:0; background:var(--accent-glow);
                       width:400px; height:400px
   - Stat badges (hero): background:var(--bg-surface); border:1px solid var(--border);
                         border-radius:12px; padding:12px 20px; display:inline-flex;
                         align-items:center; gap:10px
   - SVG icons in cards: width:48px; height:48px; in a div with background:var(--accent-glow);
                         border-radius:12px; border:1px solid var(--border-glow); padding:12px;
                         margin-bottom:20px
   - Steps connector: a visible dotted or solid line between numbered circles
   - Number circles: 48px circle, background:var(--btn-primary), color:white, font-weight:700
   - Input fields: background:var(--bg-elevated); border:1px solid var(--border);
                   border-radius:10px; padding:14px 18px; color:var(--text);
                   font-size:15px; width:100%; outline:none;
                   transition:border-color 0.2s
   - Input focus: border-color:var(--accent)
   - Mobile nav overlay: position:fixed, full screen, background:var(--bg), z-index:99
   - Footer: background:var(--bg-surface); border-top:1px solid var(--border);
             padding:60px 0 32px; color:var(--text-2)
   - Responsive: @media(max-width:768px) — 1-column grids, smaller text, hidden desktop nav

3. JAVASCRIPT — ALL in one <script> before </body>:
   a) Hamburger toggle: clicking #hamburger toggles #mobile-menu (show/hide), animates 3 bars to X
   b) Smooth scroll: document.querySelectorAll('a[href^="#"]').forEach(...) preventDefault + scrollIntoView
   c) Nav scroll effect: window scroll listener adds/removes .nav-scrolled class at 80px
   d) IntersectionObserver: observe all .animate elements, add .in-view class when visible
      .in-view: actually triggers the animation (initially opacity:0, no animation until .in-view added)
   e) Form: prevent default submit, show success message "#form-success" div, hide form

4. COPY QUALITY — use detected content as foundation, improve it:
   - Hero H1 must be bold, benefit-led, specific to this business — NOT generic
   - Subheadline: specific pain point solved + outcome
   - Service names: specific to what the business actually does
   - Testimonials: realistic names, specific results ("saved us 12 hours a week")
   - CTA headline: urgency + benefit, not "Contact Us"

5. INTERACTIVE DETAILS:
   - All nav links have smooth hover underline animation (::after pseudo with width transition)
   - Footer social icons turn accent color on hover
   - Stats in hero should animate (CSS counter isn't needed — just display the numbers boldly)
   - Process section steps slide in one by one with delays

OUTPUT RULES:
- Start IMMEDIATELY with <!DOCTYPE html> — no text before it
- End with </html> — nothing after
- NO markdown, NO code fences, NO explanation
- HTML must be complete and valid — do not cut off mid-element`

  const stream = geminiStream({
    system: 'You are a world-class front-end engineer and UI designer. When generating HTML, output ONLY the complete document — start with <!DOCTYPE html>, end with </html>. No markdown. No explanation. No code fences. The HTML must be complete, beautiful, and production-ready.',
    messages: [{ role: 'user', parts: [{ text: prompt }] }],
    maxTokens: 8192,
    model: 'gemini-2.0-flash',
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
