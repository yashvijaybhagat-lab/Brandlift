import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: user } = await sb.from('users').select('id').eq('email', session.user.email).single()
  if (!user) return NextResponse.json({ stores: [] })

  const { data: stores, error } = await sb
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stores })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, slug, description, theme, page_sections } = body

  if (!name || !slug) return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })

  const supabase = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: user } = await sb.from('users').select('id').eq('email', session.user.email).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: existing } = await sb.from('stores').select('id').eq('slug', slug).single()
  if (existing) return NextResponse.json({ error: 'This URL is already taken' }, { status: 409 })

  const { data: store, error } = await sb
    .from('stores')
    .insert({
      user_id: user.id,
      name,
      slug,
      description: description ?? null,
      theme: theme ?? 'minimal',
      page_sections: page_sections ?? [],
      is_published: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ store }, { status: 201 })
}
