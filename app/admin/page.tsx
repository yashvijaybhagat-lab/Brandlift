'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBetaAccess } from '@/lib/betaAccess'
import { DEFAULT_SYSTEM } from '@/lib/lyraSystem'
import { ALLOWED_MODELS, DEFAULT_MODEL } from '@/lib/gemini'

type Tab = 'overview' | 'codes' | 'lyra' | 'health' | 'flags' | 'code' | 'debug'

/* ─── Types ──────────────────────────────────────────────── */
interface CodeEntry { code: string; source: 'env' | 'dynamic' }
interface ApiResult  { name: string; ok: boolean; ms: number; error?: string }
interface EnvMap     { [k: string]: boolean | number | string }

/* ─── Styles ─────────────────────────────────────────────── */
const S = {
  card: { background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 24px' } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 6 },
  input: {
    width: '100%', background: '#0A0A0B', border: '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#FAFAFA', fontSize: 13, padding: '8px 12px', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box' as const,
  },
  btn: (active = true) => ({
    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: active ? 'pointer' : 'not-allowed',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#18181C',
    color: active ? '#fff' : '#52525B',
    opacity: active ? 1 : 0.6,
    transition: 'all 0.15s',
  } as React.CSSProperties),
  ghostBtn: { padding: '6px 14px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: 'none', color: '#A1A1AA', transition: 'all 0.15s' } as React.CSSProperties,
  dangerBtn: { padding: '6px 14px', borderRadius: 8, border: '0.5px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: '#f87171', transition: 'all 0.15s' } as React.CSSProperties,
}

function Badge({ children, color = '#6366f1' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: `${color}18`, border: `0.5px solid ${color}55`, color }}>
      {children}
    </span>
  )
}

function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '10px 20px', borderRadius: 10, background: type === 'ok' ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)', border: `0.5px solid ${type === 'ok' ? 'rgba(74,222,128,0.35)' : 'rgba(239,68,68,0.35)'}`, color: type === 'ok' ? '#4ADE80' : '#f87171', fontSize: 13, fontWeight: 600 }}>
      {msg}
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────── */
export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#52525B', fontSize: 13 }}>Loading…</div></div>}>
      <AdminPageInner />
    </Suspense>
  )
}

function AdminPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const beta         = useBetaAccess()
  const [tab, setTab]     = useState<Tab>((searchParams.get('tab') as Tab) ?? 'overview')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Auth gate — redirect if not owner
  useEffect(() => {
    if (!beta.loading && !beta.isOwner) router.replace('/')
  }, [beta.loading, beta.isOwner, router])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const founderHeaders = { 'Content-Type': 'application/json', 'x-founder-code': beta.code }

  if (beta.loading || !beta.isOwner) {
    return <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#52525B', fontSize: 13 }}>Verifying…</div></div>
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'codes',    label: 'Beta Codes' },
    { id: 'lyra',     label: 'Lyra Config' },
    { id: 'health',   label: 'API Health' },
    { id: 'flags',    label: 'Feature Flags' },
    { id: 'code',     label: '✦ AI Editor' },
    { id: 'debug',    label: '⬡ AI Debug' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', fontFamily: 'var(--font-inter, Inter, sans-serif)', color: '#FAFAFA' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 20, paddingBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))', border: '0.5px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>◆</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em' }}>BrandLift Admin</span>
              <Badge>FOUNDER</Badge>
            </div>
            <p style={{ fontSize: 11, color: '#52525B', marginTop: 1 }}>Welcome back, {beta.ownerName} — full system access</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button style={S.ghostBtn} onClick={() => router.push('/dashboard')}>← Back to App</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: tab === t.id ? '#a5b4fc' : '#52525B', borderBottom: `2px solid ${tab === t.id ? '#6366f1' : 'transparent'}`, transition: 'all 0.15s', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 32px', maxWidth: 900 }}>
        {tab === 'overview'  && <OverviewTab beta={beta} headers={founderHeaders} />}
        {tab === 'codes'     && <CodesTab headers={founderHeaders} showToast={showToast} />}
        {tab === 'lyra'      && <LyraConfigTab headers={founderHeaders} code={beta.code} ownerName={beta.ownerName} showToast={showToast} />}
        {tab === 'health'    && <HealthTab headers={founderHeaders} />}
        {tab === 'flags'     && <FlagsTab />}
        {tab === 'code'      && <CodeEditorTab headers={founderHeaders} showToast={showToast} />}
        {tab === 'debug'     && <DebugTab      headers={founderHeaders} showToast={showToast} />}
      </div>
    </div>
  )
}

/* ─── Country stats widget ───────────────────────────────── */
interface CountryRow { code: string; name: string; flag: string; visitors: number }
interface ReachFull  { configured: boolean; totalCountries?: number; totalVisitors?: number; countries?: CountryRow[]; updatedAt?: string }

function CountryStatsWidget({ headers }: { headers: Record<string, string> }) {
  const [data, setData]       = useState<ReachFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastPoll, setLastPoll] = useState<string>('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/countries', { headers })
      const json: ReachFull = await res.json()
      setData(json)
      setLastPoll(new Date().toLocaleTimeString())
    } catch {}
    finally { setLoading(false) }
  }, [headers])

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  if (loading) return (
    <div style={S.card}>
      <p style={S.label}>User Geography</p>
      <p style={{ color: '#52525B', fontSize: 13, marginTop: 8 }}>Loading analytics…</p>
    </div>
  )

  if (!data?.configured) return (
    <div style={S.card}>
      <p style={S.label}>User Geography</p>
      <p style={{ color: '#52525B', fontSize: 13, marginTop: 8 }}>
        Not configured — add{' '}
        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>VERCEL_TOKEN</code>{' '}
        and{' '}
        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>VERCEL_PROJECT_ID</code>{' '}
        to Vercel environment variables.
      </p>
    </div>
  )

  const countries  = data.countries ?? []
  const topCountry = countries[0]
  const maxVisits  = topCountry?.visitors ?? 1

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={S.label}>User Geography — Last 30 Days</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
          <span style={{ fontSize: 10, color: '#52525B' }}>Live · refreshed {lastPoll}</span>
          <button onClick={load} style={{ ...S.ghostBtn, padding: '3px 8px', fontSize: 11 }}>↻</button>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: '#52525B', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Countries</p>
          <p style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.05em', color: '#a5b4fc' }}>{data.totalCountries}</p>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: '#52525B', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Total Visitors</p>
          <p style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.05em', color: '#a5b4fc' }}>{(data.totalVisitors ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Country rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {countries.slice(0, 15).map(c => {
          const pct = Math.round((c.visitors / maxVisits) * 100)
          const sharePct = data.totalVisitors ? Math.round((c.visitors / data.totalVisitors) * 100) : 0
          return (
            <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 80px 44px', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20, textAlign: 'center' }}>{c.flag}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', marginBottom: 3 }}>{c.name}</div>
                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#A1A1AA', textAlign: 'right' }}>{c.visitors.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: '#52525B', textAlign: 'right' }}>{sharePct}%</span>
            </div>
          )
        })}
        {countries.length > 15 && (
          <p style={{ fontSize: 11, color: '#52525B', marginTop: 4 }}>+{countries.length - 15} more countries</p>
        )}
      </div>
    </div>
  )
}

/* ─── Overview tab ───────────────────────────────────────── */
function OverviewTab({ beta, headers }: { beta: ReturnType<typeof useBetaAccess>; headers: Record<string, string> }) {
  const ALL_FEATURES = ['4k', '1440p', 'enhancement', 'ai_captions', 'noise_reduce', 'smart_enhance', 'analytics', 'backend_access', 'priority_support', 'unlimited_exports', 'custom_branding', 'team_access', 'early_access', 'raw_logs']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          { label: 'Role', value: 'Founder', sub: 'Full access' },
          { label: 'Features Unlocked', value: beta.features.length, sub: `of ${ALL_FEATURES.length} total` },
          { label: 'Session Code', value: beta.code.slice(0, 8) + '…', sub: 'Stored in localStorage' },
        ].map(stat => (
          <div key={stat.label} style={S.card}>
            <p style={S.label}>{stat.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', color: '#FAFAFA', marginBottom: 2 }}>{stat.value}</p>
            <p style={{ fontSize: 11, color: '#52525B' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Live country stats */}
      <CountryStatsWidget headers={headers} />

      <div style={S.card}>
        <p style={S.label}>Your Features</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {ALL_FEATURES.map(f => (
            <span key={f} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: beta.features.includes(f) ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${beta.features.includes(f) ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)'}`, color: beta.features.includes(f) ? '#4ADE80' : '#52525B' }}>
              {beta.features.includes(f) ? '✓' : '○'} {f}
            </span>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <p style={S.label}>Quick Links</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/dashboard/videos', label: 'Video Studio' },
            { href: '/', label: 'Homepage' },
            { href: '/api/admin/health', label: 'Raw Health JSON ↗' },
          ].map(l => (
            <a key={l.href} href={l.href} style={{ ...S.ghostBtn, textDecoration: 'none', display: 'inline-block' }}>{l.label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Beta codes tab ─────────────────────────────────────── */
function CodesTab({ headers, showToast }: { headers: Record<string, string>; showToast: (m: string, t: 'ok' | 'err') => void }) {
  const [codes, setCodes] = useState<{ env: CodeEntry[]; dynamic: CodeEntry[] } | null>(null)
  const [newCode, setNewCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [adding, setAdding]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/codes', { headers })
      setCodes(await res.json())
    } finally { setLoading(false) }
  }, [headers])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!newCode.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/admin/codes', { method: 'POST', headers, body: JSON.stringify({ code: newCode }) })
      const data = await res.json()
      if (data.ok) { showToast(`Added ${data.code}`, 'ok'); setNewCode(''); load() }
      else showToast(data.error ?? 'Failed', 'err')
    } finally { setAdding(false) }
  }

  const remove = async (code: string) => {
    const res = await fetch('/api/admin/codes', { method: 'DELETE', headers, body: JSON.stringify({ code }) })
    const data = await res.json()
    if (data.ok) { showToast(`Removed ${code}`, 'ok'); load() }
    else showToast(data.error ?? 'Failed', 'err')
  }

  const allCodes = codes ? [...(codes.env ?? []), ...(codes.dynamic ?? [])] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Add new code */}
      <div style={S.card}>
        <p style={S.label}>Add Beta Code</p>
        <p style={{ fontSize: 12, color: '#71717A', marginBottom: 12 }}>Codes are stored in Vercel Blob and work immediately — no redeploy needed.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...S.input, flex: 1, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}
            value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
            placeholder="MYCODE2026" onKeyDown={e => e.key === 'Enter' && add()} />
          <button style={S.btn(!!newCode.trim() && !adding)} onClick={add} disabled={!newCode.trim() || adding}>
            {adding ? 'Adding…' : 'Add Code'}
          </button>
        </div>
      </div>

      {/* Code list */}
      <div style={S.card}>
        <p style={S.label}>All Active Codes ({allCodes.length})</p>
        {loading ? (
          <p style={{ color: '#52525B', fontSize: 13, marginTop: 12 }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {allCodes.map(entry => (
              <div key={entry.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0A0A0B', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.06)' }}>
                <code style={{ flex: 1, fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.05em', color: '#FAFAFA' }}>{entry.code}</code>
                <Badge color={entry.source === 'env' ? '#6366f1' : '#4ADE80'}>{entry.source}</Badge>
                {entry.source === 'dynamic' && (
                  <button style={S.dangerBtn} onClick={() => remove(entry.code)}>Remove</button>
                )}
              </div>
            ))}
            {allCodes.length === 0 && <p style={{ color: '#52525B', fontSize: 13 }}>No codes yet</p>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Lyra config tab ────────────────────────────────────── */
function LyraConfigTab({ headers, code, ownerName, showToast }: { headers: Record<string, string>; code: string; ownerName: string | null; showToast: (m: string, t: 'ok' | 'err') => void }) {
  const [prompt, setPrompt]       = useState(DEFAULT_SYSTEM)
  const [isOverridden, setIsOver] = useState(false)
  const [model, setModel]         = useState<string>(DEFAULT_MODEL)
  const [maxTok, setMaxTok]       = useState(1024)
  const [saving, setSaving]       = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState('')
  const [testing, setTesting]     = useState(false)
  const LYRA_SESSION_KEY = 'bl_lyra_session'

  // Load from server override + localStorage session
  useEffect(() => {
    fetch('/api/admin/system-prompt', { headers }).then(r => r.json()).then(data => {
      setPrompt(data.prompt ?? DEFAULT_SYSTEM)
      setIsOver(data.isOverridden ?? false)
    }).catch(() => {})

    try {
      const sess = JSON.parse(localStorage.getItem(LYRA_SESSION_KEY) ?? '{}')
      if (sess.model) setModel(sess.model)
      if (sess.maxTokens) setMaxTok(sess.maxTokens)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveSession = () => {
    localStorage.setItem(LYRA_SESSION_KEY, JSON.stringify({ model, maxTokens: maxTok, customSystem: prompt }))
    showToast('Session config saved — Lyra will use these settings now', 'ok')
  }

  const saveGlobal = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/system-prompt', { method: 'POST', headers, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      if (data.ok) { setIsOver(true); showToast('Global system prompt updated', 'ok') }
      else showToast(data.error ?? 'Failed', 'err')
    } finally { setSaving(false) }
  }

  const resetGlobal = async () => {
    const res = await fetch('/api/admin/system-prompt', { method: 'DELETE', headers })
    const data = await res.json()
    if (data.ok) { setPrompt(data.prompt); setIsOver(false); showToast('Reset to default', 'ok') }
  }

  const testPrompt = async () => {
    if (!testInput.trim()) return
    setTesting(true); setTestOutput('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'x-founder-code': code },
        body: JSON.stringify({ message: testInput, customSystem: prompt, model, maxTokens: maxTok }),
      })
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let out = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        out += dec.decode(value, { stream: true })
        setTestOutput(out)
      }
    } catch (e) { setTestOutput(String(e)) }
    finally { setTesting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Model + tokens */}
      <div style={S.card}>
        <p style={S.label}>Lyra Model & Tokens</p>
        <p style={{ fontSize: 12, color: '#71717A', marginBottom: 14 }}>These apply to your session only (saved in localStorage). Does not affect other users.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <p style={S.label}>Model</p>
            <select value={model} onChange={e => setModel(e.target.value)}
              style={{ ...S.input, cursor: 'pointer' }}>
              {ALLOWED_MODELS.map(m => (
                <option key={m} value={m}>{m}{m === DEFAULT_MODEL ? ' (default)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <p style={S.label}>Max output tokens: {maxTok}</p>
            <input type="range" min={256} max={8192} step={256} value={maxTok} onChange={e => setMaxTok(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#6366f1', marginTop: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#52525B', marginTop: 4 }}>
              <span>256</span><span>8192</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button style={S.btn()} onClick={saveSession}>Save to My Session</button>
        </div>
      </div>

      {/* System prompt editor */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <p style={{ ...S.label, margin: 0 }}>System Prompt</p>
          {isOverridden && <Badge color="#f59e0b">OVERRIDDEN</Badge>}
          <span style={{ fontSize: 11, color: '#52525B', marginLeft: 'auto' }}>{prompt.length} chars</span>
        </div>
        <p style={{ fontSize: 12, color: '#71717A', marginBottom: 12 }}>
          Edit what Lyra knows and how she responds. "Save Global" affects all users — "Save to Session" only affects yours.
        </p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={14}
          style={{ ...S.input, resize: 'vertical', lineHeight: 1.65, fontFamily: 'monospace', fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button style={S.btn(!saving)} onClick={saveGlobal} disabled={saving}>{saving ? 'Saving…' : 'Save Global (all users)'}</button>
          <button style={S.ghostBtn} onClick={saveSession}>Save to My Session</button>
          {isOverridden && <button style={S.dangerBtn} onClick={resetGlobal}>Reset to Default</button>}
        </div>
      </div>

      {/* Test prompt */}
      <div style={S.card}>
        <p style={S.label}>Test This Config</p>
        <p style={{ fontSize: 12, color: '#71717A', marginBottom: 12 }}>Send a real message through the chat API with the above system prompt and model.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={{ ...S.input, flex: 1 }} value={testInput} onChange={e => setTestInput(e.target.value)}
            placeholder="Ask Lyra something to test the prompt…" onKeyDown={e => e.key === 'Enter' && testPrompt()} />
          <button style={S.btn(!!testInput.trim() && !testing)} onClick={testPrompt} disabled={!testInput.trim() || testing}>
            {testing ? 'Testing…' : 'Run'}
          </button>
        </div>
        {testOutput && (
          <div style={{ padding: 14, borderRadius: 8, background: '#0A0A0B', border: '0.5px solid rgba(255,255,255,0.07)', fontSize: 13, color: '#E4E4E7', lineHeight: 1.65, whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto' }}>
            {testOutput}
            {testing && <span style={{ display: 'inline-block', width: 2, height: 13, background: '#6366f1', borderRadius: 1, marginLeft: 2, verticalAlign: 'text-bottom' }} />}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── API health tab ─────────────────────────────────────── */
function HealthTab({ headers }: { headers: Record<string, string> }) {
  const [data, setData] = useState<{ apis: ApiResult[]; env: EnvMap; checkedAt: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const check = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/health', { headers })
      setData(await res.json())
    } finally { setLoading(false) }
  }, [headers])

  useEffect(() => { check() }, [check])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>API Status</h2>
          {data?.checkedAt && <p style={{ fontSize: 11, color: '#52525B', marginTop: 2 }}>Last checked: {new Date(data.checkedAt).toLocaleTimeString()}</p>}
        </div>
        <button style={S.ghostBtn} onClick={check} disabled={loading}>{loading ? 'Checking…' : '↻ Re-check'}</button>
      </div>

      {data?.apis && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {data.apis.map(api => (
            <div key={api.name} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: api.ok ? '#4ADE80' : '#f87171', boxShadow: `0 0 8px ${api.ok ? '#4ADE8066' : '#f8717166'}`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>{api.name}</p>
                <p style={{ fontSize: 11, color: api.ok ? '#4ADE80' : '#f87171' }}>{api.ok ? `${api.ms}ms` : api.error?.slice(0, 60)}</p>
              </div>
              <Badge color={api.ok ? '#4ADE80' : '#f87171'}>{api.ok ? 'OK' : 'ERROR'}</Badge>
            </div>
          ))}
        </div>
      )}

      {data?.env && (
        <div style={S.card}>
          <p style={S.label}>Environment</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {Object.entries(data.env).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <code style={{ fontSize: 12, color: '#A1A1AA', flex: 1, fontFamily: 'monospace' }}>{k}</code>
                <span style={{ fontSize: 12, fontWeight: 600, color: v === true ? '#4ADE80' : v === false ? '#f87171' : '#A1A1AA' }}>
                  {typeof v === 'boolean' ? (v ? '✓ set' : '✗ missing') : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Shared types + commit helper ──────────────────────────── */
interface FileContext  { path: string; content: string }
interface FileChange   { path: string; content: string; isNew?: boolean }
interface EditorResult { explanation: string; changes: FileChange[] }

type CommitUrl = { path: string; url: string }

function ChangesViewer({ result, commitUrls, committing, onCommit, headers, showToast, storageKey }: {
  result:      EditorResult
  commitUrls:  CommitUrl[]
  committing:  boolean
  onCommit:    (msg: string) => void
  headers:     Record<string, string>
  showToast:   (m: string, t: 'ok' | 'err') => void
  storageKey?: string
}) {
  const [activeFile, setActiveFile] = useState(0)
  const [viewMode,   setViewMode]   = useState<'after' | 'before'>('after')
  const [commitMsg,  setCommitMsg]  = useState(storageKey ?? '[AI] Code change')

  return (
    <>
      <div style={{ ...S.card, borderColor: 'rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.04)' }}>
        <p style={S.label}>What changed & why</p>
        <p style={{ fontSize: 14, color: '#E4E4E7', lineHeight: 1.7, marginTop: 8 }}>{result.explanation}</p>
      </div>

      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={S.label}>{result.changes.length} file{result.changes.length > 1 ? 's' : ''} changed</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['after', 'before'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ ...S.ghostBtn, fontSize: 11, padding: '3px 10px', color: viewMode === v ? '#a5b4fc' : '#52525B', borderColor: viewMode === v ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)' }}>
                {v === 'after' ? 'New code' : 'Original'}
              </button>
            ))}
          </div>
        </div>

        {result.changes.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {result.changes.map((c, i) => (
              <button key={c.path} onClick={() => setActiveFile(i)}
                style={{ padding: '5px 12px', borderRadius: 6, border: `0.5px solid ${activeFile === i ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, background: activeFile === i ? 'rgba(99,102,241,0.15)' : 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, color: activeFile === i ? '#a5b4fc' : '#71717A' }}>
                {c.isNew && <span style={{ color: '#4ADE80', marginRight: 4 }}>+</span>}
                {c.path.split('/').pop()}
              </button>
            ))}
          </div>
        )}

        {result.changes[activeFile] && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <code style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#71717A' }}>{result.changes[activeFile].path}</code>
              {result.changes[activeFile].isNew && <span style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', background: 'rgba(74,222,128,0.1)', border: '0.5px solid rgba(74,222,128,0.3)', borderRadius: 4, padding: '2px 6px' }}>NEW FILE</span>}
              <button onClick={() => navigator.clipboard.writeText(result.changes[activeFile].content)} style={{ ...S.ghostBtn, fontSize: 11, padding: '3px 10px' }}>Copy</button>
            </div>
            <pre style={{ background: '#0A0A0B', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 16, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.75, color: '#E4E4E7', maxHeight: 500, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
              {viewMode === 'after' ? result.changes[activeFile].content : '(original not stored in this view)'}
            </pre>
          </>
        )}
      </div>

      <div style={{ ...S.card, borderColor: 'rgba(74,222,128,0.2)' }}>
        <p style={S.label}>Push to Vercel</p>
        <p style={{ fontSize: 12, color: '#71717A', marginBottom: 12 }}>Commits to GitHub → Vercel auto-deploys. Live in ~60 seconds.</p>
        <input style={{ ...S.input, marginBottom: 10 }} value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="Commit message" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={{ ...S.btn(!committing), background: !committing ? 'linear-gradient(135deg,#4ADE80,#22c55e)' : '#18181C', fontSize: 14, padding: '10px 22px' }}
            onClick={() => onCommit(commitMsg)} disabled={committing}>
            {committing ? 'Pushing…' : `↑ Push ${result.changes.length} file${result.changes.length > 1 ? 's' : ''} to Vercel`}
          </button>
          <span style={{ fontSize: 12, color: '#52525B' }}>or copy each file above and apply manually</span>
        </div>
        {commitUrls.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {commitUrls.map(u => (
              <a key={u.path} href={u.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#4ADE80', fontFamily: 'monospace' }}>
                ✓ {u.path} → view commit ↗
              </a>
            ))}
            <p style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>Vercel is deploying now.</p>
          </div>
        )}
      </div>
    </>
  )
}

/* ─── AI Code Editor tab ─────────────────────────────────────── */
function CodeEditorTab({ headers, showToast }: { headers: Record<string, string>; showToast: (m: string, t: 'ok' | 'err') => void }) {
  const [instruction, setInstruction] = useState('')
  const [status,      setStatus]      = useState('')
  const [generating,  setGenerating]  = useState(false)
  const [result,      setResult]      = useState<EditorResult | null>(null)
  const [committing,  setCommitting]  = useState(false)
  const [commitUrls,  setCommitUrls]  = useState<CommitUrl[]>([])

  const QUICK = [
    'Add a new beta feature flag called "hd_download" to the validate route',
    'Add rate-limit logging — log IP and route for every blocked request',
    'Change the Lyra default model to gemini-2.0-flash',
    'Add a /api/admin/stats route that returns a count of active beta codes',
    'Add an email field to the beta code save endpoint',
    'Make the sign-in error message friendlier when the code is wrong',
  ]

  const generate = async () => {
    if (!instruction.trim() || generating) return
    setGenerating(true); setResult(null); setCommitUrls([])
    try {
      setStatus('Reading project files…')
      const treeRes  = await fetch('/api/admin/files', { headers })
      const treeData = await treeRes.json()
      const allFiles: string[] = treeData.files ?? []

      setStatus('Identifying relevant files…')
      // Quick Gemini call to pick relevant files
      const pickRes  = await fetch('/api/admin/code-editor', {
        method:  'POST',
        headers,
        body:    JSON.stringify({ instruction, files: [], autoPickOnly: true, fileList: allFiles }),
      })
      const pickData = await pickRes.json()
      const paths: string[] = pickData.filePaths ?? []

      setStatus(`Reading ${paths.length} files…`)
      const fileContexts: FileContext[] = []
      for (const p of paths.slice(0, 8)) {
        const r = await fetch(`/api/admin/files?path=${encodeURIComponent(p)}`, { headers })
        const d = await r.json()
        if (d.content) fileContexts.push({ path: p, content: d.content })
      }

      setStatus('Generating changes…')
      const res  = await fetch('/api/admin/code-editor', {
        method:  'POST',
        headers,
        body:    JSON.stringify({ instruction, files: fileContexts }),
      })
      const data = await res.json()
      if (data.error) { showToast(data.error, 'err'); return }
      setResult(data)
    } catch (e) { showToast(String(e), 'err') }
    finally { setGenerating(false); setStatus('') }
  }

  const commit = async (msg: string) => {
    if (!result?.changes?.length || committing) return
    setCommitting(true)
    try {
      const res  = await fetch('/api/admin/code-editor', {
        method:  'PUT',
        headers,
        body:    JSON.stringify({ changes: result.changes, commitMessage: msg }),
      })
      const data = await res.json()
      if (data.ok) {
        setCommitUrls(data.results.filter((r: { ok: boolean }) => r.ok).map((r: { path: string; commitUrl: string }) => ({ path: r.path, url: r.commitUrl })))
        showToast(`${data.results.length} file${data.results.length !== 1 ? 's' : ''} committed — Vercel deploying`, 'ok')
      } else { showToast(data.error ?? 'Commit failed — check GITHUB_TOKEN env var', 'err') }
    } finally { setCommitting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      <div style={{ ...S.card, padding: '28px 32px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px' }}>AI Code Editor</h2>
        <p style={{ fontSize: 13, color: '#71717A', marginBottom: 24 }}>Describe what you want to change in plain English. The AI finds the right files, writes the code, and you push it live.</p>
        <textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          rows={5}
          placeholder="e.g. Add a new beta feature flag called 'hd_download' — when it's enabled, show a Download in HD button on the video studio page"
          style={{ ...S.input, resize: 'vertical', lineHeight: 1.7, fontSize: 14, padding: '14px 16px' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 20 }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setInstruction(q)} style={{ ...S.ghostBtn, fontSize: 11, padding: '4px 10px' }}>
              {q.slice(0, 52)}…
            </button>
          ))}
        </div>
        <button
          style={{ ...S.btn(!!instruction.trim() && !generating), fontSize: 15, padding: '12px 28px' }}
          onClick={generate}
          disabled={!instruction.trim() || generating}
        >
          {generating ? `✦ ${status || 'Working…'}` : '✦ Generate Changes'}
        </button>
      </div>

      {result && (
        <ChangesViewer
          result={result}
          commitUrls={commitUrls}
          committing={committing}
          onCommit={commit}
          headers={headers}
          showToast={showToast}
          storageKey={`[AI Editor] ${instruction.slice(0, 60)}`}
        />
      )}
    </div>
  )
}

/* ─── AI Debug tab ───────────────────────────────────────────── */
interface DebugResult { rootCause: string; explanation: string; affectedFiles: string[]; changes: FileChange[] }

function DebugTab({ headers, showToast }: { headers: Record<string, string>; showToast: (m: string, t: 'ok' | 'err') => void }) {
  const [errorDesc,  setErrorDesc]  = useState('')
  const [stackTrace, setStackTrace] = useState('')
  const [status,     setStatus]     = useState('')
  const [analysing,  setAnalysing]  = useState(false)
  const [result,     setResult]     = useState<DebugResult | null>(null)
  const [committing, setCommitting] = useState(false)
  const [commitUrls, setCommitUrls] = useState<CommitUrl[]>([])

  const EXAMPLES = [
    'The Lyra chat stops streaming mid-response sometimes',
    'Beta code validation returns 500 errors intermittently',
    'The admin panel health tab shows all APIs as offline',
    'Debug mode toggle in the FounderBar doesn\'t persist on page reload',
    'Video upload fails silently when the file is over 100MB',
  ]

  const analyse = async () => {
    if (!errorDesc.trim() || analysing) return
    setAnalysing(true); setResult(null); setCommitUrls([])
    try {
      setStatus('Reading project files…')
      const treeRes  = await fetch('/api/admin/files', { headers })
      const treeData = await treeRes.json()
      const allFiles: string[] = treeData.files ?? []

      setStatus('Finding relevant files…')
      const pickRes  = await fetch('/api/admin/code-editor', {
        method:  'POST',
        headers,
        body:    JSON.stringify({ instruction: errorDesc + ' ' + stackTrace, files: [], autoPickOnly: true, fileList: allFiles }),
      })
      const pickData = await pickRes.json()
      const paths: string[] = pickData.filePaths ?? []

      setStatus(`Reading ${paths.length} files…`)
      const fileContexts: FileContext[] = []
      for (const p of paths.slice(0, 8)) {
        const r = await fetch(`/api/admin/files?path=${encodeURIComponent(p)}`, { headers })
        const d = await r.json()
        if (d.content) fileContexts.push({ path: p, content: d.content })
      }

      setStatus('Diagnosing bug…')
      const res  = await fetch('/api/admin/debug', {
        method:  'POST',
        headers,
        body:    JSON.stringify({ errorDesc, stackTrace, files: fileContexts }),
      })
      const data = await res.json()
      if (data.error) { showToast(data.error, 'err'); return }
      setResult(data)
    } catch (e) { showToast(String(e), 'err') }
    finally { setAnalysing(false); setStatus('') }
  }

  const commit = async (msg: string) => {
    if (!result?.changes?.length || committing) return
    setCommitting(true)
    try {
      const res  = await fetch('/api/admin/code-editor', {
        method:  'PUT',
        headers,
        body:    JSON.stringify({ changes: result.changes, commitMessage: msg }),
      })
      const data = await res.json()
      if (data.ok) {
        setCommitUrls(data.results.filter((r: { ok: boolean }) => r.ok).map((r: { path: string; commitUrl: string }) => ({ path: r.path, url: r.commitUrl })))
        showToast('Fix pushed — Vercel deploying', 'ok')
      } else { showToast(data.error ?? 'Commit failed', 'err') }
    } finally { setCommitting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      <div style={{ ...S.card, padding: '28px 32px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px' }}>AI Debugger</h2>
        <p style={{ fontSize: 13, color: '#71717A', marginBottom: 24 }}>Describe the bug. The AI reads the codebase, finds the root cause, and generates a fix you can push directly to production.</p>

        <p style={{ ...S.label, marginBottom: 8 }}>What's broken?</p>
        <textarea
          value={errorDesc}
          onChange={e => setErrorDesc(e.target.value)}
          rows={4}
          placeholder="e.g. The Lyra chat stops streaming halfway through a response — it just cuts off and the spinner keeps spinning"
          style={{ ...S.input, resize: 'vertical', lineHeight: 1.7, fontSize: 14, padding: '14px 16px', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => setErrorDesc(e)} style={{ ...S.ghostBtn, fontSize: 11, padding: '4px 10px' }}>
              {e.slice(0, 52)}{e.length > 52 ? '…' : ''}
            </button>
          ))}
        </div>

        <p style={{ ...S.label, marginBottom: 8 }}>Stack trace / error output <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#3f3f46' }}>(optional)</span></p>
        <textarea
          value={stackTrace}
          onChange={e => setStackTrace(e.target.value)}
          rows={5}
          placeholder="Paste the full error from your browser console, Vercel logs, or terminal here…"
          style={{ ...S.input, resize: 'vertical', lineHeight: 1.65, fontSize: 12, fontFamily: 'monospace', padding: '12px 16px', marginBottom: 20 }}
        />

        <button
          style={{ ...S.btn(!!errorDesc.trim() && !analysing), fontSize: 15, padding: '12px 28px', background: !!errorDesc.trim() && !analysing ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#18181C' }}
          onClick={analyse}
          disabled={!errorDesc.trim() || analysing}
        >
          {analysing ? `⬡ ${status || 'Analysing…'}` : '⬡ Debug It'}
        </button>
      </div>

      {result && (
        <>
          {/* Root cause */}
          <div style={{ ...S.card, borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)', padding: '20px 24px' }}>
            <p style={{ ...S.label, color: '#f87171' }}>Root Cause</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#FAFAFA', lineHeight: 1.55, marginTop: 8 }}>{result.rootCause}</p>
          </div>

          <div style={{ ...S.card, padding: '20px 24px' }}>
            <p style={S.label}>Full Explanation</p>
            <p style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.75, marginTop: 8 }}>{result.explanation}</p>
            {result.affectedFiles?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ ...S.label, marginBottom: 8 }}>Files involved</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.affectedFiles.map(f => (
                    <code key={f} style={{ fontSize: 11, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 5, background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>{f}</code>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.changes?.length > 0 ? (
            <ChangesViewer
              result={{ explanation: result.explanation, changes: result.changes }}
              commitUrls={commitUrls}
              committing={committing}
              onCommit={commit}
              headers={headers}
              showToast={showToast}
              storageKey={`[AI Debug fix] ${errorDesc.slice(0, 50)}`}
            />
          ) : (
            <div style={{ ...S.card, borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' }}>
              <p style={{ fontSize: 13, color: '#f59e0b' }}>No code change needed — this is likely a config or environment issue. See the explanation above.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Feature flags tab ──────────────────────────────────── */
function FlagsTab() {
  const BETA_FEATURES  = ['4k', '1440p', 'enhancement', 'ai_captions', 'noise_reduce', 'smart_enhance']
  const OWNER_FEATURES = [...BETA_FEATURES, 'analytics', 'backend_access', 'priority_support', 'unlimited_exports', 'custom_branding', 'team_access', 'early_access', 'raw_logs']
  const ALL            = Array.from(new Set([...BETA_FEATURES, ...OWNER_FEATURES]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={S.card}>
        <p style={S.label}>Feature Access Matrix</p>
        <p style={{ fontSize: 12, color: '#71717A', marginBottom: 16 }}>Which roles unlock which features. Modify in <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#a5b4fc' }}>app/api/beta/validate/route.ts</code> to change.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>Feature</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>Free</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>Beta</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>Founder</th>
              </tr>
            </thead>
            <tbody>
              {ALL.map(f => (
                <tr key={f} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px' }}><code style={{ fontSize: 12, fontFamily: 'monospace', color: '#A1A1AA' }}>{f}</code></td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: 14, color: '#3f3f46' }}>○</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: 14, color: BETA_FEATURES.includes(f) ? '#4ADE80' : '#3f3f46' }}>{BETA_FEATURES.includes(f) ? '✓' : '○'}</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: 14, color: '#a5b4fc' }}>✓</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={S.card}>
        <p style={S.label}>Founder-Exclusive Capabilities</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {[
            { label: 'Rate limit bypass', desc: 'All API calls skip rate limiting — infinite generations' },
            { label: 'Model switcher', desc: 'Use any Gemini model (2.5-flash-lite → 1.5-pro) from Lyra Config' },
            { label: 'System prompt editor', desc: "Rewrite Lyra's personality and knowledge in real-time" },
            { label: 'Max token override', desc: 'Up to 8192 output tokens per Lyra response' },
            { label: 'Dynamic beta codes', desc: 'Add/remove codes via Admin without redeploying' },
            { label: 'API health monitor', desc: 'Live ping of all third-party APIs with latency' },
            { label: 'Admin panel access', desc: 'This page — /admin — secured by founder code' },
            { label: 'Prompt testing', desc: 'Test system prompts live from the Lyra Config tab' },
          ].map(cap => (
            <div key={cap.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', background: '#0A0A0B', borderRadius: 8, border: '0.5px solid rgba(99,102,241,0.12)' }}>
              <span style={{ color: '#a5b4fc', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✦</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA' }}>{cap.label}</p>
                <p style={{ fontSize: 12, color: '#71717A', marginTop: 1 }}>{cap.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
