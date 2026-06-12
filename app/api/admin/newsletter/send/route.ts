import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { sendProductUpdateEmail } from '@/lib/email'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { founderRequired } from '@/lib/founderAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = getIp(req)
  const rl = await rateLimit(`admin-newsletter:${ip}`, 5, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: { subject?: unknown; headline?: unknown; body?: unknown; ctaLabel?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subject, headline, body: emailBody, ctaLabel } = body
  if (
    typeof subject !== 'string' || subject.length < 3 || subject.length > 200 ||
    typeof headline !== 'string' || headline.length < 3 || headline.length > 200 ||
    typeof emailBody !== 'string' || emailBody.length < 10 || emailBody.length > 5000
  ) {
    return NextResponse.json({ error: 'subject, headline, and body are required (body max 5000 chars)' }, { status: 400 })
  }

  // Fetch all active subscribers
  const supabase = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('subscribers')
    .select('email')
    .eq('unsubscribed', false)

  if (error) {
    console.error('[newsletter/send] fetch subscribers:', error.message)
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  const emails: string[] = (data ?? []).map((r: { email: string }) => r.email)
  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No active subscribers' })
  }

  try {
    await sendProductUpdateEmail(
      emails,
      subject,
      headline,
      emailBody,
      typeof ctaLabel === 'string' ? ctaLabel : 'See it in action →'
    )
    return NextResponse.json({ sent: emails.length })
  } catch (err) {
    console.error('[newsletter/send] resend error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }
}
