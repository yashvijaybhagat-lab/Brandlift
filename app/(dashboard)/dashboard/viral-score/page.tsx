'use client'

import { useState } from 'react'
import { TopBar } from '@/components/dashboard/TopBar'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Sparkles, Copy, Check, ChevronDown } from 'lucide-react'
import type { ViralScoreResult } from '@/app/api/viral-score/route'

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'LinkedIn', 'Twitter / X']

const GRADE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  S: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', label: 'Viral potential' },
  A: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Strong content' },
  B: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', label: 'Good content' },
  C: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Needs work' },
  D: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Major issues' },
}

function ScoreRing({ score }: { score: number }) {
  const r = 54; const circ = 2 * Math.PI * r
  const color = score >= 80 ? '#22c55e' : score >= 65 ? '#0ea5e9' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <motion.circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.2, ease: [0.16,1,0.3,1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {score}
        </motion.span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

function DimensionBar({ icon, label, score, max, tip }: { icon: string; label: string; score: number; max: number; tip: string }) {
  const pct = (score / max) * 100
  const color = pct >= 75 ? '#22c55e' : pct >= 55 ? '#0ea5e9' : pct >= 40 ? '#f59e0b' : '#ef4444'
  const [open, setOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color, minWidth: 36, textAlign: 'right' }}>{score}/{max}</span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.16,1,0.3,1], delay: 0.2 }}
          style={{ height: '100%', background: color, borderRadius: 999 }} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6, paddingLeft: 34, overflow: 'hidden' }}>
            💡 {tip}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ViralScorePage() {
  const [script, setScript] = useState('')
  const [platform, setPlatform] = useState('TikTok')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ViralScoreResult | null>(null)
  const [error, setError] = useState('')
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

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245,158,11,0.1)', border: '0.5px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap className="w-6 h-6" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1.2 }}>Viral Score</h1>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>Analyze your script before you film. Know exactly what to fix.</p>
            </div>
          </div>

          {/* Input */}
          <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Platform selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${platform === p ? 'rgba(99,102,241,0.5)' : 'var(--color-border)'}`, background: platform === p ? 'rgba(99,102,241,0.12)' : 'transparent', color: platform === p ? '#818cf8' : 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {p}
                </button>
              ))}
            </div>

            <textarea value={script} onChange={e => setScript(e.target.value)}
              placeholder="Paste your full video script here. Include the hook, body, and call to action for the most accurate score…"
              rows={6}
              style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--color-text)', resize: 'vertical', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{script.length} chars · ~{Math.ceil(script.split(' ').length / 2.5)}s read</span>
              <button onClick={analyze} disabled={!script.trim() || loading}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 12, border: 'none', cursor: script.trim() && !loading ? 'pointer' : 'not-allowed', background: script.trim() && !loading ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'var(--color-surface-elevated)', color: script.trim() && !loading ? '#fff' : 'var(--color-text-muted)', fontSize: 14, fontWeight: 700, boxShadow: script.trim() && !loading ? '0 4px 20px rgba(245,158,11,0.3)' : 'none', transition: 'all 0.2s' }}>
                {loading ? (
                  <><div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i*0.15 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />)}</div>Analyzing…</>
                ) : (
                  <><Zap className="w-4 h-4" />Analyze script</>
                )}
              </button>
            </div>
            {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}
          </div>

          {/* Results */}
          <AnimatePresence>
            {result && grade && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Score card */}
                <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 20, padding: 24, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                  <ScoreRing score={result.totalScore} />
                  <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: grade.color, background: grade.bg, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${grade.color}44` }}>{result.grade}</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: grade.color }}>{grade.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 2 }}>{result.verdict}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>{result.summary}</p>
                  </div>
                </div>

                {/* Dimension bars */}
                <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Score breakdown <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>— tap any row for tips</span></p>
                  {Object.values(result.dimensions).map(d => (
                    <DimensionBar key={d.label} icon={d.icon} label={d.label} score={d.score} max={d.max} tip={d.tip} />
                  ))}
                </div>

                {/* Improved hook */}
                <div style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles className="w-4 h-4" style={{ color: '#818cf8' }} />
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>Improved hook</p>
                    </div>
                    <button onClick={copyHook} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: hookCopied ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', border: `0.5px solid ${hookCopied ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.2)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: hookCopied ? '#22c55e' : '#818cf8' }}>
                      {hookCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {hookCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.65, fontStyle: 'italic' }}>"{result.improvedHook}"</p>
                </div>

                {/* Quick fixes */}
                <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 14 }}>Quick fixes</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.quickFixes.map((fix, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                        style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>{fix}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Re-analyze CTA */}
                <button onClick={() => { setResult(null); setScript('') }}
                  style={{ alignSelf: 'center', padding: '8px 20px', borderRadius: 10, border: '0.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer' }}>
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
