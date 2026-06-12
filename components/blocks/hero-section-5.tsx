'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import { useMotionValue, useTransform, motion as m, useScroll } from 'motion/react'

/* ─── BrandLift Logo ──────────────────────────────────────────────────────── */
const Logo = ({ className }: { className?: string }) => (
  <div className={cn('flex items-center gap-2.5', className)}>
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 flex-shrink-0">
      <rect width="28" height="28" rx="7" fill="#5855D4" />
      <path d="M8 7h7a4 4 0 0 1 0 8H8V7zm0 8h7.5a4.5 4.5 0 0 1 0 9H8v-9z" fill="white" opacity="0.95" />
    </svg>
    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>
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
    return scrollYProgress.on('change', (v) => setScrolled(v > 0.02))
  }, [scrollYProgress])

  return (
    <header
      className="fixed z-20 w-full top-0 left-0"
      style={{
        height: 64,
        background: scrolled ? 'rgba(11,17,32,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
        transition: 'background 160ms ease, border-color 160ms ease, backdrop-filter 160ms ease',
      }}
    >
      <div className="max-w-6xl mx-auto px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="BrandLift home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8" aria-label="Primary navigation">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              style={{
                color: 'var(--text-muted)',
                fontSize: 15,
                fontWeight: 500,
                transition: 'color 150ms ease',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)' }}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* CTA group */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/sign-in" className="btn-ghost" style={{ height: 36, fontSize: 14 }}>
            Sign in
          </Link>
          <Link href="/sign-up" className="btn-primary" style={{ height: 36, fontSize: 14 }}>
            Get started free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="lg:hidden p-2"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 flex flex-col"
          style={{ background: 'var(--base)', paddingTop: 64 }}
        >
          <div className="flex flex-col gap-6 px-8 pt-8">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{ color: 'var(--text-secondary)', fontSize: 20, fontWeight: 500, textDecoration: 'none' }}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <Link href="/sign-in" className="btn-ghost" style={{ justifyContent: 'center' }}>
                Sign in
              </Link>
              <Link href="/sign-up" className="btn-primary" style={{ justifyContent: 'center' }}>
                Get started free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

/* ─── Before/After Slider ─────────────────────────────────────────────────── */
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
      style={{
        aspectRatio: '9/16',
        maxHeight: 500,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
      role="img"
      aria-label="Before and after video comparison"
    >
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

      {/* BEFORE */}
      <div className="absolute inset-0" style={{ background: '#0e0a06' }}>
        <div className="absolute inset-0" style={{ animation: 'camera-shake 2.8s ease-in-out infinite' }}>
          <video
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(1.18) saturate(0.18) contrast(0.76)' }}
            src="https://videos.pexels.com/video-files/4812205/4812205-hd_1080_1920_30fps.mp4"
            aria-hidden
          />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E")`,
            opacity: 0.85,
            mixBlendMode: 'overlay',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 50px rgba(255,255,255,0.1)' }} aria-hidden />

        {/* Status bar */}
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

        {/* REC */}
        <div className="absolute top-11 left-4 flex items-center gap-1.5">
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'blink-rec 1.4s step-end infinite', boxShadow: '0 0 6px rgba(239,68,68,0.9)' }} aria-hidden />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.95)', fontFamily: '-apple-system, sans-serif', letterSpacing: '0.07em' }}>REC</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', fontFamily: 'ui-monospace, monospace' }}>00:23</span>
        </div>

        {/* AF square */}
        <div className="absolute" style={{ top: '38%', left: '42%', width: 52, height: 52, border: '1.5px solid rgba(255,204,0,0.85)', animation: 'af-pulse 3.6s ease-out infinite' }} aria-hidden />

        {/* BEFORE label */}
        <div
          className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}
        >
          iPhone · Unedited
        </div>
      </div>

      {/* AFTER */}
      <m.div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: afterClip,
          borderLeft: '1px solid var(--accent-border)',
        }}
      >
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.85) saturate(1.55) contrast(1.25)' }}
          src="https://videos.pexels.com/video-files/4812205/4812205-hd_1080_1920_30fps.mp4"
          aria-hidden
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(18,38,72,0.2) 0%, rgba(88,85,212,0.06) 50%, rgba(110,55,20,0.14) 100%)', mixBlendMode: 'color' }} aria-hidden />
        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: '9%', background: '#000' }} aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '9%', background: '#000' }} aria-hidden />
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }} aria-hidden />

        {/* Quality tags */}
        <div className="absolute top-12 right-3 flex flex-col items-end gap-1.5" style={{ zIndex: 2 }}>
          {[
            { dot: 'var(--success)', label: 'Stabilized' },
            { dot: 'var(--accent)', label: 'Color graded' },
            { dot: 'var(--text-secondary)', label: 'Captioned' },
          ].map(({ dot, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-[9px] px-2 py-1 rounded"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.82)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
            >
              <span style={{ color: dot }}>●</span> {label}
            </div>
          ))}
        </div>

        {/* AI-polished badge */}
        <div
          className="absolute top-4 right-3 text-[10px] px-2.5 py-1 rounded-full"
          style={{ background: 'var(--accent-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--accent-border)', fontWeight: 700, letterSpacing: '0.03em' }}
        >
          AI-polished
        </div>

        {/* Lower third */}
        <div
          className="absolute left-0 right-0 px-3 pt-12 pb-3"
          style={{ bottom: '9%', background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)', zIndex: 2 }}
        >
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.95)', lineHeight: 1.45, marginBottom: 8, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            Behind the lens — golden hour session, straight from iPhone to polished edit.{' '}
            <span style={{ color: 'var(--text-secondary)' }}>#photography #brandlift</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>AI-generated caption</span>
          </div>
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
        <div className="absolute top-0 bottom-0 w-px" style={{ background: 'var(--accent-border)', left: '50%' }} aria-hidden />
        <div
          className="relative flex items-center justify-center w-8 h-8 rounded-full"
          style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M5 8H11M5 8L3 6M5 8L3 10M11 8L13 6M11 8L13 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </m.div>

      {/* Corner labels */}
      <div className="absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, zIndex: 5, pointerEvents: 'none' }} aria-hidden>BEFORE</div>
    </div>
  )
}

/* ─── Main export ─────────────────────────────────────────────────────────── */
export function HeroSection() { return <HeroSection5 /> }

function HeroSection5() {
  return (
    <>
      <HeroHeader />

      {/* Hero section */}
      <section
        aria-label="Hero"
        style={{ paddingTop: 'calc(64px + 80px)', paddingBottom: 80, minHeight: '100vh', display: 'flex', alignItems: 'center' }}
      >
        <div className="max-w-6xl mx-auto px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div className="flex flex-col gap-7">
              {/* Eyebrow */}
              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span
                  style={{
                    background: 'var(--accent-subtle)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--text-secondary)',
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Short-form video for local business
                </span>
              </div>

              {/* H1 */}
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'clamp(48px, 7vw, 88px)',
                  letterSpacing: '-0.04em',
                  lineHeight: 0.95,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                More customers,<br />
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>less filming.</span>
              </h1>

              {/* Subline */}
              <p
                style={{
                  fontSize: 'clamp(16px, 2vw, 20px)',
                  color: 'var(--text-secondary)',
                  maxWidth: 520,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Upload your iPhone footage. Get polished, platform-ready videos that bring in real customers.
              </p>

              {/* CTA row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <Link
                  href="/sign-up"
                  className="btn-primary"
                  style={{ height: 44, fontSize: 15 }}
                >
                  Start for free
                </Link>
                <Link
                  href="#how-it-works"
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 15,
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'color 160ms ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)' }}
                >
                  See how it works →
                </Link>
              </div>

              {/* Trust line */}
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Free during beta &middot; No credit card &middot; Cancel anytime
              </p>
            </div>

            {/* Right: product preview */}
            <div className="flex justify-center lg:justify-end">
              <div style={{ width: '100%', maxWidth: 340 }}>
                <BeforeAfterSlider />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
            {[
              { value: '3 min', label: 'Average turnaround' },
              { value: '10×', label: 'More content output' },
              { value: 'Free', label: 'During beta' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 py-8 px-4 text-center">
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 'clamp(20px, 3vw, 28px)',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
