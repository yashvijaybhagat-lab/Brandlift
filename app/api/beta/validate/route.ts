import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

// BETA_CODES env var — comma-separated list of valid access codes.
// Each code unlocks: 4k, 1440p, enhancement
// Example: BETA_CODES=BRANDLIFT4K,LAUNCH2026,EARLYBIRD

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`beta:${ip}`, 5, 15 * 60_000)  // 5/15min — brute-force guard
  if (!rl.success) return tooManyRequests(rl.reset)
  const { code } = await req.json().catch(() => ({ code: '' }))

  if (!code?.trim()) {
    return NextResponse.json({ valid: false, message: 'Enter a code' })
  }

  const raw       = process.env.BETA_CODES ?? 'BRANDLIFT4K,LAUNCH2026,EARLYBIRD2026,BETAACCESS'
  const validCodes = raw.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
  const normalized = (code as string).trim().toUpperCase()

  if (validCodes.includes(normalized)) {
    return NextResponse.json({
      valid:    true,
      features: ['4k', '1440p', 'enhancement'],
      message:  'Beta access granted',
    })
  }

  return NextResponse.json({ valid: false, message: 'Invalid code — check with your BrandLift contact' })
}
