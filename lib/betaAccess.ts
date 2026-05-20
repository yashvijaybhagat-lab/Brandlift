import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const STORAGE_KEY = 'bl_beta_v1'

export interface BetaState {
  unlocked:  boolean
  role:      'beta' | 'owner' | null
  ownerName: string | null
  features:  string[]
  code:      string
}

const DEFAULT: BetaState = { unlocked: false, role: null, ownerName: null, features: [], code: '' }

function saveLocal(state: BetaState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function loadLocal(): BetaState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// Fire-and-forget server sync — doesn't block the UI
async function syncToServer(state: BetaState) {
  try {
    await fetch('/api/beta/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code:      state.code,
        role:      state.role,
        ownerName: state.ownerName,
        features:  state.features,
      }),
    })
  } catch {}
}

export function useBetaAccess() {
  const { data: session, status } = useSession()
  const [state,       setState]       = useState<BetaState>(DEFAULT)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [reenterOpen, setReenterOpen] = useState(false)

  // 1. Load from localStorage immediately, then reconcile with server
  useEffect(() => {
    const local = loadLocal()
    if (local) {
      setState(local)
      setLoading(false)
      return
    }
    // No local state — wait for session to restore from server
    if (status === 'loading') return
    if (status === 'unauthenticated') { setLoading(false); return }

    // Signed in but no localStorage — try to restore from server
    fetch('/api/beta/save')
      .then(r => r.json())
      .then(data => {
        if (data.saved) {
          const restored: BetaState = {
            unlocked:  true,
            role:      data.saved.role      ?? 'beta',
            ownerName: data.saved.ownerName ?? null,
            features:  data.saved.features  ?? [],
            code:      data.saved.code      ?? '',
          }
          setState(restored)
          saveLocal(restored)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  const unlock = useCallback(async (code: string): Promise<boolean> => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/beta/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.valid) {
        const next: BetaState = {
          unlocked:  true,
          role:      data.role      ?? 'beta',
          ownerName: data.ownerName ?? null,
          features:  data.features  ?? [],
          code,
        }
        setState(next)
        saveLocal(next)
        setReenterOpen(false)
        // Sync to server if signed in (fire-and-forget)
        if (session?.user?.email) syncToServer(next)
        return true
      }
      const msg = typeof data.message === 'string' ? data.message : (data.error ?? 'Invalid code')
      setError(typeof msg === 'string' ? msg : 'Invalid code')
      return false
    } catch {
      setError('Connection error — try again')
      return false
    } finally {
      setLoading(false)
    }
  }, [session])

  const revoke = useCallback(() => {
    setState(DEFAULT)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    // Remove from server too
    fetch('/api/beta/save', { method: 'DELETE' }).catch(() => {})
  }, [])

  // Opens the re-enter input without revoking current access
  const reenter = useCallback(() => {
    setReenterOpen(true)
    setError('')
  }, [])

  const cancelReenter = useCallback(() => {
    setReenterOpen(false)
    setError('')
  }, [])

  const has     = useCallback((feature: string) => state.features.includes(feature), [state.features])
  const isOwner = state.role === 'owner'

  return {
    ...state,
    isOwner,
    loading,
    error,
    reenterOpen,
    unlock,
    revoke,
    reenter,
    cancelReenter,
    has,
  }
}
