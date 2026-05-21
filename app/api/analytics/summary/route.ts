import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'

const VERCEL_TOKEN      = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID
const VERCEL_TEAM_ID    = process.env.VERCEL_TEAM_ID

async function fetchGroup(group: string, from: number, to: number) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return []
  const params = new URLSearchParams({
    projectId: VERCEL_PROJECT_ID,
    from: from.toString(),
    to: to.toString(),
    group,
    filter: '{}',
  })
  if (VERCEL_TEAM_ID) params.set('teamId', VERCEL_TEAM_ID)

  try {
    const res = await fetch(`https://vercel.com/api/web-analytics/data?${params}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json.data ?? []) as { key: string; total: number }[]
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const auth = founderRequired(req)
  if (!auth.authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return NextResponse.json({ configured: false })
  }

  const now  = Date.now()
  const from = now - 30 * 24 * 60 * 60 * 1000

  const [pages, devices, browsers] = await Promise.all([
    fetchGroup('page',    from, now),
    fetchGroup('device',  from, now),
    fetchGroup('browser', from, now),
  ])

  const totalViews = pages.reduce((s, p) => s + p.total, 0)

  return NextResponse.json({
    configured: true,
    totalViews,
    topPages:   pages.sort((a, b) => b.total - a.total).slice(0, 10),
    devices:    devices.sort((a, b) => b.total - a.total),
    browsers:   browsers.sort((a, b) => b.total - a.total).slice(0, 6),
    updatedAt:  new Date().toISOString(),
  })
}
