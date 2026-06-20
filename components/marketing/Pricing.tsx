'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Zap, Music, Type, Scissors, Palette, MessageSquare, Clock, TrendingUp, Video, Check } from 'lucide-react'
import Iridescence from '@/components/reactbits/Iridescence'
import Magnet from '@/components/reactbits/Magnet'
import ShinyText from '@/components/reactbits/ShinyText'

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
    <section id="pricing" aria-labelledby="pricing-heading" className="py-24 relative overflow-hidden" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.12]" aria-hidden>
        <Iridescence color={[0.49, 0.36, 1]} amplitude={0.1} speed={0.8} mouseReact={false} />
      </div>
      <div className="max-w-5xl mx-auto px-6 flex flex-col gap-14 relative z-10">

        {/* Header */}
        <ScrollReveal className="flex flex-col items-center gap-5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--text-secondary)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'var(--success)' }} />
            <ShinyText text="Beta · 100% Free" color="#A9A2C4" shineColor="#ffffff" speed={4} />
          </div>
          <h2
            id="pricing-heading"
            style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1.05, fontFamily: 'var(--font-display)' }}
          >
            No subscriptions.<br />
            No paywalls. No catch.
          </h2>
          <p className="max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            BrandLift is in private beta. Every feature — AI video, scripts, captions, website analysis, and exports — is completely free while we build.
          </p>
        </ScrollReveal>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BETA_FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <ScrollReveal key={f.label} delay={i * 25}>
                <div
                  className="flex items-start gap-3 p-4 transition-all duration-150 h-full"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--accent-border)'
                    el.style.background = 'var(--surface-raised)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--border-subtle)'
                    el.style.background = 'var(--surface)'
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--accent-subtle)', borderRadius: 'var(--radius)' }}>
                    <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</p>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>Free</span>
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        {/* CTA card */}
        <ScrollReveal>
          <div
            className="p-8 flex flex-col items-center gap-6 text-center"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p className="text-[22px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
              Ready to 10x your content output?
            </p>
            <p className="text-[14px] max-w-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Early beta — every feature is free. Lock in your spot before paid plans launch.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {VALUE_PROPS.map(v => (
                <span key={v} className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <Check className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  {v}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Magnet padding={60} magnetStrength={5}>
                <button
                  onClick={() => router.push('/sign-up')}
                  className="btn-primary"
                  style={{ height: 44, fontSize: 15, paddingLeft: 32, paddingRight: 32 }}
                >
                  Claim your free spot
                </button>
              </Magnet>
              <button
                onClick={() => router.push('/sign-in')}
                className="btn-ghost"
                style={{ height: 44, fontSize: 14 }}
              >
                Sign in
              </button>
            </div>
          </div>
        </ScrollReveal>

      </div>
    </section>
  )
}
