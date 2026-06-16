/**
 * Create a Replicate prediction with a single automatic retry on *transient*
 * failures (network error or 5xx). This is the "a retry usually helps" safety
 * net for Replicate cold starts / flaky upstream responses.
 *
 * It deliberately does NOT retry 4xx responses (including 404 "version retired"
 * and 429 rate-limit) — those are not transient and the caller handles them.
 */
export async function createReplicatePrediction(opts: {
  token: string
  body: Record<string, unknown>
  /** Replicate `Prefer: wait=<n>` seconds — hold the connection for sync completion. */
  waitSeconds?: number
  /** Number of retries after the first attempt (default 1 → 2 attempts total). */
  retries?: number
  /** Backoff between attempts, ms (default 1200). */
  backoffMs?: number
}): Promise<Response> {
  const { token, body, waitSeconds, retries = 1, backoffMs = 1200 } = opts

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (waitSeconds) headers.Prefer = `wait=${waitSeconds}`
  const payload = JSON.stringify(body)

  let lastResponse: Response | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers,
        body: payload,
      })
      // 2xx (created) or 4xx (client error: bad input, retired version, rate limit)
      // — return immediately; only 5xx is treated as transient.
      if (res.status < 500) return res
      lastResponse = res
    } catch {
      // Network-level failure — transient, fall through to retry.
      lastResponse = null
    }
    if (attempt < retries) await new Promise(r => setTimeout(r, backoffMs))
  }

  return (
    lastResponse ??
    new Response(JSON.stringify({ detail: 'Replicate API unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}
