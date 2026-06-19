'use client'

import { useState } from 'react'
import { TopBar } from '@/components/dashboard/TopBar'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Sparkles, Copy, Check, ChevronDown, Clock, TrendingUp } from 'lucide-react'
import type { PlannerDay } from '@/app/api/planner/route'

const PLATFORM_COLORS: Record<string, { color: string; emoji: string }> = {
  TikTok:      { color: '#ff2d55', emoji: 'TK' },
  Instagram:   { color: '#c13584', emoji: 'IG' },
  LinkedIn:    { color: '#0077b5', emoji: 'LI' },
  'Twitter / X': { color: '#1da1f2', emoji: '✕' },
  YouTube:     { color: '#ff0000', emoji: 'YT' },
}

const DIFFICULTY_CONFIG = {
  easy:   { color: '#22c55e', label: 'Easy' },
  medium: { color: '#f59e0b', label: 'Medium' },
  hard:   { color: '#ef4444', label: 'Hard' },
}

const TYPE_COLORS: Record<string, string> = {
  'Educational':       '#818cf8',
  'Behind the Scenes': '#fb923c',
  'Trend':             '#f472b6',
  'Testimonial':       '#34d399',
  'Product Showcase':  '#60a5fa',
  'Personal Story':    '#a78bfa',
  'Tutorial':          '#facc15',
}

function DayCard({ day, index }: { day: PlannerDay; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)
  const platform = PLATFORM_COLORS[day.platform] ?? { color: '#7C5CFF', emoji: '·' }
  const difficulty = DIFFICULTY_CONFIG[day.difficulty]
  const typeColor = TYPE_COLORS[day.contentType] ?? '#818cf8'

  const copyScript = () => {
    navigator.clipboard.writeText(`Hook: ${day.hook}\n\n${day.script}\n\nHashtags: ${day.hashtags.map(h => `#${h}`).join(' ')}`).catch(() => {})
    setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}
    >
      {/* Card header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-elevated)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Day badge */}
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', lineHeight: 1 }}>{day.day.slice(0, 3)}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3 }}>{day.date.split(' ')[1]}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: platform.color }}>{platform.emoji} {day.platform}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--color-text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: typeColor, background: `${typeColor}18`, border: `0.5px solid ${typeColor}44`, borderRadius: 5, padding: '1px 7px' }}>{day.contentType}</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{day.topic}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>{day.bestTime}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>{day.estimatedViews}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: difficulty.color, background: `${difficulty.color}18`, borderRadius: 5, padding: '1px 7px', border: `0.5px solid ${difficulty.color}44` }}>{difficulty.label}</span>
        </div>

        <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 4 }} />
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '0.5px solid var(--color-border)', padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Hook */}
              <div style={{ background: 'rgba(124, 92, 255,0.06)', border: '0.5px solid rgba(124, 92, 255,0.18)', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Opening hook</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.5 }}>"{day.hook}"</p>
              </div>

              {/* Script */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Full script</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{day.script}</p>
              </div>

              {/* Hashtags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {day.hashtags.map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: platform.color, background: `${platform.color}14`, border: `0.5px solid ${platform.color}33`, borderRadius: 6, padding: '3px 8px' }}>#{h}</span>
                ))}
              </div>

              {/* Copy */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={copyScript} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: `0.5px solid ${scriptCopied ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`, background: scriptCopied ? 'rgba(34,197,94,0.08)' : 'var(--color-surface-elevated)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: scriptCopied ? '#22c55e' : 'var(--color-text-muted)', transition: 'all 0.2s' }}>
                  {scriptCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {scriptCopied ? 'Copied!' : 'Copy script'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function PlannerPage() {
  const [businessName, setBusinessName] = useState('')
  const [niche, setNiche] = useState('')
  const [audience, setAudience] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['TikTok', 'Instagram'])
  const [goals, setGoals] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<PlannerDay[] | null>(null)
  const [error, setError] = useState('')

  const PLATFORM_OPTIONS = ['TikTok', 'Instagram', 'LinkedIn', 'Twitter / X', 'YouTube']

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const generate = async () => {
    if (loading) return
    setLoading(true); setPlan(null); setError('')
    try {
      const res = await fetch('/api/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, niche, audience, platforms, goals }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPlan(data.plan)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarDays className="w-6 h-6" style={{ color: '#22c55e' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1.2 }}>7-Day Content Planner</h1>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>AI builds a full week of content — topics, hooks, scripts, hashtags, and optimal post times.</p>
            </div>
          </div>

          {/* Form */}
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Business name</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Sarah's Bakery"
                  style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Niche / industry</label>
                <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. artisan baked goods"
                  style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Target audience</label>
              <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. local families, health-conscious millennials"
                style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Platforms</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PLATFORM_OPTIONS.map(p => {
                  const meta = PLATFORM_COLORS[p] ?? { color: '#7C5CFF', emoji: '·' }
                  const active = platforms.includes(p)
                  return (
                    <button key={p} onClick={() => togglePlatform(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1px solid ${active ? meta.color + '66' : 'var(--color-border)'}`, background: active ? meta.color + '18' : 'transparent', color: active ? meta.color : 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <span>{meta.emoji}</span>{p}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Content goals <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input value={goals} onChange={e => setGoals(e.target.value)} placeholder="e.g. drive foot traffic, launch new product, grow followers"
                style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }} />
            </div>

            <button onClick={generate} disabled={loading}
              style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'var(--color-surface-elevated)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: loading ? 'var(--color-text-muted)' : '#fff', fontSize: 14, fontWeight: 700, boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.3)', transition: 'all 0.2s' }}>
              {loading ? (
                <><div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i*0.15 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />)}</div>Building your plan…</>
              ) : (
                <><Sparkles className="w-4 h-4" />Generate 7-day plan</>
              )}
            </button>
            {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}
          </div>

          {/* Plan */}
          <AnimatePresence>
            {plan && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Your 7-day plan <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>— click any day to expand</span></p>
                  <button onClick={generate} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '0.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer' }}>
                    <Sparkles className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                {plan.map((day, i) => <DayCard key={i} day={day} index={i} />)}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  )
}
