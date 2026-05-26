/**
 * Starts a Whisper transcription job on Replicate.
 * Returns segments immediately if Replicate finishes within 25s (Prefer: wait),
 * otherwise returns { id, status } so the client can poll /api/video/status/[id].
 */
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

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
  const rl = rateLimit(`transcribe:${ip}`, 5, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const { videoUrl } = await request.json()
  if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'Replicate not configured' }, { status: 503 })
  }

  try {
    const res = await fetch('https://api.replicate.com/v1/models/openai/whisper/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=25',
      },
      body: JSON.stringify({
        input: { audio: videoUrl, model: 'base', word_timestamps: true, language: 'en' },
      }),
    })

    if (!res.ok) throw new Error(`Replicate error ${res.status}`)
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
