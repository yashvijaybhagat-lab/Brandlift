'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBetaAccess } from '@/lib/betaAccess'
import { DEFAULT_SYSTEM } from '@/lib/lyraSystem'
import { ALLOWED_MODELS, DEFAULT_MODEL } from '@/lib/gemini'

type Tab = 'overview' | 'analytics' | 'codes' | 'lyra' | 'health' | 'flags' | 'code' | 'debug'

interface CodeEntry  { code: string; source: 'env' | 'dynamic' }
interface ApiResult  { name: string; ok: boolean; ms: number; error?: string }
interface EnvMap     { [k: string]: boolean | number | string }
interface ActivityItem { ts: number; action: string; detail: string }

/* ─── Design tokens ──────────────────────────────────────────── */
const C = {
  bg:       '#0A0A0B',
  surface:  '#111113',
  elevated: '#18181C',
  border:   'rgba(255,255,255,0.06)',
  borderMd: 'rgba(255,255,255,0.10)',
  primary:  '#6366f1',
  accent:   '#8b5cf6',
  text:     '#FAFAFA',
  muted:    '#A1A1AA',
  subtle:   '#52525B',
  success:  '#4ADE80',
  warning:  '#f59e0b',
  danger:   '#f87171',
}

/* ─── Style helpers ──────────────────────────────────────────── */
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.surface,
  border: `0.5px solid ${C.border}`,
  borderRadius: 14,
  padding: '20px 24px',
  ...extra,
})

const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: C.subtle,
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
}

const input: React.CSSProperties = {
  width: '100%', background: C.bg, border: `0.5px solid ${C.borderMd}`,
  borderRadius: 9, color: C.text, fontSize: 13, padding: '9px 13px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const btn = (active = true, variant: 'primary' | 'success' | 'danger' | 'ghost' = 'primary'): React.CSSProperties => {
  const bg: Record<string, string> = {
    primary: `linear-gradient(135deg,${C.primary},${C.accent})`,
    success: 'linear-gradient(135deg,#4ADE80,#22c55e)',
    danger:  'rgba(239,68,68,0.12)',
    ghost:   'transparent',
  }
  const col: Record<string, string> = {
    primary: '#fff', success: '#0A0A0B', danger: C.danger, ghost: C.muted,
  }
  const bdr: Record<string, string> = {
    primary: 'none', success: 'none', danger: `0.5px solid rgba(239,68,68,0.3)`, ghost: `0.5px solid ${C.border}`,
  }
  return {
    padding: '8px 18px', borderRadius: 9, border: active ? bdr[variant] : 'none',
    cursor: active ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 600,
    background: active ? bg[variant] : C.elevated,
    color: active ? col[variant] : C.subtle,
    opacity: active ? 1 : 0.55, transition: 'all 0.15s',
  }
}

/* ─── Activity log helpers ───────────────────────────────────── */
const ACTIVITY_KEY = 'bl_admin_activity'
function logActivity(action: string, detail: string) {
  try {
    const prev: ActivityItem[] = JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? '[]')
    const next = [{ ts: Date.now(), action, detail }, ...prev].slice(0, 30)
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next))
  } catch {}
}
function getActivity(): ActivityItem[] {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? '[]') }
  catch { return [] }
}

/* ─── Shared sub-components ──────────────────────────────────── */
function Badge({ children, color = C.primary }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4, background: `${color}18`, border: `0.5px solid ${color}55`, color }}>
      {children}
    </span>
  )
}

function Dot({ color = C.success, pulse = false }: { color?: string; pulse?: boolean }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
      {pulse && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.5, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />}
      <span style={{ position: 'relative', borderRadius: '50%', width: 8, height: 8, background: color, boxShadow: `0 0 6px ${color}88` }} />
    </span>
  )
}

function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 22px', borderRadius: 12, background: type === 'ok' ? 'rgba(74,222,128,0.10)' : 'rgba(239,68,68,0.10)', border: `0.5px solid ${type === 'ok' ? 'rgba(74,222,128,0.30)' : 'rgba(239,68,68,0.30)'}`, color: type === 'ok' ? C.success : C.danger, fontSize: 13, fontWeight: 600, backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      {type === 'ok' ? '✓' : '✗'} {msg}
    </div>
  )
}

function StatCard({ label: lbl, value, sub, color = C.primary, icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: string }) {
  return (
    <div style={{ ...card(), background: `${color}08`, border: `0.5px solid ${color}22`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, right: -10, fontSize: 60, opacity: 0.04, filter: 'blur(2px)', userSelect: 'none' }}>{icon}</div>
      <p style={label}>{lbl}</p>
      <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.05em', color, marginBottom: 2 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: C.subtle }}>{sub}</p>}
    </div>
  )
}

/* ─── Main entry ─────────────────────────────────────────────── */
export default function AdminPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.subtle, fontSize: 13 }}>Loading…</div>
      </div>
    }>
      <AdminPageInner />
    </Suspense>
  )
}

const NAV: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'overview',   label: 'Overview',      icon: '◇', desc: 'System status & stats' },
  { id: 'analytics',  label: 'Analytics',     icon: '◑', desc: 'Page views & traffic' },
  { id: 'codes',      label: 'Beta Codes',    icon: '◈', desc: 'Manage access codes' },
  { id: 'lyra',       label: 'Lyra Config',   icon: '◎', desc: 'AI model & prompt' },
  { id: 'health',     label: 'API Health',    icon: '◉', desc: 'Service status' },
  { id: 'flags',      label: 'Feature Flags', icon: '⬘', desc: 'Access matrix' },
  { id: 'code',       label: 'AI Editor',     icon: '✦', desc: 'Write & push code' },
  { id: 'debug',      label: 'AI Debug',      icon: '⬡', desc: 'Find & fix bugs' },
]

const PAGE_TITLES: Record<Tab, { title: string; desc: string }> = {
  overview:  { title: 'Overview',           desc: 'System status, geography, and quick actions' },
  analytics: { title: 'Analytics',          desc: 'Page views, top pages, and device breakdown — last 30 days' },
  codes:     { title: 'Beta Codes',         desc: 'Manage who gets access to BrandLift beta' },
  lyra:      { title: 'Lyra Config',        desc: 'Tune the AI model, token limit, and system prompt' },
  health:    { title: 'API Health',         desc: 'Live ping of every third-party service' },
  flags:     { title: 'Feature Flags',      desc: 'Which roles unlock which capabilities' },
  code:      { title: 'AI Code Editor',     desc: 'Describe a change in English — AI writes and deploys it' },
  debug:     { title: 'AI Debugger',        desc: 'Describe a bug — AI diagnoses and fixes it' },
}

function AdminPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const beta         = useBetaAccess()
  const [tab, setTab]     = useState<Tab>((searchParams.get('tab') as Tab) ?? 'overview')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    if (!beta.loading && !beta.isOwner) router.replace('/')
  }, [beta.loading, beta.isOwner, router])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toast_ = (msg: string, type: 'ok' | 'err' = 'ok') => {
    showToast(msg, type)
    logActivity(type === 'ok' ? 'success' : 'error', msg)
  }

  const founderHeaders = { 'Content-Type': 'application/json', 'x-founder-code': beta.code }

  if (beta.loading || !beta.isOwner) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${C.primary}33,${C.accent}33)`, border: `0.5px solid ${C.primary}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>◆</div>
          <p style={{ color: C.subtle, fontSize: 13 }}>Verifying access…</p>
        </div>
      </div>
    )
  }

  const { title, desc } = PAGE_TITLES[tab]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'var(--font-inter, Inter, sans-serif)', color: C.text, display: 'flex' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, flexShrink: 0, borderRight: `0.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: `0.5px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg,${C.primary}33,${C.accent}33)`, border: `0.5px solid ${C.primary}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>◆</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em', color: C.text }}>BrandLift</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <Dot pulse />
                <span style={{ fontSize: 10, color: C.subtle }}>Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(n => {
            const active = tab === n.id
            return (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: active ? `${C.primary}14` : 'transparent', color: active ? '#a5b4fc' : C.subtle, marginBottom: 2, transition: 'all 0.14s', textAlign: 'left' }}>
                <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{n.label}</span>
                {active && <span style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.primary }} />}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px 20px', borderTop: `0.5px solid ${C.border}` }}>
          <p style={{ fontSize: 11, color: C.subtle, marginBottom: 2 }}>Signed in as</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{beta.ownerName ?? 'Founder'}</p>
          <button onClick={() => router.push('/dashboard')} style={{ ...btn(true, 'ghost'), width: '100%', marginTop: 10, fontSize: 12, textAlign: 'left' }}>
            ← Back to App
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Page header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: `0.5px solid ${C.border}` }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 4px' }}>{title}</h1>
          <p style={{ fontSize: 12, color: C.subtle, margin: 0 }}>{desc}</p>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', maxWidth: 960, width: '100%' }}>
          {tab === 'overview'  && <OverviewTab  beta={beta} headers={founderHeaders} showToast={showToast} />}
          {tab === 'analytics' && <AnalyticsTab headers={founderHeaders} />}
          {tab === 'codes'     && <CodesTab     headers={founderHeaders} showToast={toast_} />}
          {tab === 'lyra'      && <LyraConfigTab headers={founderHeaders} code={beta.code} ownerName={beta.ownerName} showToast={toast_} />}
          {tab === 'health'    && <HealthTab     headers={founderHeaders} />}
          {tab === 'flags'     && <FlagsTab />}
          {tab === 'code'      && <CodeEditorTab headers={founderHeaders} showToast={toast_} />}
          {tab === 'debug'     && <DebugTab      headers={founderHeaders} showToast={toast_} />}
        </div>
      </main>

      <style>{`@keyframes ping { 75%,100% { transform: scale(2); opacity: 0 } }`}</style>
    </div>
  )
}

/* ─── Country stats widget ───────────────────────────────────── */
interface CountryRow { code: string; name: string; flag: string; visitors: number }
interface ReachFull  { configured: boolean; totalCountries?: number; totalVisitors?: number; countries?: CountryRow[]; updatedAt?: string }

function CountryStatsWidget({ headers }: { headers: Record<string, string> }) {
  const [data, setData]     = useState<ReachFull | null>(null)
  const [loading, setLoad]  = useState(true)
  const [lastPoll, setPoll] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/countries', { headers })
      setData(await res.json())
      setPoll(new Date().toLocaleTimeString())
    } catch {} finally { setLoad(false) }
  }, [headers])

  useEffect(() => { load(); const id = setInterval(load, 5 * 60 * 1000); return () => clearInterval(id) }, [load])

  if (loading) return <div style={card()}><p style={label}>User Geography</p><p style={{ color: C.subtle, fontSize: 13, marginTop: 8 }}>Loading…</p></div>

  if (!data?.configured) return (
    <div style={card()}>
      <p style={label}>User Geography</p>
      <p style={{ color: C.subtle, fontSize: 13, marginTop: 8 }}>
        Set <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>VERCEL_TOKEN</code> and <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>VERCEL_PROJECT_ID</code> in Vercel env vars.
      </p>
    </div>
  )

  const countries = data.countries ?? []
  const maxVisits = countries[0]?.visitors ?? 1

  return (
    <div style={card()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={label}>User Geography — Last 30 Days</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Dot pulse />
          <span style={{ fontSize: 10, color: C.subtle }}>{lastPoll}</span>
          <button onClick={load} style={{ ...btn(true, 'ghost'), padding: '3px 9px', fontSize: 11 }}>↻</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          { lbl: 'Countries', val: data.totalCountries, color: C.primary },
          { lbl: 'Total Visitors', val: (data.totalVisitors ?? 0).toLocaleString(), color: C.accent },
        ].map(s => (
          <div key={s.lbl} style={{ background: `${s.color}08`, border: `0.5px solid ${s.color}20`, borderRadius: 10, padding: '12px 16px' }}>
            <p style={{ ...label, color: C.subtle, marginBottom: 4 }}>{s.lbl}</p>
            <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.05em', color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {countries.slice(0, 12).map(c => {
          const pct      = Math.round((c.visitors / maxVisits) * 100)
          const sharePct = data.totalVisitors ? Math.round((c.visitors / data.totalVisitors) * 100) : 0
          return (
            <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 72px 38px', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, textAlign: 'center' }}>{c.flag}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 3 }}>{c.name}</p>
                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg,${C.primary},${C.accent})`, transition: 'width 0.6s ease' }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>{c.visitors.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: C.subtle, textAlign: 'right' }}>{sharePct}%</span>
            </div>
          )
        })}
        {countries.length > 12 && <p style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>+{countries.length - 12} more countries</p>}
      </div>
    </div>
  )
}

/* ─── Overview tab ───────────────────────────────────────────── */
function OverviewTab({ beta, headers, showToast }: { beta: ReturnType<typeof useBetaAccess>; headers: Record<string, string>; showToast: (m: string, t: 'ok' | 'err') => void }) {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const ALL_FEATURES = ['4k', '1440p', 'enhancement', 'ai_captions', 'noise_reduce', 'smart_enhance', 'analytics', 'backend_access', 'priority_support', 'unlimited_exports', 'custom_branding', 'team_access', 'early_access', 'raw_logs']

  useEffect(() => { setActivity(getActivity()) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <StatCard label="Role"              value="Founder"                icon="◆" color={C.primary} sub="Full system access" />
        <StatCard label="Features Unlocked" value={beta.features.length}   icon="⬘" color={C.accent}  sub={`of ${ALL_FEATURES.length} total`} />
        <StatCard label="Session Code"      value={beta.code.slice(0, 8) + '…'} icon="◈" color="#f59e0b" sub="Active" />
      </div>

      {/* Quick links */}
      <div style={card()}>
        <p style={label}>Quick Links</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {[
            { href: '/dashboard',         label: '⬒ Dashboard' },
            { href: '/dashboard/videos',  label: '▶ Video Studio' },
            { href: '/',                  label: '◇ Homepage' },
            { href: '/api/admin/health',  label: '◉ Raw Health JSON ↗' },
          ].map(l => (
            <a key={l.href} href={l.href} style={{ ...btn(true, 'ghost'), textDecoration: 'none', display: 'inline-block', fontSize: 12 }}>{l.label}</a>
          ))}
        </div>
      </div>

      {/* Country widget */}
      <CountryStatsWidget headers={headers} />

      {/* Feature badges */}
      <div style={card()}>
        <p style={label}>Your Features</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {ALL_FEATURES.map(f => {
            const on = beta.features.includes(f)
            return (
              <span key={f} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: on ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${on ? 'rgba(74,222,128,0.25)' : C.border}`, color: on ? C.success : C.subtle }}>
                {on ? '✓' : '○'} {f}
              </span>
            )
          })}
        </div>
      </div>

      {/* Activity log */}
      {activity.length > 0 && (
        <div style={card()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={label}>Recent Admin Activity</p>
            <button onClick={() => { localStorage.removeItem('bl_admin_activity'); setActivity([]) }} style={{ ...btn(true, 'ghost'), padding: '3px 9px', fontSize: 11 }}>Clear</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activity.slice(0, 8).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: C.elevated, borderRadius: 8, border: `0.5px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: a.action === 'success' ? C.success : C.danger, marginTop: 1 }}>{a.action === 'success' ? '✓' : '✗'}</span>
                <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{a.detail}</span>
                <span style={{ fontSize: 10, color: C.subtle, flexShrink: 0 }}>{new Date(a.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Analytics tab ──────────────────────────────────────────── */
interface SummaryData {
  configured: boolean
  totalViews?: number
  topPages?:   { key: string; total: number }[]
  devices?:    { key: string; total: number }[]
  browsers?:   { key: string; total: number }[]
}

function AnalyticsTab({ headers }: { headers: Record<string, string> }) {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [reach,   setReach]   = useState<ReachFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastPoll, setPoll]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, rRes] = await Promise.all([
        fetch('/api/analytics/summary',   { headers }),
        fetch('/api/analytics/countries', { headers }),
      ])
      const [s, r] = await Promise.all([sRes.json(), rRes.json()])
      setSummary(s); setReach(r)
      setPoll(new Date().toLocaleTimeString())
    } catch {} finally { setLoading(false) }
  }, [headers])

  useEffect(() => { load(); const id = setInterval(load, 5 * 60 * 1000); return () => clearInterval(id) }, [load])

  if (loading) return <div style={card()}><p style={{ color: C.subtle, fontSize: 13 }}>Loading analytics…</p></div>

  if (!summary?.configured) return (
    <div style={card()}>
      <p style={label}>Not Configured</p>
      <p style={{ fontSize: 13, color: C.subtle, marginTop: 8 }}>
        Add <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>VERCEL_TOKEN</code> and <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>VERCEL_PROJECT_ID</code> to your Vercel environment variables to see analytics.
      </p>
    </div>
  )

  const maxPage    = summary.topPages?.[0]?.total ?? 1
  const totalViews = summary.totalViews ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Dot pulse />
          <span style={{ fontSize: 12, color: C.subtle }}>Last 30 days · refreshed {lastPoll}</span>
        </div>
        <button onClick={load} style={{ ...btn(true, 'ghost'), padding: '5px 12px', fontSize: 12 }}>↻ Refresh</button>
      </div>

      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <StatCard label="Page Views"   value={totalViews.toLocaleString()} color={C.primary} icon="◑" sub="Last 30 days" />
        <StatCard label="Countries"    value={reach?.totalCountries ?? '—'} color={C.accent}  icon="◇" sub="Unique origins" />
        <StatCard label="Total Visitors" value={(reach?.totalVisitors ?? 0).toLocaleString()} color="#f59e0b" icon="◈" sub="Unique sessions" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top pages */}
        <div style={card()}>
          <p style={label}>Top Pages</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
            {(summary.topPages ?? []).map(p => {
              const pct = Math.round((p.total / maxPage) * 100)
              return (
                <div key={p.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <code style={{ fontSize: 11, fontFamily: 'monospace', color: C.muted }}>{p.key || '/'}</code>
                    <span style={{ fontSize: 11, color: C.subtle }}>{p.total.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg,${C.primary},${C.accent})`, transition: 'width 0.6s' }} />
                  </div>
                </div>
              )
            })}
            {(!summary.topPages || summary.topPages.length === 0) && <p style={{ color: C.subtle, fontSize: 13 }}>No data yet</p>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Devices */}
          <div style={card()}>
            <p style={label}>Devices</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {(summary.devices ?? []).map(d => {
                const icons: Record<string, string> = { mobile: '📱', desktop: '🖥️', tablet: '📲' }
                const total = (summary.devices ?? []).reduce((s, x) => s + x.total, 0) || 1
                const pct   = Math.round((d.total / total) * 100)
                return (
                  <div key={d.key} style={{ flex: 1, minWidth: 80, background: C.elevated, borderRadius: 10, padding: '12px 14px', border: `0.5px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{icons[d.key.toLowerCase()] ?? '💻'}</div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{pct}%</p>
                    <p style={{ fontSize: 10, color: C.subtle, textTransform: 'capitalize' }}>{d.key}</p>
                  </div>
                )
              })}
              {(!summary.devices || summary.devices.length === 0) && <p style={{ color: C.subtle, fontSize: 13 }}>No data yet</p>}
            </div>
          </div>

          {/* Browsers */}
          <div style={card()}>
            <p style={label}>Browsers</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {(summary.browsers ?? []).slice(0, 5).map(b => {
                const total = (summary.browsers ?? []).reduce((s, x) => s + x.total, 0) || 1
                const pct   = Math.round((b.total / total) * 100)
                return (
                  <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.muted, flex: 1, textTransform: 'capitalize' }}>{b.key || 'Other'}</span>
                    <div style={{ flex: 2, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg,${C.primary},${C.accent})` }} />
                    </div>
                    <span style={{ fontSize: 11, color: C.subtle, width: 30, textAlign: 'right' }}>{pct}%</span>
                  </div>
                )
              })}
              {(!summary.browsers || summary.browsers.length === 0) && <p style={{ color: C.subtle, fontSize: 13 }}>No data yet</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Country breakdown */}
      <CountryStatsWidget headers={headers} />
    </div>
  )
}

/* ─── Beta codes tab ─────────────────────────────────────────── */
function CodesAnalyticsBanner({ headers }: { headers: Record<string, string> }) {
  const [summary, setSummary] = useState<{ configured: boolean; totalViews?: number; topPages?: { key: string; total: number }[] } | null>(null)
  const [reach,   setReach]   = useState<{ configured: boolean; totalCountries?: number; totalVisitors?: number } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/summary',   { headers }).then(r => r.json()).catch(() => ({ configured: false })),
      fetch('/api/analytics/countries', { headers }).then(r => r.json()).catch(() => ({ configured: false })),
    ]).then(([s, r]) => { setSummary(s); setReach(r) })
  }, [headers])

  if (!summary?.configured) return null

  const topPage = summary.topPages?.[0]

  return (
    <div style={{ ...card(), background: `${C.primary}06`, borderColor: `${C.primary}20`, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={label}>Vercel Analytics — Last 30 Days</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dot pulse />
          <span style={{ fontSize: 10, color: C.subtle }}>Live</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { lbl: 'Page Views',   val: (summary.totalViews ?? 0).toLocaleString(), color: C.primary },
          { lbl: 'Countries',    val: reach?.totalCountries ?? '—',                color: C.accent  },
          { lbl: 'Unique Visitors', val: (reach?.totalVisitors ?? 0).toLocaleString(), color: '#4ADE80' },
        ].map(s => (
          <div key={s.lbl} style={{ background: `${s.color}08`, border: `0.5px solid ${s.color}20`, borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ ...label, marginBottom: 3, color: C.subtle }}>{s.lbl}</p>
            <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>
      {topPage && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: C.subtle }}>Top page:</span>
          <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#a5b4fc', background: `${C.primary}10`, padding: '2px 7px', borderRadius: 4 }}>{topPage.key || '/'}</code>
          <span style={{ fontSize: 11, color: C.subtle }}>{topPage.total.toLocaleString()} views</span>
        </div>
      )}
    </div>
  )
}

function CodesTab({ headers, showToast }: { headers: Record<string, string>; showToast: (m: string, t: 'ok' | 'err') => void }) {
  const [codes,   setCodes]   = useState<{ env: CodeEntry[]; dynamic: CodeEntry[] } | null>(null)
  const [newCode, setNewCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [adding,  setAdding]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/admin/codes', { headers }); setCodes(await res.json()) }
    finally { setLoading(false) }
  }, [headers])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!newCode.trim()) return
    setAdding(true)
    try {
      const res  = await fetch('/api/admin/codes', { method: 'POST', headers, body: JSON.stringify({ code: newCode }) })
      const data = await res.json()
      if (data.ok) { showToast(`Added ${data.code}`, 'ok'); setNewCode(''); load() }
      else showToast(data.error ?? 'Failed', 'err')
    } finally { setAdding(false) }
  }

  const remove = async (code: string) => {
    const res  = await fetch('/api/admin/codes', { method: 'DELETE', headers, body: JSON.stringify({ code }) })
    const data = await res.json()
    if (data.ok) { showToast(`Removed ${code}`, 'ok'); load() }
    else showToast(data.error ?? 'Failed', 'err')
  }

  const allCodes = codes ? [...(codes.env ?? []), ...(codes.dynamic ?? [])] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CodesAnalyticsBanner headers={headers} />

      <div style={card()}>
        <p style={label}>Add Beta Code</p>
        <p style={{ fontSize: 12, color: C.subtle, marginBottom: 14 }}>Codes activate immediately — no redeploy needed.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...input, flex: 1, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}
            value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
            placeholder="MYCODE2026" onKeyDown={e => e.key === 'Enter' && add()} />
          <button style={btn(!!newCode.trim() && !adding)} onClick={add} disabled={!newCode.trim() || adding}>
            {adding ? 'Adding…' : 'Add Code'}
          </button>
        </div>
      </div>

      <div style={card()}>
        <p style={label}>All Active Codes ({allCodes.length})</p>
        {loading ? (
          <p style={{ color: C.subtle, fontSize: 13, marginTop: 12 }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {allCodes.map(entry => (
              <div key={entry.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: C.elevated, borderRadius: 9, border: `0.5px solid ${C.border}` }}>
                <code style={{ flex: 1, fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.05em', color: C.text }}>{entry.code}</code>
                <Badge color={entry.source === 'env' ? C.primary : C.success}>{entry.source}</Badge>
                <button onClick={() => navigator.clipboard.writeText(entry.code)} style={{ ...btn(true, 'ghost'), padding: '3px 9px', fontSize: 11 }}>Copy</button>
                {entry.source === 'dynamic' && (
                  <button style={btn(true, 'danger')} onClick={() => remove(entry.code)}>Remove</button>
                )}
              </div>
            ))}
            {allCodes.length === 0 && <p style={{ color: C.subtle, fontSize: 13 }}>No codes yet</p>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Lyra config tab ────────────────────────────────────────── */
function LyraConfigTab({ headers, code, ownerName, showToast }: { headers: Record<string, string>; code: string; ownerName: string | null; showToast: (m: string, t: 'ok' | 'err') => void }) {
  const [prompt,     setPrompt]  = useState(DEFAULT_SYSTEM)
  const [isOverridden, setIsOver] = useState(false)
  const [model,      setModel]   = useState<string>(DEFAULT_MODEL)
  const [maxTok,     setMaxTok]  = useState(1024)
  const [saving,     setSaving]  = useState(false)
  const [testInput,  setTestIn]  = useState('')
  const [testOutput, setTestOut] = useState('')
  const [testing,    setTesting] = useState(false)
  const LYRA_SESSION_KEY = 'bl_lyra_session'

  useEffect(() => {
    fetch('/api/admin/system-prompt', { headers }).then(r => r.json()).then(data => {
      setPrompt(data.prompt ?? DEFAULT_SYSTEM); setIsOver(data.isOverridden ?? false)
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
    showToast('Session config saved', 'ok')
  }

  const saveGlobal = async () => {
    setSaving(true)
    try {
      const res  = await fetch('/api/admin/system-prompt', { method: 'POST', headers, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      if (data.ok) { setIsOver(true); showToast('Global system prompt updated', 'ok') }
      else showToast(data.error ?? 'Failed', 'err')
    } finally { setSaving(false) }
  }

  const resetGlobal = async () => {
    const res  = await fetch('/api/admin/system-prompt', { method: 'DELETE', headers })
    const data = await res.json()
    if (data.ok) { setPrompt(data.prompt); setIsOver(false); showToast('Reset to default', 'ok') }
  }

  const testPrompt = async () => {
    if (!testInput.trim()) return
    setTesting(true); setTestOut('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'x-founder-code': code },
        body: JSON.stringify({ message: testInput, customSystem: prompt, model, maxTokens: maxTok }),
      })
      const reader = res.body!.getReader()
      const dec    = new TextDecoder()
      let out = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        out += dec.decode(value, { stream: true })
        setTestOut(out)
      }
    } catch (e) { setTestOut(String(e)) }
    finally { setTesting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card()}>
        <p style={label}>Model & Token Limit</p>
        <p style={{ fontSize: 12, color: C.subtle, marginBottom: 14 }}>Session-only — doesn't affect other users.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <p style={label}>Model</p>
            <select value={model} onChange={e => setModel(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
              {ALLOWED_MODELS.map(m => <option key={m} value={m}>{m}{m === DEFAULT_MODEL ? ' (default)' : ''}</option>)}
            </select>
          </div>
          <div>
            <p style={label}>Max output tokens: {maxTok.toLocaleString()}</p>
            <input type="range" min={256} max={8192} step={256} value={maxTok} onChange={e => setMaxTok(Number(e.target.value))} style={{ width: '100%', accentColor: C.primary, marginTop: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.subtle, marginTop: 4 }}>
              <span>256</span><span>8192</span>
            </div>
          </div>
        </div>
        <button style={{ ...btn(), marginTop: 16 }} onClick={saveSession}>Save to My Session</button>
      </div>

      <div style={card()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <p style={{ ...label, margin: 0 }}>System Prompt</p>
          {isOverridden && <Badge color={C.warning}>OVERRIDDEN</Badge>}
          <span style={{ fontSize: 11, color: C.subtle, marginLeft: 'auto' }}>{prompt.length} chars</span>
        </div>
        <p style={{ fontSize: 12, color: C.subtle, marginBottom: 12 }}>Edit what Lyra knows and how she responds. "Save Global" affects all users.</p>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={14}
          style={{ ...input, resize: 'vertical', lineHeight: 1.65, fontFamily: 'monospace', fontSize: 12 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button style={btn(!saving)} onClick={saveGlobal} disabled={saving}>{saving ? 'Saving…' : 'Save Global'}</button>
          <button style={btn(true, 'ghost')} onClick={saveSession}>Save to My Session</button>
          {isOverridden && <button style={btn(true, 'danger')} onClick={resetGlobal}>Reset to Default</button>}
        </div>
      </div>

      <div style={card()}>
        <p style={label}>Test This Config</p>
        <p style={{ fontSize: 12, color: C.subtle, marginBottom: 12 }}>Send a real message through the chat API with the current system prompt and model.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={{ ...input, flex: 1 }} value={testInput} onChange={e => setTestIn(e.target.value)}
            placeholder="Ask Lyra something…" onKeyDown={e => e.key === 'Enter' && testPrompt()} />
          <button style={btn(!!testInput.trim() && !testing)} onClick={testPrompt} disabled={!testInput.trim() || testing}>
            {testing ? 'Testing…' : 'Run'}
          </button>
        </div>
        {testOutput && (
          <div style={{ padding: 14, borderRadius: 9, background: C.bg, border: `0.5px solid ${C.border}`, fontSize: 13, color: '#E4E4E7', lineHeight: 1.65, whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto' }}>
            {testOutput}
            {testing && <span style={{ display: 'inline-block', width: 2, height: 13, background: C.primary, borderRadius: 1, marginLeft: 2, verticalAlign: 'text-bottom' }} />}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── API health tab ─────────────────────────────────────────── */
function HealthTab({ headers }: { headers: Record<string, string> }) {
  const [data,    setData]    = useState<{ apis: ApiResult[]; env: EnvMap; checkedAt: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const check = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/admin/health', { headers }); setData(await res.json()) }
    finally { setLoading(false) }
  }, [headers])

  useEffect(() => { check(); const id = setInterval(check, 30_000); return () => clearInterval(id) }, [check])

  const allOk = data?.apis?.every(a => a.ok) ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {allOk !== null && <Dot color={allOk ? C.success : C.danger} pulse />}
          <span style={{ fontSize: 13, fontWeight: 700, color: allOk === null ? C.subtle : allOk ? C.success : C.danger }}>
            {allOk === null ? 'Checking…' : allOk ? 'All systems operational' : 'Some services degraded'}
          </span>
          {data?.checkedAt && <span style={{ fontSize: 11, color: C.subtle }}>· {new Date(data.checkedAt).toLocaleTimeString()}</span>}
        </div>
        <button style={btn(true, 'ghost')} onClick={check} disabled={loading}>{loading ? 'Checking…' : '↻ Re-check'}</button>
      </div>

      {data?.apis && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {data.apis.map(api => (
            <div key={api.name} style={{ ...card(), display: 'flex', alignItems: 'center', gap: 14, background: api.ok ? 'rgba(74,222,128,0.03)' : 'rgba(248,113,113,0.03)', borderColor: api.ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)' }}>
              <Dot color={api.ok ? C.success : C.danger} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{api.name}</p>
                <p style={{ fontSize: 11, color: api.ok ? C.success : C.danger }}>{api.ok ? `${api.ms}ms` : api.error?.slice(0, 60)}</p>
              </div>
              <Badge color={api.ok ? C.success : C.danger}>{api.ok ? 'OK' : 'ERROR'}</Badge>
            </div>
          ))}
        </div>
      )}

      {data?.env && (
        <div style={card()}>
          <p style={label}>Environment Variables</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
            {Object.entries(data.env).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `0.5px solid rgba(255,255,255,0.04)` }}>
                <code style={{ fontSize: 12, color: C.muted, flex: 1, fontFamily: 'monospace' }}>{k}</code>
                <span style={{ fontSize: 12, fontWeight: 600, color: v === true ? C.success : v === false ? C.danger : C.muted }}>
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

function ChangesViewer({ result, commitUrls, committing, onCommit, headers, showToast, storageKey, localMode }: {
  result:     EditorResult; commitUrls: CommitUrl[]; committing: boolean
  onCommit:   (msg: string) => void; headers: Record<string, string>
  showToast:  (m: string, t: 'ok' | 'err') => void; storageKey?: string; localMode?: boolean
}) {
  const [activeFile, setActiveFile] = useState(0)
  const [viewMode,   setViewMode]   = useState<'after' | 'before'>('after')
  const [commitMsg,  setCommitMsg]  = useState(storageKey ?? '[AI] Code change')

  return (
    <>
      <div style={{ ...card(), borderColor: `${C.primary}33`, background: `${C.primary}05` }}>
        <p style={label}>What changed & why</p>
        <p style={{ fontSize: 14, color: '#E4E4E7', lineHeight: 1.75, marginTop: 8 }}>{result.explanation}</p>
      </div>

      <div style={card()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={label}>{result.changes.length} file{result.changes.length > 1 ? 's' : ''} changed</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['after', 'before'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ ...btn(true, 'ghost'), fontSize: 11, padding: '3px 10px', color: viewMode === v ? '#a5b4fc' : C.subtle, borderColor: viewMode === v ? `${C.primary}66` : C.border }}>
                {v === 'after' ? 'New code' : 'Original'}
              </button>
            ))}
          </div>
        </div>

        {result.changes.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {result.changes.map((c, i) => (
              <button key={c.path} onClick={() => setActiveFile(i)}
                style={{ padding: '5px 12px', borderRadius: 7, border: `0.5px solid ${activeFile === i ? `${C.primary}55` : C.border}`, background: activeFile === i ? `${C.primary}18` : 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, color: activeFile === i ? '#a5b4fc' : C.subtle }}>
                {c.isNew && <span style={{ color: C.success, marginRight: 4 }}>+</span>}
                {c.path.split('/').pop()}
              </button>
            ))}
          </div>
        )}

        {result.changes[activeFile] && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <code style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: C.subtle }}>{result.changes[activeFile].path}</code>
              {result.changes[activeFile].isNew && <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: 'rgba(74,222,128,0.1)', border: `0.5px solid rgba(74,222,128,0.3)`, borderRadius: 4, padding: '2px 6px' }}>NEW FILE</span>}
              <button onClick={() => navigator.clipboard.writeText(result.changes[activeFile].content)} style={{ ...btn(true, 'ghost'), fontSize: 11, padding: '3px 10px' }}>Copy</button>
            </div>
            <pre style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: 9, padding: 16, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.75, color: '#E4E4E7', maxHeight: 500, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
              {viewMode === 'after' ? result.changes[activeFile].content : '(original not stored in this view)'}
            </pre>
          </>
        )}
      </div>

      <div style={{ ...card(), borderColor: 'rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.02)' }}>
        <p style={label}>{localMode ? 'Apply Locally' : 'Push to Vercel'}</p>
        <p style={{ fontSize: 12, color: C.subtle, marginBottom: 12 }}>
          {localMode
            ? 'Writes files directly to disk. Restart dev server (or let Next.js hot-reload) to see changes.'
            : 'Commits to GitHub → Vercel auto-deploys. Live in ~60 seconds.'}
        </p>
        {localMode && (
          <div style={{ padding: '8px 12px', borderRadius: 7, background: 'rgba(245,158,11,0.08)', border: '0.5px solid rgba(245,158,11,0.25)', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: C.warning, margin: 0 }}>
              GITHUB_TOKEN / GITHUB_REPO not set — fixes will be written to the local filesystem only. Add them to Vercel env vars to enable live deploys.
            </p>
          </div>
        )}
        <input style={{ ...input, marginBottom: 10 }} value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="Commit message" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={{ ...btn(!committing, 'success'), fontSize: 14, padding: '10px 24px' }}
            onClick={() => onCommit(commitMsg)} disabled={committing}>
            {committing
              ? (localMode ? 'Writing…' : 'Pushing…')
              : (localMode
                  ? `↓ Apply ${result.changes.length} file${result.changes.length > 1 ? 's' : ''} locally`
                  : `↑ Push ${result.changes.length} file${result.changes.length > 1 ? 's' : ''} to Vercel`)}
          </button>
          <span style={{ fontSize: 12, color: C.subtle }}>or copy each file above and apply manually</span>
        </div>
        {commitUrls.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {commitUrls.map(u => (
              u.url
                ? <a key={u.path} href={u.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.success, fontFamily: 'monospace' }}>✓ {u.path} → view commit ↗</a>
                : <span key={u.path} style={{ fontSize: 12, color: C.success, fontFamily: 'monospace' }}>✓ {u.path} — written to disk</span>
            ))}
            <p style={{ fontSize: 12, color: C.subtle, marginTop: 4 }}>
              {localMode ? 'Files saved. Next.js will hot-reload the changes.' : 'Vercel is deploying now.'}
            </p>
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
  const [localMode,   setLocalMode]   = useState(false)

  const QUICK = [
    'Add a new beta feature flag called "hd_download" to the validate route',
    'Add rate-limit logging — log IP and route for every blocked request',
    'Change the Lyra default model to gemini-2.0-flash',
    'Add a /api/admin/stats route that returns a count of active beta codes',
    'Make the sign-in error message friendlier when the code is wrong',
  ]

  const generate = async () => {
    if (!instruction.trim() || generating) return
    setGenerating(true); setResult(null); setCommitUrls([])
    try {
      setStatus('Reading project files…')
      const treeData = await fetch('/api/admin/files', { headers }).then(r => r.json())
      const allFiles: string[] = treeData.files ?? []

      setStatus('Identifying relevant files…')
      const pickData = await fetch('/api/admin/code-editor', {
        method: 'POST', headers,
        body: JSON.stringify({ instruction, files: [], autoPickOnly: true, fileList: allFiles }),
      }).then(r => r.json())
      const paths: string[] = pickData.filePaths ?? []

      setStatus(`Reading ${paths.length} files…`)
      const fileContexts: FileContext[] = []
      for (const p of paths.slice(0, 8)) {
        const d = await fetch(`/api/admin/files?path=${encodeURIComponent(p)}`, { headers }).then(r => r.json())
        if (d.content) fileContexts.push({ path: p, content: d.content })
      }

      setStatus('Generating changes…')
      const data = await fetch('/api/admin/code-editor', {
        method: 'POST', headers,
        body: JSON.stringify({ instruction, files: fileContexts }),
      }).then(r => r.json())
      if (data.error) { showToast(data.error, 'err'); return }
      setResult(data)
    } catch (e) { showToast(String(e), 'err') }
    finally { setGenerating(false); setStatus('') }
  }

  const commit = async (msg: string) => {
    if (!result?.changes?.length || committing) return
    setCommitting(true)
    try {
      const data = await fetch('/api/admin/code-editor', {
        method: 'PUT', headers,
        body: JSON.stringify({ changes: result.changes, commitMessage: msg }),
      }).then(r => r.json())
      if (data.ok) {
        setLocalMode(!!data.local)
        setCommitUrls(data.results.filter((r: { ok: boolean }) => r.ok).map((r: { path: string; commitUrl: string }) => ({ path: r.path, url: r.commitUrl })))
        showToast(data.local ? `${data.results.length} file(s) written locally` : `${data.results.length} file${data.results.length !== 1 ? 's' : ''} committed`, 'ok')
      } else { showToast(data.error ?? 'Failed to apply changes', 'err') }
    } finally { setCommitting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...card(), padding: '28px 32px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px' }}>AI Code Editor</h2>
        <p style={{ fontSize: 13, color: C.subtle, marginBottom: 20 }}>Describe what you want to change. The AI finds the right files, writes the code, and you push it live.</p>
        <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={5}
          placeholder="e.g. Add a new beta feature flag called 'hd_download' — when it's enabled, show a Download in HD button on the video studio page"
          style={{ ...input, resize: 'vertical', lineHeight: 1.7, fontSize: 14, padding: '14px 16px' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 18 }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setInstruction(q)} style={{ ...btn(true, 'ghost'), fontSize: 11, padding: '4px 10px' }}>
              {q.slice(0, 52)}…
            </button>
          ))}
        </div>
        <button style={{ ...btn(!!instruction.trim() && !generating), fontSize: 14, padding: '11px 26px' }}
          onClick={generate} disabled={!instruction.trim() || generating}>
          {generating ? `✦ ${status || 'Working…'}` : '✦ Generate Changes'}
        </button>
      </div>
      {result && <ChangesViewer result={result} commitUrls={commitUrls} committing={committing} onCommit={commit} headers={headers} showToast={showToast} storageKey={`[AI Editor] ${instruction.slice(0, 60)}`} localMode={localMode} />}
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
  const [localMode,  setLocalMode]  = useState(false)

  const EXAMPLES = [
    'The Lyra chat stops streaming mid-response sometimes',
    'Beta code validation returns 500 errors intermittently',
    'The admin panel health tab shows all APIs as offline',
    'Video upload fails silently when the file is over 100MB',
  ]

  const analyse = async () => {
    if (!errorDesc.trim() || analysing) return
    setAnalysing(true); setResult(null); setCommitUrls([])
    try {
      setStatus('Reading project files…')
      const treeData = await fetch('/api/admin/files', { headers }).then(r => r.json())
      const allFiles: string[] = treeData.files ?? []

      setStatus('Finding relevant files…')
      const pickData = await fetch('/api/admin/code-editor', {
        method: 'POST', headers,
        body: JSON.stringify({ instruction: errorDesc + ' ' + stackTrace, files: [], autoPickOnly: true, fileList: allFiles }),
      }).then(r => r.json())
      const paths: string[] = pickData.filePaths ?? []

      setStatus(`Reading ${paths.length} files…`)
      const fileContexts: FileContext[] = []
      for (const p of paths.slice(0, 8)) {
        const d = await fetch(`/api/admin/files?path=${encodeURIComponent(p)}`, { headers }).then(r => r.json())
        if (d.content) fileContexts.push({ path: p, content: d.content })
      }

      setStatus('Diagnosing bug…')
      const data = await fetch('/api/admin/debug', {
        method: 'POST', headers,
        body: JSON.stringify({ errorDesc, stackTrace, files: fileContexts }),
      }).then(r => r.json())
      if (data.error) { showToast(data.error, 'err'); return }
      setResult(data)
    } catch (e) { showToast(String(e), 'err') }
    finally { setAnalysing(false); setStatus('') }
  }

  const commit = async (msg: string) => {
    if (!result?.changes?.length || committing) return
    setCommitting(true)
    try {
      const data = await fetch('/api/admin/code-editor', {
        method: 'PUT', headers,
        body: JSON.stringify({ changes: result.changes, commitMessage: msg }),
      }).then(r => r.json())
      if (data.ok) {
        setLocalMode(!!data.local)
        setCommitUrls(data.results.filter((r: { ok: boolean }) => r.ok).map((r: { path: string; commitUrl: string }) => ({ path: r.path, url: r.commitUrl })))
        showToast(data.local ? 'Fix applied locally — hot-reload active' : 'Fix pushed — Vercel deploying', 'ok')
      } else { showToast(data.error ?? 'Failed to apply fix', 'err') }
    } finally { setCommitting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...card(), padding: '28px 32px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px' }}>AI Debugger</h2>
        <p style={{ fontSize: 13, color: C.subtle, marginBottom: 20 }}>Describe the bug. The AI reads the codebase, finds the root cause, and generates a fix.</p>

        <p style={{ ...label, marginBottom: 8 }}>What's broken?</p>
        <textarea value={errorDesc} onChange={e => setErrorDesc(e.target.value)} rows={4}
          placeholder="e.g. The Lyra chat stops streaming halfway through a response"
          style={{ ...input, resize: 'vertical', lineHeight: 1.7, fontSize: 14, padding: '14px 16px', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {EXAMPLES.map(e => (
            <button key={e} onClick={() => setErrorDesc(e)} style={{ ...btn(true, 'ghost'), fontSize: 11, padding: '4px 10px' }}>
              {e.slice(0, 52)}{e.length > 52 ? '…' : ''}
            </button>
          ))}
        </div>

        <p style={{ ...label, marginBottom: 8 }}>Stack trace <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: C.subtle }}>(optional)</span></p>
        <textarea value={stackTrace} onChange={e => setStackTrace(e.target.value)} rows={4}
          placeholder="Paste the error from Vercel logs or browser console…"
          style={{ ...input, resize: 'vertical', lineHeight: 1.65, fontSize: 12, fontFamily: 'monospace', padding: '12px 16px', marginBottom: 20 }} />

        <button style={{ ...btn(!!errorDesc.trim() && !analysing), fontSize: 14, padding: '11px 26px' }}
          onClick={analyse} disabled={!errorDesc.trim() || analysing}>
          {analysing ? `⬡ ${status || 'Analysing…'}` : '⬡ Debug It'}
        </button>
      </div>

      {result && (
        <>
          <div style={{ ...card(), borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.03)' }}>
            <p style={{ ...label, color: C.danger }}>Root Cause</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.55, marginTop: 8 }}>{result.rootCause}</p>
          </div>
          <div style={card()}>
            <p style={label}>Full Explanation</p>
            <p style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.75, marginTop: 8 }}>{result.explanation}</p>
            {result.affectedFiles?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ ...label, marginBottom: 8 }}>Files involved</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.affectedFiles.map(f => (
                    <code key={f} style={{ fontSize: 11, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 5, background: `${C.primary}14`, border: `0.5px solid ${C.primary}33`, color: '#a5b4fc' }}>{f}</code>
                  ))}
                </div>
              </div>
            )}
          </div>
          {result.changes?.length > 0 ? (
            <ChangesViewer result={{ explanation: result.explanation, changes: result.changes }} commitUrls={commitUrls} committing={committing} onCommit={commit} headers={headers} showToast={showToast} storageKey={`[AI Debug fix] ${errorDesc.slice(0, 50)}`} localMode={localMode} />
          ) : (
            <div style={{ ...card(), borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.03)' }}>
              <p style={{ fontSize: 13, color: C.warning }}>No code change needed — this is likely a config or environment issue. See the explanation above.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Feature flags tab ──────────────────────────────────────── */
function FlagsTab() {
  const BETA_FEATURES  = ['4k', '1440p', 'enhancement', 'ai_captions', 'noise_reduce', 'smart_enhance']
  const OWNER_FEATURES = [...BETA_FEATURES, 'analytics', 'backend_access', 'priority_support', 'unlimited_exports', 'custom_branding', 'team_access', 'early_access', 'raw_logs']
  const ALL            = Array.from(new Set([...BETA_FEATURES, ...OWNER_FEATURES]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={card()}>
        <p style={label}>Feature Access Matrix</p>
        <p style={{ fontSize: 12, color: C.subtle, marginBottom: 16 }}>Modify in <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#a5b4fc' }}>app/api/beta/validate/route.ts</code> to change.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Feature', 'Free', 'Beta', 'Founder'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Feature' ? 'left' : 'center', padding: '8px 12px', fontSize: 10, fontWeight: 800, color: h === 'Founder' ? C.primary : C.subtle, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `0.5px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL.map(f => (
                <tr key={f} style={{ borderBottom: `0.5px solid rgba(255,255,255,0.04)` }}>
                  <td style={{ padding: '8px 12px' }}><code style={{ fontSize: 12, fontFamily: 'monospace', color: C.muted }}>{f}</code></td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: 14, color: '#2d2d35' }}>○</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: 14, color: BETA_FEATURES.includes(f) ? C.success : '#2d2d35' }}>{BETA_FEATURES.includes(f) ? '✓' : '○'}</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: 14, color: '#a5b4fc' }}>✓</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={card()}>
        <p style={label}>Founder-Exclusive Capabilities</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {[
            { label: 'Rate limit bypass',      desc: 'All API calls skip rate limiting — infinite generations' },
            { label: 'Model switcher',          desc: 'Use any Gemini model from Lyra Config' },
            { label: 'System prompt editor',    desc: "Rewrite Lyra's personality and knowledge in real-time" },
            { label: 'Max token override',      desc: 'Up to 8192 output tokens per Lyra response' },
            { label: 'Dynamic beta codes',      desc: 'Add/remove codes via Admin without redeploying' },
            { label: 'API health monitor',      desc: 'Live ping of all third-party APIs with latency' },
            { label: 'AI Code Editor',          desc: 'Write and deploy code changes from the browser' },
            { label: 'AI Debugger',             desc: 'AI diagnoses bugs and generates fixes' },
            { label: 'Analytics dashboard',     desc: 'Page views, top pages, devices, and geography' },
          ].map(cap => (
            <div key={cap.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', background: C.elevated, borderRadius: 9, border: `0.5px solid ${C.primary}14` }}>
              <span style={{ color: '#a5b4fc', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✦</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{cap.label}</p>
                <p style={{ fontSize: 12, color: C.subtle, marginTop: 1 }}>{cap.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
