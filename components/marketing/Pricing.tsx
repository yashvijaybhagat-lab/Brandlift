'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Zap, Music, Type, Scissors, Palette, MessageSquare, Clock, TrendingUp, Video, Check } from 'lucide-react'

function ScrollReveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setTimeout(() => setVisible(true), delay); observer.disconnect() } }, { threshold: 0.12 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 300ms ease, transform 300ms ease' }}>
      {children}
    </div>
  )
}


const BETA_FEATURES = [
  { icon: Video,         label: 'AI Script Generation',   desc: 'Gen Z-tuned scripts that actually convert' },
  { icon: Sparkles,      label: 'AI Video Enhancement',   desc: '4× upscaling, stabilization, color grading' },
  { icon: Music,         label: 'AI Background Music',    desc: 'Auto-matched soundtrack to your video mood' },
  { icon: Type,          label: 'Auto-Captions',          desc: 'Generated from your script, perfectly styled' },
  { icon: Palette,       label: 'Cinematic Color Grading',desc: 'Pro-grade presets applied in one click' },
  { icon: Scissors,      label: 'Video Trimming',         desc: 'Set in/out points before exporting' },
  { icon: MessageSquare, label: 'Hook Overlays',          desc: 'Attention-grabbing text and CTAs baked in' },
  { icon: TrendingUp,    label: 'Posting Time Intel',     desc: 'Best time to post per platform, per week' },
  { icon: Zap,           label: 'Unlimited Content Ideas',desc: 'AI hooks tailored to your niche, daily' },
  { icon: Clock,         label: 'New features every week',desc: "We ship fast — join now and shape what's built" },
]

const VALUE_PROPS = [
  'No credit card',
  'No usage limits',
  'Cancel anytime',
  'Free during beta',
]

export default function Pricing() {
  const router = useRouter()
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-24" style={{ borderTop: '0.5px solid var(--color-border)' }}>
      <div className="max-w-5xl mx-auto px-6 flex flex-col gap-14">

        {/* Header */}
        <ScrollReveal className="flex flex-col items-center gap-5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse inline-block" />
            Beta · 100% Free
          </div>
          <h2
            id="pricing-heading"
            style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-text)', lineHeight: 1.05, fontFamily: 'var(--font-display)' }}
          >
            No subscriptions.<br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 45%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              No paywalls. No catch.
            </span>
          </h2>
          <p className="max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            BrandLift is in private beta. Every feature — AI video, scripts, captions, website analysis, and exports — is completely free while we build.
          </p>
        </ScrollReveal>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BETA_FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <ScrollReveal key={f.label} delay={i * 30}>
                <div
                  className="flex items-start gap-3 p-4 rounded-2xl transition-all duration-200 h-full"
                  style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--color-surface-elevated)'
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                    <Icon className="w-4 h-4" style={{ color: '#818cf8' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{f.label}</p>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '0.5px solid rgba(74,222,128,0.2)' }}>Free</span>
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        {/* CTA card */}
        <ScrollReveal>
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-6 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)',
              border: '0.5px solid rgba(99,102,241,0.2)',
            }}
          >
            {/* Subtle glow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 pointer-events-none"
              aria-hidden
              style={{
                background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />

            <div className="relative z-10 flex flex-col items-center gap-4">
              <p className="text-[22px] font-bold" style={{ color: '#FAFAFA', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                Ready to 10× your content output?
              </p>
              <p className="text-[14px] max-w-sm" style={{ color: '#71717A', lineHeight: 1.65 }}>
                Join hundreds of small businesses already saving 10+ hours a week on content creation.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {VALUE_PROPS.map(v => (
                  <span key={v} className="flex items-center gap-1.5 text-[12px]" style={{ color: '#A1A1AA' }}>
                    <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#4ADE80' }} />
                    {v}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                <button
                  onClick={() => router.push('/sign-up')}
                  className="px-8 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)', boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 12px 32px rgba(99,102,241,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.3)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                >
                  Claim your free spot →
                </button>
                <button
                  onClick={() => router.push('/sign-in')}
                  className="px-6 py-3.5 rounded-xl text-[14px] transition-all duration-150"
                  style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', color: '#71717A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
                >
                  Sign in →
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>

      </div>
    </section>
  )
}
