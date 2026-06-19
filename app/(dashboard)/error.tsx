'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6" style={{ background: '#08060F' }}>
      <div className="flex flex-col items-center gap-3 text-center max-w-md px-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.02em' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: '#71717A', lineHeight: 1.6 }}>
          {error.message || 'An unexpected error occurred. Try refreshing the page.'}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white mt-2"
          style={{ background: 'linear-gradient(135deg,#7C5CFF 0%,#5558e8 100%)', boxShadow: '0 0 0 1px rgba(124, 92, 255,0.4)' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
