/**
 * Next.js Edge Middleware — security, rate limiting, and hardening.
 * Runs at the CDN edge before any route handler.
 */

import { NextRequest, NextResponse } from 'next/server'

// ── Rate limit store (edge-compatible fixed-window) ───────────
const hits = new Map<string, { n: number; expires: number }>()

function allow(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = hits.get(key)
  if (!entry || now > entry.expires) { hits.set(key, { n: 1, expires: now + windowMs }); return true }
  if (entry.n >= limit) return false
  entry.n++
  return true
}

// ── Route-specific rate limits ────────────────────────────────
const ROUTE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/beta\/validate/,     limit: 5,   windowMs: 15 * 60_000 }, // brute-force guard
  { pattern: /^\/api\/admin\//,            limit: 60,  windowMs: 60_000       }, // admin endpoints
  { pattern: /^\/api\/video\/enhance/,     limit: 10,  windowMs: 60 * 60_000 }, // Replicate $$
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
  { pattern: /^\/api\//,                  limit: 120, windowMs: 60_000       },
]

// ── Founder bypass ────────────────────────────────────────────
function isFounderCodeEdge(code: string | null): boolean {
  if (!code) return false
  const n  = code.trim().toUpperCase()
  const yb = (process.env.OWNER_CODE_YB ?? '').trim().toUpperCase()
  const an = (process.env.OWNER_CODE_AN ?? '').trim().toUpperCase()
  return (!!yb && n === yb) || (!!an && n === an)
}

// ── Security headers ──────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options':           'DENY',
  'X-Content-Type-Options':    'nosniff',
  'X-XSS-Protection':          '1; mode=block',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' blob: https:; " +
    "connect-src 'self' https://generativelanguage.googleapis.com https://api.replicate.com https://api.pexels.com https://api.github.com; " +
    "frame-ancestors 'none';",
}

// ── Blocked user-agents (bots/scanners) ──────────────────────
const BLOCKED_UA_PATTERNS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zgrab/i,
  /python-requests\/[0-1]/i, /go-http-client\/1\.0/i,
  /curl\/[0-6]\./i, /libwww-perl/i, /harvest/i, /webshag/i,
]

// ── Suspicious path patterns (scanner probes) ─────────────────
const BLOCKED_PATH_PATTERNS = [
  /\.(php|asp|aspx|jsp|cgi|env|git|svn|htaccess|htpasswd|DS_Store)$/i,
  /\/(wp-admin|wp-login|phpmyadmin|adminer|shell|eval|exec|cmd)\b/i,
  /\/(\.\.\/|%2e%2e)/i, // path traversal
  /<script/i,            // XSS probe in URL
  /union.*select/i,      // SQLi probe
]

function ip(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd ? fwd.split(',')[0].trim() : 'anonymous'
}

function blocked429(retryMs: number) {
  return new NextResponse(
    JSON.stringify({ error: 'Too many requests — try again shortly.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(retryMs / 1000)) } }
  )
}

function blocked403(reason: string) {
  return new NextResponse(
    JSON.stringify({ error: 'Forbidden.' }),
    { status: 403, headers: { 'Content-Type': 'application/json', 'X-Block-Reason': reason } }
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const clientIp     = ip(req)

  // ── 1. Blocked path patterns (scanner / exploit probes) ──────
  if (BLOCKED_PATH_PATTERNS.some(p => p.test(pathname) || p.test(req.nextUrl.search))) {
    return blocked403('probe')
  }

  // ── 2. Blocked user-agents ────────────────────────────────────
  const ua = req.headers.get('user-agent') ?? ''
  if (BLOCKED_UA_PATTERNS.some(p => p.test(ua))) {
    return blocked403('ua')
  }

  // ── 3. Security headers on all responses ──────────────────────
  // We attach them after deciding whether to pass or block.
  // For rate-limit / block responses they're added inline above.

  // ── 4. Skip NextAuth internal routes ─────────────────────────
  if (pathname.startsWith('/api/auth/')) {
    const res = NextResponse.next()
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // ── 5. Non-API paths: just add security headers ───────────────
  if (!pathname.startsWith('/api/')) {
    const res = NextResponse.next()
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // ── 6. Admin routes: founder-only + extra rate limit ─────────
  if (pathname.startsWith('/api/admin/')) {
    const founderCode = req.headers.get('x-founder-code')
    if (!isFounderCodeEdge(founderCode)) {
      // Rate-limit unauthenticated probes of admin endpoints aggressively
      if (!allow(`admin:${clientIp}`, 10, 5 * 60_000)) return blocked403('admin-probe')
      return blocked403('unauthorized')
    }
  }

  // ── 7. Founder bypass for rate limits ────────────────────────
  if (isFounderCodeEdge(req.headers.get('x-founder-code'))) {
    const res = NextResponse.next()
    res.headers.set('x-real-ip', clientIp)
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // ── 8. Rate limiting ──────────────────────────────────────────
  for (const { pattern, limit, windowMs } of ROUTE_LIMITS) {
    if (!pattern.test(pathname)) continue
    if (!allow(`${clientIp}:${pattern.source}`, limit, windowMs)) {
      return blocked429(windowMs)
    }
    break
  }

  // ── 9. Pass — attach security headers and real IP ─────────────
  const res = NextResponse.next()
  res.headers.set('x-real-ip', clientIp)
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
