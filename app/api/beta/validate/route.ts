import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

// BETA_CODES env var — comma-separated list of valid access codes.
// OWNER_CODE_YB / OWNER_CODE_AN — founder codes (set in .env.local, never commit)

const BETA_FEATURES  = ['4k', '1440p', 'enhancement', 'ai_captions', 'noise_reduce', 'smart_enhance']
const OWNER_FEATURES = [...BETA_FEATURES, 'analytics', 'backend_access', 'priority_support', 'unlimited_exports', 'custom_branding', 'team_access', 'early_access', 'raw_logs']

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`beta:${ip}`, 5, 15 * 60_000)  // 5/15min — brute-force guard
  if (!rl.success) return tooManyRequests(rl.reset)
  const { code } = await req.json().catch(() => ({ code: '' }))

  if (!code?.trim()) {
    return NextResponse.json({ valid: false, message: 'Enter a code' })
  }

  const normalized = (code as string).trim().toUpperCase()

  // ── Owner / founder codes (checked before beta codes) ───────────────────────
  const ownerCodeYB = (process.env.OWNER_CODE_YB ?? '').trim().toUpperCase()
  const ownerCodeAN = (process.env.OWNER_CODE_AN ?? '').trim().toUpperCase()

  if (ownerCodeYB && normalized === ownerCodeYB) {
    return NextResponse.json({
      valid:     true,
      role:      'owner',
      ownerName: 'Yash',
      features:  OWNER_FEATURES,
      message:   'Founder access granted — welcome back, Yash',
    })
  }
  if (ownerCodeAN && normalized === ownerCodeAN) {
    return NextResponse.json({
      valid:     true,
      role:      'owner',
      ownerName: 'Ansh',
      features:  OWNER_FEATURES,
      message:   'Founder access granted — welcome back, Ansh',
    })
  }

  // ── Beta codes (env + Blob-stored dynamic codes) ────────────────────────────
  const raw        = process.env.BETA_CODES ?? 'BRANDLIFT4K,LAUNCH2026,EARLYBIRD2026,BETAACCESS'
  const envCodes   = raw.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)

  // Check Blob-stored dynamic codes added via admin panel
  let dynamicCodes: string[] = []
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { head } = await import('@vercel/blob')
      const info = await head('admin/beta-codes.json', { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => null)
      if (info) {
        const res  = await fetch(info.url)
        const data = await res.json()
        if (Array.isArray(data)) dynamicCodes = data.map(c => String(c).toUpperCase())
      }
    }
  } catch {}

  if ([...envCodes, ...dynamicCodes].includes(normalized)) {
    return NextResponse.json({
      valid:    true,
      role:     'beta',
      features: BETA_FEATURES,
      message:  'Beta access granted',
    })
  }

  return NextResponse.json({ valid: false, message: 'Invalid code — check with your BrandLift contact' })
}
