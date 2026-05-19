/**
 * In-memory sliding-window rate limiter.
 * Works reliably for Node.js route handlers (warm Lambda instances on Vercel
 * are frequently reused, so the Map persists across requests from the same user).
 * For strictly distributed limiting across cold-starts, swap the store for
 * Upstash Redis (@upstash/ratelimit) — the call signature is identical.
 */

interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Prevent unbounded memory growth — purge expired keys every 5 minutes
if (typeof global !== 'undefined' && typeof (global as Record<string, unknown>).__rlCleanup === 'undefined') {
  ;(global as Record<string, unknown>).__rlCleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) if (now > entry.resetAt) store.delete(key)
  }, 5 * 60_000)
}

export interface RateLimitResult {
  success:   boolean
  limit:     number
  remaining: number
  reset:     number  // unix timestamp in seconds
}

/**
 * Check + increment a rate limit bucket.
 * @param key      Unique key e.g. `"script:1.2.3.4"`
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, limit, remaining: limit - 1, reset: Math.ceil(resetAt / 1000) }
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, reset: Math.ceil(entry.resetAt / 1000) }
  }

  entry.count++
  return { success: true, limit, remaining: limit - entry.count, reset: Math.ceil(entry.resetAt / 1000) }
}

/** Extract the real client IP, honouring Vercel's x-forwarded-for and the
 *  x-real-ip header set by our own middleware. */
export function getIp(req: Request): string {
  const realIp   = (req.headers as Headers).get('x-real-ip')
  if (realIp) return realIp
  const forwarded = (req.headers as Headers).get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'anonymous'
}

/** Build a standard 429 Response with Retry-After and X-RateLimit-* headers. */
export function tooManyRequests(reset: number): Response {
  const retryAfter = Math.max(1, reset - Math.floor(Date.now() / 1000))
  return new Response(
    JSON.stringify({ error: 'Too many requests — slow down and try again shortly.' }),
    {
      status: 429,
      headers: {
        'Content-Type':        'application/json',
        'Retry-After':         String(retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset':   String(reset),
      },
    },
  )
}
