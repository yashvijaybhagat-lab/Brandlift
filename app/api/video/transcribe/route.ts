import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WHISPER_VERSION = '4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2'

export async function POST(request: NextRequest) {
  const { videoUrl } = await request.json()
  if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
  if (!process.env.REPLICATE_API_TOKEN) return NextResponse.json({ error: 'Replicate not configured' }, { status: 503 })

  try {
    // Start Whisper prediction
    const startRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: WHISPER_VERSION,
        input: { audio: videoUrl, model: 'base', word_timestamps: true, language: 'en' },
      }),
    })
    if (!startRes.ok) throw new Error(`Replicate start failed: ${startRes.status}`)
    const prediction = await startRes.json()
    if (!prediction.id) throw new Error('No prediction ID')

    // Poll until done (max 50s)
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` },
      })
      const data = await pollRes.json()
      if (data.status === 'succeeded' && data.output) {
        const segments = parseToSegments(data.output)
        return NextResponse.json({ segments })
      }
      if (data.status === 'failed') throw new Error('Whisper transcription failed')
    }
    throw new Error('Transcription timed out')
  } catch (err) {
    console.error('[transcribe]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Transcription failed' }, { status: 500 })
  }
}

interface WhisperSegment { start: number; end: number; text: string }
interface WhisperOutput { segments?: WhisperSegment[]; text?: string }

function parseToSegments(output: WhisperOutput): { text: string; start: number; end: number }[] {
  if (output.segments && output.segments.length > 0) {
    // Merge short segments into ~6-word chunks
    const result: { text: string; start: number; end: number }[] = []
    let buf = ''
    let bufStart = 0
    for (const seg of output.segments) {
      const words = (seg.text.trim() + ' ' + buf).trim().split(/\s+/)
      if (words.length >= 5 || seg === output.segments[output.segments.length - 1]) {
        result.push({ text: (buf + ' ' + seg.text).trim(), start: bufStart || seg.start, end: seg.end })
        buf = ''; bufStart = 0
      } else {
        buf = (buf + ' ' + seg.text).trim()
        if (!bufStart) bufStart = seg.start
      }
    }
    return result.filter(s => s.text.length > 0)
  }
  // Fallback: split plain text into timed chunks
  if (output.text) {
    const words = output.text.trim().split(/\s+/)
    const chunks: { text: string; start: number; end: number }[] = []
    let t = 0.5
    for (let i = 0; i < words.length; i += 6) {
      const chunk = words.slice(i, i + 6).join(' ')
      const dur = chunk.split(' ').length * 0.42 + 0.3
      chunks.push({ text: chunk, start: t, end: t + dur })
      t += dur + 0.2
    }
    return chunks
  }
  return []
}
