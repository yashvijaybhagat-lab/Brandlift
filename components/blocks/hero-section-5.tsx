'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Menu, X, ArrowRight } from 'lucide-react'
import { useMotionValue, useTransform, motion as m, useScroll } from 'motion/react'
import ShinyText from '@/components/reactbits/ShinyText'
import CountUp from '@/components/reactbits/CountUp'

/* ─── BrandLift Logo ──────────────────────────────────────────────────────── */
const Logo = ({ className }: { className?: string }) => (
  <div className={cn('flex items-center gap-2.5', className)}>
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 flex-shrink-0">
      <rect width="28" height="28" rx="7" fill="#7C5CFF" />
      <path d="M8 7h7a4 4 0 0 1 0 8H8V7zm0 8h7.5a4.5 4.5 0 0 1 0 9H8v-9z" fill="white" opacity="0.95" />
    </svg>
    <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>
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
        background: scrolled ? 'rgba(11,17,32,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(124, 92, 255,0.15)' : '1px solid transparent',
        transition: 'background 200ms ease, border-color 200ms ease',
      }}
    >
      <div className="max-w-6xl mx-auto px-8 h-full flex items-center justify-between">
        <Link href="/" aria-label="BrandLift home"><Logo /></Link>

        <nav className="hidden lg:flex items-center gap-8" aria-label="Primary navigation">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 500, transition: 'color 150ms ease', textDecoration: 'none' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)' }}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/sign-in"
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, textDecoration: 'none', padding: '8px 16px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)' }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            style={{
              background: '#7C5CFF',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              padding: '9px 20px',
              borderRadius: 10,
              boxShadow: '0 0 0 1px rgba(124, 92, 255,0.5), 0 4px 20px rgba(124, 92, 255,0.35)',
              transition: 'box-shadow 160ms ease, transform 160ms ease',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.boxShadow = '0 0 0 1px rgba(124, 92, 255,0.8), 0 6px 28px rgba(124, 92, 255,0.5)'
              el.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.boxShadow = '0 0 0 1px rgba(124, 92, 255,0.5), 0 4px 20px rgba(124, 92, 255,0.35)'
              el.style.transform = 'translateY(0)'
            }}
          >
            Get started free
          </Link>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="lg:hidden p-2"
          style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex flex-col" style={{ background: '#08060F', paddingTop: 64 }}>
          <div className="flex flex-col gap-6 px-8 pt-8">
            {menuItems.map((item) => (
              <Link key={item.name} href={item.href} onClick={() => setMenuOpen(false)}
                style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: 500, textDecoration: 'none' }}>
                {item.name}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Link href="/sign-in" style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '12px', textDecoration: 'none' }}>Sign in</Link>
              <Link href="/sign-up" style={{ background: '#7C5CFF', color: '#fff', textAlign: 'center', padding: '12px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>
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
        aspectRatio: '9 / 16',
        width: 'auto',
        maxWidth: '100%',
        margin: '0 auto',
        maxHeight: 'none',
        height: 'min(85vh, 880px)',
        borderRadius: 20,
        border: '1px solid rgba(124, 92, 255,0.2)',
        background: '#0e0a06',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124, 92, 255,0.12)',
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
          48%{transform:translate(-1px,0.5px) rotate(0.18deg) scale(0.999)}
          64%{transform:translate(-0.5px,-0.3px) rotate(0.08deg) scale(1.001)}
          80%{transform:translate(-0.3px,0.8px) rotate(0.1deg) scale(1.002)}
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
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(1.18) saturate(0.18) contrast(0.76)' }}
            src="https://videos.pexels.com/video-files/4812205/4812205-hd_1080_1920_30fps.mp4" aria-hidden />
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E")`, opacity: 0.85, mixBlendMode: 'overlay' }} aria-hidden />
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 50px rgba(255,255,255,0.1)' }} aria-hidden />

        <div className="absolute top-0 left-0 right-0 px-4 pt-3 pb-1 flex items-center justify-between"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)' }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: '-apple-system, sans-serif' }}>9:41</span>
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

        <div className="absolute top-11 left-4 flex items-center gap-1.5">
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'blink-rec 1.4s step-end infinite', boxShadow: '0 0 6px rgba(239,68,68,0.9)' }} aria-hidden />
          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.95)', fontFamily: '-apple-system, sans-serif', letterSpacing: '0.07em' }}>REC</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.72)', fontFamily: 'ui-monospace, monospace' }}>00:23</span>
        </div>

        <div className="absolute" style={{ top: '38%', left: '42%', width: 52, height: 52, border: '1.5px solid rgba(255,204,0,0.85)', animation: 'af-pulse 3.6s ease-out infinite' }} aria-hidden />

        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[8px] px-2 py-0.5 rounded"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
          iPhone · Unedited
        </div>
      </div>

      {/* AFTER */}
      <m.div className="absolute inset-0 overflow-hidden" style={{ clipPath: afterClip, borderLeft: '1px solid rgba(124, 92, 255,0.4)' }}>
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.85) saturate(1.55) contrast(1.25)' }}
          src="https://videos.pexels.com/video-files/4812205/4812205-hd_1080_1920_30fps.mp4" aria-hidden />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(18,38,72,0.2) 0%, rgba(124, 92, 255,0.06) 50%, rgba(110,55,20,0.14) 100%)', mixBlendMode: 'color' }} aria-hidden />
        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: '9%', background: '#000' }} aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '9%', background: '#000' }} aria-hidden />
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }} aria-hidden />

        <div className="absolute top-12 right-3 flex flex-col items-end gap-1.5" style={{ zIndex: 2 }}>
          {[
            { dot: '#10B981', label: 'Stabilized' },
            { dot: '#7C5CFF', label: 'Color graded' },
            { dot: '#94A3B8', label: 'Captioned' },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1 text-[7px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.85)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              <span style={{ color: dot }}>●</span> {label}
            </div>
          ))}
        </div>

        <div className="absolute top-4 right-3 text-[8px] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(124, 92, 255,0.2)', color: '#A5A3F0', border: '1px solid rgba(124, 92, 255,0.4)', fontWeight: 700, letterSpacing: '0.03em' }}>
          AI-polished
        </div>

        <div className="absolute left-0 right-0 px-3 pt-12 pb-3"
          style={{ bottom: '9%', background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)', zIndex: 2 }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.95)', lineHeight: 1.45, marginBottom: 6, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            Behind the lens — golden hour session, straight from iPhone to polished edit.{' '}
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>#photography #brandlift</span>
          </p>
        </div>
      </m.div>

      {/* Drag handle */}
      <m.div drag="x" dragConstraints={containerRef} dragElastic={0} dragMomentum={false}
        className="absolute top-0 bottom-0 flex items-center justify-center"
        style={{ x, left: '50%', marginLeft: -20, width: 40, cursor: 'ew-resize', zIndex: 20 }}
        aria-label="Drag to compare">
        <div className="absolute top-0 bottom-0 w-px" style={{ background: 'rgba(124, 92, 255,0.6)', left: '50%', boxShadow: '0 0 8px rgba(124, 92, 255,0.4)' }} aria-hidden />
        <div className="relative flex items-center justify-center w-9 h-9 rounded-full"
          style={{ background: '#7C5CFF', boxShadow: '0 0 0 3px rgba(124, 92, 255,0.3), 0 4px 16px rgba(0,0,0,0.5)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M5 8H11M5 8L3 6M5 8L3 10M11 8L13 6M11 8L13 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </m.div>

      <div className="absolute top-3 left-3 text-[8px] px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(0,0,0,0.75)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, zIndex: 5, pointerEvents: 'none' }} aria-hidden>BEFORE</div>
    </div>
  )
}

/* ─── Beta Code Widget ────────────────────────────────────────────────────── */
function BetaCodeWidget() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [activeCode, setActiveCode] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/beta/me')
      .then(r => r.json())
      .then(data => { if (data.session?.code) setActiveCode(data.session.code) })
      .catch(() => {})
  }, [])

  function handleReset() {
    fetch('/api/beta/validate', { method: 'DELETE' }).catch(() => {})
    fetch('/api/beta/save', { method: 'DELETE' }).catch(() => {})
    try { localStorage.removeItem('bl_beta_v1') } catch {}
    setActiveCode(null)
    setCode('')
    setStatus('idle')
    setMessage('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/beta/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (data.valid) {
        setStatus('success')
        setMessage(data.message || 'Access granted!')
        setActiveCode(code.trim())
        setTimeout(() => router.push('/sign-up'), 900)
      } else {
        setStatus('error')
        setMessage(data.message || 'Invalid code')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong — try again')
    }
  }

  if (activeCode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
          Beta code active
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#A5A3F0',
            background: 'rgba(124, 92, 255,0.12)',
            border: '1px solid rgba(124, 92, 255,0.25)',
            borderRadius: 8,
            padding: '6px 12px',
          }}>
            {activeCode}
          </span>
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              padding: 0,
              transition: 'color 150ms ease',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
          >
            Reset
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
        Have a beta code?
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus('idle'); setMessage('') }}
          placeholder="ENTER-CODE"
          maxLength={32}
          spellCheck={false}
          autoComplete="off"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: status === 'error'
              ? '1px solid rgba(239,68,68,0.6)'
              : status === 'success'
              ? '1px solid rgba(16,185,129,0.6)'
              : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.08em',
            fontFamily: 'ui-monospace, monospace',
            padding: '10px 14px',
            outline: 'none',
            width: 180,
            transition: 'border-color 150ms ease',
          }}
          onFocus={(e) => { if (status === 'idle') e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.6)' }}
          onBlur={(e) => { if (status === 'idle') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !code.trim()}
          style={{
            background: status === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(124, 92, 255,0.18)',
            border: status === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(124, 92, 255,0.35)',
            borderRadius: 10,
            color: status === 'success' ? '#34D399' : '#A5A3F0',
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 18px',
            cursor: status === 'loading' || !code.trim() ? 'not-allowed' : 'pointer',
            opacity: !code.trim() ? 0.5 : 1,
            transition: 'all 150ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'loading' ? '…' : status === 'success' ? 'Unlocked' : 'Unlock'}
        </button>
      </form>
      {message && (
        <p style={{ fontSize: 12, margin: 0, color: status === 'error' ? 'rgba(239,68,68,0.85)' : 'rgba(52,211,153,0.9)', fontWeight: 500 }}>
          {message}
        </p>
      )}
    </div>
  )
}

/* ─── Main export ─────────────────────────────────────────────────────────── */
export function HeroSection() { return <HeroSection5 /> }

function HeroSection5() {
  return (
    <>
      <HeroHeader />

      <section
        aria-label="Hero"
        style={{ paddingTop: 'calc(64px + 40px)', paddingBottom: 40, minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflowX: 'clip' }}
      >
        <div className="max-w-6xl mx-auto px-8 w-full">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12 items-center">

            {/* Left: copy */}
            <div className="flex flex-col gap-8">

              {/* Eyebrow */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(124, 92, 255,0.12)',
                  border: '1px solid rgba(124, 92, 255,0.3)',
                  color: '#A5A3F0',
                  borderRadius: 100,
                  padding: '5px 14px 5px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'rgba(124, 92, 255,0.25)' }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M6 1L7.5 4.5L11 5.5L8.5 8L9 11.5L6 10L3 11.5L3.5 8L1 5.5L4.5 4.5L6 1Z" fill="#A5A3F0" />
                    </svg>
                  </span>
                  <ShinyText text="Now in beta · free to join" color="#A5A3F0" shineColor="#ffffff" speed={4} />
                </span>
              </div>

              {/* H1 — giant */}
              <div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 'clamp(52px, 7.5vw, 96px)',
                    letterSpacing: '-0.045em',
                    lineHeight: 0.93,
                    margin: 0,
                    color: '#F0F0F6',
                  }}
                >
                  More customers,
                </h1>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 'clamp(52px, 7.5vw, 96px)',
                    letterSpacing: '-0.045em',
                    lineHeight: 0.93,
                    margin: 0,
                    marginTop: '0.06em',
                    background: 'linear-gradient(135deg, #7B78E8 0%, #7C5CFF 45%, #9B8AF0 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  less filming.
                </h1>
              </div>

              {/* Subline */}
              <p style={{
                fontSize: 'clamp(17px, 1.8vw, 21px)',
                color: 'rgba(255,255,255,0.5)',
                maxWidth: 480,
                lineHeight: 1.65,
                margin: 0,
                fontWeight: 400,
              }}>
                Upload your iPhone footage. Get polished, platform-ready videos that bring in real customers — in minutes.
              </p>

              {/* CTA row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <Link
                  href="/sign-up"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#7C5CFF',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 700,
                    textDecoration: 'none',
                    padding: '14px 28px',
                    borderRadius: 12,
                    boxShadow: '0 0 0 1px rgba(124, 92, 255,0.5), 0 8px 32px rgba(124, 92, 255,0.45)',
                    transition: 'box-shadow 200ms ease, transform 150ms ease',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.boxShadow = '0 0 0 1px rgba(124, 92, 255,0.9), 0 12px 40px rgba(124, 92, 255,0.6)'
                    el.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.boxShadow = '0 0 0 1px rgba(124, 92, 255,0.5), 0 8px 32px rgba(124, 92, 255,0.45)'
                    el.style.transform = 'translateY(0)'
                  }}
                >
                  Start for free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 15,
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'color 160ms ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.8)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)' }}
                >
                  See how it works →
                </Link>
              </div>

              {/* Trust */}
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', margin: 0, letterSpacing: '0.01em' }}>
                Free during beta &middot; No credit card &middot; Cancel anytime
              </p>

              {/* Beta code entry */}
              <BetaCodeWidget />

            </div>

            {/* Right: product preview */}
            <div className="flex justify-center lg:justify-end" style={{ position: 'relative' }}>
              {/* Glow behind slider */}
              <div style={{
                position: 'absolute',
                inset: '-20%',
                background: 'radial-gradient(ellipse at center, rgba(124, 92, 255,0.22) 0%, transparent 65%)',
                pointerEvents: 'none',
                zIndex: 0,
              }} aria-hidden />
              <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>
                <BeforeAfterSlider />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,24,39,0.4)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-3">
            {([
              { to: 3, suffix: ' min', label: 'Average turnaround' },
              { to: 10, suffix: '×', label: 'More content output' },
              { text: 'Free', label: 'During beta' },
            ] as { to?: number; suffix?: string; text?: string; label: string }[]).map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5 py-9 px-4 text-center"
                style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'clamp(24px, 3.5vw, 36px)',
                  background: 'linear-gradient(135deg, #A5A3F0, #7C5CFF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}>
                  {stat.text ?? (
                    <>
                      <CountUp to={stat.to as number} duration={2} />
                      {stat.suffix}
                    </>
                  )}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
