import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'bl_beta_v1'

export interface BetaState {
  unlocked: boolean
  features: string[]
  code:     string
}

const DEFAULT: BetaState = { unlocked: false, features: [], code: '' }

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
        const next: BetaState = { unlocked: true, features: data.features ?? [], code }
        setState(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return true
      }
      // Always coerce to string — unexpected server responses can return non-string message
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

  // Check if a specific feature is unlocked
  const has = useCallback((feature: string) => state.features.includes(feature), [state.features])

  return { ...state, loading, error, unlock, revoke, has }
}
