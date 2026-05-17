import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname) => ({
        allowedContentTypes: [
          'video/mp4',
          'video/quicktime',
          'video/mov',
          'video/avi',
          'video/webm',
          'video/x-msvideo',
          'video/x-matroska',
        ],
        maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
        addRandomSuffix: true,
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[video/upload] upload complete:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[video/upload] error:', error)
    return NextResponse.json(
      { error: (error as Error).message ?? 'Upload token generation failed' },
      { status: 400 },
    )
  }
}
