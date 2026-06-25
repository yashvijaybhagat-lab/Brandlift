import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from './providers'
import './globals.css'

const SITE_URL = 'https://brandlift.app'
const SITE_TITLE = 'BrandLift — Build Your Product Store in Minutes'
const SITE_DESCRIPTION =
  'Create a beautiful product storefront with AI. Describe your product, pick a template, and get a shareable store link — free forever. No code, no hassle.'

export const metadata: Metadata = {
  title: { default: SITE_TITLE, template: '%s — BrandLift' },
  description: SITE_DESCRIPTION,
  keywords: ['product store builder', 'AI storefront', 'sell products online', 'free online store', 'no-code store builder'],
  icons: { icon: '/brandlift-favicon.png', apple: '/brandlift-favicon.png' },
  authors: [{ name: 'BrandLift' }],
  creator: 'BrandLift',
  metadataBase: new URL(SITE_URL),
  openGraph: { type: 'website', locale: 'en_US', url: SITE_URL, siteName: 'BrandLift', title: SITE_TITLE, description: SITE_DESCRIPTION },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0D0D0F',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#0D0D0F] text-[#FAFAFA] min-h-screen">
        <Providers>
          {children}
        </Providers>
        <div id="toast-root" aria-live="polite" aria-atomic="false" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
