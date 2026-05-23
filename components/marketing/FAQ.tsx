'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

const FAQS = [
  {
    q: 'Is BrandLift actually free?',
    a: "Yes — completely. We're in beta, which means every feature (AI video enhancement, script generation, captions, exports, all of it) is free for everyone who joins now. No credit card required, no hidden limits. When we launch paid plans, early beta users lock in a significant discount.",
  },
  {
    q: 'What kind of businesses use BrandLift?',
    a: "Any business that wants to show up on social media but doesn't have time or budget for a full content team. Barbershops, restaurants, personal trainers, plumbers, photographers, real estate agents, yoga studios — if your customers are on TikTok, Instagram, or YouTube, BrandLift is built for you.",
  },
  {
    q: 'What video formats do you accept?',
    a: 'MP4, MOV, WebM, and AVI up to 500MB. You can upload horizontal, vertical, or square footage — we resize it for every platform automatically. Even shaky, badly-lit iPhone clips work fine.',
  },
  {
    q: 'How long does AI processing take?',
    a: "Most videos are ready in under 3 minutes. Script generation, caption writing, and hook creation are instant. Full video enhancement (upscaling, color grading, stabilization) takes 2–5 minutes depending on clip length. You'll get a notification when it's done.",
  },
  {
    q: 'Do I need any editing skills?',
    a: "None at all. Drop your raw footage, tell us a bit about your business, and BrandLift handles the rest — writing the script, editing the video, adding captions, and sizing it for every platform. If you can send a text, you can use BrandLift.",
  },
  {
    q: 'Which platforms can I export to?',
    a: 'TikTok (9:16 vertical), Instagram Reels & feed (1:1 square and 9:16), YouTube Shorts (9:16), and LinkedIn (1:1). Each export is sized, formatted, and captioned for that specific platform. More platforms coming soon.',
  },
  {
    q: 'Is my content private and secure?',
    a: 'Yes. Your videos are stored in encrypted Vercel Blob storage. Only you can access them. We never use your content to train AI models or share it with third parties. You can delete your videos at any time from your dashboard.',
  },
  {
    q: 'What happens when the beta ends?',
    a: "We'll move to a paid model, but everyone who joins during beta gets grandfathered pricing — significantly cheaper than what new users will pay. The earlier you join, the better the deal you lock in. We'll give at least 30 days' notice before anything changes.",
  },
]

function FAQItem({ q, a, delay }: { q: string; a: string; delay: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 350ms ease ${delay}ms, transform 350ms ease ${delay}ms`,
        borderBottom: '0.5px solid var(--color-border)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span
          className="text-[14px] font-medium leading-snug"
          style={{ color: open ? '#FAFAFA' : '#A1A1AA', transition: 'color 200ms ease' }}
        >
          {q}
        </span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 mt-0.5 transition-transform duration-250"
          style={{ color: '#52525B', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? '400px' : '0',
          overflow: 'hidden',
          transition: 'max-height 300ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        <p
          className="text-[14px] leading-relaxed pb-5"
          style={{ color: '#71717A' }}
        >
          {a}
        </p>
      </div>
    </div>
  )
}

export default function FAQ() {
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerVisible, setHeaderVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHeaderVisible(true); observer.disconnect() } },
      { threshold: 0.2 }
    )
    if (headerRef.current) observer.observe(headerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="faq"
      className="py-24"
      style={{ borderTop: '0.5px solid var(--color-border)' }}
    >
      <div className="max-w-3xl mx-auto px-6 flex flex-col gap-12">
        {/* Header */}
        <div
          ref={headerRef}
          className="flex flex-col items-center gap-4 text-center"
          style={{
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '0.5px solid rgba(99,102,241,0.2)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#818cf8',
            }}
          >
            FAQ
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 44px)',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              color: '#FAFAFA',
            }}
          >
            Questions? We&apos;ve got answers.
          </h2>
          <p style={{ fontSize: 15, color: '#71717A', maxWidth: '40ch', lineHeight: 1.65 }}>
            Everything you need to know before you start. Still curious? Talk to us.
          </p>
        </div>

        {/* Items */}
        <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
          {FAQS.map((item, i) => (
            <FAQItem key={item.q} q={item.q} a={item.a} delay={i * 40} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className="flex flex-col items-center gap-3 text-center"
          style={{
            opacity: headerVisible ? 1 : 0,
            transition: 'opacity 500ms ease 300ms',
          }}
        >
          <p className="text-[14px]" style={{ color: '#71717A' }}>
            Still have questions?{' '}
            <Link
              href="/contact"
              style={{ color: '#818cf8', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              Reach out directly →
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
