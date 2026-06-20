'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import ShinyText from '@/components/reactbits/ShinyText'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    setSubmitted(true)
    setEmail('')
  }

  return (
    <footer
      aria-label="Site footer"
      className="py-16"
      style={{ background: 'var(--base)', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-12">
        {/* Email capture */}
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex flex-col gap-1.5">
            <h3
              className="text-heading"
              style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', color: 'var(--text-primary)' }}
            >
              Get content tips for your business
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Weekly ideas, trends, and hooks — curated for your industry. No spam.
            </p>
          </div>

          {submitted ? (
            <div
              className="flex items-center gap-2 px-4 py-2.5 text-sm"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: 'var(--success)',
                borderRadius: 'var(--radius)',
              }}
            >
              <span aria-hidden>✓</span>
              You&apos;re in — check your inbox
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex gap-2 w-full max-w-sm"
              aria-label="Subscribe to content tips"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                required
                aria-label="Your email address"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-interactive text-sm"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  height: 40,
                  borderRadius: 'var(--radius)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.4)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 92, 255,0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                type="submit"
                className="btn-primary flex-shrink-0"
                style={{ height: 40 }}
              >
                Subscribe
              </button>
            </form>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border-subtle)' }} role="separator" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo + copyright */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <Link
              href="/"
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              <ShinyText text="BrandLift" color="#A9A2C4" shineColor="#7C5CFF" speed={4} />
            </Link>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} BrandLift. All rights reserved.
            </span>
          </div>

          {/* Nav links */}
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-6 flex-wrap justify-center">
              {[
                { label: 'Privacy', href: '/privacy' },
                { label: 'Terms', href: '/terms' },
                { label: 'Accessibility', href: '/accessibility' },
                { label: 'Contact', href: '/contact' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs transition-colors"
                    style={{
                      color: 'var(--text-muted)',
                      transitionDuration: '160ms',
                      transitionTimingFunction: 'var(--ease-out)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'
                    }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Made by */}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Made by Yash Bhagat &amp; Ansh Thakar
          </span>

        </div>
      </div>
    </footer>
  )
}
