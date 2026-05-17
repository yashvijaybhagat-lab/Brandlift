import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

type Plan = 'free' | 'starter' | 'pro' | 'agency'

const AI_PLANS: Plan[] = ['pro', 'agency']

/**
 * Call at the top of any AI API route.
 * Returns { userId, plan } on success, or a NextResponse 401/403 to return immediately.
 */
export async function requireAiAccess(): Promise<
  { userId: string; plan: Plan; denied: false } | { denied: true; response: NextResponse }
> {
  const { userId } = await auth()

  if (!userId) {
    return {
      denied: true,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  const supabase = getServerSupabase()
  const { data: user, error } = await supabase
    .from('users')
    .select('plan')
    .eq('clerk_id', userId)
    .single()

  if (error || !user) {
    return {
      denied: true,
      response: NextResponse.json({ error: 'User not found' }, { status: 401 }),
    }
  }

  const plan = user.plan as Plan

  if (!AI_PLANS.includes(plan)) {
    return {
      denied: true,
      response: NextResponse.json(
        {
          error: 'AI features require a Pro or Agency plan.',
          plan,
          upgradeRequired: true,
        },
        { status: 403 }
      ),
    }
  }

  return { userId, plan, denied: false }
}
