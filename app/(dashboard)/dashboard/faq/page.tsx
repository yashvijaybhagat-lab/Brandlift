'use client'

import { useState, useEffect, useRef } from 'react'
import { TopBar } from '@/components/dashboard/TopBar'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle, Search, ChevronDown, Sparkles, Plus, Check, MessageSquare, X,
} from 'lucide-react'
import type { FAQItem } from '@/app/api/faq/route'

const CATEGORIES = ['All', 'Getting Started', 'Content Creation', 'Features', 'Account', 'Tips & Tricks']

const CAT_COLOR: Record<string, string> = {
  'Getting Started':  '#22c55e',
  'Content Creation': '#f59e0b',
  'Features':         '#818cf8',
  'Account':          '#0ea5e9',
  'Billing':          '#ec4899',
  'Tips & Tricks':    '#a78bfa',
  'General':          '#71717a',
}

function FAQAccordionItem({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(false)
  const color = CAT_COLOR[item.category] ?? '#71717a'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      layout
      style={{
        background: 'var(--color-surface)',
        border: `0.5px solid ${open ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.06)' : 'none',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '15px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `${color}12`, border: `0.5px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageSquare style={{ width: 14, height: 14, color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4, marginBottom: 5 }}>
            {item.question}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color, background: `${color}12`, borderRadius: 5, padding: '2px 7px',
          }}>
            {item.category}
          </span>
        </div>

        <ChevronDown style={{
          width: 16, height: 16, color: 'var(--color-text-muted)', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s',
        }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              padding: '0 18px 18px 64px',
              fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.75,
              borderTop: '0.5px solid var(--color-border)', paddingTop: 14,
            }}>
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function AskPanel({ onAdded }: { onAdded: () => void }) {
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [response, setResponse] = useState<{ answer: string; added: boolean } | null>(null)
  const [error, setError] = useState('')
  const responseRef = useRef<HTMLDivElement>(null)

  const ask = async () => {
    if (!question.trim() || asking) return
    setAsking(true); setResponse(null); setError('')
    try {
      const res = await fetch('/api/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResponse({ answer: data.answer, added: data.added })
      if (data.added) onAdded()
      setQuestion('')
      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAsking(false)
    }
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 18, padding: 22,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles style={{ width: 14, height: 14, color: '#818cf8' }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Ask a question</p>
          </div>
        </div>
        <span style={{
          fontSize: 11, color: 'var(--color-text-muted)',
          background: 'var(--color-surface-elevated)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 6, padding: '3px 8px',
        }}>
          Good questions are added to the FAQ
        </span>
      </div>

      {/* Input */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask() }}
          placeholder="What would you like to know about BrandLift?"
          rows={3}
          style={{
            width: '100%',
            background: 'var(--color-surface-elevated)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 14, color: 'var(--color-text)',
            resize: 'none', outline: 'none', lineHeight: 1.65,
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.4)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {question.length > 0 ? `${question.length} chars · ⌘↵ to submit` : '⌘↵ to submit'}
        </span>
        <button
          onClick={ask}
          disabled={!question.trim() || asking}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', borderRadius: 11, border: 'none',
            cursor: question.trim() && !asking ? 'pointer' : 'not-allowed',
            background: question.trim() && !asking
              ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
              : 'var(--color-surface-elevated)',
            color: question.trim() && !asking ? '#fff' : 'var(--color-text-muted)',
            fontSize: 13, fontWeight: 700,
            boxShadow: question.trim() && !asking ? '0 4px 18px rgba(99,102,241,0.28)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {asking ? (
            <>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.7)' }}
                  />
                ))}
              </div>
              Thinking…
            </>
          ) : (
            <><Plus style={{ width: 14, height: 14 }} />Ask</>
          )}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#ef4444', marginTop: -4 }}>{error}</p>
      )}

      {/* Response */}
      <AnimatePresence>
        {response && (
          <motion.div ref={responseRef}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            style={{
              borderRadius: 14, padding: '16px 18px',
              background: response.added ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.03)',
              border: `0.5px solid ${response.added ? 'rgba(99,102,241,0.22)' : 'var(--color-border)'}`,
              position: 'relative',
            }}
          >
            <button
              onClick={() => setResponse(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X style={{ width: 13, height: 13 }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              {response.added ? (
                <>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'rgba(99,102,241,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check style={{ width: 11, height: 11, color: '#818cf8' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#818cf8' }}>Added to FAQ</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>— others can find this now</span>
                </>
              ) : (
                <>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <HelpCircle style={{ width: 11, height: 11, color: 'var(--color-text-muted)' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>Answered for you</span>
                </>
              )}
            </div>

            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.72 }}>
              {response.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  const [items, setItems] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const loadFAQ = async () => {
    const res = await fetch('/api/faq')
    const data = await res.json()
    setItems(data.items ?? [])
    setLoading(false)
  }

  useEffect(() => { loadFAQ() }, [])

  const categoryCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1
    return acc
  }, {})

  const filtered = items.filter(item => {
    const matchCat = category === 'All' || item.category === category
    const q = search.toLowerCase()
    const matchSearch = !q
      || item.question.toLowerCase().includes(q)
      || item.answer.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <HelpCircle style={{ width: 22, height: 22, color: '#818cf8' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1.2 }}>
                FAQ
              </h1>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {loading ? 'Loading…' : `${items.length} questions answered · Ask anything and help build the FAQ`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div style={{
            background: 'var(--color-surface)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 13,
            display: 'flex', alignItems: 'center', gap: 11, padding: '11px 15px',
            transition: 'border-color 0.2s',
          }}
            onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.35)' }}
            onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
          >
            <Search style={{ width: 15, height: 15, color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions and answers…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 14, color: 'var(--color-text)', fontFamily: 'inherit',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X style={{ width: 13, height: 13, color: 'var(--color-text-muted)' }} />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const count = cat === 'All' ? items.length : (categoryCounts[cat] ?? 0)
              const isActive = category === cat
              const color = cat === 'All' ? '#818cf8' : (CAT_COLOR[cat] ?? '#818cf8')
              return (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  padding: '5px 12px', borderRadius: 8,
                  border: `1px solid ${isActive ? `${color}45` : 'var(--color-border)'}`,
                  background: isActive ? `${color}12` : 'transparent',
                  color: isActive ? color : 'var(--color-text-muted)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {cat}
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: isActive ? `${color}25` : 'rgba(255,255,255,0.06)',
                      color: isActive ? color : 'var(--color-text-muted)',
                      borderRadius: 4, padding: '1px 5px',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* FAQ list */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  height: 68, background: 'var(--color-surface)',
                  borderRadius: 14, opacity: 0.4 + i * 0.1,
                  animation: 'pulse 1.5s infinite',
                }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '52px 24px' }}>
              <HelpCircle style={{ width: 32, height: 32, color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                {search ? `No results for "${search}"` : 'No questions in this category yet — ask one below!'}
              </p>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((item, i) => (
                <FAQAccordionItem key={item.id} item={item} index={i} />
              ))}
            </div>
          )}

          {/* Ask a question */}
          <AskPanel onAdded={loadFAQ} />

        </div>
      </div>
    </div>
  )
}
