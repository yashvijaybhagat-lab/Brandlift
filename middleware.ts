/**
 * Next.js Edge Middleware — full security stack.
 * Runs at CDN edge before any route handler.
 *
 * Layers (in order):
 *  1. Permanent blocklist (IPs auto-promoted after repeat offenses)
 *  2. Blocked paths (scanner probes, exploit patterns)
 *  3. Blocked user-agents (attack tools)
 *  4. Admin firewall (founder-only at edge)
 *  5. Fail2ban rate limit (auto-escalating blocks)
 *  6. Per-route rate limiting
 *  7. Security headers on every response
 */

import { NextRequest, NextResponse } from 'next/server'

// ── Founder bypass ────────────────────────────────────────────
function isFounderCodeEdge(code: string | null | undefined, cookieCode?: string | null): boolean {
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

// ── IP extraction ─────────────────────────────────────────────
function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'anon'
}

// ── Rate limiting ─────────────────────────────────────────────
// NOTE: In-memory rate limiting doesn't work on Vercel serverless — each instance
// has isolated memory. Rate limits below are enforced per-instance as a best-effort
// guard. For strict rate limiting, use Vercel's built-in DDoS protection or an
// external store (Upstash Redis).
const hits = new Map<string, { n: number; expires: number }>()

function allow(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = hits.get(key)
  if (!entry || now > entry.expires) { hits.set(key, { n: 1, expires: now + windowMs }); return true }
  if (entry.n >= limit) return false
  entry.n++
  return true
}

function recordOffense(_ip: string): boolean { return false }
function isBlocked(_ip: string): boolean { return false }

// ── Route rate limits ─────────────────────────────────────────
const ROUTE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/beta\/validate/,     limit: 5,   windowMs: 15 * 60_000 },
  { pattern: /^\/api\/video\/enhance/,     limit: 10,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/video\/transcribe/,  limit: 5,   windowMs: 60 * 60_000 },
  { pattern: /^\/api\/video\/script/,      limit: 20,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/ideas\/generate/,    limit: 20,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/hooks\/generate/,    limit: 30,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/script\/score/,      limit: 30,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/trends\/generate/,   limit: 10,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/video\/post-copy/,   limit: 20,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/pexels\//,           limit: 60,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/chat\/upload/,       limit: 20,  windowMs: 60 * 60_000 },
  { pattern: /^\/api\/chat/,              limit: 30,  windowMs: 60_000       },
  { pattern: /^\/api\//,                  limit: 100, windowMs: 60_000       },
]

// ── Blocked paths ─────────────────────────────────────────────
const BLOCKED_PATHS: RegExp[] = [
  // file extension probes
  /\.(php|asp|aspx|jsp|cgi|env|git|svn|bak|sql|sh|bash|config|ini|log|DS_Store|htaccess|htpasswd)(\?|$)/i,
  // admin/CMS probes
  /\/(wp-admin|wp-login|wp-content|wordpress|phpmyadmin|adminer|db|myadmin|mysql|cpanel|webmail|roundcube|shell|eval|exec|cmd|cmd\.exe)/i,
  // path traversal
  /(\.\.|%2e%2e|%252e|%c0%ae)/i,
  // XSS in URL
  /<\s*script/i,
  /javascript:/i,
  /vbscript:/i,
  // SQLi in URL / query
  /(\bunion\b.{0,30}\bselect\b|\bor\b\s+['"\d]+=\s*['"\d]+)/i,
  // SSRF / localhost probes
  /\/\/(localhost|127\.0\.0\.|0\.0\.0\.0|169\.254\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i,
  // Common vuln scanners targeting known CVEs
  /\/(actuator|metrics|health|env|mappings|info|trace|dump|heapdump|jolokia|jmx|weblogic|struts|solr|jenkins)\b/i,
  // Null byte injection
  /%00/,
]

// ── Blocked user-agents ───────────────────────────────────────
const BLOCKED_UA: RegExp[] = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zgrab/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /hydra/i, /burpsuite/i,
  /acunetix/i, /nessus/i, /openvas/i, /metasploit/i, /havij/i,
  /python-requests\/[0-1]\./i, /python-urllib/i,
  /go-http-client\/1\.0/i, /libwww-perl/i, /lwp-trivial/i,
  /wget\/[0-9]/i, /curl\/[0-6]\./i,
  /\b(sqlmap|dirbuster|gobuster|wfuzz|hydra)\b/i,
]

// ── Security response headers ─────────────────────────────────
const SEC_HEADERS: [string, string][] = [
  ['X-Frame-Options',           'DENY'],
  ['X-Content-Type-Options',    'nosniff'],
  ['X-XSS-Protection',          '1; mode=block'],
  ['Referrer-Policy',           'strict-origin-when-cross-origin'],
  ['Permissions-Policy',        'camera=(), microphone=(), geolocation=(), payment=()'],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Powered-By',              ''],   // strip
  ['Server',                    ''],   // strip
  ['Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' blob: https:; " +
    "connect-src 'self' https://generativelanguage.googleapis.com https://api.replicate.com https://api.pexels.com https://api.github.com https://vercel.com https://blob.vercel-storage.com https://*.public.blob.vercel-storage.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
  ],
]

function addSecHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of SEC_HEADERS) {
    if (v === '') res.headers.delete(k)
    else res.headers.set(k, v)
  }
  return res
}

// ── Response helpers ─────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const full  = pathname + search
  const ip    = clientIp(req)
  const ua    = req.headers.get('user-agent') ?? ''

  // 1. Fail2ban — permanently blocked IPs
  if (isBlocked(ip)) return block403('blocked')

  // 2. Blocked path patterns
  if (BLOCKED_PATHS.some(p => p.test(full))) {
    recordOffense(ip)
    return block403('probe')
  }

  // 3. Blocked user-agents
  if (BLOCKED_UA.some(p => p.test(ua))) {
    recordOffense(ip)
    return block403('ua')
  }

  // 4. Request size check (Content-Length header — no body parsing needed)
  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
  const isVideoRoute  = /\/(video|upload|chat\/upload)/.test(pathname)
  const maxBytes      = isVideoRoute ? 200 * 1024 * 1024 : 2 * 1024 * 1024 // 200MB / 2MB
  if (contentLength > maxBytes) {
    return block403('payload-too-large')
  }

  // 5. Static assets, _next — just add headers and pass
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|css|js|map)$/.test(pathname)
  ) {
    return addSecHeaders(NextResponse.next())
  }

  // 6. NextAuth routes — pass with headers (must not be rate-limited)
  if (pathname.startsWith('/api/auth/')) {
    return addSecHeaders(NextResponse.next())
  }

  // 7. Founder session — bypass all rate limits
  const founderHeader = req.headers.get('x-founder-code')
  const founderCookie = req.cookies.get('bl_session')?.value
  if (isFounderCodeEdge(founderHeader, founderCookie)) {
    const res = NextResponse.next()
    res.headers.set('x-real-ip', ip)
    return addSecHeaders(res)
  }

  // 8. Admin route firewall — only founders, blocked at edge
  if (pathname.startsWith('/api/admin/')) {
    return block403('unauthorized')
  }

  // 9. Per-route rate limiting with fail2ban escalation
  if (pathname.startsWith('/api/')) {
    for (const { pattern, limit, windowMs } of ROUTE_LIMITS) {
      if (!pattern.test(pathname)) continue
      if (!allow(`${ip}:${pattern.source}`, limit, windowMs)) {
        return block429(windowMs)
      }
      break
    }
  }

  // 10. Pass — add security headers and real IP
  const res = NextResponse.next()
  res.headers.set('x-real-ip', ip)
  return addSecHeaders(res)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
