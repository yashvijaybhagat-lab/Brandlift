import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { founderRequired } from '@/lib/founderAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('unsubscribed', false)

  if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json({ count: count ?? 0 })
}
