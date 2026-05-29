import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'

const VERCEL_TOKEN      = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID
const VERCEL_TEAM_ID    = process.env.VERCEL_TEAM_ID

function toFlag(code: string) {
  return code.toUpperCase().replace(/./g, char =>
    String.fromCodePoint(char.charCodeAt(0) + 127397)
  )
}

function toCountryName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

async function fetchCountries() {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return null

  const now  = Date.now()
  const from = now - 30 * 24 * 60 * 60 * 1000 // last 30 days

  const params = new URLSearchParams({
    projectId: VERCEL_PROJECT_ID,
    from:      from.toString(),
    to:        now.toString(),
    group:     'country',
    filter:    '{}',
  })
  if (VERCEL_TEAM_ID) params.set('teamId', VERCEL_TEAM_ID)

  const res = await fetch(`https://vercel.com/api/web-analytics/data?${params}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    next:    { revalidate: 300 },
  })

  if (!res.ok) return null

  const json = await res.json()
  const raw: { key: string; total: number }[] = json.data ?? []

  const countries = raw
    .filter(c => c.key && c.key !== '(not set)' && c.key.length === 2)
    .sort((a, b) => b.total - a.total)
    .map(c => ({
      code:     c.key,
      name:     toCountryName(c.key),
      flag:     toFlag(c.key),
      visitors: c.total,
    }))

  return {
    countries,
    totalCountries: countries.length,
    totalVisitors:  countries.reduce((s, c) => s + c.visitors, 0),
    updatedAt:      new Date().toISOString(),
  }
}

// Public endpoint — returns country list + totals (no per-country counts)
// Founder endpoint — returns full data including visitor counts
export async function GET(req: NextRequest) {
  const auth = founderRequired(req)

  const data = await fetchCountries()

  if (!data) {
    return NextResponse.json(
      { configured: false, message: 'Set VERCEL_TOKEN and VERCEL_PROJECT_ID env vars' },
      { status: 200 }
    )
  }

  // Founders get full visitor counts; public gets only flags + total
  if (auth.authorized) {
    return NextResponse.json({ configured: true, ...data })
  }

  return NextResponse.json({
    configured:     true,
    totalCountries: data.totalCountries,
    totalVisitors:  data.totalVisitors,
    flags:          data.countries.slice(0, 30).map(c => ({ code: c.code, flag: c.flag, name: c.name })),
    updatedAt:      data.updatedAt,
  })
}
