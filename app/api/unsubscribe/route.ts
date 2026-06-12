import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t')
  if (!token) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  let email: string
  try {
    email = Buffer.from(token, 'base64url').toString('utf-8')
    if (!email.includes('@')) throw new Error('bad email')
  } catch {
    return new NextResponse('Invalid unsubscribe link.', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  const supabase = getServerSupabase()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (supabaseUrl.startsWith('http') && !supabaseUrl.includes('your_supabase')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('subscribers')
      .update({ unsubscribed: true })
      .eq('email', email.toLowerCase())
  }

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Unsubscribed</title></head>
    <body style="margin:0;padding:60px 20px;background:#0a0a0b;font-family:-apple-system,sans-serif;text-align:center;">
      <div style="max-width:420px;margin:0 auto;">
        <div style="font-size:20px;font-weight:800;color:#6366f1;margin-bottom:24px;">BrandLift</div>
        <h1 style="font-size:22px;font-weight:700;color:#fafafa;margin:0 0 12px;">You're unsubscribed.</h1>
        <p style="font-size:15px;color:#71717a;line-height:1.6;margin:0 0 28px;">
          You won't receive any more emails from us.<br/>Changed your mind?
          <a href="https://brandlift.dev" style="color:#818cf8;">Come back anytime.</a>
        </p>
      </div>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}
