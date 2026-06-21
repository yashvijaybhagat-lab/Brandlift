'use client'

import { useEffect, useState } from 'react'
import CountUp from '@/components/reactbits/CountUp'

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
const ACCENTS = ['#7C5CFF', '#7C5CFF', '#7C5CFF', '#7C5CFF', '#7C5CFF', '#7C5CFF']
const RESULT_COLORS = ['#7C5CFF', '#7C5CFF', '#7C5CFF', '#7C5CFF', '#7C5CFF', '#7C5CFF']

/* ─── Seeded placeholder reviews (shown until real reviews come in) ───────── */
const PLACEHOLDER_REVIEWS: Review[] = [
  {
    id: 'seed-1',
    name: 'Marcus T.',
    business: "Marcus's Barbershop",
    location: 'Atlanta, GA',
    result: '340 new followers in 2 weeks',
    quote: 'I was posting maybe once a week and getting zero traction. BrandLift helped me turn a single haircut video into 5 different posts with captions and music already done. First reel hit 8,000 views.',
    submittedAt: 0,
  },
  {
    id: 'seed-2',
    name: 'Priya K.',
    business: 'Bloom Yoga Studio',
    location: 'Austin, TX',
    result: '3 new memberships from one post',
    quote: 'I had no idea how to edit videos or what to even say. The script generator wrote my entire caption and the AI music matched the vibe perfectly. One post brought in 3 sign-ups the same day.',
    submittedAt: 0,
  },
  {
    id: 'seed-3',
    name: 'Diego R.',
    business: "Diego's Food Truck",
    location: 'Miami, FL',
    result: 'Line out the door on launch day',
    quote: "Posted a 15-second clip of our tacos with BrandLift's captions and music. It hit 22K views overnight. Next day we had a line we'd never seen before. This thing is the real deal.",
    submittedAt: 0,
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
        style={{ background: 'linear-gradient(to right, #08060F, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #08060F, transparent)' }} />
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
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Business name *</label>
              <input value={business} onChange={e => setBusiness(e.target.value)} placeholder="Jane's Bakery" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Location <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Austin, TX" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            </div>
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Result <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <input value={result} onChange={e => setResult(e.target.value)} placeholder="500 new followers" style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Your story * <span style={{ color: 'var(--text-muted)' }}>({quote.length}/600)</span></label>
            <textarea
              value={quote} onChange={e => setQuote(e.target.value.slice(0, 600))} rows={4}
              placeholder="What did you post? What happened? Be specific — real stories get featured."
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.4)' }}
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
              100+ small businesses · Real results
            </span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px,3.5vw,36px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1.1, fontFamily: 'var(--font-display)' }}>
            100+ small businesses are growing<br />with BrandLift.
          </h2>
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
              <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: '#110E1C' }} />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {(displayReviews.length > 0 ? displayReviews : PLACEHOLDER_REVIEWS).slice(0, 3).map((r, i) => (
              <ReviewCard key={r.id} review={r} index={i} />
            ))}
          </div>
        )}

        {/* CTA + submission form */}
        <div className="flex flex-col gap-5 max-w-lg mx-auto w-full">
          <div className="flex flex-col gap-2 text-center">
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Got results? Add your story.
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
                ~<CountUp to={8} duration={2} /> min
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
