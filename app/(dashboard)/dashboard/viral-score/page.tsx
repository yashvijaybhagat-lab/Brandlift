'use client'

import { useState } from 'react'
import { TopBar } from '@/components/dashboard/TopBar'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Copy, Check, ChevronDown, TrendingUp, Eye, Heart, MousePointerClick, Flame } from 'lucide-react'
import type { ViralScoreResult } from '@/app/api/viral-score/route'

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'LinkedIn', 'Twitter / X']

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  S: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)', label: 'Viral potential' },
  A: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)',   label: 'Strong content'  },
  B: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',   border: 'rgba(14,165,233,0.25)',  label: 'Good content'    },
  C: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',  label: 'Needs work'      },
  D: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',    label: 'Major issues'    },
}

const DIM_ICONS: Record<string, React.ReactNode> = {
  'Hook Power':     <Zap           className="w-4 h-4" />,
  'Retention':      <Eye           className="w-4 h-4" />,
  'Emotional Pull': <Heart         className="w-4 h-4" />,
  'Call to Action': <MousePointerClick className="w-4 h-4" />,
  'Trend Fit':      <Flame         className="w-4 h-4" />,
}

function ScoreRing({ score }: { score: number }) {
  const r = 52; const circ = 2 * Math.PI * r
  const color = score >= 80 ? '#22c55e' : score >= 65 ? '#0ea5e9' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 136, height: 136, flexShrink: 0 }}>
      <svg width={136} height={136} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={68} cy={68} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
        <motion.circle cx={68} cy={68} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }}
          style={{ fontSize: 34, fontWeight: 900, color, letterSpacing: '-0.05em', lineHeight: 1 }}>
          {score}
        </motion.span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 3 }}>/ 100</span>
      </div>
    </div>
  )
}

function DimensionBar({ label, score, max, tip }: { label: string; score: number; max: number; tip: string }) {
  const pct = (score / max) * 100
  const color = pct >= 75 ? '#22c55e' : pct >= 55 ? '#0ea5e9' : pct >= 40 ? '#f59e0b' : '#ef4444'
  const [open, setOpen] = useState(false)
  const icon = DIM_ICONS[label]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>{score}<span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>/{max}</span></span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 4 }} />
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden', marginLeft: 38 }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ height: '100%', background: color, borderRadius: 999 }} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.65, paddingLeft: 38, overflow: 'hidden', margin: 0 }}>
            {tip}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ViralScorePage() {
  const [script, setScript]       = useState('')
  const [platform, setPlatform]   = useState('TikTok')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<ViralScoreResult | null>(null)
  const [error, setError]         = useState('')
  const [hookCopied, setHookCopied] = useState(false)

  const analyze = async () => {
    if (!script.trim() || loading) return
    setLoading(true); setResult(null); setError('')
    try {
      const res = await fetch('/api/viral-score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, platform }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data.result)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  const copyHook = () => {
    if (!result) return
    navigator.clipboard.writeText(result.improvedHook).catch(() => {})
    setHookCopied(true); setTimeout(() => setHookCopied(false), 2000)
  }

  const grade = result ? GRADE_CONFIG[result.grade] : null
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0
  const readSecs = Math.ceil(wordCount / 2.5)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header */}
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1.15 }}>Viral Score</h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 5 }}>Analyze your script before you film. Know exactly what to fix.</p>
          </div>

          {/* Input card */}
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Platform pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  style={{
                    padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${platform === p ? 'rgba(124, 92, 255,0.5)' : 'var(--color-border)'}`,
                    background: platform === p ? 'rgba(124, 92, 255,0.1)' : 'transparent',
                    color: platform === p ? '#818cf8' : 'var(--color-text-muted)',
                  }}>
                  {p}
                </button>
              ))}
            </div>

            <textarea value={script} onChange={e => setScript(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze() }}
              placeholder="Paste your video script here — hook, body, and CTA — for the most accurate analysis."
              rows={7}
              style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--color-text)', resize: 'vertical', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {wordCount > 0 ? `${wordCount} words · ~${readSecs}s` : 'Paste your script above'}
              </span>
              <button onClick={analyze} disabled={!script.trim() || loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 11, border: 'none',
                  cursor: script.trim() && !loading ? 'pointer' : 'not-allowed',
                  background: script.trim() && !loading ? '#f59e0b' : 'var(--color-surface-elevated)',
                  color: script.trim() && !loading ? '#000' : 'var(--color-text-muted)',
                  fontSize: 13, fontWeight: 700,
                  boxShadow: script.trim() && !loading ? '0 2px 16px rgba(245,158,11,0.25)' : 'none',
                  transition: 'all 0.2s',
                }}>
                {loading ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                        style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                    ))}
                    <span style={{ marginLeft: 4 }}>Analyzing</span>
                  </div>
                ) : (
                  <><Zap className="w-4 h-4" />Analyze</>
                )}
              </button>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                {error}
              </p>
            )}
          </div>

          {/* Results */}
          <AnimatePresence>
            {result && grade && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Score card */}
                <div style={{ background: 'var(--color-surface)', border: `0.5px solid ${grade.border}`, borderRadius: 20, padding: 24, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' as const }}>
                  <ScoreRing score={result.totalScore} />
                  <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: grade.color, background: grade.bg, borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${grade.border}`, letterSpacing: '-0.02em' }}>
                        {result.grade}
                      </span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: grade.color, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{grade.label}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginTop: 2, letterSpacing: '-0.02em' }}>{result.verdict}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>{result.summary}</p>
                  </div>
                </div>

                {/* Dimension bars */}
                <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Score breakdown</p>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>tap any row for tips</span>
                  </div>
                  {Object.values(result.dimensions).map(d => (
                    <DimensionBar key={d.label} label={d.label} score={d.score} max={d.max} tip={d.tip} />
                  ))}
                </div>

                {/* Improved hook */}
                <div style={{ background: 'rgba(124, 92, 255,0.05)', border: '0.5px solid rgba(124, 92, 255,0.18)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp className="w-4 h-4" style={{ color: '#818cf8' }} />
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>Improved hook</p>
                    </div>
                    <button onClick={copyHook}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: hookCopied ? 'rgba(34,197,94,0.1)' : 'rgba(124, 92, 255,0.1)', border: `0.5px solid ${hookCopied ? 'rgba(34,197,94,0.3)' : 'rgba(124, 92, 255,0.2)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: hookCopied ? '#22c55e' : '#818cf8' }}>
                      {hookCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {hookCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.7, fontStyle: 'italic' }}>"{result.improvedHook}"</p>
                </div>

                {/* Quick fixes */}
                <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>Quick fixes</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {result.quickFixes.map((fix, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(124, 92, 255,0.12)', border: '0.5px solid rgba(124, 92, 255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#818cf8', flexShrink: 0, marginTop: 1 }}>
                          {i + 1}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{fix}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Reset */}
                <button onClick={() => { setResult(null); setScript('') }}
                  style={{ alignSelf: 'center' as const, padding: '8px 20px', borderRadius: 10, border: '0.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer' }}>
                  Analyze another script
                </button>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  )
}
