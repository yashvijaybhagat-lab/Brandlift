'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Zap, Music, Type, Scissors, Palette, MessageSquare, Clock, TrendingUp, Video } from 'lucide-react'

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
  { icon: Video,        label: 'AI Script Generation',   desc: 'Gen Z-tuned scripts written like a real person' },
  { icon: Sparkles,     label: 'AI Video Enhancement',   desc: '4× upscaling with Real-ESRGAN' },
  { icon: Music,        label: 'AI Background Music',    desc: 'Auto-matched to your video mood' },
  { icon: Type,         label: 'AI Captions',            desc: 'Auto-generated from your script, styled' },
  { icon: Palette,      label: 'Color Grading',          desc: 'Cinematic presets in one click' },
  { icon: Scissors,     label: 'Video Trimming',         desc: 'Set in/out points before export' },
  { icon: MessageSquare,label: 'Text Overlays',          desc: 'Hook text and CTAs baked in' },
  { icon: TrendingUp,   label: 'Posting Time Intel',     desc: 'Platform-specific peak time recommendations' },
  { icon: Zap,          label: 'Content Ideas (AI)',     desc: 'Unlimited AI-tailored hooks for your business' },
  { icon: Clock,        label: 'More features weekly',   desc: "We're shipping fast — join and shape the roadmap" },
]

export default function Pricing() {
  const router = useRouter()
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-24" style={{ borderTop: '0.5px solid var(--color-border)' }}>
      <div className="max-w-5xl mx-auto px-6 flex flex-col gap-16">

        {/* Header */}
        <ScrollReveal className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse inline-block" />
            Beta · Completely Free
          </div>
          <h2 id="pricing-heading" style={{ fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-text)', lineHeight: 1.1 }}>
            Everything is free.<br />
            <span style={{ color: '#818cf8' }}>You&apos;re early.</span>
          </h2>
          <p className="max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            BrandLift is in beta. No credit card, no plans, no paywalls. Every feature — including the ones still being built — is unlocked for all beta users. In exchange, we just ask you to tell us what sucks.
          </p>
        </ScrollReveal>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BETA_FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <ScrollReveal key={f.label} delay={i * 35}>
                <div
                  className="flex items-start gap-3 p-4 rounded-2xl transition-all duration-200"
                  style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-elevated)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)' }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                    <Icon className="w-4 h-4" style={{ color: '#818cf8' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{f.label}</p>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '0.5px solid rgba(74,222,128,0.2)' }}>Free</span>
                    </div>
                    <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        {/* CTA */}
        <ScrollReveal className="flex flex-col items-center gap-5">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => router.push('/sign-up')}
              className="px-8 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)', boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 12px 32px rgba(99,102,241,0.35)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              Join the beta — it&apos;s free
            </button>
            <button
              onClick={() => router.push('/sign-in')}
              className="px-6 py-3.5 rounded-xl text-[14px] transition-all duration-150"
              style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', color: '#71717A' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
            >
              Already have an account →
            </button>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            No credit card · No limits · Cancel whenever (there&apos;s nothing to cancel)
          </p>
        </ScrollReveal>

      </div>
    </section>
  )
}
