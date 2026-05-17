'use client'

import * as React from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, ArrowRight, Video, Lightbulb, Eye, BarChart2 } from 'lucide-react'
import { TopBar } from '@/components/dashboard/TopBar'
import { ContentIdeasFeed } from '@/components/dashboard/ContentIdeasFeed'
import { Badge } from '@/components/ui/Badge'

/* ─── Mini sparkline ──────────────────────────────────────────────────────── */
function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 28
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
  const area = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')} L${w},${h} L0,${h} Z`
  const line = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Stat formats ────────────────────────────────────────────────────────── */
type StatFormat = 'number' | 'compact' | 'percent'

function formatStatValue(value: number, format: StatFormat): string {
  if (format === 'compact') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    return value.toString()
  }
  if (format === 'percent') return `${value}%`
  return value.toLocaleString()
}

/* ─── Stats data ──────────────────────────────────────────────────────────── */
interface Stat {
  label: string
  value: number
  format: StatFormat
  delta: string
  deltaPositive: boolean
  period: string
  icon: React.ElementType
  sparkData: number[]
  color: string
}

const STATS: Stat[] = [
  {
    label: 'Est. Monthly Reach',
    value: 142000,
    format: 'compact',
    delta: '+28%',
    deltaPositive: true,
    period: 'vs last month',
    icon: Eye,
    sparkData: [62, 71, 68, 88, 94, 101, 115, 128, 142],
    color: '#6366f1',
  },
  {
    label: 'Videos Published',
    value: 8,
    format: 'number',
    delta: '+3',
    deltaPositive: true,
    period: 'vs last month',
    icon: Video,
    sparkData: [2, 3, 3, 4, 4, 5, 6, 7, 8],
    color: '#8b5cf6',
  },
  {
    label: 'Ideas Saved',
    value: 24,
    format: 'number',
    delta: '+12',
    deltaPositive: true,
    period: 'this week',
    icon: Lightbulb,
    sparkData: [4, 6, 8, 10, 12, 14, 17, 21, 24],
    color: '#06b6d4',
  },
  {
    label: 'Avg. Engagement',
    value: 4.2,
    format: 'percent',
    delta: '+0.8pp',
    deltaPositive: true,
    period: 'vs last month',
    icon: BarChart2,
    sparkData: [2.1, 2.4, 2.8, 3.0, 3.2, 3.6, 3.9, 4.0, 4.2],
    color: '#4ADE80',
  },
]

/* ─── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon
  const displayValue = formatStatValue(stat.value, stat.format)
  const TrendIcon = stat.deltaPositive ? TrendingUp : TrendingDown
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
      {/* Subtle color tint on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-px transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, transparent, ${stat.color}60, transparent)`, opacity: hovered ? 1 : 0 }}
        aria-hidden
      />

      {/* Label + icon */}
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

      {/* Value + sparkline row */}
      <div className="flex items-end justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 700,
            color: '#FAFAFA',
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          {displayValue}
        </span>
        <div className="flex-shrink-0 mb-0.5">
          <Sparkline data={stat.sparkData} color={stat.color} />
        </div>
      </div>

      {/* Delta */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
          style={{
            color: stat.deltaPositive ? '#4ADE80' : '#F87171',
            background: stat.deltaPositive ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          }}
        >
          <TrendIcon className="w-2.5 h-2.5" />
          {stat.delta}
        </span>
        <span style={{ fontSize: 11, color: '#3f3f46' }}>{stat.period}</span>
      </div>
    </article>
  )
}

/* ─── Quick Stats section ─────────────────────────────────────────────────── */
function QuickStats() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Performance</h2>
        <span style={{ fontSize: 11, color: '#3f3f46', fontFamily: 'var(--font-mono)' }}>Last 30 days</span>
      </div>
      <div className="flex flex-col gap-2">
        {STATS.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  )
}

/* ─── Recent Videos ───────────────────────────────────────────────────────── */
interface VideoRow {
  id: string
  filename: string
  date: string
  status: 'published' | 'draft' | 'processing'
  views?: string
}

const RECENT_VIDEOS: VideoRow[] = [
  { id: '1', filename: 'Before & After — May Results.mp4', date: 'May 14', status: 'published', views: '12.4K' },
  { id: '2', filename: 'Meet Our Team.mp4', date: 'May 11', status: 'published', views: '8.1K' },
  { id: '3', filename: 'New Arrivals Walkthrough.mp4', date: 'May 9', status: 'draft' },
]

const STATUS_CONFIG: Record<VideoRow['status'], { label: string; variant: 'success' | 'default' | 'warning' }> = {
  published: { label: 'Live', variant: 'success' },
  draft: { label: 'Draft', variant: 'default' },
  processing: { label: 'Processing', variant: 'warning' },
}

function RecentVideos() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Recent Videos</h2>
        <Link
          href="/dashboard/videos"
          className="flex items-center gap-0.5 text-[11px] font-medium transition-colors duration-150"
          style={{ color: '#52525B' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#818cf8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#52525B')}
        >
          View all
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {RECENT_VIDEOS.map((video) => {
          const st = STATUS_CONFIG[video.status]
          return (
            <div
              key={video.id}
              className="group flex items-center gap-3 p-3 rounded-xl transition-all duration-150"
              style={{
                background: '#111113',
                border: '0.5px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = '#141416'
                el.style.borderColor = 'rgba(255,255,255,0.09)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = '#111113'
                el.style.borderColor = 'rgba(255,255,255,0.06)'
              }}
            >
              {/* Thumbnail */}
              <div
                className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                style={{ width: 48, height: 32, background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}
                aria-hidden
              >
                <Video className="w-3.5 h-3.5" style={{ color: '#3f3f46' }} />
              </div>

              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12, fontWeight: 500, color: '#FAFAFA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {video.filename}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p style={{ fontSize: 11, color: '#52525B' }}>{video.date}</p>
                  {video.views && (
                    <>
                      <span style={{ fontSize: 11, color: '#3f3f46' }}>·</span>
                      <p style={{ fontSize: 11, color: '#52525B', fontFamily: 'var(--font-mono)' }}>{video.views} views</p>
                    </>
                  )}
                </div>
              </div>

              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 flex gap-0 min-h-0">
        {/* Main */}
        <div className="flex-1 overflow-auto p-6 min-w-0">
          <ContentIdeasFeed
            limit={6}
            showFilters={false}
            gridClass="grid-cols-1 sm:grid-cols-2"
          />
        </div>

        {/* Right sidebar */}
        <aside className="hidden lg:flex flex-col gap-6 w-[296px] flex-shrink-0 overflow-auto p-5 border-l border-white/[0.05]">
          <QuickStats />
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />
          <RecentVideos />
        </aside>
      </div>
    </div>
  )
}
