import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export const dynamic = 'force-dynamic'

interface Review {
  id: string
  name: string
  business: string
  location: string
  result: string
  quote: string
  submittedAt: number
  status: string
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'reviews/', limit: 50 })

    const settled = await Promise.allSettled(
      blobs.map(b => fetch(b.url).then(r => r.ok ? r.json() as Promise<Review> : Promise.reject()))
    )

    const reviews = settled
      .filter((r): r is PromiseFulfilledResult<Review> => r.status === 'fulfilled' && r.value?.status === 'published')
      .map(r => r.value)
      .sort((a, b) => b.submittedAt - a.submittedAt)

    return NextResponse.json({ reviews })
  } catch {
    return NextResponse.json({ reviews: [] })
  }
}
