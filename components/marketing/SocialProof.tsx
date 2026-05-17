'use client'

import { useEffect, useRef, useState } from 'react'

/* ─── Count-up hook ──────────────────────────────────────────────────────── */
function useCountUp(target: number, duration: number, started: boolean, decimals = 0) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!started) return
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3)
      const raw = eased * target
      setValue(decimals > 0 ? parseFloat(raw.toFixed(decimals)) : Math.round(raw))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [started, target, duration, decimals])

  return value
}

/* ─── Stat item ──────────────────────────────────────────────────────────── */
type StatProps = {
  rawValue: number
  suffix: string
  label: string
  started: boolean
  duration?: number
  decimals?: number
}

function Stat({ rawValue, suffix, label, started, duration = 1600, decimals = 0 }: StatProps) {
  const count = useCountUp(rawValue, duration, started, decimals)

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div
        className="text-3xl font-medium tracking-tight"
        style={{
          color: 'var(--color-text)',
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
    </div>
  )
}

/* ─── Business type marquee ──────────────────────────────────────────────── */
const BUSINESSES = [
  'Barbershops',
  'Restaurants',
  'Yoga Studios',
  'Plumbers',
  'Photographers',
  'Food Trucks',
  'Personal Trainers',
  'Landscapers',
  'Nail Salons',
  'Dog Groomers',
  'Chiropractors',
  'Florists',
]

function Marquee() {
  // Duplicate for seamless loop
  const items = [...BUSINESSES, ...BUSINESSES]

  return (
    <div className="relative overflow-hidden w-full" aria-hidden>
      {/* Fade edges */}
      <div
        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, var(--color-bg), transparent)',
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, var(--color-bg), transparent)',
        }}
      />

      <div
        className="flex items-center gap-3 py-1"
        style={{
          width: 'max-content',
          animation: 'marqueeScroll 30s linear infinite',
        }}
      >
        {items.map((biz, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-sm px-3 py-1.5 rounded-pill flex-shrink-0"
            style={{
              background: 'var(--color-surface-elevated)',
              border: '0.5px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {biz}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes marqueeScroll {
            0%, 100% { transform: translateX(0); }
          }
        }
      `}</style>
    </div>
  )
}

/* ─── SocialProof ────────────────────────────────────────────────────────── */
export default function SocialProof() {
  const sectionRef = useRef<HTMLElement>(null)
  const [statsStarted, setStatsStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="Social proof"
      className="py-16 overflow-hidden"
      style={{ borderTop: '0.5px solid var(--color-border)', borderBottom: '0.5px solid var(--color-border)' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-10">
        {/* Headline */}
        <p
          className="text-sm text-center"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Trusted by businesses who don't have time for bad software
        </p>

        {/* Marquee */}
        <Marquee />

        {/* Stats */}
        <div
          className="grid grid-cols-3 gap-8 w-full max-w-lg"
          style={{
            borderTop: '0.5px solid var(--color-border)',
            paddingTop: 32,
          }}
        >
          <Stat rawValue={2400} suffix="+" label="businesses live" started={statsStarted} duration={1400} />
          <Stat rawValue={18} suffix="M" label="videos processed" started={statsStarted} duration={1600} />
          <Stat rawValue={4.9} suffix="★" label="average rating" started={statsStarted} duration={1200} decimals={1} />
        </div>
      </div>
    </section>
  )
}
