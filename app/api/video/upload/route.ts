import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'video/mp4',
          'video/quicktime',
          'video/mov',
          'video/avi',
          'video/webm',
        ],
        maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[video/upload] uploaded:', blob.url)
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}
