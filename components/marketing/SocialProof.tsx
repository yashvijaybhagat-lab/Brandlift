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
      const eased = 1 - Math.pow(1 - progress, 3)
      const raw = eased * target
      setValue(decimals > 0 ? parseFloat(raw.toFixed(decimals)) : Math.round(raw))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, target, duration, decimals])
  return value
}

/* ─── Testimonials ───────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    initials: 'MR',
    name: 'Marcus R.',
    business: 'Fade Factory Barbershop',
    location: 'Austin, TX',
    result: '14.2K views on first post',
    resultColor: '#4ADE80',
    quote: "I had no idea how to make a TikTok. Put out my first video using BrandLift's script — got more new bookings in one week than a whole month of flyers. The color grading makes my shop look like a movie.",
    color: '#6366f1',
  },
  {
    initials: 'SM',
    name: 'Sofia M.',
    business: 'Luna Yoga Studio',
    location: 'Denver, CO',
    result: '340% more Instagram reach',
    resultColor: '#a78bfa',
    quote: "The content ideas are actually specific to yoga studios — not generic 'post your values' filler. My class waitlist filled up in 3 days after I posted the first video it wrote for me.",
    color: '#8b5cf6',
  },
  {
    initials: 'JT',
    name: 'James T.',
    business: 'Taqueria del Sol',
    location: 'Phoenix, AZ',
    result: '800+ new followers in 2 weeks',
    resultColor: '#f59e0b',
    quote: "My son kept saying I needed to be on TikTok. I finally tried this. Now he's asking ME for advice. The hashtag generator alone saved me hours of googling and my food content actually looks professional.",
    color: '#06b6d4',
  },
]

/* ─── Business type marquee ──────────────────────────────────────────────── */
const BUSINESSES = [
  'Barbershops', 'Restaurants', 'Yoga Studios', 'Plumbers',
  'Photographers', 'Food Trucks', 'Personal Trainers', 'Landscapers',
  'Nail Salons', 'Dog Groomers', 'Chiropractors', 'Florists',
  'Coffee Shops', 'Gyms', 'Real Estate Agents', 'Bakeries',
]

function Marquee() {
  const items = [...BUSINESSES, ...BUSINESSES]
  return (
    <div className="relative overflow-hidden w-full" aria-hidden>
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #0A0A0B, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #0A0A0B, transparent)' }} />
      <div className="flex items-center gap-2.5 py-1"
        style={{ width: 'max-content', animation: 'marqueeScroll 35s linear infinite' }}>
        {items.map((biz, i) => (
          <span key={i} className="whitespace-nowrap text-[12px] px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', color: '#71717A' }}>
            {biz}
          </span>
        ))}
      </div>
      <style>{`@keyframes marqueeScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  )
}

/* ─── Star rating ────────────────────────────────────────────────────────── */
function Stars() {
  return (
    <div className="flex gap-0.5">
      {[0,1,2,3,4].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden>
          <path d="M6 1l1.236 2.505L10 3.97l-2 1.95.472 2.75L6 7.25l-2.472 1.42L4 5.92 2 3.97l2.764-.465z"/>
        </svg>
      ))}
    </div>
  )
}

/* ─── Stats row ──────────────────────────────────────────────────────────── */
function StatItem({ value, suffix, label, started, duration = 1800 }: { value: number; suffix: string; label: string; started: boolean; duration?: number }) {
  const count = useCountUp(value, duration, started)
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span style={{ fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
        {count.toLocaleString()}{suffix}
      </span>
      <span style={{ fontSize: 12, color: '#52525B', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function SocialProof() {
  const sectionRef = useRef<HTMLElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect() }
    }, { threshold: 0.3 })
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} aria-label="Social proof" className="py-20 overflow-hidden"
      style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-14">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 0 3px rgba(74,222,128,0.2)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Early beta results</span>
          </div>
          <p style={{ fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.03em', lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>
            Real businesses. Real results.
          </p>
          <p style={{ fontSize: 14, color: '#71717A', maxWidth: '38ch', lineHeight: 1.6 }}>
            From barbershops to taco trucks — small businesses are going viral without a marketing team.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <div key={t.name}
              className="flex flex-col gap-4 p-5 rounded-2xl transition-all duration-200"
              style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${t.color}30`; (e.currentTarget as HTMLElement).style.background = '#141416' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = '#111113' }}
            >
              {/* Result badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit"
                style={{ background: `${t.resultColor}10`, border: `0.5px solid ${t.resultColor}30` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.resultColor }}>↑ {t.result}</span>
              </div>

              {/* Quote */}
              <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.7, flex: 1 }}>
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-1" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                  style={{ background: `${t.color}20`, color: t.color, border: `0.5px solid ${t.color}40` }}>
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>{t.name}</p>
                    <Stars />
                  </div>
                  <p style={{ fontSize: 11, color: '#52525B', lineHeight: 1.3 }}>{t.business} · {t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-3 gap-6"
            style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 32 }}>
            <StatItem value={340} suffix="+" label="businesses in beta" started={started} />
            <StatItem value={12400} suffix="" label="videos created" started={started} duration={2200} />
            <StatItem value={8} suffix=" min" label="avg onboarding time" started={started} duration={1200} />
          </div>

          {/* Business type marquee */}
          <div className="flex flex-col gap-3">
            <p style={{ fontSize: 11, color: '#3f3f46', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Works for every local business</p>
            <Marquee />
          </div>
        </div>

      </div>
    </section>
  )
}
