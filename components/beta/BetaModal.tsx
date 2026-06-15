'use client'
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Lock, X, CheckCircle2 } from 'lucide-react'
import { useBetaAccess } from '@/lib/betaAccess'

/* ─── Context ─────────────────────────────────────────────────────────────── */

interface BetaModalContextValue {
  openBetaModal: (featureLabel?: string) => void
}

const BetaModalContext = createContext<BetaModalContextValue>({ openBetaModal: () => {} })

export function useBetaModal() {
  return useContext(BetaModalContext)
}

/* ─── Provider + Modal ────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: '✦', label: '4K & 2K export',   desc: 'Ultra-high resolution output' },
  { icon: '⬆', label: 'AI Enhancement',   desc: 'Replicate upscaling on every clip' },
  { icon: '',  label: 'Audio Captions',    desc: 'Whisper AI auto-sync to speech' },
  { icon: '✦', label: 'Noise Reduction',  desc: 'Clarity boost in Color tab' },
]

export function BetaModalProvider({ children }: { children: React.ReactNode }) {
  const beta = useBetaAccess()
  const [open, setOpen] = useState(false)
  const [featureLabel, setFeatureLabel] = useState<string | undefined>()
  const [code, setCode] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const openBetaModal = useCallback((label?: string) => {
    setFeatureLabel(label)
    setCode('')
    setSuccess(false)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function handleUnlock() {
    if (!code.trim()) return
    const ok = await beta.unlock(code.trim())
    if (ok) {
      setSuccess(true)
      setTimeout(() => setOpen(false), 1400)
    }
  }

  if (!open) {
    return (
      <BetaModalContext.Provider value={{ openBetaModal }}>
        {children}
      </BetaModalContext.Provider>
    )
  }

  return (
    <BetaModalContext.Provider value={{ openBetaModal }}>
      {children}

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        aria-hidden
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Unlock beta access"
        style={{
          position: 'fixed', zIndex: 9999,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(420px, calc(100vw - 32px))',
          background: '#111118',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(139,92,246,0.12)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock style={{ width: 15, height: 15, color: '#a78bfa' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#e4e4f0', margin: 0, letterSpacing: '-0.02em' }}>
                {featureLabel ? `${featureLabel} is a beta feature` : 'Unlock Beta Access'}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, marginTop: 2 }}>
                Enter your code to unlock all beta features
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ color: '#52525b', background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
            aria-label="Close"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(139,92,246,0.06)',
              border: '0.5px solid rgba(139,92,246,0.14)',
            }}>
              <span style={{ fontSize: 12, color: '#8b5cf6', flexShrink: 0, lineHeight: 1.5 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', margin: 0 }}>{f.label}</p>
                <p style={{ fontSize: 10, color: '#52525b', margin: 0, marginTop: 2, lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input row */}
        {!success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); beta.error && beta.unlock('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleUnlock() }}
                placeholder="ENTER BETA CODE"
                maxLength={32}
                spellCheck={false}
                autoComplete="off"
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: beta.error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 10,
                  color: '#c4b5fd',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  fontFamily: 'ui-monospace, monospace',
                  padding: '11px 14px',
                  outline: 'none',
                  transition: 'border-color 150ms ease',
                }}
                onFocus={e => { if (!beta.error) e.currentTarget.style.borderColor = 'rgba(139,92,246,0.65)' }}
                onBlur={e => { if (!beta.error) e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)' }}
              />
              <button
                onClick={handleUnlock}
                disabled={beta.loading || !code.trim()}
                style={{
                  padding: '11px 20px',
                  borderRadius: 10,
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  color: '#c4b5fd',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: beta.loading || !code.trim() ? 'not-allowed' : 'pointer',
                  opacity: !code.trim() ? 0.5 : 1,
                  transition: 'all 150ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {beta.loading ? '…' : 'Unlock'}
              </button>
            </div>
            {beta.error && (
              <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.85)', margin: 0, fontWeight: 500 }}>
                {beta.error}
              </p>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 12,
            background: 'rgba(74,222,128,0.06)',
            border: '1px solid rgba(74,222,128,0.2)',
          }}>
            <CheckCircle2 style={{ width: 16, height: 16, color: '#4ade80', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#4ade80', margin: 0, fontWeight: 500 }}>
              Beta access unlocked — enjoy all features!
            </p>
          </div>
        )}
      </div>
    </BetaModalContext.Provider>
  )
}
