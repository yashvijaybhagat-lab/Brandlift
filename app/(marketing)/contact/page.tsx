'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

const TOPICS = [
  'General question',
  'Billing & plans',
  'Technical support',
  'Feature request',
  'Partnership',
  'Press inquiry',
]

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState(TOPICS[0])
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return
    setSent(true)
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(24,24,28,0.8)',
    border: '0.5px solid rgba(255,255,255,0.09)',
    borderRadius: 10,
    color: '#FAFAFA',
    fontSize: 14,
    padding: '12px 16px',
    outline: 'none',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
  } as React.CSSProperties

  const focusStyle = {
    borderColor: 'rgba(124, 92, 255,0.45)',
    boxShadow: '0 0 0 3px rgba(124, 92, 255,0.1)',
  }

  const blurStyle = {
    borderColor: 'rgba(255,255,255,0.09)',
    boxShadow: 'none',
  }

  return (
    <div style={{ background: '#08060F', minHeight: '100vh' }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(16px)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
      >
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#7C5CFF', letterSpacing: '-0.03em' }}>
          BrandLift
        </Link>
        <Link
          href="/"
          style={{ fontSize: 13, color: '#71717A' }}
          className="transition-colors duration-150 hover:text-[#FAFAFA]"
        >
          ← Back to home
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-14 max-w-xl">
          <div
            className="inline-block text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5"
            style={{ background: 'rgba(124, 92, 255,0.1)', color: '#818cf8', border: '0.5px solid rgba(124, 92, 255,0.2)' }}
          >
            Contact
          </div>
          <h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.04em', color: '#FAFAFA', lineHeight: 1.05 }}
          >
            Let&apos;s talk.
          </h1>
          <p style={{ fontSize: 16, color: '#71717A', marginTop: 14, lineHeight: 1.65 }}>
            Whether you have a question, a problem, or just want to say hi — we&apos;re a real team and we read every message.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div
                className="flex flex-col items-center justify-center text-center py-16 rounded-2xl"
                style={{ border: '0.5px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.04)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'rgba(74,222,128,0.12)', border: '0.5px solid rgba(74,222,128,0.25)' }}
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                    <path d="M4 11L9 16L18 6" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#FAFAFA', marginBottom: 8 }}>
                  Message sent
                </h2>
                <p style={{ fontSize: 14, color: '#71717A', maxWidth: '30ch' }}>
                  We&apos;ll get back to you at <span style={{ color: '#FAFAFA' }}>{email}</span> within 1–2 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  {/* Name */}
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#A1A1AA', letterSpacing: '0.01em' }}>
                      Your name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      required
                      style={inputStyle}
                      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                      onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#A1A1AA', letterSpacing: '0.01em' }}>
                      Email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@yourbusiness.com"
                      required
                      style={inputStyle}
                      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                      onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
                    />
                  </div>
                </div>

                {/* Topic */}
                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#A1A1AA', letterSpacing: '0.01em' }}>
                    Topic
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
                    onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                    onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
                  >
                    {TOPICS.map((t) => (
                      <option key={t} value={t} style={{ background: '#110E1C', color: '#FAFAFA' }}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#A1A1AA', letterSpacing: '0.01em' }}>
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    required
                    rows={6}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={(e) => Object.assign(e.currentTarget.style, { ...focusStyle })}
                    onBlur={(e) => Object.assign(e.currentTarget.style, { ...blurStyle })}
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #7C5CFF 0%, #5558e8 100%)',
                    boxShadow: '0 0 0 1px rgba(124, 92, 255,0.4), 0 8px 24px rgba(124, 92, 255,0.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(124, 92, 255,0.5), 0 12px 32px rgba(124, 92, 255,0.35)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(124, 92, 255,0.4), 0 8px 24px rgba(124, 92, 255,0.25)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  Send message
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            )}
          </div>

          {/* Sidebar info */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {[
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                ),
                label: 'Email',
                value: 'contact@brandlift.dev',
                href: 'mailto:contact@brandlift.dev',
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                ),
                label: 'Response time',
                value: '1–2 business days',
                href: null,
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                ),
                label: 'Based in',
                value: 'San Francisco, CA',
                href: null,
              },
            ].map(({ icon, label, value, href }) => (
              <div
                key={label}
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ background: 'rgba(17,17,19,0.8)', border: '0.5px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(124, 92, 255,0.1)', border: '0.5px solid rgba(124, 92, 255,0.15)' }}
                >
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    {label}
                  </div>
                  {href ? (
                    <a href={href} style={{ fontSize: 14, color: '#A1A1AA' }} className="hover:text-[#FAFAFA] transition-colors duration-150">
                      {value}
                    </a>
                  ) : (
                    <div style={{ fontSize: 14, color: '#A1A1AA' }}>{value}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Note */}
            <p style={{ fontSize: 13, color: '#3f3f46', lineHeight: 1.65, marginTop: 4 }}>
              For urgent billing or account issues, include your account email in the message and we&apos;ll prioritise your request.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
