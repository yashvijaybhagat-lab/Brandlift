'use client'

import { useEffect, useState } from 'react'

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Review {
  id: string
  name: string
  business: string
  location: string
  result: string
  quote: string
  submittedAt: number
}

/* ─── Card accent palette ────────────────────────────────────────────────── */
const ACCENTS = ['#5855D4', '#5855D4', '#5855D4', '#5855D4', '#5855D4', '#5855D4']
const RESULT_COLORS = ['#5855D4', '#5855D4', '#5855D4', '#5855D4', '#5855D4', '#5855D4']

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
        style={{ background: 'linear-gradient(to right, #0B1120, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #0B1120, transparent)' }} />
      <div className="flex items-center gap-2.5 py-1"
        style={{ width: 'max-content', animation: 'marqueeScroll 35s linear infinite' }}>
        {items.map((biz, i) => (
          <span key={i} className="whitespace-nowrap text-[12px] px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            {biz}
          </span>
        ))}
      </div>
      
    </div>
  )
}

/* ─── Stars ──────────────────────────────────────────────────────────────── */
function Stars() {
  return (
    <div className="flex gap-0.5">
      {[0,1,2,3,4].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden>
          <path d="M6 1l1.236 2.505L10 3.97l-2 1.95.472 2.75L6 7.25l-2.472 1.42L4 5.92 2 3.97l2.764-.465z"/>
        </svg>
      ))}
    </div>
  )
}

/* ─── Review card ────────────────────────────────────────────────────────── */
function ReviewCard({ review, index }: { review: Review; index: number }) {
  const color       = ACCENTS[index % ACCENTS.length]
  const resultColor = RESULT_COLORS[index % RESULT_COLORS.length]
  const initials    = review.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="flex flex-col gap-4 p-6 transition-all duration-150"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: 24 }}
    >
      {review.result && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit"
          style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.03em' }}>↑ {review.result}</span>
        </div>
      )}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, flex: 1 }}>
        &ldquo;{review.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{review.name}</p>
            <Stars />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
            {review.business}{review.location ? ` · ${review.location}` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Empty slot placeholder ─────────────────────────────────────────────── */
function EmptySlot() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center"
      style={{ border: '1px dashed var(--border-subtle)', background: 'transparent', borderRadius: 'var(--radius)', minHeight: 180 }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
        <span style={{ fontSize: 15, color: 'var(--accent)', lineHeight: 1 }}>+</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: '20ch' }}>
        Your result could be featured here
      </p>
    </div>
  )
}

/* ─── Submission form ────────────────────────────────────────────────────── */
type FormState = 'idle' | 'submitting' | 'success' | 'error'

function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen]         = useState(false)
  const [name, setName]         = useState('')
  const [business, setBusiness] = useState('')
  const [location, setLocation] = useState('')
  const [result, setResult]     = useState('')
  const [quote, setQuote]       = useState('')
  const [state, setState]       = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const submit = async () => {
    if (!name.trim() || !business.trim() || !quote.trim()) {
      setErrorMsg('Name, business, and your story are required.')
      return
    }
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, business, location, result, quote }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Something went wrong')
      }
      setState('success')
      onSuccess()
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    }
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(74,222,128,0.1)', border: '0.5px solid rgba(74,222,128,0.3)' }}>
          <span style={{ fontSize: 18, color: '#4ADE80' }}>✓</span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#E4E4E7' }}>Thanks for sharing!</p>
        <p style={{ fontSize: 13, color: '#52525B', maxWidth: '30ch', lineHeight: 1.55 }}>
          Your review will appear here shortly if it meets our guidelines.
        </p>
      </div>
    )
  }

  const inputStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    padding: '10px 12px',
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold transition-all duration-150 w-full"
        style={{ background: open ? 'var(--accent-subtle)' : 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius)' }}
      >
        {open ? '✕ Close' : 'Share your story →'}
      </button>

      {/* Form panel */}
      {open && (
        <div className="flex flex-col gap-3 p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)' }}>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Your name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane D." style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(88,85,212,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Business name *</label>
              <input value={business} onChange={e => setBusiness(e.target.value)} placeholder="Jane's Bakery" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(88,85,212,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Location <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Austin, TX" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(88,85,212,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Result <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <input value={result} onChange={e => setResult(e.target.value)} placeholder="500 new followers" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(88,85,212,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Your story * <span style={{ color: 'var(--text-muted)' }}>({quote.length}/600)</span></label>
            <textarea
              value={quote} onChange={e => setQuote(e.target.value.slice(0, 600))} rows={4}
              placeholder="What did you post? What happened? Be specific — real stories get featured."
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(88,85,212,0.4)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {errorMsg && (
            <p style={{ fontSize: 12, color: '#f87171', lineHeight: 1.5 }}>{errorMsg}</p>
          )}

          <button
            onClick={submit}
            disabled={state === 'submitting'}
            className="btn-primary"
            style={{ opacity: state === 'submitting' ? 0.6 : 1, cursor: state === 'submitting' ? 'default' : 'pointer', width: '100%', justifyContent: 'center' }}
          >
            {state === 'submitting' ? 'Submitting…' : 'Submit review'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Positive, genuine reviews are published automatically. No editing — your words stay your words.
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function SocialProof() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)

  const fetchReviews = () => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(d => { setReviews(d.reviews ?? []); setLoadingReviews(false) })
      .catch(() => setLoadingReviews(false))
  }

  useEffect(() => { fetchReviews() }, [])

  const displayReviews = reviews.slice(0, 3)

  return (
    <section aria-label="Social proof" className="py-20 overflow-hidden"
      style={{ background: 'var(--base)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-14">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {reviews.length > 0 ? 'Real businesses. Real results.' : 'Now in beta · be among the first'}
            </span>
          </div>
          <p style={{ fontSize: 'clamp(26px,3.5vw,36px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.1, fontFamily: 'var(--font-display)' }}>
            {reviews.length > 0
              ? <>Small businesses are growing<br />with BrandLift.</>
              : <>Built for small businesses<br />like yours.</>}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: '44ch', lineHeight: 1.6 }}>
            {reviews.length > 0
              ? 'From barbershops to food trucks — creators using BrandLift to 10× their content without hiring an editor.'
              : 'From barbershops to food trucks — turn raw clips into content that brings in customers, without hiring an editor.'}
          </p>
        </div>

        {/* Cards grid */}
        {loadingReviews ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: '#111113' }} />
            ))}
          </div>
        ) : displayReviews.length === 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            <EmptySlot /><EmptySlot /><EmptySlot />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {displayReviews.map((r, i) => <ReviewCard key={r.id} review={r} index={i} />)}
            {Array.from({ length: Math.max(0, 3 - displayReviews.length) }).map((_, i) => <EmptySlot key={`empty-${i}`} />)}
          </div>
        )}

        {/* CTA + submission form */}
        <div className="flex flex-col gap-5 max-w-lg mx-auto w-full">
          <div className="flex flex-col gap-2 text-center">
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {reviews.length > 0 ? 'Got results? Add your story.' : 'Used BrandLift? Share what happened.'}
            </p>
          </div>
          <SubmitForm onSuccess={fetchReviews} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            Or email us directly at{' '}
            <a href="mailto:contact@brandlift.dev" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
              contact@brandlift.dev
            </a>
          </p>
        </div>

        {/* Onboarding stat + marquee */}
        <div className="flex flex-col gap-8">
          <div className="flex justify-center"
            style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
            <div className="flex flex-col items-center gap-1 text-center">
              <span style={{ fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'var(--font-display)' }}>
                ~8 min
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>average onboarding time</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Built for every local business</p>
            <Marquee />
          </div>
        </div>

      </div>
    </section>
  )
}
