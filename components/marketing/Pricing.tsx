'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

/* ─── Scroll-reveal ──────────────────────────────────────────────────────── */
function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 280ms var(--ease-out), transform 280ms var(--ease-out)',
      }}
    >
      {children}
    </div>
  )
}

/* ─── Hold-to-subscribe button ───────────────────────────────────────────── */
function HoldButton({ onComplete }: { onComplete: () => void }) {
  const [holding, setHolding] = useState(false)
  const [clip, setClip] = useState(100) // right inset %
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const HOLD_DURATION = 2000

  const startHold = () => {
    setHolding(true)
    startTimeRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / HOLD_DURATION, 1)
      const inset = 100 - progress * 100
      setClip(inset)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Complete
        setTimeout(onComplete, 100)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const endHold = () => {
    setHolding(false)
    cancelAnimationFrame(rafRef.current)
    setClip(100)
  }

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      aria-label="Hold to get started — hold the button for 2 seconds to proceed"
      className="relative w-full overflow-hidden rounded-interactive py-3.5 text-sm font-medium select-none"
      style={{
        background: 'var(--color-surface-elevated)',
        border: '0.5px solid var(--color-primary)',
        color: 'var(--color-primary)',
        transform: holding ? 'scale(0.97)' : 'scale(1)',
        transition: holding
          ? 'transform 130ms var(--ease-out)'
          : 'transform 200ms var(--ease-out)',
        cursor: 'pointer',
      }}
    >
      {/* Amber fill overlay via clip-path */}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none"
        style={{
          background: 'var(--color-primary)',
          color: '#0A0A0B',
          clipPath: `inset(0 ${clip}% 0 0)`,
          transition: holding ? 'none' : 'clip-path 200ms var(--ease-out)',
        }}
      >
        {clip < 50 ? 'Almost there...' : 'Hold to get started'}
      </span>
      <span className="relative z-10">
        {clip < 50 ? 'Almost there...' : 'Hold to get started'}
      </span>
    </button>
  )
}

/* ─── Plan types ─────────────────────────────────────────────────────────── */
type Plan = {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  popular?: boolean
  cta?: 'primary' | 'hold' | 'ghost'
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Everything you need to get your first win.',
    features: [
      '1 video/month',
      'Basic content ideas',
      'Your business profile',
      'Community support',
    ],
    cta: 'ghost',
  },
  {
    name: 'Growth',
    price: '$49',
    period: '/mo',
    description: 'For businesses ready to grow consistently.',
    features: [
      '10 videos/month',
      'Full content intelligence',
      'Video transformation',
      'Priority support',
      'Content calendar',
    ],
    popular: true,
    cta: 'hold',
  },
  {
    name: 'Pro',
    price: '$149',
    period: '/mo',
    description: "For agencies and businesses that don't compromise.",
    features: [
      'Unlimited videos',
      'White-label option',
      'Custom domain',
      'Dedicated support',
      'API access',
    ],
    cta: 'hold',
  },
]

/* ─── Pricing card ───────────────────────────────────────────────────────── */
function PricingCard({ plan, delay }: { plan: Plan; delay: number }) {
  const router = useRouter()

  return (
    <ScrollReveal delay={delay}>
      <div
        className="relative flex flex-col gap-6 rounded-container p-6 h-full card-hover"
        style={{
          background: plan.popular ? 'var(--color-surface-elevated)' : 'var(--color-surface)',
          border: plan.popular
            ? '0.5px solid rgba(99,102,241,0.3)'
            : '0.5px solid var(--color-border)',
          boxShadow: plan.popular ? '0 0 0 1px rgba(99,102,241,0.08)' : 'none',
        }}
      >
        {/* Most Popular badge */}
        {plan.popular && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium px-3 py-1 rounded-pill"
            style={{
              background: 'var(--color-primary)',
              color: '#0A0A0B',
            }}
          >
            Most Popular
          </div>
        )}

        {/* Plan header */}
        <div className="flex flex-col gap-1.5">
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {plan.name}
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="font-medium"
              style={{
                fontSize: 'clamp(28px, 3vw, 36px)',
                letterSpacing: '-0.03em',
                color: 'var(--color-text)',
              }}
            >
              {plan.price}
            </span>
            {plan.period && (
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {plan.period}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {plan.description}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--color-border)' }} />

        {/* Features */}
        <ul className="flex flex-col gap-2.5 flex-1">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2.5 text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto pt-2">
          {plan.cta === 'hold' ? (
            <HoldButton onComplete={() => router.push('/sign-up')} />
          ) : plan.cta === 'primary' ? (
            <button
              onClick={() => router.push('/sign-up')}
              className="pressable w-full py-3.5 rounded-interactive text-sm font-medium"
              style={{ background: 'var(--color-primary)', color: '#0A0A0B' }}
            >
              Get started
            </button>
          ) : (
            <button
              onClick={() => router.push('/sign-up')}
              className="pressable w-full py-3.5 rounded-interactive text-sm"
              style={{
                background: 'transparent',
                border: '0.5px solid var(--color-border-strong)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Start for free
            </button>
          )}
        </div>
      </div>
    </ScrollReveal>
  )
}

/* ─── Pricing section ────────────────────────────────────────────────────── */
export default function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="py-24"
      style={{ borderTop: '0.5px solid var(--color-border)' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-12">
        {/* Header */}
        <ScrollReveal className="text-center flex flex-col items-center gap-3">
          <div
            className="text-xs uppercase tracking-widest font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            Pricing
          </div>
          <h2
            id="pricing-heading"
            className="text-heading"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--color-text)' }}
          >
            Simple pricing. No surprises.
          </h2>
          <p className="max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
            Start free and upgrade when you&apos;re ready. No contracts, cancel anytime.
          </p>
        </ScrollReveal>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan, i) => (
            <PricingCard key={plan.name} plan={plan} delay={i * 60} />
          ))}
        </div>

        {/* Bottom note */}
        <ScrollReveal className="text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            All plans include a 14-day free trial on paid features · No credit card required to start
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
