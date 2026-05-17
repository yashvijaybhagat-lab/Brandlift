'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

const BUSINESS_TYPES = [
  'barbershop',
  'restaurant',
  'yoga studio',
  'plumbing company',
  'photography business',
  'food truck',
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [typeIndex] = useState(() => Math.floor(Math.random() * BUSINESS_TYPES.length))

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
      style={{ borderTop: '0.5px solid var(--color-border)' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-12">
        {/* Email capture */}
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex flex-col gap-1.5">
            <h3
              className="text-heading"
              style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', color: 'var(--color-text)' }}
            >
              Get content tips for your {BUSINESS_TYPES[typeIndex]}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Weekly ideas, trends, and hooks — curated for your industry. No spam.
            </p>
          </div>

          {submitted ? (
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-interactive text-sm"
              style={{
                background: 'rgba(74,222,128,0.08)',
                border: '0.5px solid rgba(74,222,128,0.2)',
                color: 'var(--color-success)',
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
                  background: 'var(--color-surface-elevated)',
                  border: '0.5px solid var(--color-border-strong)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                type="submit"
                className="pressable px-4 py-2.5 rounded-interactive text-sm font-medium flex-shrink-0"
                style={{ background: 'var(--color-primary)', color: '#0A0A0B' }}
              >
                Subscribe
              </button>
            </form>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--color-border)' }} role="separator" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo + copyright */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <Link
              href="/"
              className="text-sm font-medium"
              style={{ color: 'var(--color-primary)' }}
            >
              BrandLift
            </Link>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              © {new Date().getFullYear()} BrandLift. All rights reserved.
            </span>
          </div>

          {/* Nav links */}
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-6 flex-wrap justify-center">
              {[
                { label: 'Privacy', href: '/privacy' },
                { label: 'Terms', href: '/terms' },
                { label: 'Contact', href: '/contact' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs transition-colors"
                    style={{
                      color: 'var(--color-text-muted)',
                      transitionDuration: '160ms',
                      transitionTimingFunction: 'var(--ease-out)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-muted)'
                    }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

        </div>
      </div>
    </footer>
  )
}
