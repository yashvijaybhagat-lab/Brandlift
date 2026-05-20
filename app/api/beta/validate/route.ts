import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { sanitizeCode } from '@/lib/sanitize'

const BETA_FEATURES  = ['4k', '1440p', 'enhancement', 'ai_captions', 'noise_reduce', 'smart_enhance']
const OWNER_FEATURES = [...BETA_FEATURES, 'analytics', 'backend_access', 'priority_support', 'unlimited_exports', 'custom_branding', 'team_access', 'early_access', 'raw_logs']

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true,
  sameSite: 'strict' as const,
  maxAge:   30 * 24 * 60 * 60, // 30 days
  path:     '/',
}

function withSession(code: string, body: object): NextResponse {
  const res = NextResponse.json(body)
  res.cookies.set('bl_session', code, COOKIE_OPTS)
  return res
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`beta:${ip}`, 5, 15 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const body = await req.json().catch(() => ({}))
  const raw  = sanitizeCode(body?.code)

  if (!raw.clean || !raw.value) {
    return NextResponse.json({ valid: false, message: 'Enter a valid code' })
  }

  const normalized = raw.value

  // ── Owner / founder codes ────────────────────────────────────
  const ownerCodeYB = (process.env.OWNER_CODE_YB ?? '').trim().toUpperCase()
  const ownerCodeAN = (process.env.OWNER_CODE_AN ?? '').trim().toUpperCase()

  if (ownerCodeYB && normalized === ownerCodeYB) {
    return withSession(normalized, {
      valid: true, role: 'owner', ownerName: 'Yash', features: OWNER_FEATURES,
      message: 'Founder access granted — welcome back, Yash',
    })
  }
  if (ownerCodeAN && normalized === ownerCodeAN) {
    return withSession(normalized, {
      valid: true, role: 'owner', ownerName: 'Ansh', features: OWNER_FEATURES,
      message: 'Founder access granted — welcome back, Ansh',
    })
  }

  // ── Beta codes (env + Blob) ───────────────────────────────────
  const envCodes   = (process.env.BETA_CODES ?? '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
  let   blobCodes: string[] = []
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { head } = await import('@vercel/blob')
      const info = await head('admin/beta-codes.json', { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => null)
      if (info) {
        const res  = await fetch(info.url)
        const data = await res.json()
        if (Array.isArray(data)) blobCodes = data.map(c => String(c).toUpperCase())
      }
    }
  } catch {}

  if ([...envCodes, ...blobCodes].includes(normalized)) {
    return withSession(normalized, {
      valid: true, role: 'beta', features: BETA_FEATURES, message: 'Beta access granted',
    })
  }

  return NextResponse.json({ valid: false, message: 'Invalid code — check with your BrandLift contact' })
}

// Clear the session cookie on sign-out
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('bl_session', '', { maxAge: 0, path: '/' })
  return res
}
