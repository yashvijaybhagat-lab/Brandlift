'use client'

import * as React from 'react'
import { TrendingUp, Eye, Video, Lightbulb, BarChart2, X } from 'lucide-react'
import { TopBar } from '@/components/dashboard/TopBar'
import { ContentIdeasFeed, type ContentIdea } from '@/components/dashboard/ContentIdeasFeed'

/* ─── Sparkline ───────────────────────────────────────────────────────────── */
function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 72; const h = 22
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
  const area = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')} L${w},${h} L0,${h} Z`
  const line = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface Stat {
  label: string
  value: string
  raw: number
  delta: string
  deltaPositive: boolean
  period: string
  icon: React.ElementType
  sparkData: number[]
  color: string
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function parseReach(reach: string) {
  const parts = reach.split('–')
  const parse = (s: string) => {
    const t = s.trim()
    if (t.endsWith('K')) return Math.round(parseFloat(t) * 1000)
    return Math.round(parseFloat(t))
  }
  const lo = parse(parts[0])
  const hi = parse(parts[parts.length - 1])
  return { lo, hi, mid: Math.round((lo + hi) / 2) }
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

/* ─── Stats builder ───────────────────────────────────────────────────────── */
function buildStats(idea: ContentIdea | null): Stat[] {
  if (idea) {
    const { lo, hi, mid } = parseReach(idea.reach)
    const eng = idea.trend === 'trending' ? 5.8 : idea.trend === 'rising' ? 4.6 : 3.2
    const sparkReach = [0, Math.round(lo * 0.1), Math.round(lo * 0.3), Math.round(lo * 0.6), lo, Math.round(lo * 1.2), Math.round(mid * 0.85), mid]
    const sparkEng = [0, 0.5, 1.2, 2.1, 3.0, eng * 0.7, eng * 0.9, eng]
    return [
      { label: 'Estimated Reach', value: `${formatCompact(lo)}–${formatCompact(hi)}`, raw: mid, delta: idea.trend === 'trending' ? 'high potential' : idea.trend === 'rising' ? 'growing niche' : 'steady', deltaPositive: true, period: 'estimated range', icon: Eye, sparkData: sparkReach, color: '#6366f1' },
      { label: 'Engagement Rate', value: `${eng}%`, raw: eng, delta: idea.trend === 'trending' ? 'above average' : 'on target', deltaPositive: true, period: 'for this format', icon: BarChart2, sparkData: sparkEng, color: '#4ADE80' },
      { label: 'Videos Published', value: '0', raw: 0, delta: 'publish first', deltaPositive: true, period: 'to unlock stats', icon: Video, sparkData: [0, 0, 0, 0, 0, 0, 0, 0], color: '#8b5cf6' },
      { label: 'Ideas Selected', value: '1', raw: 1, delta: 'idea chosen', deltaPositive: true, period: 'click Use this idea', icon: Lightbulb, sparkData: [0, 0, 0, 0, 0, 0, 0, 1], color: '#06b6d4' },
    ]
  }
  return [
    { label: 'Predicted Monthly Reach', value: '8.4K', raw: 8400, delta: 'projected', deltaPositive: true, period: 'after first video', icon: Eye, sparkData: [0, 0, 0, 1, 2, 4, 6, 8], color: '#6366f1' },
    { label: 'Predicted Engagement', value: '4.8%', raw: 4.8, delta: 'estimated', deltaPositive: true, period: 'for your industry', icon: BarChart2, sparkData: [0, 0, 1, 2, 3, 4, 4, 5], color: '#4ADE80' },
    { label: 'Videos Published', value: '0', raw: 0, delta: 'publish first', deltaPositive: true, period: 'to unlock stats', icon: Video, sparkData: [0, 0, 0, 0, 0, 0, 0, 0], color: '#8b5cf6' },
    { label: 'Ideas Saved', value: '0', raw: 0, delta: 'use an idea', deltaPositive: true, period: 'from the feed below', icon: Lightbulb, sparkData: [0, 0, 0, 0, 0, 0, 0, 0], color: '#06b6d4' },
  ]
}

/* ─── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon
  const [hovered, setHovered] = React.useState(false)
  return (
    <article
      className="relative flex flex-col gap-3 p-4 rounded-2xl overflow-hidden transition-all duration-200 cursor-default"
      style={{
        background: hovered ? '#141416' : '#111113',
        border: `0.5px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.2)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute top-0 left-0 right-0 h-px transition-opacity duration-200" style={{ background: `linear-gradient(90deg, transparent, ${stat.color}60, transparent)`, opacity: hovered ? 1 : 0 }} aria-hidden />
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{stat.label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200" style={{ background: hovered ? `${stat.color}20` : '#18181C', border: `0.5px solid ${hovered ? `${stat.color}30` : 'rgba(255,255,255,0.06)'}` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: hovered ? stat.color : '#71717A' }} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.05em', lineHeight: 1 }}>{stat.value}</span>
        <div className="flex-shrink-0 mb-0.5"><Sparkline data={stat.sparkData} color={stat.color} /></div>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ color: stat.deltaPositive ? '#4ADE80' : '#F87171', background: stat.deltaPositive ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)' }}>
          <TrendingUp className="w-2.5 h-2.5" />
          {stat.delta}
        </span>
        <span style={{ fontSize: 11, color: '#3f3f46' }}>{stat.period}</span>
      </div>
    </article>
  )
}

/* ─── Idea analytics panel ────────────────────────────────────────────────── */
function IdeaAnalyticsPanel({ idea, onClose }: { idea: ContentIdea; onClose: () => void }) {
  const { lo, hi } = parseReach(idea.reach)
  const eng = idea.trend === 'trending' ? 5.8 : idea.trend === 'rising' ? 4.6 : 3.2
  const trendColor = idea.trend === 'trending' ? '#FBBF24' : idea.trend === 'rising' ? '#4ADE80' : '#A1A1AA'
  const trendEmoji = idea.trend === 'trending' ? '🔥' : idea.trend === 'rising' ? '📈' : '⭐'

  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-2xl"
      style={{ background: '#111113', border: '0.5px solid rgba(99,102,241,0.2)', boxShadow: '0 0 0 1px rgba(99,102,241,0.06), 0 8px 32px rgba(0,0,0,0.3)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6366f1' }}>Idea forecast</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '0.5px solid rgba(99,102,241,0.2)' }}>Beta</span>
          </div>
          <p style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.5 }}>
            &ldquo;{idea.hook.slice(0, 80)}{idea.hook.length > 80 ? '…' : ''}&rdquo;
          </p>
        </div>
        <button onClick={onClose} className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors duration-150" style={{ background: '#18181C', color: '#52525B' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B' }}>
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Trend badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold" style={{ color: trendColor, background: `${trendColor}15`, border: `0.5px solid ${trendColor}30` }}>
          {trendEmoji} {idea.trend.charAt(0).toUpperCase() + idea.trend.slice(1)}
        </span>
        <span style={{ fontSize: 12, color: '#52525B' }}>{idea.format.replace(/-/g, ' ')}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Est. reach', value: `${formatCompact(lo)}–${formatCompact(hi)}`, sub: 'views', color: '#6366f1' },
          { label: 'Engagement', value: `${eng}%`, sub: 'est. rate', color: '#4ADE80' },
          { label: 'Platforms', value: String(idea.platforms.length), sub: 'channels', color: '#8b5cf6' },
          { label: 'Potential', value: idea.trend === 'trending' ? 'High' : idea.trend === 'rising' ? 'Med-High' : 'Steady', sub: 'virality', color: '#06b6d4' },
        ].map(item => (
          <div key={item.label} className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: item.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{item.value}</p>
            <p style={{ fontSize: 10, color: '#3f3f46' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Platform badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {idea.platforms.map(p => (
          <span key={p} className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider" style={{ background: '#18181C', color: '#71717A', border: '0.5px solid rgba(255,255,255,0.07)' }}>
            {p === 'tiktok' ? 'TikTok' : p === 'instagram' ? 'Instagram' : 'YouTube'}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [selectedIdea, setSelectedIdea] = React.useState<ContentIdea | null>(null)
  const stats = React.useMemo(() => buildStats(selectedIdea), [selectedIdea])

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-8">

          {/* Analytics */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>
                  {selectedIdea ? 'Idea Forecast' : 'Predicted Performance'}
                </h2>
                <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>
                  {selectedIdea ? 'Click any idea below to update these projections' : 'Click an idea below to see its projected performance'}
                </p>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '0.5px solid rgba(99,102,241,0.2)' }}>Beta</span>
            </div>

            {/* Selected idea detail panel */}
            {selectedIdea && (
              <IdeaAnalyticsPanel idea={selectedIdea} onClose={() => setSelectedIdea(null)} />
            )}

            {/* 4 stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map(stat => <StatCard key={stat.label} stat={stat} />)}
            </div>
          </section>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

          {/* Content ideas */}
          <ContentIdeasFeed
            showFilters
            gridClass="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            onSelectIdea={setSelectedIdea}
          />
        </div>
      </div>
    </div>
  )
}
