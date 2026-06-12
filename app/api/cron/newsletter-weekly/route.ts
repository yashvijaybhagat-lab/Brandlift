import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { sendWeeklyTipEmail, WEEKLY_TIPS } from '@/lib/email'
import { put, head } from '@vercel/blob'

export const dynamic = 'force-dynamic'

const STATE_KEY = 'system/newsletter-tip-index.json'

async function getTipIndex(): Promise<number> {
  try {
    const blob = await head(STATE_KEY)
    if (!blob) return 0
    const res = await fetch(blob.url)
    const data = await res.json()
    return typeof data.index === 'number' ? data.index : 0
  } catch {
    return 0
  }
}

async function saveTipIndex(index: number) {
  await put(STATE_KEY, JSON.stringify({ index }), { access: 'public', addRandomSuffix: false })
}

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or an admin with the secret)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('subscribers')
    .select('email')
    .eq('unsubscribed', false)

  if (error) {
    console.error('[cron/newsletter-weekly] fetch subscribers:', error.message)
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  const emails: string[] = (data ?? []).map((r: { email: string }) => r.email)
  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No subscribers' })
  }

  const tipIndex = await getTipIndex()
  const tip = WEEKLY_TIPS[tipIndex % WEEKLY_TIPS.length]

  try {
    await sendWeeklyTipEmail(emails, tip)
    await saveTipIndex(tipIndex + 1)
    return NextResponse.json({ sent: emails.length, tipIndex, tipSubject: tip.subject })
  } catch (err) {
    console.error('[cron/newsletter-weekly] send failed:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
