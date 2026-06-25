import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// Database type definitions
// ─────────────────────────────────────────────

export interface DatabaseTables {
  subscribers: {
    Row: { id: string; email: string; subscribed_at: string }
    Insert: { id?: string; email: string; subscribed_at?: string }
    Update: Partial<DatabaseTables['subscribers']['Insert']>
  }
  users: {
    Row: {
      id: string
      email: string
      name: string | null
      avatar_url: string | null
      plan: 'free' | 'starter' | 'pro'
      stripe_customer_id: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      email: string
      name?: string | null
      avatar_url?: string | null
      plan?: 'free' | 'starter' | 'pro'
      stripe_customer_id?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: Partial<DatabaseTables['users']['Insert']>
  }
  stores: {
    Row: {
      id: string
      user_id: string
      name: string
      slug: string
      description: string | null
      logo_url: string | null
      banner_url: string | null
      theme: 'minimal' | 'bold' | 'luxury' | 'tech'
      theme_config: Record<string, unknown>
      custom_domain: string | null
      is_published: boolean
      page_sections: PageSection[]
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      user_id: string
      name: string
      slug: string
      description?: string | null
      logo_url?: string | null
      banner_url?: string | null
      theme?: 'minimal' | 'bold' | 'luxury' | 'tech'
      theme_config?: Record<string, unknown>
      custom_domain?: string | null
      is_published?: boolean
      page_sections?: PageSection[]
      created_at?: string
      updated_at?: string
    }
    Update: Partial<DatabaseTables['stores']['Insert']>
  }
  products: {
    Row: {
      id: string
      store_id: string
      name: string
      slug: string
      description: string | null
      price: number
      compare_at_price: number | null
      images: string[]
      inventory: number | null
      is_available: boolean
      variants: ProductVariant[]
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      store_id: string
      name: string
      slug: string
      description?: string | null
      price: number
      compare_at_price?: number | null
      images?: string[]
      inventory?: number | null
      is_available?: boolean
      variants?: ProductVariant[]
      created_at?: string
      updated_at?: string
    }
    Update: Partial<DatabaseTables['products']['Insert']>
  }
  orders: {
    Row: {
      id: string
      store_id: string
      customer_email: string
      customer_name: string
      items: OrderItem[]
      subtotal: number
      total: number
      status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
      shipping_address: ShippingAddress | null
      stripe_payment_intent: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      store_id: string
      customer_email: string
      customer_name: string
      items: OrderItem[]
      subtotal: number
      total: number
      status?: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
      shipping_address?: ShippingAddress | null
      stripe_payment_intent?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: Partial<DatabaseTables['orders']['Insert']>
  }
}

export interface PageSection {
  id: string
  type: 'hero' | 'features' | 'gallery' | 'testimonials' | 'cta' | 'text' | 'products'
  content: Record<string, unknown>
  order: number
}

export interface ProductVariant {
  id: string
  name: string
  options: string[]
  price_modifier?: number
}

export interface OrderItem {
  product_id: string
  product_name: string
  price: number
  quantity: number
  variant?: string
}

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country: string
}

export type Database = {
  public: {
    Tables: DatabaseTables
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─────────────────────────────────────────────
// Environment helpers
// ─────────────────────────────────────────────

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !url.startsWith('http') || url.includes('your_supabase')) {
    return 'https://placeholder.supabase.co'
  }
  return url
}

function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
}

// ─────────────────────────────────────────────
// Browser client (singleton)
// ─────────────────────────────────────────────

let browserClient: SupabaseClient<Database> | null = null

export function createBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient
  browserClient = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return browserClient
}

// ─────────────────────────────────────────────
// Server client
// ─────────────────────────────────────────────

export function createServerClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Service role client — bypasses RLS, use only in server API routes for writes
export function createServiceClient(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? getSupabaseAnonKey()
  return createClient<Database>(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const supabase = createBrowserClient()
export function getServerSupabase(): SupabaseClient<Database> { return createServerClient() }
export function getServiceSupabase(): SupabaseClient<Database> { return createServiceClient() }
