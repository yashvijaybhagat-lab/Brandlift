import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  const token = process.env.REPLICATE_API_TOKEN
  if (!token || token === 'your_replicate_token') {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 })
  }

  const res = await fetch(
    `https://api.replicate.com/v1/predictions/${params.id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: res.status })
  }

  const data = await res.json()
  const output = Array.isArray(data.output) ? data.output[0] : data.output

  return NextResponse.json({
    id:     data.id,
    status: data.status,          // 'starting' | 'processing' | 'succeeded' | 'failed'
    output: output ?? null,
    error:  data.error ?? null,
  })
}
