import Link from 'next/link'

export const metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: '#08060F',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(72px, 14vw, 132px)',
          fontWeight: 800,
          lineHeight: 1,
          margin: 0,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #7B78E8 0%, #7C5CFF 60%, #9B8AF0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        404
      </p>
      <h1
        style={{
          fontSize: 'clamp(20px, 3vw, 28px)',
          fontWeight: 700,
          color: '#F0F0F6',
          margin: 0,
          letterSpacing: '-0.02em',
        }}
      >
        This page took a wrong turn.
      </h1>
      <p
        style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.5)',
          maxWidth: '42ch',
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        The link may be broken, or the page may have moved. Let&apos;s get you back on track.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
          background: '#7C5CFF',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          textDecoration: 'none',
          padding: '12px 24px',
          borderRadius: 12,
          boxShadow: '0 0 0 1px rgba(124, 92, 255,0.5), 0 8px 28px rgba(124, 92, 255,0.4)',
        }}
      >
        Back to home
      </Link>
    </main>
  )
}
