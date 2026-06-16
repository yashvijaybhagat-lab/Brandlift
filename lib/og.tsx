import { ImageResponse } from 'next/og'

/**
 * Shared social-share image generator (1200×630) used by both
 * app/opengraph-image.tsx and app/twitter-image.tsx so link previews
 * always render a real, branded image. Replaces the missing /og-image.png.
 */
export const ogAlt =
  'BrandLift — Turn raw footage into polished, platform-ready content in minutes'
export const ogSize = { width: 1200, height: 630 }
export const ogContentType = 'image/png'

export function renderBrandOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background:
            'linear-gradient(135deg, #0B1120 0%, #141a30 55%, #1b1840 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '74px',
              height: '74px',
              borderRadius: '18px',
              background: '#5855D4',
              color: '#ffffff',
              fontSize: '46px',
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '40px',
              fontWeight: 700,
              color: '#F0F0F6',
              letterSpacing: '-0.03em',
            }}
          >
            BrandLift
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '70px',
              fontWeight: 800,
              color: '#F0F0F6',
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              maxWidth: '960px',
            }}
          >
            Turn raw footage into polished content.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '30px',
              color: '#94A3B8',
              marginTop: '24px',
              maxWidth: '900px',
            }}
          >
            Upload your iPhone clips. Get platform-ready videos in minutes.
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              color: '#A5A3F0',
              fontWeight: 600,
            }}
          >
            brandlift.dev
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              color: '#ffffff',
              background: 'rgba(88,85,212,0.25)',
              border: '1px solid rgba(88,85,212,0.5)',
              borderRadius: '999px',
              padding: '10px 26px',
            }}
          >
            Free during beta
          </div>
        </div>
      </div>
    ),
    { ...ogSize }
  )
}
