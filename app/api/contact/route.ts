import { NextResponse } from 'next/server'
import { sendContactEmail } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const b = (body ?? {}) as Record<string, unknown>
  const name = String(b.name ?? '').trim()
  const email = String(b.email ?? '').trim()
  const topic = String(b.topic ?? 'General question').trim() || 'General question'
  const message = String(b.message ?? '').trim()

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message is too long (5000 char max).' }, { status: 400 })
  }

  try {
    const res = await sendContactEmail({
      name: name.slice(0, 200),
      email: email.slice(0, 200),
      topic: topic.slice(0, 100),
      message,
    })
    if (res?.error) {
      console.error('[contact] resend error', res.error)
      return NextResponse.json(
        { error: 'Could not send right now — please email contact@brandlift.dev directly.' },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact] send failed', err)
    return NextResponse.json(
      { error: 'Could not send right now — please email contact@brandlift.dev directly.' },
      { status: 500 }
    )
  }
}
