import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token || token === 'your_replicate_token') {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not configured.' },
      { status: 503 },
    )
  }

  const formData = await req.formData()
  const file = formData.get('video') as File | null
  const style = (formData.get('style') as string) ?? 'professional'

  if (!file) {
    return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
  }

  // 1. Store original in Vercel Blob
  let blobUrl: string
  try {
    const blob = await put(`videos/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })
    blobUrl = blob.url
  } catch {
    // If blob not configured, still try with Replicate Files API fallback
    const arrayBuffer = await file.arrayBuffer()
    const uploadForm = new FormData()
    uploadForm.append(
      'content',
      new Blob([arrayBuffer], { type: file.type }),
      file.name,
    )
    const uploadRes = await fetch('https://api.replicate.com/v1/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: uploadForm,
    })
    if (!uploadRes.ok) {
      return NextResponse.json({ error: 'Upload failed — configure Vercel Blob or reduce file size.' }, { status: 500 })
    }
    const uploadData = await uploadRes.json()
    blobUrl = uploadData.urls.get
  }

  // 2. Scale & model based on style
  const scale = style === 'cinematic' ? 2 : 4

  // 3. Create Replicate prediction
  const predRes = await fetch(
    'https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=5',
      },
      body: JSON.stringify({
        input: {
          video: blobUrl,
          scale,
          face_enhance: false,
          model: 'realesr-animevideov3',
        },
      }),
    },
  )

  if (!predRes.ok) {
    const err = await predRes.json().catch(() => ({ detail: predRes.statusText }))
    return NextResponse.json(
      { error: err.detail ?? 'Replicate API error' },
      { status: predRes.status },
    )
  }

  const prediction = await predRes.json()
  return NextResponse.json({
    id: prediction.id,
    status: prediction.status,
    originalUrl: blobUrl,
  })
}
