'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ background: '#0A0A0B', margin: 0, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#FAFAFA', margin: 0 }}>Something went wrong</h2>
          <p style={{ fontSize: 13, color: '#71717A', margin: 0, lineHeight: 1.6 }}>{error.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={reset}
            style={{ padding: '10px 20px', borderRadius: 12, background: '#6366f1', color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
