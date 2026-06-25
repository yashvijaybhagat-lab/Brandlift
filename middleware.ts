import { NextRequest, NextResponse } from 'next/server'

// ── Founder bypass ────────────────────────────────────────────
function isFounder(code: string | null | undefined, cookieCode?: string | null): boolean {
  const yb = (process.env.OWNER_CODE_YB ?? '').trim().toUpperCase()
  const an = (process.env.OWNER_CODE_AN ?? '').trim().toUpperCase()
  if (!yb && !an) return false
  for (const raw of [code, cookieCode]) {
    if (!raw) continue
    const n = raw.trim().toUpperCase()
    if ((yb && n === yb) || (an && n === an)) return true
  }
  return false
}

function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'anon'
}

const hits = new Map<string, { n: number; expires: number }>()
function allow(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = hits.get(key)
  if (!entry || now > entry.expires) { hits.set(key, { n: 1, expires: now + windowMs }); return true }
  if (entry.n >= limit) return false
  entry.n++
  return true
}

const ROUTE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth\//,          limit: 5,   windowMs: 15 * 60_000 },
  { pattern: /^\/api\/ai\//,            limit: 10,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/stores\//,        limit: 60,  windowMs: 60_000 },
  { pattern: /^\/api\/products\//,      limit: 60,  windowMs: 60_000 },
  { pattern: /^\/api\/orders\//,        limit: 30,  windowMs: 60_000 },
  { pattern: /^\/api\/subscribe/,       limit: 5,   windowMs: 15 * 60_000 },
  { pattern: /^\/api\/contact/,         limit: 5,   windowMs: 15 * 60_000 },
  { pattern: /^\/api\//,                limit: 100, windowMs: 60_000 },
]

const BLOCKED_PATHS: RegExp[] = [
  /\.(php|asp|aspx|jsp|cgi|env|git|svn|bak|sql|sh|bash|config|ini|log|DS_Store|htaccess|htpasswd)(\?|$)/i,
  /\/(wp-admin|wp-login|wp-content|wordpress|phpmyadmin|adminer|db|myadmin|mysql|cpanel|webmail|shell|eval|exec)/i,
  /(\.\.|%2e%2e|%252e|%c0%ae)/i,
  /<\s*script/i,
  /javascript:/i,
  /(\bunion\b.{0,30}\bselect\b|\bor\b\s+['"\d]+=\s*['"\d]+)/i,
  /%00/,
]

const BLOCKED_UA: RegExp[] = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /dirbuster/i, /gobuster/i,
  /wfuzz/i, /hydra/i, /burpsuite/i, /acunetix/i, /nessus/i, /metasploit/i,
]

const SEC_HEADERS: [string, string][] = [
  ['X-Frame-Options',           'SAMEORIGIN'],
  ['X-Content-Type-Options',    'nosniff'],
  ['X-XSS-Protection',          '1; mode=block'],
  ['Referrer-Policy',           'strict-origin-when-cross-origin'],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' blob: https:; " +
    "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.stripe.com https://vercel.com https://blob.vercel-storage.com https://*.public.blob.vercel-storage.com; " +
    "frame-src https://js.stripe.com; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  ],
]

function addSecHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of SEC_HEADERS) {
    if (v === '') res.headers.delete(k)
    else res.headers.set(k, v)
  }
  return res
}

function block403(reason = 'Forbidden'): NextResponse {
  return addSecHeaders(new NextResponse(
    JSON.stringify({ error: 'Forbidden.' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  ))
}

function block429(windowMs: number): NextResponse {
  return addSecHeaders(new NextResponse(
    JSON.stringify({ error: 'Too many requests — try again shortly.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
  ))
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const full = pathname + search
  const ip   = clientIp(req)
  const ua   = req.headers.get('user-agent') ?? ''

  if (BLOCKED_PATHS.some(p => p.test(full))) return block403('probe')
  if (BLOCKED_UA.some(p => p.test(ua)))       return block403('ua')

  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
  if (contentLength > 10 * 1024 * 1024) return block403('payload-too-large')

  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|css|js|map)$/.test(pathname)
  ) {
    return addSecHeaders(NextResponse.next())
  }

  // Founder bypass
  const founderHeader = req.headers.get('x-founder-code')
  const founderCookie = req.cookies.get('bl_session')?.value
  if (isFounder(founderHeader, founderCookie)) {
    const res = NextResponse.next()
    res.headers.set('x-real-ip', ip)
    return addSecHeaders(res)
  }

  // Admin firewall
  if (pathname.startsWith('/api/admin/') || pathname.startsWith('/admin')) {
    return block403('unauthorized')
  }

  // Per-route rate limiting
  if (pathname.startsWith('/api/')) {
    for (const { pattern, limit, windowMs } of ROUTE_LIMITS) {
      if (!pattern.test(pathname)) continue
      if (!allow(`${ip}:${pattern.source}`, limit, windowMs)) return block429(windowMs)
      break
    }
  }

  const res = NextResponse.next()
  res.headers.set('x-real-ip', ip)
  return addSecHeaders(res)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
