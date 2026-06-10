'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight, ArrowUpRight, Unlock, CheckCircle2 } from 'lucide-react'
import { useScroll, motion } from 'motion/react'
import { useBetaAccess } from '@/lib/betaAccess'

/* ─── BrandLift Logo ──────────────────────────────────────────────────────── */
const Logo = ({ className }: { className?: string }) => (
  <div className={cn('flex items-center gap-2.5', className)}>
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 flex-shrink-0">
      <rect width="28" height="28" rx="7" fill="url(#bl-hero-gradient)" />
      <path d="M8 7h7a4 4 0 0 1 0 8H8V7zm0 8h7.5a4.5 4.5 0 0 1 0 9H8v-9z" fill="white" opacity="0.95" />
      <defs>
        <linearGradient id="bl-hero-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
    <span style={{ color: '#FAFAFA', fontWeight: 600, fontSize: 17, letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>
      BrandLift
    </span>
  </div>
)

/* ─── Nav ─────────────────────────────────────────────────────────────────── */
const menuItems = [
  { name: 'How it works', href: '#how-it-works' },
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '#faq' },
]

const HeroHeader = () => {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)
  const { scrollYProgress } = useScroll()

  React.useEffect(() => {
    return scrollYProgress.on('change', (v) => setScrolled(v > 0.03))
  }, [scrollYProgress])

  return (
    <header>
      <nav
        data-state={menuOpen ? 'active' : undefined}
        className="group fixed z-20 w-full pt-3"
      >
        <div
          className={cn(
            'mx-auto max-w-7xl rounded-2xl px-5 transition-all duration-300 lg:px-10',
            scrolled && 'bg-[#0A0A0B]/70 backdrop-blur-xl border border-white/[0.07]'
          )}
        >
          <motion.div
            className={cn(
              'relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0',
              scrolled ? 'lg:py-3' : 'lg:py-5'
            )}
            layout
            transition={{ duration: 0.2 }}
          >
            {/* Logo + hamburger */}
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <Link href="/" aria-label="BrandLift home">
                <Logo />
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="relative z-20 -m-2 block cursor-pointer p-2 lg:hidden text-[#71717A] hover:text-[#FAFAFA] transition-colors"
              >
                <Menu className="group-data-[state=active]:opacity-0 group-data-[state=active]:scale-0 m-auto size-5 duration-200 transition-all" />
                <X className="group-data-[state=active]:opacity-100 group-data-[state=active]:scale-100 absolute inset-0 m-auto size-5 opacity-0 scale-0 duration-200 transition-all" />
              </button>

              {/* Desktop nav links */}
              <div className="hidden lg:block">
                <ul className="flex gap-7 text-sm">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-[#71717A] hover:text-[#FAFAFA] transition-colors duration-150 text-[13px] font-medium tracking-tight"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA group */}
            <div
              className={cn(
                'bg-[#0A0A0B] group-data-[state=active]:block lg:group-data-[state=active]:flex',
                'mb-6 hidden w-full flex-wrap items-center justify-end gap-3 rounded-2xl border border-white/[0.08] p-5 shadow-2xl',
                'md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-3 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none'
              )}
            >
              {/* Mobile nav links */}
              <div className="lg:hidden w-full">
                <ul className="flex flex-col gap-4 text-base pb-4 border-b border-white/[0.06] mb-4">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors text-[15px]">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-2 md:w-fit">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-[13px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.06] transition-all duration-150 border border-white/[0.08]"
                >
                  Login
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-all duration-150"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)',
                    boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 4px 16px rgba(99,102,241,0.25)',
                  }}
                >
                  Get started
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </nav>
    </header>
  )
}

/* ─── Stat badge ──────────────────────────────────────────────────────────── */
function StatBadge({ value, label, accent }: { value: string; label: string; accent?: string }) {
  const color = accent ?? '#6366f1'
  return (
    <div
      className="flex flex-col gap-0.5 px-4 py-3 rounded-xl relative overflow-hidden"
      style={{
        background: 'rgba(17,17,19,0.85)',
        border: `0.5px solid ${color}25`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 0 1px ${color}10, 0 4px 20px rgba(0,0,0,0.3)`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 30% 0%, ${color}12 0%, transparent 65%)` }}
        aria-hidden
      />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#FAFAFA', letterSpacing: '-0.04em', lineHeight: 1, position: 'relative' }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: '#71717A', fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase', position: 'relative' }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Hero Section ────────────────────────────────────────────────────────── */
export function HeroSection() {
  const beta = useBetaAccess()
  const [showBeta, setShowBeta] = useState(false)
  const [betaInput, setBetaInput] = useState('')

  // Open re-enter input when reenterOpen is triggered from the hook
  useEffect(() => { if (beta.reenterOpen) setShowBeta(true) }, [beta.reenterOpen])

  const submitBetaCode = async () => {
    if (!betaInput.trim() || beta.loading) return
    const ok = await beta.unlock(betaInput.trim())
    if (!ok) setBetaInput('')
    else { setBetaInput(''); setShowBeta(false) }
  }

  return (
    <>
      <HeroHeader />

      <main className="overflow-x-hidden">
        {/* ── Main hero ── */}
        <section className="relative min-h-[100svh] flex items-center pt-20">
          {/* Noise grain overlay */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
              opacity: 0.8,
            }}
            aria-hidden
          />

          <div className="relative z-[2] mx-auto max-w-7xl px-6 lg:px-12 w-full py-20 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

              {/* ── Left copy ── */}
              <div className="flex flex-col gap-7">

                {/* Eyebrow */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                >
                  <div
                    className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full w-fit"
                    style={{
                      background: 'rgba(99,102,241,0.08)',
                      border: '0.5px solid rgba(99,102,241,0.25)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: '#4ADE80',
                        boxShadow: '0 0 0 3px rgba(74,222,128,0.2)',
                        animation: 'pulse-dot 2.4s ease-in-out infinite',
                      }}
                      aria-hidden
                    />
                    <style>{`@keyframes pulse-dot{0%,100%{box-shadow:0 0 0 3px rgba(74,222,128,0.2)}50%{box-shadow:0 0 0 5px rgba(74,222,128,0.08)}}`}</style>
                    <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>
                      Now in private beta — founding businesses welcome
                    </span>
                  </div>
                </motion.div>

                {/* Headline */}
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 'clamp(44px, 6.5vw, 80px)',
                      lineHeight: 1.0,
                      letterSpacing: '-0.04em',
                      color: '#FAFAFA',
                    }}
                  >
                    Videos{' '}
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 45%, #8b5cf6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      10x Faster
                    </span>
                    <br />
                    with BrandLift.
                  </motion.h1>
                </div>

                {/* Subheadline */}
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  style={{
                    fontSize: 'clamp(16px, 1.8vw, 20px)',
                    color: '#71717A',
                    lineHeight: 1.65,
                    maxWidth: '42ch',
                  }}
                >
                  Turn raw iPhone footage into polished, branded content — AI-powered editing, captions, and scheduling in minutes.
                </motion.p>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.28, ease: [0.23, 1, 0.32, 1] }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Link
                    href="/sign-up"
                    className="pressable group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)',
                      boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 8px 24px rgba(99,102,241,0.3), 0 2px 8px rgba(0,0,0,0.3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.6), 0 12px 32px rgba(99,102,241,0.4), 0 2px 8px rgba(0,0,0,0.3)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 8px 24px rgba(99,102,241,0.3), 0 2px 8px rgba(0,0,0,0.3)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    Get Started Free
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 px-5 py-3.5 rounded-xl text-[14px] font-medium transition-all duration-150"
                    style={{ color: '#A1A1AA', border: '0.5px solid rgba(255,255,255,0.1)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
                      e.currentTarget.style.color = '#FAFAFA'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                      e.currentTarget.style.color = '#A1A1AA'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    See a demo
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </motion.div>

                {/* Beta code entry */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.34, ease: [0.23, 1, 0.32, 1] }}
                >
                  {beta.unlocked && !beta.reenterOpen ? (
                    <div className="flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                        style={{
                          background: beta.isOwner ? 'rgba(99,102,241,0.1)' : 'rgba(74,222,128,0.08)',
                          border: beta.isOwner ? '0.5px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(74,222,128,0.25)',
                        }}>
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: beta.isOwner ? '#a5b4fc' : '#4ADE80' }} />
                        {beta.isOwner ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>
                            Welcome back, {beta.ownerName} — Founder access active
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#4ADE80', fontWeight: 500 }}>Beta access active — 4K &amp; AI Enhancement unlocked</span>
                        )}
                        {beta.isOwner && (
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#6366f1', letterSpacing: '0.1em', padding: '1px 5px', borderRadius: 3, background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.3)', textTransform: 'uppercase' }}>FOUNDER</span>
                        )}
                      </div>
                      <button
                        onClick={() => { beta.reenter(); setBetaInput('') }}
                        style={{ fontSize: 11, color: '#3f3f46', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: 'fit-content' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#71717A' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3f3f46' }}
                      >
                        Enter a different code →
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setShowBeta(v => !v)}
                        className="inline-flex items-center gap-1.5 w-fit transition-colors duration-150"
                        style={{ fontSize: 13, color: showBeta ? '#a5b4fc' : '#52525B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={e => { if (!showBeta) (e.currentTarget as HTMLElement).style.color = '#A1A1AA' }}
                        onMouseLeave={e => { if (!showBeta) (e.currentTarget as HTMLElement).style.color = '#52525B' }}
                      >
                        <Unlock className="w-3 h-3" />
                        <span>Have a beta code?</span>
                      </button>

                      {showBeta && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                          className="flex flex-col gap-3 p-4 rounded-xl"
                          style={{ background: 'rgba(14,14,16,0.95)', border: '0.5px solid rgba(99,102,241,0.25)', backdropFilter: 'blur(16px)', maxWidth: 340 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA' }}>
                                {beta.reenterOpen ? 'Enter a different code' : 'Enter your access code'}
                              </p>
                              <p style={{ fontSize: 12, color: '#71717A', marginTop: 3 }}>
                                {beta.reenterOpen
                                  ? 'Your existing access is saved — this will upgrade or replace it.'
                                  : 'Beta or founder code to unlock premium features.'}
                              </p>
                            </div>
                            {beta.reenterOpen && (
                              <button onClick={() => { beta.cancelReenter(); setShowBeta(false) }}
                                style={{ fontSize: 11, color: '#52525B', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 2 }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525B' }}>
                                Cancel
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={betaInput}
                              onChange={e => setBetaInput(e.target.value.toUpperCase())}
                              onKeyDown={e => { if (e.key === 'Enter') submitBetaCode() }}
                              placeholder="BETACODE"
                              autoFocus
                              className="flex-1 px-3 py-2 rounded-lg text-[13px]"
                              style={{
                                background: '#18181C',
                                border: `0.5px solid ${beta.error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                color: '#FAFAFA',
                                outline: 'none',
                                fontFamily: 'monospace',
                                letterSpacing: '0.1em',
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
                              onBlur={e => { e.currentTarget.style.borderColor = beta.error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)' }}
                            />
                            <button
                              onClick={submitBetaCode}
                              disabled={beta.loading || !betaInput.trim()}
                              className="px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 flex-shrink-0"
                              style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white',
                                border: 'none',
                                cursor: beta.loading || !betaInput.trim() ? 'not-allowed' : 'pointer',
                                opacity: beta.loading || !betaInput.trim() ? 0.5 : 1,
                              }}
                            >
                              {beta.loading ? '…' : 'Unlock'}
                            </button>
                          </div>
                          {beta.error && (
                            <p style={{ fontSize: 12, color: '#f87171' }}>{beta.error}</p>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Trust line + stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="flex flex-col gap-4"
                >
                  <p style={{ fontSize: 12, color: '#52525B' }}>
                    Free forever · No credit card · Setup in 5 minutes
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <StatBadge value="10x" label="Faster editing" accent="#6366f1" />
                    <StatBadge value="3 min" label="Video ready" accent="#8b5cf6" />
                    <StatBadge value="500+" label="Businesses" accent="#4ADE80" />
                  </div>
                </motion.div>
              </div>

              {/* ── Right: before/after video slider ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="w-full max-w-sm mx-auto lg:max-w-none"
              >
                {/* Outer glow frame */}
                <div
                  className="relative rounded-[20px] p-[1px]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.15) 50%, rgba(255,255,255,0.06) 100%)',
                    boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 40px 80px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="rounded-[19px] overflow-hidden" style={{ background: '#0A0A0B' }}>
                    <BeforeAfterSlider />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Platform ticker ── */}
        <section className="relative border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(10,10,11,0.6), transparent)' }}
          />

          <div className="group relative mx-auto max-w-7xl px-6 py-8">
            <div className="flex flex-col items-center gap-5 md:flex-row">
              <div className="flex-shrink-0 md:pr-8 md:border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#52525B',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Publish to every platform
                </p>
              </div>

              <div className="relative w-full overflow-hidden md:flex-1">
                <InfiniteSlider speedOnHover={20} speed={40} gap={96}>
                  {PLATFORM_LOGOS.map((p) => (
                    <div key={p.name} className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity duration-200">
                      {p.svgPath ? (
                        <svg height={p.h} viewBox="0 0 24 24" fill="white" aria-label={p.name} style={{ width: 'auto', display: 'block' }}>
                          <path d={p.svgPath} />
                        </svg>
                      ) : (
                        <img
                          src={`https://cdn.simpleicons.org/${p.slug}/ffffff`}
                          alt={p.name}
                          style={{ height: p.h, width: 'auto', display: 'block' }}
                        />
                      )}
                    </div>
                  ))}
                </InfiniteSlider>

                <ProgressiveBlur className="pointer-events-none absolute left-0 top-0 h-full w-16" direction="left" blurIntensity={1} />
                <ProgressiveBlur className="pointer-events-none absolute right-0 top-0 h-full w-16" direction="right" blurIntensity={1} />
                <div className="absolute inset-y-0 left-0 w-16" style={{ background: 'linear-gradient(to right, #0A0A0B, transparent)' }} />
                <div className="absolute inset-y-0 right-0 w-16" style={{ background: 'linear-gradient(to left, #0A0A0B, transparent)' }} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

type PlatformLogo = { name: string; h: number } & ({ slug: string; svgPath?: never } | { svgPath: string; slug?: never })

const PLATFORM_LOGOS: PlatformLogo[] = [
  { name: 'TikTok', slug: 'tiktok', h: 20 },
  { name: 'Instagram', slug: 'instagram', h: 20 },
  { name: 'YouTube', slug: 'youtube', h: 18 },
  { name: 'X', slug: 'x', h: 17 },
  { name: 'LinkedIn', svgPath: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z', h: 20 },
  { name: 'Facebook', slug: 'facebook', h: 20 },
  { name: 'Canva', svgPath: 'M12.006 0C5.622 0 .419 4.88.012 11.262c-.43 6.838 4.703 12.77 11.33 13.184.222.014.442.02.663.02 6.408 0 11.637-4.914 11.982-11.37C24.394 6.22 18.976.375 12.557.012A12.52 12.52 0 0 0 12.006 0zm-.82 6.956c.627 0 1.195.142 1.7.422.504.28.903.676 1.192 1.183.29.508.434 1.095.434 1.758 0 .67-.144 1.263-.434 1.775a3.07 3.07 0 0 1-1.192 1.19 3.42 3.42 0 0 1-1.7.424 3.454 3.454 0 0 1-1.707-.424 3.085 3.085 0 0 1-1.188-1.19c-.288-.512-.433-1.105-.433-1.775 0-.663.145-1.25.433-1.758a3.07 3.07 0 0 1 1.188-1.183 3.454 3.454 0 0 1 1.707-.422z', h: 20 },
  { name: 'Shopify', slug: 'shopify', h: 20 },
  { name: 'Pinterest', slug: 'pinterest', h: 20 },
]

/* ─── Before/After Slider ─────────────────────────────────────────────────── */
import { useRef } from 'react'
import { useMotionValue, useTransform, motion as m } from 'motion/react'

function BeforeAfterSlider() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const x = useMotionValue(0)

  const clipPercent = useTransform(x, (v) => {
    if (containerWidth === 0) return 50
    return Math.max(0, Math.min(100, ((v + containerWidth / 2) / containerWidth) * 100))
  })
  const afterClip = useTransform(clipPercent, (p) => `inset(0 ${100 - p}% 0 0)`)

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width))
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!containerWidth) return
    let played = false
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !played) {
        played = true
        const half = containerWidth / 2
        let elapsed = 0
        const steps = [{ t: -half * 0.65, d: 850 }, { t: half * 0.65, d: 1050 }, { t: 0, d: 650 }]
        steps.forEach(({ t, d }) => {
          setTimeout(() => x.set(t), elapsed)
          elapsed += d + 80
        })
      }
    }, { threshold: 0.4 })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [containerWidth, x])

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ aspectRatio: '9/16', maxHeight: 500 }}
      role="img"
      aria-label="Before and after video comparison"
    >
      {/* Keyframes for iPhone effects */}
      <style>{`
        @keyframes camera-shake {
          0%,100%{transform:translate(0,0) rotate(0deg) scale(1)}
          8%{transform:translate(-1.5px,0.8px) rotate(-0.15deg) scale(1.002)}
          16%{transform:translate(1px,-1.2px) rotate(0.2deg) scale(0.999)}
          24%{transform:translate(-0.8px,1px) rotate(-0.1deg) scale(1.001)}
          32%{transform:translate(1.2px,0.3px) rotate(0.12deg) scale(1)}
          40%{transform:translate(0.3px,-0.8px) rotate(-0.08deg) scale(1.002)}
          48%{transform:translate(-1px,0.5px) rotate(0.18deg) scale(0.999)}
          56%{transform:translate(0.8px,1px) rotate(-0.12deg) scale(1)}
          64%{transform:translate(-0.5px,-0.3px) rotate(0.08deg) scale(1.001)}
          72%{transform:translate(1px,-0.8px) rotate(-0.15deg) scale(1)}
          80%{transform:translate(-0.3px,0.8px) rotate(0.1deg) scale(1.002)}
          88%{transform:translate(0.8px,-0.5px) rotate(-0.08deg) scale(0.999)}
        }
        @keyframes blink-rec {
          0%,45%{opacity:1}50%,100%{opacity:0}
        }
        @keyframes af-pulse {
          0%{box-shadow:0 0 0 1.5px rgba(255,204,0,0.9),0 0 0 3px rgba(255,204,0,0);opacity:1}
          60%{box-shadow:0 0 0 1.5px rgba(255,204,0,0.6),0 0 0 6px rgba(255,204,0,0);opacity:0.7}
          100%{box-shadow:0 0 0 1.5px rgba(255,204,0,0),0 0 0 6px rgba(255,204,0,0);opacity:0}
        }
      `}</style>

      {/* BEFORE — raw iPhone footage */}
      <div className="absolute inset-0 overflow-hidden" style={{ background: '#0e0a06' }}>
        {/* Shaky wrapper */}
        <div
          className="absolute inset-0"
          style={{ animation: 'camera-shake 2.8s ease-in-out infinite' }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(1.18) saturate(0.18) contrast(0.76)' }}
            src="https://videos.pexels.com/video-files/4812205/4812205-hd_1080_1920_30fps.mp4"
            aria-hidden
          />
        </div>

        {/* Heavy digital grain */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E")`,
            opacity: 0.85,
            mixBlendMode: 'overlay',
          }}
          aria-hidden
        />

        {/* Washed-out edge blow-out */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 50px rgba(255,255,255,0.1)' }}
          aria-hidden
        />

        {/* iPhone status bar */}
        <div
          className="absolute top-0 left-0 right-0 px-4 pt-3 pb-1 flex items-center justify-between"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: '-apple-system, sans-serif' }}>9:41</span>
          <div className="flex items-center gap-1.5">
            <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden>
              <rect x="0" y="8" width="3" height="4" rx="0.5" fill="rgba(255,255,255,0.9)"/>
              <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" fill="rgba(255,255,255,0.9)"/>
              <rect x="9" y="3" width="3" height="9" rx="0.5" fill="rgba(255,255,255,0.9)"/>
              <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="rgba(255,255,255,0.35)"/>
            </svg>
            <svg width="23" height="11" viewBox="0 0 23 11" fill="none" aria-hidden>
              <rect x="0.5" y="0.5" width="19" height="10" rx="2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1"/>
              <rect x="20.5" y="3.5" width="2" height="4" rx="1" fill="rgba(255,255,255,0.55)"/>
              <rect x="2" y="2" width="13" height="7" rx="1.5" fill="rgba(255,255,255,0.92)"/>
            </svg>
          </div>
        </div>

        {/* REC indicator */}
        <div className="absolute top-11 left-4 flex items-center gap-1.5">
          <div
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#ef4444',
              animation: 'blink-rec 1.4s step-end infinite',
              boxShadow: '0 0 6px rgba(239,68,68,0.9)',
            }}
            aria-hidden
          />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.95)', fontFamily: '-apple-system, sans-serif', letterSpacing: '0.07em' }}>REC</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', fontFamily: 'ui-monospace, monospace' }}>00:23</span>
        </div>

        {/* Camera AF square */}
        <div
          className="absolute"
          style={{
            top: '38%', left: '42%',
            width: 52, height: 52,
            border: '1.5px solid rgba(255,204,0,0.85)',
            animation: 'af-pulse 3.6s ease-out infinite',
          }}
          aria-hidden
        />

        {/* Bottom label */}
        <div
          className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', fontWeight: 500 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
          iPhone · Unedited
        </div>
      </div>

      {/* AFTER — professional output */}
      <m.div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: afterClip,
          borderLeft: '1px solid rgba(99,102,241,0.35)',
        }}
      >
        {/* Cinematic-grade stable video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.85) saturate(1.55) contrast(1.25)' }}
          src="https://videos.pexels.com/video-files/4812205/4812205-hd_1080_1920_30fps.mp4"
          aria-hidden
        />

        {/* Cinematic teal-warm color grade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(18,38,72,0.2) 0%, rgba(99,102,241,0.06) 50%, rgba(110,55,20,0.14) 100%)', mixBlendMode: 'color' }}
          aria-hidden
        />

        {/* Letterbox bars */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: '9%', background: '#000' }} aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '9%', background: '#000' }} aria-hidden />

        {/* Edge vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}
          aria-hidden
        />

        {/* Right-side actions */}
        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5" style={{ zIndex: 2 }}>
          {[
            { icon: '❤️', count: '24.1K' },
            { icon: '💬', count: '847' },
            { icon: '↗️', count: 'Share' },
          ].map(({ icon, count }) => (
            <div key={count} className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)' }}
              >
                {icon}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Professional lower-third */}
        <div
          className="absolute left-0 right-0 px-3 pt-12 pb-3"
          style={{
            bottom: '9%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)',
            zIndex: 2,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: '1.5px solid rgba(255,255,255,0.9)' }}
            >
              B
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>@lumenaframes</span>
            <div
              className="px-2 py-0.5 rounded text-[10px] font-bold"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '0.5px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}
            >
              Follow
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.95)', lineHeight: 1.45, marginBottom: 8, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            📸 Behind the lens — golden hour session, straight from my iPhone to polished edit in minutes{' '}
            <span style={{ color: '#a5b4fc' }}>#photography #lumenaframes #contentcreator</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Original audio · Lumen Frames</span>
          </div>
        </div>

        {/* Quality indicator stack */}
        <div className="absolute top-12 right-3 flex flex-col items-end gap-1.5" style={{ zIndex: 2 }}>
          {[
            { dot: '#4ade80', label: 'Stabilized' },
            { dot: '#a78bfa', label: 'Color graded' },
            { dot: '#60a5fa', label: 'Captioned' },
          ].map(({ dot, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-[9px] px-2 py-1 rounded-md"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.1)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
            >
              <span style={{ color: dot }}>●</span> {label}
            </div>
          ))}
        </div>

        {/* AI-polished badge */}
        <div
          className="absolute top-4 right-3 text-[10px] px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '0.5px solid rgba(99,102,241,0.35)', backdropFilter: 'blur(10px)', fontWeight: 700, letterSpacing: '0.03em' }}
        >
          ✦ AI-polished
        </div>
      </m.div>

      {/* Drag handle */}
      <m.div
        drag="x"
        dragConstraints={containerRef}
        dragElastic={0}
        dragMomentum={false}
        className="absolute top-0 bottom-0 flex items-center justify-center"
        style={{ x, left: '50%', marginLeft: -20, width: 40, cursor: 'ew-resize', zIndex: 20 }}
        aria-label="Drag to compare"
      >
        <div className="absolute top-0 bottom-0 w-px" style={{ background: 'rgba(99,102,241,0.4)', left: '50%' }} aria-hidden />
        <div
          className="relative flex items-center justify-center w-8 h-8 rounded-full"
          style={{ background: '#6366f1', boxShadow: '0 0 0 2px rgba(99,102,241,0.25), 0 4px 12px rgba(0,0,0,0.5)' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M5 8H11M5 8L3 6M5 8L3 10M11 8L13 6M11 8L13 10" stroke="#0A0A0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </m.div>
    </div>
  )
}
