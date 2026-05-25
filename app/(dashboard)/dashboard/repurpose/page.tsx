'use client'

import { useState } from 'react'
import { TopBar } from '@/components/dashboard/TopBar'
import { motion, AnimatePresence } from 'framer-motion'
import { Repeat2, Copy, Check, Sparkles, ChevronDown } from 'lucide-react'
import type { RepurposeResult } from '@/app/api/repurpose/route'

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     emoji: '🎵', color: '#ff2d55', bg: 'rgba(255,45,85,0.1)' },
  { id: 'instagram', label: 'Instagram',  emoji: '📸', color: '#c13584', bg: 'rgba(193,53,132,0.1)' },
  { id: 'linkedin',  label: 'LinkedIn',   emoji: '💼', color: '#0077b5', bg: 'rgba(0,119,181,0.1)' },
  { id: 'twitter',   label: 'Twitter / X',emoji: '✦',  color: '#1da1f2', bg: 'rgba(29,161,242,0.1)' },
  { id: 'youtube',   label: 'YouTube',    emoji: '▶',  color: '#ff0000', bg: 'rgba(255,0,0,0.1)' },
  { id: 'email',     label: 'Email',      emoji: '✉',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
] as const

type PlatformId = typeof PLATFORMS[number]['id']

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', border: `0.5px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: copied ? '#22c55e' : 'var(--color-text-muted)', transition: 'all 0.2s', flexShrink: 0 }}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function PlatformCard({ id, result }: { id: PlatformId; result: RepurposeResult }) {
  const meta = PLATFORMS.find(p => p.id === id)!

  const renderContent = () => {
    if (id === 'tiktok' || id === 'instagram') {
      const d = result[id]
      const fullText = `${d.hook}\n\n${d.caption}\n\n${d.hashtags.map(h => `#${h}`).join(' ')}`
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', border: '0.5px solid var(--color-border)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hook</p>
            <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.55, fontWeight: 600 }}>{d.hook}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Caption</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>{d.caption}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {d.hashtags.map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, border: `0.5px solid ${meta.color}33`, borderRadius: 6, padding: '3px 8px' }}>#{h}</span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <CopyButton text={fullText} />
          </div>
        </div>
      )
    }
    if (id === 'linkedin') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.linkedin.post}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <CopyButton text={result.linkedin.post} />
          </div>
        </div>
      )
    }
    if (id === 'twitter') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result.twitter.thread.map((tweet, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: meta.bg, border: `1px solid ${meta.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: meta.color, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{tweet}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>{tweet.length}/280</p>
              </div>
              <CopyButton text={tweet} />
            </div>
          ))}
        </div>
      )
    }
    if (id === 'youtube') {
      const d = result.youtube
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.4, flex: 1 }}>{d.title}</p>
              <CopyButton text={d.title} />
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.description}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {d.tags.map(t => <span key={t} style={{ fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, border: `0.5px solid ${meta.color}33`, borderRadius: 6, padding: '3px 8px' }}>{t}</span>)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <CopyButton text={`${d.title}\n\n${d.description}\n\nTags: ${d.tags.join(', ')}`} />
          </div>
        </div>
      )
    }
    if (id === 'email') {
      const d = result.email
      const fullEmail = `Subject: ${d.subject}\nPreview: ${d.preview}\n\n${d.body}`
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', border: '0.5px solid var(--color-border)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subject</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{d.subject}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preview text</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{d.preview}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Body</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{d.body}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <CopyButton text={fullEmail} />
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}
    >
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, background: meta.bg }}>
        <span style={{ fontSize: 18 }}>{meta.emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{meta.label}</span>
      </div>
      <div style={{ padding: 16 }}>{renderContent()}</div>
    </motion.div>
  )
}

export default function RepurposePage() {
  const [script, setScript] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [niche, setNiche] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RepurposeResult | null>(null)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const run = async () => {
    if (!script.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, businessName, niche }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data.result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Repeat2 className="w-6 h-6" style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1.2 }}>Repurpose Studio</h1>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>Paste your script or idea — get 6 platform-ready formats instantly.</p>
            </div>
          </div>

          {/* Input */}
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              placeholder="Paste your video script, topic idea, or any content you want to repurpose across platforms…"
              rows={5}
              style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--color-text)', resize: 'vertical', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit' }}
            />

            {/* Advanced */}
            <button onClick={() => setShowAdvanced(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, width: 'fit-content' }}>
              <ChevronDown className="w-3.5 h-3.5" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              Advanced options
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, overflow: 'hidden' }}>
                  <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Business name (optional)" style={{ background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--color-text)', outline: 'none' }} />
                  <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Niche / industry (optional)" style={{ background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--color-text)', outline: 'none' }} />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={run}
              disabled={!script.trim() || loading}
              style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 12, border: 'none', cursor: script.trim() && !loading ? 'pointer' : 'not-allowed', background: script.trim() && !loading ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--color-surface-elevated)', color: script.trim() && !loading ? '#fff' : 'var(--color-text-muted)', fontSize: 14, fontWeight: 700, boxShadow: script.trim() && !loading ? '0 4px 20px rgba(99,102,241,0.35)' : 'none', transition: 'all 0.2s' }}
            >
              {loading ? (
                <><div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i*0.15 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-text-muted)' }} />)}</div>Repurposing…</>
              ) : (
                <><Sparkles className="w-4 h-4" />Repurpose for all 6 platforms</>
              )}
            </button>

            {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}
          </div>

          {/* Platform pills preview */}
          {!result && !loading && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', opacity: 0.5 }}>
              {PLATFORMS.map(p => (
                <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, border: '0.5px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <span>{p.emoji}</span> {p.label}
                </span>
              ))}
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
                {PLATFORMS.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                    <PlatformCard id={p.id} result={result} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  )
}
