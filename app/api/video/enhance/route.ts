/**
 * 4K Enhancement pipeline — starts the AI upscale stage.
 *
 * Server-side stages (Replicate):
 *   1. upscale      — Real-ESRGAN video model (4× or 2× based on source resolution)
 *   2. face_restore — Built into the upscale call via face_enhance flag
 *
 * Client-side stages (canvas, happen during export):
 *   3. color        — S-curve, auto-WB, skin-tone protection
 *   4. sharpen      — Unsharp mask convolution (zero halos)
 *   5. export       — Per-platform variant at correct bitrate/resolution
 *
 * Quality gate: client sends before/after luma sample → server validates via GET /enhance/status/:id
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { type SourceAnalysis } from '@/lib/enhancePipeline'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Video upscaling via Replicate is temporarily unavailable.
  // nightmareai/real-esrgan only supports images, not video streams.
  // Return a clear message so the client shows "coming soon" instead of silently failing.
  return NextResponse.json(
    { error: 'Video enhancement is coming soon — your video exports at full original quality in the meantime.', code: 'ENHANCE_UNAVAILABLE' },
    { status: 503 },
  )
}
