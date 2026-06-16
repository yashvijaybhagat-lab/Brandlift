/**
 * Starts a Whisper transcription job on Replicate.
 * Returns segments immediately if Replicate finishes within 25s (Prefer: wait),
 * otherwise returns { id, status } so the client can poll /api/video/status/[id].
 */
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
// Hold the function long enough for Replicate's `Prefer: wait` window (25s) plus
// network overhead. Without this the request can be killed mid-wait and "hang".
export const maxDuration = 60

// Pinned openai/whisper version. Overridable via env so a retired Replicate
// version can be swapped without a redeploy.
const WHISPER_VERSION = process.env.WHISPER_VERSION || 'cdd97b257f93cb89dede1c7584e3d3a170fbb0ec'

interface WSegment { start: number; end: number; text: string }
interface WOutput  { segments?: WSegment[]; transcription?: string; text?: string }

function parseToSegments(output: WOutput): { text: string; start: number; end: number }[] {
  const segs = output?.segments ?? []
  if (segs.length > 0) {
    const result: { text: string; start: number; end: number }[] = []
    let buf = '', bufStart = 0
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const merged = (buf + ' ' + seg.text.trim()).trim()
      const wordCount = merged.split(/\s+/).length
      if (wordCount >= 5 || i === segs.length - 1) {
        if (merged) result.push({ text: merged, start: bufStart || seg.start, end: seg.end })
        buf = ''; bufStart = 0
      } else {
        buf = merged
        if (!bufStart) bufStart = seg.start
      }
    }
    return result.filter(s => s.text.length > 0)
  }
  const text = output?.transcription ?? output?.text ?? ''
  if (!text) return []
  const words = text.trim().split(/\s+/)
  let t = 0.5
  const chunks: { text: string; start: number; end: number }[] = []
  for (let i = 0; i < words.length; i += 6) {
    const chunk = words.slice(i, i + 6).join(' ')
    const dur = chunk.split(' ').length * 0.42 + 0.3
    chunks.push({ text: chunk, start: t, end: t + dur })
    t += dur + 0.2
  }
  return chunks
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  const rl = await rateLimit(`transcribe:${ip}`, 5, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  const { videoUrl } = await request.json()
  if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'Replicate not configured' }, { status: 503 })
  }

  try {
    // Use the versioned endpoint — the model-deployment endpoint (/v1/models/.../predictions)
    // returns 404 when the model has no public deployment; the versioned endpoint is stable.
    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=25',
      },
      body: JSON.stringify({
        version: WHISPER_VERSION,
        input: { audio: videoUrl, model: 'base', word_timestamps: true, language: 'en' },
      }),
    })

    if (!res.ok) {
      if (res.status === 404) {
        // Model version unavailable — caller will fall back to script captions
        return NextResponse.json({ error: 'whisper_unavailable' }, { status: 503 })
      }
      throw new Error(`Replicate error ${res.status}`)
    }
    const prediction = await res.json()

    // Completed within the wait window
    if ((prediction.status === 'succeeded' || prediction.status === 'completed') && prediction.output) {
      const segments = parseToSegments(prediction.output as WOutput)
      return NextResponse.json({ segments, id: prediction.id })
    }

    // Still processing — client polls /api/video/status/[id]
    if (prediction.id) {
      return NextResponse.json({ id: prediction.id, status: prediction.status ?? 'starting' })
    }

    throw new Error('No prediction ID returned')
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Transcription failed' }, { status: 500 })
  }
}
