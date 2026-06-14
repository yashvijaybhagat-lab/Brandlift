/**
 * DELETE /api/user/delete — GDPR/CCPA "right to erasure" endpoint.
 *
 * Permanently deletes all personal data stored for the authenticated user:
 * - Vercel Blob: profile, videos list, saved ideas (everything under user-data/<email>/)
 * - Signs the user out after deletion (session invalidated client-side)
 *
 * NOTE: This does NOT cancel Stripe subscriptions automatically.
 * If the user has an active subscription, cancel it in Stripe dashboard
 * or add Stripe API call here. See manual-action note in the response.
 *
 * NextAuth does not store user data in a persistent DB by default (JWT sessions),
 * so no additional DB cleanup is required for the session itself.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { list, del } from '@vercel/blob'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const ip = getIp(req)
  // Tight limit — deletion is irreversible, prevent accidental loops
  const rl = await rateLimit(`user-delete:${ip}`, 3, 60 * 60_000)
  if (!rl.success) return tooManyRequests(rl.reset)

  const email = session.user.email
  const prefix = `user-data/${encodeURIComponent(email)}/`

  try {
    // List all blobs under this user's prefix
    let cursor: string | undefined
    const urlsToDelete: string[] = []

    do {
      const result = await list({ prefix, limit: 1000, cursor })
      urlsToDelete.push(...result.blobs.map(b => b.url))
      cursor = result.cursor
    } while (cursor)

    // Delete in batches of 100 (Vercel Blob API limit per call)
    for (let i = 0; i < urlsToDelete.length; i += 100) {
      await del(urlsToDelete.slice(i, i + 100))
    }

    return NextResponse.json({
      deleted: true,
      blobsDeleted: urlsToDelete.length,
      // Remind client to also sign out and clear local storage
      nextStep: 'sign_out',
      manualAction: urlsToDelete.length > 0
        ? 'If you have an active subscription, cancel it at stripe.com/billing to stop charges.'
        : null,
    })
  } catch (err) {
    console.error('[user/delete] Blob deletion failed:', err instanceof Error ? err.message : 'unknown')
    // Return generic error — do not leak internal details
    return NextResponse.json({ error: 'Deletion failed — please contact support@brandlift.dev' }, { status: 500 })
  }
}
