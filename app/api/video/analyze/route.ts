import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeSource } from '@/lib/enhancePipeline'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const ip = getIp(req)
  const rl = await rateLimit(`video-analyze:${ip}`, 60, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: {
    width: number
    height: number
    fps: number
    duration: number
    fileSize?: number
    avgLuma?: number
    hasFaces?: boolean
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { width, height, fps, duration, fileSize, avgLuma, hasFaces } = body

  if (
    typeof width !== 'number' || typeof height !== 'number' ||
    typeof fps !== 'number' || typeof duration !== 'number' ||
    width <= 0 || height <= 0 || fps <= 0 || duration <= 0
  ) {
    return NextResponse.json({ error: 'width, height, fps, duration are required positive numbers' }, { status: 400 })
  }

  const analysis = analyzeSource({
    width: Math.round(width),
    height: Math.round(height),
    fps: Math.min(fps, 120),
    duration: Math.min(duration, 7200),
    fileSize,
    avgLuma,
    hasFaces,
  })

  return NextResponse.json({ analysis })
}
