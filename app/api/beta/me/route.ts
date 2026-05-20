/**
 * GET /api/beta/me
 * Reads the httpOnly bl_session cookie and returns the session data.
 * Called by useBetaAccess() on mount to restore session without localStorage.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isFounderCode } from '@/lib/founderAuth'

export const dynamic = 'force-dynamic'

const BETA_FEATURES  = ['4k', '1440p', 'enhancement', 'ai_captions', 'noise_reduce', 'smart_enhance']
const OWNER_FEATURES = [...BETA_FEATURES, 'analytics', 'backend_access', 'priority_support', 'unlimited_exports', 'custom_branding', 'team_access', 'early_access', 'raw_logs']

export async function GET(req: NextRequest) {
  const code = req.cookies.get('bl_session')?.value
  if (!code) return NextResponse.json({ session: null })

  const normalized = code.trim().toUpperCase()

  // Check founder codes
  const founder = isFounderCode(normalized)
  if (founder.valid) {
    return NextResponse.json({
      session: {
        code,
        role:      'owner',
        ownerName: founder.ownerName,
        features:  OWNER_FEATURES,
      }
    })
  }

  // Check beta codes (env + blob)
  const raw       = process.env.BETA_CODES ?? ''
  const envCodes  = raw.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
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

  if (envCodes.includes(normalized) || blobCodes.includes(normalized)) {
    return NextResponse.json({
      session: {
        code,
        role:      'beta',
        ownerName: null,
        features:  BETA_FEATURES,
      }
    })
  }

  // Cookie exists but code is no longer valid — clear it
  const res = NextResponse.json({ session: null })
  res.cookies.set('bl_session', '', { maxAge: 0, path: '/' })
  return res
}
