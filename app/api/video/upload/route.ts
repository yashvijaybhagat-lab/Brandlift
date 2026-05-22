import { NextRequest, NextResponse } from 'next/server'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const filename = url.searchParams.get('filename') ?? 'video.mp4'
  const ext = filename.includes('.') ? filename.split('.').pop()! : 'mp4'
  // Construct a unique pathname for Vercel Blob, ensuring it's a file path.
  const pathname = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 })
  }

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
      maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
      addRandomSuffix: false, // We're already creating a unique pathname
    })
    // The response now includes the full upload URL directly, not just the token.
    // This simplifies the client-side upload process.
    return NextResponse.json({
      clientToken: clientToken.token, // The actual upload token
      uploadUrl: clientToken.url,     // The direct upload URL
      pathname,                       // The final path in the blob storage
    })
  } catch (err) {
    console.error('[video/upload] token error:', err)
    return NextResponse.json({ error: 'Failed to generate upload token' }, { status: 500 })
  }
}
