'use client'

import { useEffect, useState } from 'react'
import { useBetaAccess } from '@/lib/betaAccess'
import { getDebugMode, setDebugMode, subscribeDebug } from '@/lib/debugMode'

const LYRA_SESSION_KEY = 'bl_lyra_session'

export function FounderBar() {
  const beta = useBetaAccess()
  const [debug, setDebug] = useState(false)
  const [model, setModel] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDebug(getDebugMode())
    try {
      const sess = JSON.parse(localStorage.getItem(LYRA_SESSION_KEY) ?? '{}')
      if (sess.model) setModel(sess.model)
    } catch {}
    return subscribeDebug(setDebug)
  }, [])

  const toggleDebug = () => setDebugMode(!debug)

  if (!mounted || !beta.isOwner) return null

  return (
    <>
      <style>{`
        @keyframes bl-bar-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .bl-founder-bar { animation: bl-bar-in 0.3s ease forwards; }
      `}</style>

      <div
        className="bl-founder-bar"
        style={{
          position: 'fixed', bottom: 24, left: 24, zIndex: 8998,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px 6px 12px',
          background: 'rgba(10,10,11,0.92)',
          backdropFilter: 'blur(16px)',
          border: '0.5px solid rgba(99,102,241,0.3)',
          borderRadius: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(99,102,241,0.12)',
        }}
      >
        {/* Founder pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a5b4fc', boxShadow: '0 0 6px rgba(165,180,252,0.6)' }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {beta.ownerName}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', letterSpacing: '0.08em', padding: '1px 5px', borderRadius: 3, background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.3)', textTransform: 'uppercase' }}>FOUNDER</span>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />

        {/* Active model */}
        {model && (
          <>
            <span style={{ fontSize: 10, color: '#52525B' }}>{model.replace('gemini-', '')}</span>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
          </>
        )}

        {/* Debug toggle */}
        <button
          onClick={toggleDebug}
          title={debug ? 'Debug mode ON — click to turn off' : 'Debug mode OFF — click to enable'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 16,
            background: debug ? 'rgba(99,102,241,0.15)' : 'none',
            border: `0.5px solid ${debug ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
            color: debug ? '#a5b4fc' : '#52525B',
            cursor: 'pointer', fontSize: 10, fontWeight: 600, transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 10 }}>{debug ? '◉' : '◎'}</span>
          Debug
        </button>

        {/* Admin link */}
        <a
          href="/admin"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 16,
            background: 'rgba(99,102,241,0.08)',
            border: '0.5px solid rgba(99,102,241,0.2)',
            color: '#a5b4fc', fontSize: 10, fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(99,102,241,0.18)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(99,102,241,0.08)' }}
        >
          Admin ↗
        </a>
      </div>
    </>
  )
}
