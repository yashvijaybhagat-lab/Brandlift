/**
 * Next.js Edge Middleware — Layer 1 rate limiting.
 * Runs before any route handler. Blocks flood attacks at the CDN edge
 * before they consume Lambda compute time.
 *
 * Layer 2 (per-route stricter limits) lives inside each route handler
 * using lib/rateLimit.ts.
 */

import { NextRequest, NextResponse } from 'next/server'

// Edge-compatible fixed-window store.
// Resets on instance restart — that's acceptable for the broad flood-protection
// role this layer plays. For strict cross-instance limiting use Upstash Redis.
const hits = new Map<string, { n: number; expires: number }>()

/** Returns true if the request is within the allowed rate. */
function allow(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = hits.get(key)
  if (!entry || now > entry.expires) {
    hits.set(key, { n: 1, expires: now + windowMs })
    return true
  }
  if (entry.n >= limit) return false
  entry.n++
  return true
}

// Route-specific caps (requests / window).
// These are the first gate; route handlers apply tighter per-feature limits.
const ROUTE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/beta\/validate/,    limit: 5,   windowMs: 15 * 60_000 }, // brute-force guard
  { pattern: /^\/api\/video\/enhance/,   limit: 10,  windowMs: 60 * 60_000 }, // Replicate $$
  { pattern: /^\/api\/video\/transcribe/,limit: 5,   windowMs: 60 * 60_000 }, // Replicate $$
  { pattern: /^\/api\/video\/script/,    limit: 20,  windowMs: 60 * 60_000 }, // Gemini quota
  { pattern: /^\/api\/ideas\/generate/,  limit: 20,  windowMs: 60 * 60_000 }, // Gemini quota
  { pattern: /^\/api\/hooks\/generate/,  limit: 30,  windowMs: 60 * 60_000 }, // Gemini quota
  { pattern: /^\/api\/script\/score/,    limit: 30,  windowMs: 60 * 60_000 }, // Gemini quota
  { pattern: /^\/api\/trends\/generate/, limit: 10,  windowMs: 60 * 60_000 }, // Gemini quota
  { pattern: /^\/api\/video\/post-copy/, limit: 20,  windowMs: 60 * 60_000 }, // Gemini quota
  { pattern: /^\/api\/pexels\//,          limit: 60,  windowMs: 60 * 60_000 }, // Pexels searches
  { pattern: /^\/api\/chat\/upload/,      limit: 20,  windowMs: 60 * 60_000 }, // file uploads
  { pattern: /^\/api\/chat/,             limit: 30,  windowMs: 60_000       }, // streaming abuse
  { pattern: /^\/api\//,                 limit: 120, windowMs: 60_000       }, // global fallback
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip non-API paths and NextAuth internal routes (OAuth redirects must not be blocked)
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Resolve real client IP — Vercel sets x-forwarded-for on every request
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous'

  // Apply the first matching route rule
  for (const { pattern, limit, windowMs } of ROUTE_LIMITS) {
    if (!pattern.test(pathname)) continue

    if (!allow(`${ip}:${pattern.source}`, limit, windowMs)) {
      const retryAfter = Math.ceil(windowMs / 1000)
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests — slow down and try again shortly.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After':  String(retryAfter),
          },
        },
      )
    }
    break
  }

  // Pass real IP downstream so route handlers don't need to re-parse headers
  const res = NextResponse.next()
  res.headers.set('x-real-ip', ip)
  return res
}

export const config = {
  matcher: '/api/:path*',
}
