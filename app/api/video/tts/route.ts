import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'

export const maxDuration = 60

function extractAudioUrl(output: unknown): string | null {
  if (!output) return null
  if (typeof output === 'string') return output
  if (Array.isArray(output)) return typeof output[0] === 'string' ? output[0] : null
  if (typeof output === 'object') {
    const o = output as Record<string, unknown>
    if (typeof o.audio_out === 'string') return o.audio_out
    if (typeof o.url === 'string') return o.url
  }
  return null
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`tts:${ip}`, 8, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  const token = process.env.REPLICATE_API_TOKEN
  if (!token || token === 'your_replicate_token') {
    return NextResponse.json({ error: 'Replicate not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const text: string = (body.text ?? '').trim().slice(0, 500)
  const voice: string = body.voice ?? 'v2/en_speaker_6'

  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const res = await fetch('https://api.replicate.com/v1/models/suno-ai/bark/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=30',
    },
    body: JSON.stringify({
      input: {
        prompt: text,
        history_prompt: voice,
        text_temp: 0.7,
        waveform_temp: 0.7,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    return NextResponse.json({ error: err.detail ?? 'Replicate error' }, { status: res.status })
  }

  const prediction = await res.json()

  if (prediction.status === 'succeeded' || prediction.status === 'completed') {
    const url = extractAudioUrl(prediction.output)
    if (url) return NextResponse.json({ url })
  }

  if (prediction.id) {
    return NextResponse.json({ id: prediction.id, status: prediction.status ?? 'starting' })
  }

  return NextResponse.json({ error: 'No prediction ID returned' }, { status: 500 })
}
