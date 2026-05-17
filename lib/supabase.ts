import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// Database type definitions
// ─────────────────────────────────────────────

export interface DatabaseTables {
  subscribers: {
    Row: {
      id: string
      email: string
      subscribed_at: string
    }
    Insert: {
      id?: string
      email: string
      subscribed_at?: string
    }
    Update: Partial<DatabaseTables['subscribers']['Insert']>
  }
  users: {
    Row: {
      id: string
      clerk_id: string
      email: string
      created_at: string
      updated_at: string
      stripe_customer_id: string | null
      plan: 'free' | 'starter' | 'pro' | 'agency'
    }
    Insert: {
      id?: string
      clerk_id: string
      email: string
      created_at?: string
      updated_at?: string
      stripe_customer_id?: string | null
      plan?: 'free' | 'starter' | 'pro' | 'agency'
    }
    Update: Partial<DatabaseTables['users']['Insert']>
  }
  businesses: {
    Row: {
      id: string
      user_id: string
      name: string
      description: string | null
      audience: string | null
      location: string | null
      services: string[]
      differentiator: string | null
      tone: string | null
      platforms: string[]
      style: string | null
      logo_url: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      user_id: string
      name: string
      description?: string | null
      audience?: string | null
      location?: string | null
      services?: string[]
      differentiator?: string | null
      tone?: string | null
      platforms?: string[]
      style?: string | null
      logo_url?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: Partial<DatabaseTables['businesses']['Insert']>
  }
  content_pieces: {
    Row: {
      id: string
      business_id: string
      platform: string
      content_type: string
      body: string
      status: 'draft' | 'approved' | 'published' | 'archived'
      scheduled_at: string | null
      published_at: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      business_id: string
      platform: string
      content_type: string
      body: string
      status?: 'draft' | 'approved' | 'published' | 'archived'
      scheduled_at?: string | null
      published_at?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: Partial<DatabaseTables['content_pieces']['Insert']>
  }
  brand_assets: {
    Row: {
      id: string
      business_id: string
      type: 'logo' | 'banner' | 'photo' | 'icon'
      url: string
      alt_text: string | null
      created_at: string
    }
    Insert: {
      id?: string
      business_id: string
      type: 'logo' | 'banner' | 'photo' | 'icon'
      url: string
      alt_text?: string | null
      created_at?: string
    }
    Update: Partial<DatabaseTables['brand_assets']['Insert']>
  }
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
  // Return a no-op placeholder if not configured so builds don't crash
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
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}

// ─────────────────────────────────────────────
// Server client (new instance per request — no singleton)
// ─────────────────────────────────────────────

export function createServerClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// ─────────────────────────────────────────────
// Convenience exports
// ─────────────────────────────────────────────

/** Use in client components */
export const supabase = createBrowserClient()

/** Use in server components / API routes */
export function getServerSupabase(): SupabaseClient<Database> {
  return createServerClient()
}
