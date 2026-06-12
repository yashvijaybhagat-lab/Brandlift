'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Sparkles, Share2, ArrowRight } from 'lucide-react'

function useVisible(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, visible }
}

/* ── Step 1 mockup: drag-drop upload ── */
function UploadMockup({ active }: { active: boolean }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div
        className="rounded-xl flex flex-col items-center justify-center gap-3 py-8 transition-all duration-500"
        style={{
          border: `1.5px dashed ${active ? 'rgba(88,85,212,0.5)' : 'rgba(255,255,255,0.1)'}`,
          background: active ? 'var(--accent-subtle)' : 'transparent',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500"
          style={{ background: active ? 'rgba(88,85,212,0.15)' : 'rgba(255,255,255,0.05)' }}
        >
          <Upload className="w-5 h-5" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }} />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-medium" style={{ color: active ? '#FAFAFA' : '#71717A' }}>
            {active ? 'Drop your footage here' : 'Drop your iPhone video'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#52525B' }}>MP4, MOV, any quality</p>
        </div>
      </div>
      {/* File being "uploaded" */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-700"
        style={{
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          opacity: active ? 1 : 0.3,
          transform: active ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }} aria-hidden><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium truncate" style={{ color: '#FAFAFA' }}>barbershop_raw.mp4</p>
          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                background: 'linear-gradient(90deg, #5855D4, #5855D4)',
                width: active ? '100%' : '0%',
              }}
            />
          </div>
        </div>
        <span className="text-[11px] font-medium flex-shrink-0" style={{ color: active ? '#4ADE80' : '#52525B' }}>
          {active ? 'Done' : '...'}
        </span>
      </div>
    </div>
  )
}

/* ── Step 2 mockup: AI processing ── */
const STEPS = [
  { label: 'Analyzing footage',      done: true  },
  { label: 'Stabilizing & grading',  done: true  },
  { label: 'Generating captions',    done: false },
  { label: 'Optimizing for platforms', done: false },
]

function ProcessMockup({ active }: { active: boolean }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick(t => t + 1), 900)
    return () => clearInterval(id)
  }, [active])
  const progress = active ? Math.min((tick / 6) * 100, 95) : 0

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: active ? '#4ADE80' : '#52525B', boxShadow: active ? '0 0 0 3px rgba(74,222,128,0.2)' : 'none', animation: active ? 'pulse-dot 2s ease infinite' : 'none' }}
          />
          <span className="text-[12px] font-medium" style={{ color: active ? '#FAFAFA' : '#52525B' }}>
            {active ? 'AI processing…' : 'Waiting for upload'}
          </span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: '#52525B' }}>
          {Math.round(progress)}%
        </span>
      </div>
      {/* Overall bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #5855D4, #5855D4)' }}
        />
      </div>
      {/* Steps */}
      <div className="flex flex-col gap-2.5">
        {STEPS.map((s, i) => {
          const show = active && tick >= i * 1.5
          return (
            <div key={s.label} className="flex items-center gap-2.5" style={{ opacity: show ? 1 : 0.2, transition: 'opacity 400ms ease' }}>
              <span className="text-[13px] flex-shrink-0" style={{ color: s.done ? '#4ADE80' : '#5855D4' }}>
                {s.done && show ? '✓' : show ? '→' : '·'}
              </span>
              <span className="text-[12px]" style={{ color: s.done ? '#A1A1AA' : '#FAFAFA' }}>{s.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Step 3 mockup: export ── */
const PLATFORMS = [
  { name: 'TikTok',     color: '#ff0050', bg: 'rgba(255,0,80,0.1)',    icon: '♪',  ratio: '9:16' },
  { name: 'Instagram',  color: '#c026d3', bg: 'rgba(192,38,211,0.1)',  icon: '◻',  ratio: '1:1'  },
  { name: 'YouTube',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '▶',  ratio: '16:9' },
  { name: 'LinkedIn',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  icon: 'in', ratio: '1:1'  },
]

function ExportMockup({ active }: { active: boolean }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium" style={{ color: active ? '#FAFAFA' : '#52525B' }}>
          Ready to share
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)', color: active ? '#4ADE80' : '#52525B', border: `1px solid ${active ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}` }}
        >
          {active ? '4 formats' : 'pending'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p, i) => (
          <div
            key={p.name}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-500"
            style={{
              background: active ? p.bg : 'rgba(255,255,255,0.02)',
              border: `0.5px solid ${active ? `${p.color}33` : 'rgba(255,255,255,0.06)'}`,
              transform: active ? 'translateY(0)' : 'translateY(4px)',
              opacity: active ? 1 : 0.3,
              transitionDelay: `${i * 80}ms`,
            }}
          >
            <span className="text-[14px] flex-shrink-0 font-bold" style={{ color: active ? p.color : '#52525B', fontFamily: 'monospace' }}>{p.icon}</span>
            <div>
              <p className="text-[11px] font-medium" style={{ color: active ? '#FAFAFA' : '#52525B' }}>{p.name}</p>
              <p className="text-[10px]" style={{ color: '#52525B' }}>{p.ratio}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-500 mt-1"
        style={{
          background: active ? 'linear-gradient(135deg, #5855D4, #5855D4)' : 'rgba(255,255,255,0.04)',
          color: active ? '#fff' : '#52525B',
          border: active ? 'none' : '0.5px solid rgba(255,255,255,0.06)',
          opacity: active ? 1 : 0.5,
          cursor: active ? 'pointer' : 'default',
        }}
      >
        {active ? 'Download all 4 →' : 'Processing…'}
      </button>
    </div>
  )
}

/* ── Steps data ── */
const STEPS_DATA = [
  {
    num: '01',
    icon: Upload,
    title: 'Drop your footage',
    desc: 'Upload any raw video — shaky iPhone clips, bad lighting, no edits needed. We accept MP4, MOV, WebM up to 500MB.',
    Mockup: UploadMockup,
  },
  {
    num: '02',
    icon: Sparkles,
    title: 'We do the work',
    desc: 'We stabilize, color grade, add captions in your voice, write hooks, and format everything for each platform.',
    Mockup: ProcessMockup,
  },
  {
    num: '03',
    icon: Share2,
    title: 'Post everywhere',
    desc: 'Download platform-perfect cuts for TikTok, Instagram Reels, YouTube Shorts, and LinkedIn — all in one click.',
    Mockup: ExportMockup,
  },
]

export default function HowItWorks() {
  const { ref, visible } = useVisible(0.1)

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="py-24"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-16">
        {/* Header */}
        <div
          className="flex flex-col items-center gap-4 text-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            How it works
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(30px, 4.5vw, 48px)',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              color: 'var(--text-primary)',
            }}
          >
            From raw clip to polished content<br />
            in under 3 minutes.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: '44ch', lineHeight: 1.65 }}>
            No editing skills. No design software. No agency fees. Just your video, our tools, and results you can post today.
          </p>
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {STEPS_DATA.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={step.num}
                className="flex flex-col gap-5"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 400ms ease ${i * 100}ms, transform 400ms ease ${i * 100}ms`,
                }}
              >
                {/* Mockup */}
                <step.Mockup active={visible} />

                {/* Label */}
                <div className="flex flex-col gap-2 px-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-[11px] font-bold tracking-widest uppercase"
                      style={{ color: '#5855D4' }}
                    >
                      {step.num}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(88,85,212,0.1)', border: '0.5px solid rgba(88,85,212,0.2)' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: '#8B87E6' }} />
                    </div>
                    <div>
                      <h3
                        className="text-[15px] font-semibold mb-1"
                        style={{ color: '#FAFAFA', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-[13px] leading-relaxed" style={{ color: '#71717A' }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Arrow connector row for desktop */}
        <div
          className="hidden lg:flex items-center justify-center gap-4 -mt-8"
          style={{ opacity: visible ? 0.4 : 0, transition: 'opacity 600ms ease 400ms' }}
          aria-hidden
        >
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-4 flex-1 justify-center">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(88,85,212,0.3), transparent)' }} />
              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#5855D4' }} />
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(88,85,212,0.3), transparent)' }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
