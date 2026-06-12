'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { Sparkles } from 'lucide-react'

const FOUNDER_EMAIL = 'ybhagat2011@gmail.com'

type SendState = 'idle' | 'sending' | 'sent' | 'error'
type GenState = 'idle' | 'generating' | 'error'

const TEMPLATES = [
  {
    label: 'New Feature',
    subject: '✨ New in BrandLift: [feature name]',
    headline: 'We just shipped something you\'re going to love',
    body: `<p>Hey!</p>\n<p>We just launched <strong>[feature name]</strong> — and it's live in your dashboard right now.</p>\n<p>[2-3 sentences describing what it does and why it matters]</p>\n<p>Here's how to try it: [one clear instruction]</p>\n<p>As always, reply to this email if you have questions — I read every message.</p>`,
  },
  {
    label: 'Product Update',
    subject: '📦 What\'s new in BrandLift this week',
    headline: 'Here\'s what shipped this week',
    body: `<p>Quick update on what we've been building:</p>\n<ul>\n  <li>✅ <strong>[Feature 1]</strong> — [one sentence]</li>\n  <li>✅ <strong>[Feature 2]</strong> — [one sentence]</li>\n  <li>✅ <strong>[Improvement]</strong> — [one sentence]</li>\n</ul>\n<p>All of these are live. Let me know what you think.</p>`,
  },
  {
    label: 'Announcement',
    subject: '🚀 Big news from BrandLift',
    headline: '[Your announcement headline]',
    body: `<p>Hey, I have some exciting news to share.</p>\n<p>[2-3 sentences with the announcement]</p>\n<p>[Why this matters for subscribers]</p>\n<p>More details coming soon — stay tuned.</p>`,
  },
]

export default function NewsletterPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [subject, setSubject] = React.useState('')
  const [headline, setHeadline] = React.useState('')
  const [body, setBody] = React.useState('')
  const [ctaLabel, setCtaLabel] = React.useState('See it in action →')
  const [sendState, setSendState] = React.useState<SendState>('idle')
  const [sentCount, setSentCount] = React.useState(0)
  const [sendError, setSendError] = React.useState('')
  const [subCount, setSubCount] = React.useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [genState, setGenState] = React.useState<GenState>('idle')
  const [genError, setGenError] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [showNotes, setShowNotes] = React.useState(false)

  // Founder-only guard
  React.useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.email || session.user.email !== FOUNDER_EMAIL) {
      router.replace('/dashboard')
    }
  }, [session, status, router])

  React.useEffect(() => {
    fetch('/api/admin/newsletter/stats')
      .then(r => r.json())
      .then(d => { if (typeof d.count === 'number') setSubCount(d.count) })
      .catch(() => {})
  }, [])

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setSubject(t.subject)
    setHeadline(t.headline)
    setBody(t.body)
  }

  async function handleGenerate() {
    setGenState('generating')
    setGenError('')
    try {
      const res = await fetch('/api/admin/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const data = await res.json()
      if (!res.ok) { setGenError(data.error ?? 'Failed'); setGenState('error'); return }
      setSubject(data.subject)
      setHeadline(data.headline)
      setBody(data.body)
      setCtaLabel(data.ctaLabel)
      setGenState('idle')
      setShowNotes(false)
    } catch {
      setGenError('Network error — try again')
      setGenState('error')
    }
  }

  async function handleSend() {
    setConfirmOpen(false)
    setSendState('sending')
    setSendError('')
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, headline, body, ctaLabel }),
      })
      const data = await res.json()
      if (!res.ok) { setSendError(data.error ?? 'Send failed'); setSendState('error'); return }
      setSentCount(data.sent ?? 0)
      setSendState('sent')
    } catch {
      setSendError('Network error — try again')
      setSendState('error')
    }
  }

  const canSend = subject.trim().length >= 3 && headline.trim().length >= 3 && body.trim().length >= 10

  if (status === 'loading' || !session?.user?.email || session.user.email !== FOUNDER_EMAIL) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-bold text-[#FAFAFA] tracking-tight">Newsletter</h1>
              <p className="text-[14px] text-[#52525B] mt-1">
                Send to all subscribers
                {subCount !== null && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                    {subCount.toLocaleString()} active
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Weekly tips note */}
          <div className="rounded-xl p-4 flex gap-3"
            style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.15)' }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <p className="text-[13px] text-[#71717A] leading-relaxed">
              <span className="text-[#A1A1AA] font-medium">Weekly tips are automatic.</span> Every Monday at 2pm UTC a content tip goes out automatically. Use this page for product updates and announcements.
            </p>
          </div>

          {/* AI Generate */}
          <div className="rounded-xl p-5 flex flex-col gap-4"
            style={{ background: 'rgba(139,92,246,0.06)', border: '0.5px solid rgba(139,92,246,0.2)' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: '#a78bfa' }} />
                <span className="text-[14px] font-semibold text-[#FAFAFA]">Generate with AI</span>
              </div>
              <button
                onClick={() => setShowNotes(v => !v)}
                className="text-[12px] text-[#71717A] hover:text-[#A1A1AA] transition-colors"
              >
                {showNotes ? 'Hide notes' : 'Add notes about what shipped'}
              </button>
            </div>

            {showNotes && (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Describe what shipped this week — new features, improvements, anything noteworthy. Leave blank to generate a general update."
                className={cn(
                  'w-full px-3 py-2.5 rounded-[8px] text-[13px] text-[#FAFAFA] placeholder:text-[#3f3f46] resize-y',
                  'bg-[#18181C] border border-white/[0.1] focus:outline-none focus:border-[rgba(139,92,246,0.5)]',
                )}
              />
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                loading={genState === 'generating'}
                onClick={handleGenerate}
                className="gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {genState === 'generating' ? 'Generating…' : 'Generate email'}
              </Button>
              <p className="text-[12px] text-[#52525B]">
                AI writes subject, headline, and body — you review before sending
              </p>
              {genError && <p className="text-[12px] text-red-400">{genError}</p>}
            </div>
          </div>

          {/* Templates */}
          <div>
            <p className="text-[12px] font-semibold text-[#52525B] uppercase tracking-wider mb-3">Or use a template</p>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => applyTemplate(t)}
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#A1A1AA' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#FAFAFA' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#A1A1AA' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#A1A1AA]">Subject line</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
                placeholder="✨ New in BrandLift: AI video enhancement"
                className={cn(
                  'w-full px-3 py-2.5 rounded-[8px] text-[14px] text-[#FAFAFA] placeholder:text-[#3f3f46]',
                  'bg-[#18181C] border border-white/[0.1] focus:outline-none focus:border-[rgba(99,102,241,0.5)]',
                )} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#A1A1AA]">Email headline</label>
              <input value={headline} onChange={e => setHeadline(e.target.value)} maxLength={200}
                placeholder="We just shipped something you're going to love"
                className={cn(
                  'w-full px-3 py-2.5 rounded-[8px] text-[14px] text-[#FAFAFA] placeholder:text-[#3f3f46]',
                  'bg-[#18181C] border border-white/[0.1] focus:outline-none focus:border-[rgba(99,102,241,0.5)]',
                )} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#A1A1AA]">
                Body
                <span className="ml-2 text-[11px] text-[#52525B] font-normal">HTML — &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;</span>
              </label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} maxLength={5000}
                placeholder="<p>Hey!</p>&#10;<p>We just shipped...</p>"
                className={cn(
                  'w-full px-3 py-2.5 rounded-[8px] text-[13px] text-[#FAFAFA] placeholder:text-[#3f3f46] resize-y font-mono',
                  'bg-[#18181C] border border-white/[0.1] focus:outline-none focus:border-[rgba(99,102,241,0.5)]',
                )} />
              <p className="text-[11px] text-[#3f3f46] text-right">{body.length}/5000</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[#A1A1AA]">Button label</label>
              <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} maxLength={60}
                placeholder="See it in action →"
                className={cn(
                  'w-full px-3 py-2.5 rounded-[8px] text-[14px] text-[#FAFAFA] placeholder:text-[#3f3f46]',
                  'bg-[#18181C] border border-white/[0.1] focus:outline-none focus:border-[rgba(99,102,241,0.5)]',
                )} />
            </div>
          </div>

          {/* Send */}
          {sendState === 'sent' ? (
            <div className="rounded-xl p-5 text-center"
              style={{ background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.2)' }}>
              <p className="text-[15px] font-semibold text-[#4ADE80]">Sent to {sentCount.toLocaleString()} subscribers ✓</p>
            </div>
          ) : confirmOpen ? (
            <div className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(251,191,36,0.05)', border: '0.5px solid rgba(251,191,36,0.2)' }}>
              <p className="text-[14px] text-[#A1A1AA]">
                Send <span className="text-[#FAFAFA] font-medium">"{subject}"</span> to{' '}
                <span className="text-[#FAFAFA] font-medium">{subCount?.toLocaleString() ?? '...'} subscribers</span>? This can't be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" loading={sendState === 'sending'} onClick={handleSend}>
                  Yes, send it
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="primary" size="md" disabled={!canSend} onClick={() => setConfirmOpen(true)}>
                Send to all subscribers
              </Button>
              {sendError && <p className="text-[13px] text-red-400">{sendError}</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
