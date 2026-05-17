'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'

/* ─── Scroll-reveal wrapper ──────────────────────────────────────────────── */
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

/* ─── Section wrapper ────────────────────────────────────────────────────── */
function FeatureSection({
  children,
  reversed = false,
  id,
}: {
  children: ReactNode
  reversed?: boolean
  id?: string
}) {
  return (
    <div
      id={id}
      className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reversed ? 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1' : ''}`}
    >
      {children}
    </div>
  )
}

/* ─── Smart Onboarding Mockup ────────────────────────────────────────────── */
function OnboardingMockup() {
  const [showAi, setShowAi] = useState(false)

  useEffect(() => {
    const ref = { current: null as HTMLDivElement | null }
    const timer = { id: 0 }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer.id = window.setTimeout(() => setShowAi(true), 800)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    const el = document.getElementById('onboarding-mockup')
    if (el) observer.observe(el)
    return () => {
      observer.disconnect()
      clearTimeout(timer.id)
    }
  }, [])

  return (
    <div
      id="onboarding-mockup"
      className="rounded-container p-6 flex flex-col gap-5"
      style={{
        background: 'var(--color-surface)',
        border: '0.5px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-interactive flex items-center justify-center text-xs font-medium"
          style={{ background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }}
        >
          1
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Tell us about your business
        </span>
      </div>

      {/* Question */}
      <div>
        <p className="text-base font-medium mb-3" style={{ color: 'var(--color-text)' }}>
          What do you do in one sentence?
        </p>
        <div
          className="w-full rounded-interactive px-4 py-3 text-sm"
          style={{
            background: 'var(--color-surface-elevated)',
            border: '0.5px solid var(--color-border-strong)',
            color: 'var(--color-text-secondary)',
          }}
        >
          I cut hair and make people feel confident
        </div>

        {/* AI refinement */}
        <div
          style={{
            opacity: showAi ? 1 : 0,
            transform: showAi ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 280ms var(--ease-out), transform 280ms var(--ease-out)',
            marginTop: 10,
          }}
        >
          <div
            className="flex items-start gap-2.5 p-3 rounded-interactive"
            style={{
              background: 'rgba(245,166,35,0.06)',
              border: '0.5px solid rgba(245,166,35,0.2)',
            }}
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
              style={{ background: 'var(--color-primary)', fontSize: 9, color: '#0A0A0B', fontWeight: 700 }}
            >
              AI
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--color-primary)' }}>
                AI is refining...
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                "Premium barbershop creating sharp looks and lasting confidence for modern men."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 rounded-full flex-1"
            style={{
              background: i === 0 ? 'var(--color-primary)' : 'var(--color-border-strong)',
              transition: 'background 200ms var(--ease-out)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Content Intelligence Mockup ────────────────────────────────────────── */
const CONTENT_IDEAS = [
  {
    hook: '"The 3-minute trick that makes clients book twice as often"',
    platform: 'TikTok',
    trend: '↑ 24%',
    trending: true,
  },
  {
    hook: '"Before & after: what a proper fade actually looks like"',
    platform: 'Instagram',
    trend: '↑ 12%',
    trending: true,
  },
  {
    hook: '"Why most guys ruin their haircut on day 3"',
    platform: 'YouTube',
    trend: 'Evergreen',
    trending: false,
  },
  {
    hook: '"I asked 50 clients what they actually want. Here\'s what I learned."',
    platform: 'LinkedIn',
    trend: '↑ 8%',
    trending: false,
  },
]

function ContentMockup() {
  return (
    <div
      className="rounded-container p-5 grid grid-cols-2 gap-3"
      style={{
        background: 'var(--color-surface)',
        border: '0.5px solid var(--color-border)',
      }}
    >
      {CONTENT_IDEAS.map((idea, i) => (
        <div
          key={i}
          className="card-hover rounded-card p-3.5 flex flex-col gap-2.5"
          style={{
            background: 'var(--color-surface-elevated)',
            border: '0.5px solid var(--color-border)',
          }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
            {idea.hook}
          </p>
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span
              className="text-xs px-2 py-0.5 rounded-pill"
              style={{
                background: 'var(--color-primary-muted)',
                color: 'var(--color-primary)',
              }}
            >
              {idea.platform}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: idea.trending ? 'var(--color-success)' : 'var(--color-text-muted)' }}
            >
              {idea.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Video Pipeline Mockup ──────────────────────────────────────────────── */
type PipelineStep = {
  label: string
  percent: number
  done: boolean
}

const PIPELINE_STEPS: PipelineStep[] = [
  { label: 'Analyzing footage quality', percent: 100, done: true },
  { label: 'Stabilizing & color grading', percent: 100, done: true },
  { label: 'Generating captions', percent: 75, done: false },
  { label: 'Optimizing for platforms', percent: 50, done: false },
]

function ProgressBar({ percent, animate, done }: { percent: number; animate: boolean; done: boolean }) {
  return (
    <div
      className="relative h-1.5 rounded-full overflow-hidden"
      style={{ background: 'var(--color-border-strong)' }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 rounded-full"
        style={{
          background: done ? 'var(--color-success)' : 'var(--color-primary)',
          width: animate ? `${percent}%` : '0%',
          transition: animate
            ? `width ${600 + percent * 8}ms var(--ease-out)`
            : 'none',
        }}
      />
    </div>
  )
}

function PipelineMockup() {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setAnimate(true), 200)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    const el = document.getElementById('pipeline-mockup')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      id="pipeline-mockup"
      className="rounded-container p-6 flex flex-col gap-4"
      style={{
        background: 'var(--color-surface)',
        border: '0.5px solid var(--color-border)',
        fontFamily: 'monospace',
      }}
    >
      {/* Filename header */}
      <div
        className="flex items-center gap-2 pb-3"
        style={{ borderBottom: '0.5px solid var(--color-border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          processing
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
          barbershop_reel_0514.mp4
        </span>
      </div>

      {PIPELINE_STEPS.map((step, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-sm flex-shrink-0"
                style={{
                  color: step.done ? 'var(--color-success)' : step.percent < 100 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  opacity: animate ? 1 : 0,
                  transition: `opacity 200ms var(--ease-out) ${i * 150}ms`,
                }}
              >
                {step.done ? '✓' : step.percent < 100 ? '→' : '·'}
              </span>
              <span
                className="text-xs truncate"
                style={{
                  color: step.done ? 'var(--color-text-secondary)' : step.percent < 100 ? 'var(--color-text)' : 'var(--color-text-muted)',
                }}
              >
                {step.label}...
              </span>
            </div>
            <span
              className="text-xs flex-shrink-0 font-medium"
              style={{
                color: step.done ? 'var(--color-success)' : 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {step.percent}%
            </span>
          </div>
          <ProgressBar percent={step.percent} animate={animate} done={step.done} />
        </div>
      ))}
    </div>
  )
}

/* ─── Features section ───────────────────────────────────────────────────── */
export default function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-24"
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-24">
        {/* Section label */}
        <ScrollReveal className="text-center">
          <div
            className="inline-block text-xs uppercase tracking-widest font-medium mb-3"
            style={{ color: 'var(--color-primary)' }}
          >
            Features
          </div>
          <h2
            id="features-heading"
            className="text-heading"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--color-text)' }}
          >
            Everything you need. Nothing you don't.
          </h2>
        </ScrollReveal>

        {/* 01 — Smart Onboarding */}
        <FeatureSection>
          <ScrollReveal delay={0}>
            <div className="flex flex-col gap-5">
              <div className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>
                01 / Smart Onboarding
              </div>
              <h3
                className="text-heading"
                style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--color-text)' }}
              >
                The intake form that thinks for you
              </h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Answer five plain-English questions. Our AI does the rest — translating your story into polished brand copy, content pillars, and a posting strategy tailored to your industry.
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  'No marketing jargon required',
                  'Smart suggestions as you type',
                  'Done in under 5 minutes',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <OnboardingMockup />
          </ScrollReveal>
        </FeatureSection>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--color-border)' }} role="separator" />

        {/* 02 — Content Intelligence */}
        <FeatureSection reversed>
          <ScrollReveal delay={0}>
            <div className="flex flex-col gap-5">
              <div className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>
                02 / Content Intelligence
              </div>
              <h3
                className="text-heading"
                style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--color-text)' }}
              >
                Content ideas that actually fit your business
              </h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                No generic tips. We analyze your niche, your location, and what's trending in your category — then surface ideas you can actually film this week.
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  'Industry-specific hooks updated weekly',
                  'Platform-optimized formats (TikTok, Reels, Shorts)',
                  'Trend signals from your market',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <ContentMockup />
          </ScrollReveal>
        </FeatureSection>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--color-border)' }} role="separator" />

        {/* 03 — Video Transformation */}
        <FeatureSection>
          <ScrollReveal delay={0}>
            <div className="flex flex-col gap-5">
              <div className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>
                03 / Video Transformation
              </div>
              <h3
                className="text-heading"
                style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--color-text)' }}
              >
                Send us your shaky iPhone footage. We send back pro content.
              </h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Upload whatever you have. We stabilize, color grade, add captions, resize for every platform, and return videos that look like you hired a production crew.
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  'Stabilization & professional color grading',
                  'Auto-captions in your brand voice',
                  'Export for TikTok, Instagram, YouTube',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <PipelineMockup />
          </ScrollReveal>
        </FeatureSection>
      </div>
    </section>
  )
}
