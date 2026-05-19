'use client'

import { useRef } from 'react'

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

/* ─── Empty slot card ────────────────────────────────────────────────────── */
function EmptySlot({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl text-center"
      style={{ border: '1px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)', minHeight: 200 }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.15)' }}>
        <span style={{ fontSize: 16, color: '#6366f1' }}>+</span>
      </div>
      <p style={{ fontSize: 12, color: '#3f3f46', lineHeight: 1.5 }}>{label}</p>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function SocialProof() {
  const sectionRef = useRef<HTMLElement>(null)

  return (
    <section ref={sectionRef} aria-label="Social proof" className="py-20 overflow-hidden"
      style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-14">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 0 3px rgba(74,222,128,0.2)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Early beta — spots open</span>
          </div>
          <p style={{ fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.03em', lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>
            Be one of the first success stories.
          </p>
          <p style={{ fontSize: 14, color: '#71717A', maxWidth: '42ch', lineHeight: 1.6 }}>
            We&apos;re in early beta. These slots are reserved for real results from real business owners — not made-up testimonials.
          </p>
        </div>

        {/* CTA + empty slots grid */}
        <div className="grid md:grid-cols-3 gap-4">

          {/* CTA card */}
          <div className="flex flex-col gap-4 p-6 rounded-2xl md:col-span-1"
            style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
            <div className="flex flex-col gap-2 flex-1">
              <p style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Share your results</p>
              <p style={{ fontSize: 14, color: '#E4E4E7', lineHeight: 1.65 }}>
                Used BrandLift and got results? We&apos;d love to feature your story here and send you 3 months free in return.
              </p>
              <p style={{ fontSize: 12, color: '#52525B', lineHeight: 1.5, marginTop: 4 }}>
                Just email us a quick summary — your business, what you posted, and what happened.
              </p>
            </div>
            <a
              href="mailto:hello@brandlift.app?subject=My BrandLift results"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
              style={{ background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.15)' }}
            >
              Share your story →
            </a>
          </div>

          {/* Empty slots */}
          <EmptySlot label="Your results could be here. We&apos;ll feature real wins from real beta users." />
          <EmptySlot label="Got a before & after? A spike in bookings? We want to hear it." />
        </div>

        {/* Honest stat + marquee */}
        <div className="flex flex-col gap-8">
          <div className="flex justify-center"
            style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 32 }}>
            <div className="flex flex-col items-center gap-1 text-center">
              <span style={{ fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'var(--font-display)' }}>
                ~8 min
              </span>
              <span style={{ fontSize: 12, color: '#52525B', fontWeight: 500 }}>average onboarding time</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p style={{ fontSize: 11, color: '#3f3f46', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Built for every local business</p>
            <Marquee />
          </div>
        </div>

      </div>
    </section>
  )
}
