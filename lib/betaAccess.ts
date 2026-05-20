import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'bl_beta_v1'

export interface BetaState {
  unlocked:  boolean
  role:      'beta' | 'owner' | null
  ownerName: string | null
  features:  string[]
  code:      string
}

const DEFAULT: BetaState = { unlocked: false, role: null, ownerName: null, features: [], code: '' }

export function useBetaAccess() {
  const [state,   setState]   = useState<BetaState>(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setState(JSON.parse(saved))
    } catch {}
  }, [])

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
          role:      data.role ?? 'beta',
          ownerName: data.ownerName ?? null,
          features:  data.features ?? [],
          code,
        }
        setState(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
  }, [])

  const revoke = useCallback(() => {
    setState(DEFAULT)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const has     = useCallback((feature: string) => state.features.includes(feature), [state.features])
  const isOwner = state.role === 'owner'

  return { ...state, isOwner, loading, error, unlock, revoke, has }
}
