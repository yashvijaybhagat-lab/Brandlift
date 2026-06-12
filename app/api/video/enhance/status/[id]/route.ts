/**
 * Pipeline status polling.
 *
 * Maps Replicate prediction states to pipeline stage progress.
 * Accepts optional quality gate data (before/after luma) to detect regressions.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { QUALITY_THRESHOLDS, type QualityGateResult } from '@/lib/enhancePipeline'

export const dynamic = 'force-dynamic'

// Quality gate — compare client-sampled luma values from a reference frame
function runQualityGate(params: {
  sourceLuma: number
  enhancedLuma: number
  flickerCount?: number
}): QualityGateResult {
  const { sourceLuma, enhancedLuma, flickerCount = 0 } = params
  const lumaDelta        = enhancedLuma - sourceLuma
  const regressionDrop   = lumaDelta < QUALITY_THRESHOLDS.maxLumaDrop
  const flickerFail      = flickerCount > QUALITY_THRESHOLDS.maxFlicker

  // Simplified SSIM approximation: penalise large luma swings from expected range
  const ssimApprox = Math.max(0, 1 - Math.abs(lumaDelta) / 80)

  const regressionDetected = regressionDrop || flickerFail || ssimApprox < QUALITY_THRESHOLDS.minSsim
  const passed = !regressionDetected

  return {
    passed,
    ssimApprox: parseFloat(ssimApprox.toFixed(3)),
    lumaDelta: parseFloat(lumaDelta.toFixed(1)),
    flickerCount,
    regressionDetected,
    recommendation: regressionDetected ? 'fallback_source' : 'proceed',
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const ip = getIp(req)
  const rl = await rateLimit(`enhance-status:${ip}`, 300, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 })
  }

  const { id } = await params
  if (!id || !/^[a-z0-9]{8,32}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid prediction ID' }, { status: 400 })
  }

  // Optional quality gate data from the client (luma averages sampled client-side)
  const url = new URL(req.url)
  const sourceLumaStr   = url.searchParams.get('sourceLuma')
  const enhancedLumaStr = url.searchParams.get('enhancedLuma')
  const flickerStr      = url.searchParams.get('flickerCount')

  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch prediction status' },
      { status: res.status >= 500 ? 502 : res.status },
    )
  }

  const prediction = await res.json()
  const status: string = prediction.status

  // Map Replicate status → pipeline stage + overall progress %
  let stage    = 'upscale'
  let progress = 5

  if (status === 'starting') {
    stage = 'upscale'; progress = 10
  } else if (status === 'processing') {
    // Replicate doesn't expose per-frame progress for this model.
    // Estimate based on time elapsed (logs field sometimes has frame counts).
    const logs: string = prediction.logs ?? ''
    const frameMatch = logs.match(/frame\s+(\d+)/i)
    if (frameMatch) {
      // Upscale stage is 15–65% of overall progress
      const framesStr = logs.match(/(\d+)\s+frames/i)
      if (framesStr) {
        const done  = parseInt(frameMatch[1])
        const total = parseInt(framesStr[1])
        const pct   = total > 0 ? Math.min((done / total) * 100, 100) : 50
        progress = Math.round(15 + pct * 0.5)   // maps 0–100% of upscale → 15–65% overall
      } else {
        progress = 40  // indeterminate mid-point
      }
    } else {
      progress = 30
    }
  } else if (status === 'succeeded') {
    stage    = 'color'   // upscale done; color/sharpen/export happen client-side
    progress = 70
  } else if (status === 'failed' || status === 'canceled') {
    return NextResponse.json({
      id: prediction.id,
      status,
      stage: 'upscale',
      progress: 0,
      error: prediction.error ?? 'Upscale failed',
      fallback: true,
    })
  }

  const outputUrl = status === 'succeeded'
    ? (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output)
    : undefined

  // Run quality gate only when we have both before/after luma measurements
  let qualityGate: QualityGateResult | null = null
  if (outputUrl && sourceLumaStr && enhancedLumaStr) {
    qualityGate = runQualityGate({
      sourceLuma:   parseFloat(sourceLumaStr),
      enhancedLuma: parseFloat(enhancedLumaStr),
      flickerCount: flickerStr ? parseInt(flickerStr) : 0,
    })
  }

  return NextResponse.json({
    id: prediction.id,
    status,
    stage,
    progress,
    outputUrl,
    qualityGate,
  })
}
