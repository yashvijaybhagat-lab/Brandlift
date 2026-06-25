import { notFound } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase'
import { StorefrontClient } from './StorefrontClient'

interface Props {
  params: Promise<{ store: string }>
}

export default async function StorefrontPage({ params }: Props) {
  const { store: slug } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServerSupabase() as any

  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !store) {
    notFound()
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  return <StorefrontClient store={store} products={products ?? []} />
}

export async function generateMetadata({ params }: Props) {
  const { store: slug } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServerSupabase() as any
  const { data: store } = await supabase.from('stores').select('name, description').eq('slug', slug).single()
  return {
    title: store?.name ?? 'Store',
    description: store?.description ?? 'Shop this store on BrandLift.',
  }
}
