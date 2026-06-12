import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`subscribe:${ip}`, 5, 15 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: { email?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { email } = body

  if (!email || typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const supabase = getServerSupabase()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!supabaseUrl.startsWith('http') || supabaseUrl.includes('your_supabase')) {
    return NextResponse.json({ ok: true }) // Supabase not configured, silently succeed
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('subscribers')
    .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email' })

  if (error) {
    console.error('Subscribe error:', error.message)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
