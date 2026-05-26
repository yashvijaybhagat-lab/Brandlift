import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'
import { hfGetStatus } from '@/lib/higgsfield'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = founderRequired(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Founder access required' }, { status: 403 })
  }
  try {
    const data = await hfGetStatus(params.id)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    )
  }
}
