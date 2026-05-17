'use client'

import * as React from 'react'
import { TrendingUp, Eye, Video, Lightbulb, BarChart2 } from 'lucide-react'
import { TopBar } from '@/components/dashboard/TopBar'
import { ContentIdeasFeed } from '@/components/dashboard/ContentIdeasFeed'

/* ─── Sparkline ───────────────────────────────────────────────────────────── */
function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 72
  const h = 24
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

/* ─── Stat card ───────────────────────────────────────────────────────────── */
interface Stat {
  label: string
  value: string
  delta: string
  deltaPositive: boolean
  period: string
  icon: React.ElementType
  sparkData: number[]
  color: string
}

const STATS: Stat[] = [
  {
    label: 'Predicted Monthly Reach',
    value: '8.4K',
    delta: 'projected',
    deltaPositive: true,
    period: 'after first video',
    icon: Eye,
    sparkData: [0, 0, 0, 1, 2, 4, 6, 8],
    color: '#6366f1',
  },
  {
    label: 'Videos Published',
    value: '0',
    delta: 'publish first',
    deltaPositive: true,
    period: 'to unlock stats',
    icon: Video,
    sparkData: [0, 0, 0, 0, 0, 0, 0, 0],
    color: '#8b5cf6',
  },
  {
    label: 'Ideas Saved',
    value: '0',
    delta: 'use an idea',
    deltaPositive: true,
    period: 'from the feed below',
    icon: Lightbulb,
    sparkData: [0, 0, 0, 0, 0, 0, 0, 0],
    color: '#06b6d4',
  },
  {
    label: 'Predicted Engagement',
    value: '4.8%',
    delta: 'estimated',
    deltaPositive: true,
    period: 'for your industry',
    icon: BarChart2,
    sparkData: [0, 0, 1, 2, 3, 4, 4, 5],
    color: '#4ADE80',
  },
]

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
      <div
        className="absolute top-0 left-0 right-0 h-px transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, transparent, ${stat.color}60, transparent)`, opacity: hovered ? 1 : 0 }}
        aria-hidden
      />

      <div className="flex items-center justify-between">
        <p style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {stat.label}
        </p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200"
          style={{
            background: hovered ? `${stat.color}20` : '#18181C',
            border: `0.5px solid ${hovered ? `${stat.color}30` : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: hovered ? stat.color : '#71717A' }} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.05em', lineHeight: 1 }}>
          {stat.value}
        </span>
        <div className="flex-shrink-0 mb-0.5">
          <Sparkline data={stat.sparkData} color={stat.color} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
          style={{
            color: stat.deltaPositive ? '#4ADE80' : '#F87171',
            background: stat.deltaPositive ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          }}
        >
          <TrendingUp className="w-2.5 h-2.5" />
          {stat.delta}
        </span>
        <span style={{ fontSize: 11, color: '#3f3f46' }}>{stat.period}</span>
      </div>
    </article>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-8">

          {/* Analytics section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>
                  Predicted Performance
                </h2>
                <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>
                  Estimates based on your business profile and industry benchmarks
                </p>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '0.5px solid rgba(99,102,241,0.2)' }}>Beta</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {STATS.map(stat => <StatCard key={stat.label} stat={stat} />)}
            </div>
          </section>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

          {/* Content ideas */}
          <ContentIdeasFeed showFilters gridClass="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" />

        </div>
      </div>
    </div>
  )
}
