/**
 * Distributed sliding-window rate limiter backed by Redis.
 *
 * WHY REDIS: Vercel runs multiple serverless instances in parallel. An
 * in-memory Map is per-instance — a user can bypass a 40/hr limit by
 * hitting 4 instances 10 times each. Redis is one shared counter that
 * all instances write to atomically, so limits actually hold.
 *
 * FALLBACK: If REDIS_URL is not set (or the connection fails), the limiter
 * falls back to the in-memory store so the app never hard-crashes. The
 * fallback is noted in the server log so you know to fix it.
 *
 * PRODUCTION SETUP:
 *   1. Create a free Upstash Redis at https://console.upstash.com
 *   2. Copy the Redis URL (starts with redis:// or rediss://)
 *   3. Add REDIS_URL=<url> to Vercel environment variables
 *
 * LOCAL DEV:
 *   brew install redis && brew services start redis
 *   Add REDIS_URL=redis://localhost:6379 to .env.local
 *
 * MIDDLEWARE NOTE: Next.js middleware runs in the Edge runtime which
 * cannot use ioredis (Node.js-only). The middleware keeps its own
 * lightweight in-memory guard — acceptable because middleware limits
 * protect routing, not paid AI/API calls.
 */

import Redis from 'ioredis'

/* ── Redis connection (singleton, lazy) ─────────────────── */

let redis: Redis | null = null
let redisAvailable = false

function getRedis(): Redis | null {
  // Already tried and failed — don't retry on every request
  if (redis !== null) return redisAvailable ? redis : null

  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('[rateLimit] REDIS_URL not set — falling back to in-memory rate limiting (per-instance only)')
    redis = null
    return null
  }

  try {
    redis = new Redis(url, {
      // Fail fast — don't block requests waiting for a slow Redis
      connectTimeout: 2_000,
      commandTimeout: 1_000,
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      // TLS required for Upstash (rediss://) — ioredis handles this automatically
    })

    redis.on('ready', () => { redisAvailable = true })
    redis.on('error', (err) => {
      if (redisAvailable) {
        // Only log once per transition to avoid log spam
        console.error('[rateLimit] Redis error — falling back to in-memory:', err.message)
      }
      redisAvailable = false
    })
    redis.on('reconnecting', () => { redisAvailable = false })

    return redis
  } catch (err) {
    console.error('[rateLimit] Failed to create Redis client:', err)
    redis = null
    return null
  }
}

/* ── Lua script: atomic INCR + conditional PEXPIRE ─────── */
// Single round-trip, fully atomic (Redis is single-threaded).
// Returns the new count after increment.
const INCR_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count
`

/* ── In-memory fallback store ───────────────────────────── */

interface Entry { count: number; resetAt: number }
const memStore = new Map<string, Entry>()

// Prevent unbounded memory growth — purge expired keys every 5 minutes
if (typeof global !== 'undefined' && !(global as Record<string, unknown>).__rlCleanup) {
  ;(global as Record<string, unknown>).__rlCleanup = setInterval(() => {
    const now = Date.now()
    memStore.forEach((entry, key) => { if (now > entry.resetAt) memStore.delete(key) })
  }, 5 * 60_000)
}

function memRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now   = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    memStore.set(key, { count: 1, resetAt })
    return { success: true, limit, remaining: limit - 1, reset: Math.ceil(resetAt / 1000) }
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, reset: Math.ceil(entry.resetAt / 1000) }
  }

  entry.count++
  return { success: true, limit, remaining: limit - entry.count, reset: Math.ceil(entry.resetAt / 1000) }
}

/* ── Public interface ───────────────────────────────────── */

export interface RateLimitResult {
  success:   boolean
  limit:     number
  remaining: number
  reset:     number  // unix timestamp in seconds
}

/**
 * Check + increment a distributed rate limit bucket.
 *
 * Uses Redis when REDIS_URL is set; falls back to in-memory if Redis is
 * unavailable. The same key namespace works for both backends.
 *
 * @param key      Unique key e.g. `"smart-edit:1.2.3.4"`
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const client = getRedis()

  if (client && redisAvailable) {
    try {
      const count = await client.eval(INCR_SCRIPT, 1, key, String(windowMs)) as number
      const ttlMs = await client.pttl(key)
      const resetAt = ttlMs > 0
        ? Math.ceil((Date.now() + ttlMs) / 1000)
        : Math.ceil((Date.now() + windowMs) / 1000)

      return {
        success:   count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        reset:     resetAt,
      }
    } catch (err) {
      // Redis op failed mid-request — fall through to in-memory
      console.error('[rateLimit] Redis eval failed, using in-memory fallback:', (err as Error).message)
    }
  }

  // In-memory fallback (synchronous)
  return memRateLimit(key, limit, windowMs)
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
        'Content-Type':          'application/json',
        'Retry-After':           String(retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset':     String(reset),
      },
    },
  )
}
