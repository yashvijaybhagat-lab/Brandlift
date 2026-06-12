'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    // Animate in on mount
    const t = requestAnimationFrame(() => setMounted(true))

    const handleScroll = () => {
      setScrolled(window.scrollY > 12)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      cancelAnimationFrame(t)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <nav
      aria-label="Main navigation"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
        backgroundColor: scrolled ? 'rgba(13, 17, 23, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '0.5px solid var(--color-border)' : '0.5px solid transparent',
        transition: [
          'opacity 280ms var(--ease-out)',
          'transform 280ms var(--ease-out)',
          'background-color 200ms var(--ease-out)',
          'border-color 200ms var(--ease-out)',
          'backdrop-filter 200ms var(--ease-out)',
        ].join(', '),
      }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-base font-medium tracking-tight"
          style={{ color: 'var(--color-primary)' }}
        >
          BrandLift
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-7">
          {[              
            { label: 'Features', href: '#features' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'Examples', href: '#examples' },
            session && session.user?.email === 'yash@brandlift.app' && { label: 'Admin', href: '/admin' },
          ].filter(Boolean).map(({ label, href }: any) => (
            <a
              key={label}
              href={href}
              className="text-sm transition-colors"
              style={{
                color: 'var(--color-text-secondary)',
                transitionDuration: '160ms',
                transitionTimingFunction: 'var(--ease-out)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)'
              }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/sign-up"
          className="pressable text-sm font-medium px-4 py-2 rounded-interactive"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#0A0A0B',
          }}
        >
          Get started free
        </Link>
      </div>
    </nav>
  )
}
