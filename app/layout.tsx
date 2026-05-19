import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from './providers'
import { LyraChat } from '@/components/chat/LyraChat'
import './gloabals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'BrandLift — Your Digital Presence, Done',
    template: '%s — BrandLift',
  },
  description:
    'BrandLift helps small business owners build a professional digital presence in minutes — not months. Posts, profiles, and pages that actually bring in customers.',
  keywords: [
    'small business marketing',
    'digital presence',
    'social media for small business',
    'local business website',
    'AI content generator',
  ],
  authors: [{ name: 'BrandLift' }],
  creator: 'BrandLift',
  metadataBase: new URL('https://brandlift.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://brandlift.app',
    siteName: 'BrandLift',
    title: 'BrandLift — Your Digital Presence, Done',
    description:
      'Build your digital presence in minutes. Content that sounds like you, not a robot.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BrandLift',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BrandLift — Your Digital Presence, Done',
    description: 'Build your digital presence in minutes.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-brand-bg text-brand-text min-h-screen">
        <Providers>
          {children}
          <LyraChat />
        </Providers>
        <div id="toast-root" aria-live="polite" aria-atomic="false" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" />
        <Analytics />
      </body>
    </html>
  )
}
