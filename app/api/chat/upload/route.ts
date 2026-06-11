import { NextRequest, NextResponse } from 'next/server'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-msvideo',
  'application/pdf', 'text/plain', 'text/csv',
]

export async function GET(request: NextRequest) {
  const ip = getIp(request)
  const rl = rateLimit(`chat-upload:${ip}`, 20, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('filename') ?? 'file'
  const contentType = searchParams.get('type') ?? 'application/octet-stream'

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 })
  }

  const ext = filename.includes('.') ? filename.split('.').pop()! : 'bin'
  const pathname = `chat/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const allowedType = ALLOWED_TYPES.includes(contentType) ? contentType : 'application/octet-stream'

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      pathname,
      allowedContentTypes: [allowedType, 'application/octet-stream'],
      maximumSizeInBytes: 100 * 1024 * 1024,
      addRandomSuffix: false,
    })
    return NextResponse.json({ clientToken, pathname })
  } catch {
    return NextResponse.json({ error: 'Failed to generate upload token' }, { status: 500 })
  }
}
