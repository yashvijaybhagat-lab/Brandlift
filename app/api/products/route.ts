import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = req.nextUrl.searchParams.get('store_id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getServerSupabase() as any

  let q = sb.from('products').select('*').order('created_at', { ascending: false })
  if (storeId) q = q.eq('store_id', storeId)

  const { data: products, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { store_id, name, description, price, images, inventory, compare_at_price, variants } = body
  if (!store_id || !name || price == null) {
    return NextResponse.json({ error: 'store_id, name, and price are required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getServiceSupabase() as any
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { data: product, error } = await sb
    .from('products')
    .insert({
      store_id,
      name,
      slug,
      description: description ?? null,
      price: Number(price),
      compare_at_price: compare_at_price ? Number(compare_at_price) : null,
      images: images ?? [],
      inventory: inventory ?? null,
      is_available: true,
      variants: variants ?? [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product }, { status: 201 })
}
