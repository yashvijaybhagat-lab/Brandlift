import { NextRequest, NextResponse } from 'next/server'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { getServerSession } from 'next-auth'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const ALLOWED_EXTS = new Set(['mp4', 'mov', 'avi', 'webm', 'mkv', 'qt'])

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to upload videos' }, { status: 401 })
  }

  const ip = getIp(request)
  const rl = await rateLimit(`video-upload:${ip}`, 20, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 })
  }

  const url = new URL(request.url)
  const filename = url.searchParams.get('filename') ?? 'video.mp4'
  const rawExt = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : 'mp4'
  const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : 'mp4'
  const pathname = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      pathname,
      allowedContentTypes: [
        'video/mp4',
        'video/quicktime',
        'video/mov',
        'video/avi',
        'video/webm',
        'video/x-msvideo',
        'video/x-matroska',
      ],
      maximumSizeInBytes: 500 * 1024 * 1024,
      addRandomSuffix: false,
    })
    return NextResponse.json({ clientToken, pathname })
  } catch (err) {
    console.error('[video/upload] token error:', err)
    return NextResponse.json({ error: 'Failed to generate upload token' }, { status: 500 })
  }
}
