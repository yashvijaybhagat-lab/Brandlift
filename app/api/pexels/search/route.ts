import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

interface PexelsVideoFile {
  id: number
  quality: string
  file_type: string
  width: number
  height: number
  link: string
}

interface PexelsVideo {
  id: number
  width: number
  height: number
  duration: number
  url: string
  image: string
  user: { name: string }
  video_files: PexelsVideoFile[]
}

export async function GET(req: NextRequest) {
  const ip = getIp(req)
  const rl = rateLimit(`pexels:${ip}`, 60, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const key = process.env.PEXELS_API_KEY
  if (!key) return NextResponse.json({ error: 'PEXELS_API_KEY not configured' }, { status: 503 })

  const { searchParams } = req.nextUrl
  const query = searchParams.get('q')?.trim()
  const orientation = searchParams.get('orientation') ?? 'portrait'
  const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '12'), 24)

  if (!query) return NextResponse.json({ error: 'q is required' }, { status: 400 })

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}&size=medium`,
    { headers: { Authorization: key }, next: { revalidate: 300 } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: `Pexels error ${res.status}` }, { status: res.status })
  }

  const data = await res.json()

  const videos = (data.videos as PexelsVideo[]).map(v => {
    const files = v.video_files ?? []
    // Prefer HD portrait (tall), else any HD, else SD
    const portaitHd = files.find(f => f.quality === 'hd' && f.file_type === 'video/mp4' && f.height > f.width)
    const anyHd     = files.find(f => f.quality === 'hd' && f.file_type === 'video/mp4')
    const anySd     = files.find(f => f.quality === 'sd' && f.file_type === 'video/mp4')
    const best = portaitHd ?? anyHd ?? anySd ?? files[0]
    return {
      id: v.id,
      thumbnail: v.image,
      url: best?.link ?? '',
      width: best?.width ?? v.width,
      height: best?.height ?? v.height,
      duration: v.duration,
      photographer: v.user?.name ?? 'Pexels',
      pexelsUrl: v.url,
    }
  }).filter(v => v.url)

  return NextResponse.json({ videos, total: data.total_results ?? 0 })
}
