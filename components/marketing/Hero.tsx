'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import Link from 'next/link'

function useAnalyticsStats() {
  const [stats, setStats] = useState<{ visitors: number; countries: number } | null>(null)

  useEffect(() => {
    const load = () =>
      fetch('/api/analytics/countries')
        .then(r => r.json())
        .then((d: { configured?: boolean; totalVisitors?: number; totalCountries?: number }) => {
          if (d.configured && d.totalVisitors && d.totalCountries) {
            setStats({ visitors: d.totalVisitors, countries: d.totalCountries })
          }
        })
        .catch(() => {})

    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return stats
}

function formatVisitors(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toString()
}

/* ─── Stagger reveal helper ─────────────────────────────────────────────── */
type RevealProps = {
  delay?: number
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

function Reveal({ delay = 0, children, className, style }: RevealProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(id)
  }, [delay])

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 280ms var(--ease-out), transform 280ms var(--ease-out)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Before/After video mockup slider ──────────────────────────────────── */
function VideoReveal() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const x = useMotionValue(0)

  // clip the "After" panel: inset(0 X% 0 0) where X = (1 - handle%) * 100
  const clipPercent = useTransform(x, (v) => {
    if (containerWidth === 0) return 50
    const pct = ((v + containerWidth / 2) / containerWidth) * 100
    return Math.max(0, Math.min(100, pct))
  })

  const afterClip = useTransform(clipPercent, (p) => `inset(0 ${100 - p}% 0 0)`)

  // Measure container
  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Demo animation on scroll into view
  useEffect(() => {
    if (containerWidth === 0) return
    let played = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !played) {
          played = true
          const half = containerWidth / 2
          // Sweep left → right → center
          const steps = [
            { target: -half * 0.7, duration: 800 },
            { target: half * 0.7, duration: 1000 },
            { target: 0, duration: 600 },
          ]

          let elapsed = 0
          steps.forEach(({ target, duration }) => {
            setTimeout(() => {
              x.set(target)
            }, elapsed)
            elapsed += duration + 100
          })
        }
      },
      { threshold: 0.4 }
    )

    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [containerWidth, x])

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ aspectRatio: '9/16', maxHeight: 520 }}
      role="img"
      aria-label="Before and after video transformation comparison"
    >
      {/* BEFORE — raw footage */}
      <div
        className="absolute inset-0 rounded-container overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '0.5px solid var(--color-border)',
        }}
      >
        {/* Grain overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
            opacity: 0.6,
          }}
          aria-hidden
        />
        {/* Desaturated/dim content placeholder */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ filter: 'grayscale(0.6) brightness(0.55)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="rgba(255,255,255,0.4)" />
            </svg>
          </div>
          <div className="space-y-1.5 px-6 w-full">
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="h-2 rounded-full" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.1)', margin: '0 auto' }} />
            ))}
          </div>
        </div>
        {/* Label */}
        <div
          className="absolute bottom-3 left-3 text-xs px-2.5 py-1 rounded-pill"
          style={{
            background: 'rgba(0,0,0,0.6)',
            color: 'var(--color-text-muted)',
            border: '0.5px solid var(--color-border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          Your iPhone footage
        </div>
      </div>

      {/* AFTER — polished output */}
      <motion.div
        className="absolute inset-0 rounded-container overflow-hidden"
        style={{
          clipPath: afterClip,
          background: 'linear-gradient(160deg, #1a1508 0%, #0A0A0B 100%)',
          border: '0.5px solid rgba(99,102,241,0.2)',
        }}
      >
        {/* Vibrant, sharp content placeholder */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {/* Amber glow background */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.5) 0%, transparent 70%)',
            }}
            aria-hidden
          />
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.3)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="rgba(99,102,241,0.9)" />
            </svg>
          </div>
          {/* Caption bars */}
          <div
            className="absolute bottom-12 left-3 right-3 rounded-interactive px-3 py-2"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
              🔥 This is how we do it
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Check the link in bio ↑
            </div>
          </div>
        </div>
        {/* Label */}
        <div
          className="absolute bottom-3 right-3 text-xs px-2.5 py-1 rounded-pill"
          style={{
            background: 'rgba(99,102,241,0.15)',
            color: 'var(--color-primary)',
            border: '0.5px solid rgba(99,102,241,0.3)',
            backdropFilter: 'blur(8px)',
          }}
        >
          AI-polished output
        </div>
      </motion.div>

      {/* Drag handle */}
      <motion.div
        drag="x"
        dragConstraints={containerRef}
        dragElastic={0}
        dragMomentum={false}
        className="absolute top-0 bottom-0 flex items-center justify-center"
        style={{
          x,
          left: '50%',
          marginLeft: -20,
          width: 40,
          cursor: 'ew-resize',
          zIndex: 20,
        }}
        aria-label="Drag to compare before and after"
      >
        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ background: 'rgba(99,102,241,0.5)', left: '50%' }}
          aria-hidden
        />
        {/* Handle circle */}
        <div
          className="relative flex items-center justify-center w-9 h-9 rounded-full shadow-lg"
          style={{
            background: 'var(--color-primary)',
            boxShadow: '0 0 0 2px rgba(99,102,241,0.3), 0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M5 8H11M5 8L3 6M5 8L3 10M11 8L13 6M11 8L13 10" stroke="#0A0A0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
export default function Hero() {
  const stats = useAnalyticsStats()
  return (
    <section
      className="relative min-h-screen flex items-center pt-14 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: 'var(--color-bg)',
          }}
        />
        {/* Amber radial blobs */}
        <div
          className="absolute"
          style={{
            top: '-10%',
            right: '-5%',
            width: '50%',
            height: '60%',
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)',
            animation: 'meshMove1 25s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '0%',
            left: '-5%',
            width: '45%',
            height: '50%',
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 70%)',
            animation: 'meshMove2 30s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            top: '30%',
            left: '20%',
            width: '35%',
            height: '40%',
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.05) 0%, transparent 70%)',
            animation: 'meshMove3 20s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes meshMove1 {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(-3%, 5%); }
            66% { transform: translate(4%, -3%); }
          }
          @keyframes meshMove2 {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(4%, -6%); }
            66% { transform: translate(-3%, 4%); }
          }
          @keyframes meshMove3 {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(5%, 3%); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes meshMove1, @keyframes meshMove2, @keyframes meshMove3 {
              0%, 100% { transform: none; }
            }
          }
        `}</style>
      </div>

      <div className="max-w-6xl mx-auto px-6 w-full py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Eyebrow chip */}
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-sm w-fit"
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '0.5px solid var(--color-border-strong)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: 'var(--color-success)',
                    boxShadow: '0 0 0 3px rgba(74,222,128,0.2)',
                    animation: 'pulse-dot 2s ease-in-out infinite',
                  }}
                  aria-hidden
                />
                <style>{`
                  @keyframes pulse-dot {
                    0%, 100% { box-shadow: 0 0 0 3px rgba(74,222,128,0.2); }
                    50% { box-shadow: 0 0 0 5px rgba(74,222,128,0.1); }
                  }
                `}</style>
                {stats
                  ? `${formatVisitors(stats.visitors)} visits · ${stats.countries} countries`
                  : 'Now in beta · free to join'
                }
              </div>
            </Reveal>

            {/* Headings */}
            <div className="flex flex-col gap-1">
              <Reveal delay={80}>
                <h1
                  id="hero-heading"
                  className="text-heading"
                  style={{
                    fontSize: 'clamp(36px, 5vw, 56px)',
                    lineHeight: 1.1,
                    color: 'var(--color-text)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  You run a great business.
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <h2
                  className="text-heading m-0"
                  style={{
                    fontSize: 'clamp(36px, 5vw, 56px)',
                    lineHeight: 1.1,
                    color: 'var(--color-primary)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Nobody knows it yet.
                </h2>
              </Reveal>
            </div>

            {/* Subhead */}
            <Reveal delay={240}>
              <p
                style={{
                  fontSize: 'clamp(16px, 2vw, 20px)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                  maxWidth: '44ch',
                }}
              >
                We build your digital presence and keep it running — you just show up.
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={320}>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/sign-up"
                  className="pressable inline-flex items-center gap-2 px-6 py-3 rounded-interactive text-sm font-medium"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#0A0A0B',
                  }}
                >
                  Get started free
                </Link>
                <a
                  href="#examples"
                  className="pressable inline-flex items-center gap-1.5 px-5 py-3 rounded-interactive text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  See an example
                  <span aria-hidden>→</span>
                </a>
              </div>
            </Reveal>

            {/* Trust line */}
            <Reveal delay={360}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Free forever · No credit card · Setup in 5 minutes
              </p>
            </Reveal>
          </div>

          {/* Right column — before/after slider */}
          <Reveal delay={400} className="w-full max-w-xs mx-auto lg:max-w-none">
            <VideoReveal />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
