import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { founderRequired } from '@/lib/founderAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = founderRequired(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Founder access required' }, { status: 403 })
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF images are allowed' }, { status: 400 })
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 20 MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const pathname = `higgsfield/input/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const blob = await put(pathname, file, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN })
  return NextResponse.json({ url: blob.url })
}
