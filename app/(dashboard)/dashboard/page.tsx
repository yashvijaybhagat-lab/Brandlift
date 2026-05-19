'use client'

import * as React from 'react'
import { TrendingUp, Eye, Video, Lightbulb, BarChart2, X, Clock, Calendar, CheckCircle2, Circle } from 'lucide-react'
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

/* ─── Posting time data per platform ─────────────────────────────────────── */
type TimeSlot = { label: string; score: number; views: string }

const POSTING_TIMES: Record<string, TimeSlot[]> = {
  tiktok: [
    { label: '6am',  score: 0.30, views: '~180 views' },
    { label: '9am',  score: 0.62, views: '~420 views' },
    { label: '12pm', score: 0.78, views: '~640 views' },
    { label: '3pm',  score: 0.55, views: '~390 views' },
    { label: '6pm',  score: 0.88, views: '~870 views' },
    { label: '9pm',  score: 1.00, views: '~1.1K views' },
  ],
  instagram: [
    { label: '6am',  score: 0.40, views: '~210 views' },
    { label: '9am',  score: 0.92, views: '~780 views' },
    { label: '12pm', score: 0.80, views: '~620 views' },
    { label: '3pm',  score: 0.50, views: '~330 views' },
    { label: '6pm',  score: 0.95, views: '~850 views' },
    { label: '9pm',  score: 0.65, views: '~480 views' },
  ],
  youtube: [
    { label: '6am',  score: 0.25, views: '~90 views'  },
    { label: '9am',  score: 0.55, views: '~280 views' },
    { label: '12pm', score: 0.70, views: '~420 views' },
    { label: '3pm',  score: 0.88, views: '~670 views' },
    { label: '6pm',  score: 0.75, views: '~520 views' },
    { label: '9pm',  score: 0.95, views: '~780 views' },
  ],
}

const BEST_DAYS: Record<string, string> = {
  tiktok: 'Tue, Thu & Fri',
  instagram: 'Mon, Wed & Fri',
  youtube: 'Thu, Sat & Sun',
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
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
    const eng = idea.trend === 'trending' ? 5.2 : idea.trend === 'rising' ? 3.8 : 2.9
    const sparkReach = [0, Math.round(lo * 0.08), Math.round(lo * 0.25), Math.round(lo * 0.5), lo, Math.round((lo + mid) * 0.5), mid]
    const sparkEng = [0, 0.8, 1.5, 2.4, 3.1, eng * 0.8, eng]
    return [
      {
        label: 'Est. Reach (30 days)',
        value: `${formatCompact(lo)}–${formatCompact(hi)}`,
        raw: mid,
        delta: idea.trend === 'trending' ? 'high potential' : idea.trend === 'rising' ? 'growing niche' : 'steady',
        deltaPositive: true,
        period: 'views if posted at peak',
        icon: Eye,
        sparkData: sparkReach,
        color: '#6366f1',
      },
      {
        label: 'Engagement Rate',
        value: `${eng}%`,
        raw: eng,
        delta: idea.trend === 'trending' ? '+2.1% vs avg' : idea.trend === 'rising' ? '+0.7% vs avg' : 'avg for format',
        deltaPositive: true,
        period: 'likes + comments + saves',
        icon: BarChart2,
        sparkData: sparkEng,
        color: '#4ADE80',
      },
      {
        label: 'Videos Published',
        value: '0',
        raw: 0,
        delta: 'start publishing',
        deltaPositive: true,
        period: 'upload your first video',
        icon: Video,
        sparkData: [0, 0, 0, 0, 0, 0, 0],
        color: '#8b5cf6',
      },
      {
        label: 'Best Post Window',
        value: idea.platforms[0] === 'tiktok' ? '9pm' : idea.platforms[0] === 'instagram' ? '6pm' : '9pm',
        raw: 0,
        delta: `on ${BEST_DAYS[idea.platforms[0]] ?? 'weekdays'}`,
        deltaPositive: true,
        period: `for ${PLATFORM_LABEL[idea.platforms[0]] ?? idea.platforms[0]}`,
        icon: Clock,
        sparkData: (POSTING_TIMES[idea.platforms[0]] ?? POSTING_TIMES.tiktok).map(t => t.score * 100),
        color: '#f59e0b',
      },
    ]
  }

  // Default: new user, no videos yet — honest numbers
  return [
    {
      label: 'Potential Monthly Reach',
      value: '800–4K',
      raw: 2000,
      delta: 'with 1 video/week',
      deltaPositive: true,
      period: 'realistic for a new account',
      icon: Eye,
      sparkData: [0, 0, 100, 300, 600, 1200, 2000],
      color: '#6366f1',
    },
    {
      label: 'Avg Engagement Rate',
      value: '3–5%',
      raw: 4,
      delta: 'small biz benchmark',
      deltaPositive: true,
      period: 'industry average',
      icon: BarChart2,
      sparkData: [0, 1, 2, 3, 3.5, 4, 4.5],
      color: '#4ADE80',
    },
    {
      label: 'Videos Published',
      value: '0',
      raw: 0,
      delta: 'post your first',
      deltaPositive: true,
      period: 'click an idea below',
      icon: Video,
      sparkData: [0, 0, 0, 0, 0, 0, 0],
      color: '#8b5cf6',
    },
    {
      label: 'Ideas Ready',
      value: '15',
      raw: 15,
      delta: 'ready to use',
      deltaPositive: true,
      period: 'click one to get started',
      icon: Lightbulb,
      sparkData: [0, 2, 4, 7, 10, 12, 15],
      color: '#06b6d4',
    },
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

/* ─── Posting time chart ──────────────────────────────────────────────────── */
function PostingTimeChart({ platform }: { platform: string }) {
  const slots = POSTING_TIMES[platform] ?? POSTING_TIMES.tiktok
  const bestIdx = slots.reduce((bi, s, i) => s.score > slots[bi].score ? i : bi, 0)
  const bestDays = BEST_DAYS[platform] ?? 'weekdays'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA' }}>
            Best time to post on {PLATFORM_LABEL[platform] ?? platform}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" style={{ color: '#52525B' }} />
          <span style={{ fontSize: 11, color: '#52525B' }}>{bestDays}</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-16">
        {slots.map((slot, i) => {
          const isBest = i === bestIdx
          return (
            <div key={slot.label} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-full rounded-t-sm relative group"
                style={{
                  height: `${Math.round(slot.score * 52)}px`,
                  background: isBest
                    ? 'linear-gradient(to top, #f59e0b, #fbbf24)'
                    : 'rgba(99,102,241,0.25)',
                  boxShadow: isBest ? '0 0 8px rgba(245,158,11,0.4)' : 'none',
                  transition: 'all 0.2s',
                  minHeight: 4,
                  cursor: 'default',
                }}
                title={slot.views}
              >
                {isBest && (
                  <div
                    className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '0.5px solid rgba(245,158,11,0.3)' }}
                  >
                    best
                  </div>
                )}
              </div>
              <span style={{ fontSize: 9, color: isBest ? '#fbbf24' : '#3f3f46', fontWeight: isBest ? 700 : 400 }}>
                {slot.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Best time callout */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg"
        style={{ background: 'rgba(245,158,11,0.06)', border: '0.5px solid rgba(245,158,11,0.2)' }}
      >
        <span style={{ fontSize: 12, color: '#A1A1AA' }}>
          Post at <span style={{ color: '#fbbf24', fontWeight: 600 }}>{slots[bestIdx].label}</span> on {bestDays}
        </span>
        <span style={{ fontSize: 11, color: '#52525B' }}>
          {slots[bestIdx].views} avg
        </span>
      </div>
    </div>
  )
}

/* ─── Idea analytics panel ────────────────────────────────────────────────── */
function IdeaAnalyticsPanel({ idea, onClose }: { idea: ContentIdea; onClose: () => void }) {
  const { lo, hi } = parseReach(idea.reach)
  const eng = idea.trend === 'trending' ? 5.2 : idea.trend === 'rising' ? 3.8 : 2.9
  const trendColor = idea.trend === 'trending' ? '#FBBF24' : idea.trend === 'rising' ? '#4ADE80' : '#A1A1AA'
  const trendEmoji = idea.trend === 'trending' ? '🔥' : idea.trend === 'rising' ? '📈' : '⭐'
  const [activePlatform, setActivePlatform] = React.useState(idea.platforms[0])

  // Reset active platform when idea changes
  React.useEffect(() => { setActivePlatform(idea.platforms[0]) }, [idea])

  return (
    <div
      className="flex flex-col gap-5 p-5 rounded-2xl"
      style={{ background: '#111113', border: '0.5px solid rgba(99,102,241,0.2)', boxShadow: '0 0 0 1px rgba(99,102,241,0.06), 0 8px 32px rgba(0,0,0,0.3)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6366f1' }}>Idea forecast</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${trendColor}15`, color: trendColor, border: `0.5px solid ${trendColor}30` }}>
              {trendEmoji} {idea.trend}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.5 }}>
            &ldquo;{idea.hook.slice(0, 90)}{idea.hook.length > 90 ? '…' : ''}&rdquo;
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors duration-150"
          style={{ background: '#18181C', color: '#52525B' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B' }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Est. reach', value: `${formatCompact(lo)}–${formatCompact(hi)}`, sub: 'views/video', color: '#6366f1' },
          { label: 'Engagement', value: `${eng}%`, sub: 'likes + saves', color: '#4ADE80' },
          { label: 'Format', value: idea.format === 'talking-head' ? 'Talk' : idea.format === 'b-roll' ? 'B-roll' : idea.format === 'tutorial' ? 'Tutorial' : 'Text', sub: idea.format.replace(/-/g, ' '), color: '#8b5cf6' },
        ].map(item => (
          <div key={item.label} className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: item.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{item.value}</p>
            <p style={{ fontSize: 10, color: '#3f3f46' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Posting time section */}
      <div className="flex flex-col gap-3 pt-1">
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

        {/* Platform tabs */}
        {idea.platforms.length > 1 && (
          <div className="flex items-center gap-1.5">
            {idea.platforms.map(p => (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150"
                style={{
                  background: activePlatform === p ? 'rgba(99,102,241,0.12)' : '#18181C',
                  border: activePlatform === p ? '0.5px solid rgba(99,102,241,0.4)' : '0.5px solid rgba(255,255,255,0.07)',
                  color: activePlatform === p ? '#a5b4fc' : '#52525B',
                }}
              >
                {PLATFORM_LABEL[p]}
              </button>
            ))}
          </div>
        )}

        <PostingTimeChart platform={activePlatform} />
      </div>
    </div>
  )
}

/* ─── Weekly Content Calendar ─────────────────────────────────────────────── */
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PLATFORM_SCHEDULE: { day: number; platform: string; time: string; score: number }[] = [
  { day: 1, platform: 'TikTok',    time: '9pm',  score: 1.00 },
  { day: 2, platform: 'Instagram', time: '9am',  score: 0.92 },
  { day: 3, platform: 'TikTok',    time: '6pm',  score: 0.88 },
  { day: 4, platform: 'YouTube',   time: '3pm',  score: 0.88 },
  { day: 4, platform: 'Instagram', time: '6pm',  score: 0.95 },
  { day: 5, platform: 'TikTok',    time: '9pm',  score: 0.95 },
  { day: 6, platform: 'YouTube',   time: '9pm',  score: 0.95 },
]

const PLATFORM_COLORS: Record<string, string> = {
  TikTok:    '#4ADE80',
  Instagram: '#a78bfa',
  YouTube:   '#f87171',
  LinkedIn:  '#60a5fa',
}

function WeekCalendar() {
  const today = new Date().getDay()
  const [checked, setChecked] = React.useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setChecked(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Posting Schedule</h2>
          <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>Optimal days and times based on platform data</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <Calendar className="w-3 h-3" style={{ color: '#52525B' }} />
          <span style={{ fontSize: 11, color: '#52525B' }}>This week</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_DAYS.map((day, idx) => {
          const isToday = idx === today
          const slots = PLATFORM_SCHEDULE.filter(s => s.day === idx)
          const topSlot = slots.sort((a, b) => b.score - a.score)[0]
          const isPast = idx < today
          return (
            <div
              key={day}
              className="flex flex-col gap-1.5 p-2.5 rounded-xl transition-all duration-200"
              style={{
                background: isToday ? 'rgba(99,102,241,0.08)' : '#111113',
                border: `0.5px solid ${isToday ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)'}`,
                opacity: isPast ? 0.5 : 1,
              }}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span style={{ fontSize: 10, fontWeight: 600, color: isToday ? '#818cf8' : '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{day}</span>
                {isToday && <div className="w-1 h-1 rounded-full" style={{ background: '#6366f1' }} />}
              </div>

              {topSlot ? (
                <div className="flex flex-col gap-1">
                  <div
                    className="w-full h-1 rounded-full"
                    style={{ background: PLATFORM_COLORS[topSlot.platform] ?? '#6366f1', opacity: topSlot.score }}
                  />
                  <p style={{ fontSize: 9, color: PLATFORM_COLORS[topSlot.platform] ?? '#a5b4fc', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                    {topSlot.platform}
                  </p>
                  <p style={{ fontSize: 9, color: '#52525B', textAlign: 'center' }}>{topSlot.time}</p>
                  {slots.length > 1 && (
                    <p style={{ fontSize: 8, color: '#3f3f46', textAlign: 'center' }}>+{slots.length - 1} more</p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 9, color: '#27272a', textAlign: 'center' }}>Rest</p>
              )}

              {topSlot && !isPast && (
                <button
                  onClick={() => toggle(`${idx}`)}
                  className="flex items-center justify-center w-full mt-auto transition-opacity duration-150"
                  title={checked.has(`${idx}`) ? 'Mark as not posted' : 'Mark as posted'}
                >
                  {checked.has(`${idx}`) ? (
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#4ADE80' }} />
                  ) : (
                    <Circle className="w-3.5 h-3.5" style={{ color: '#27272a' }} />
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(PLATFORM_COLORS).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span style={{ fontSize: 11, color: '#52525B' }}>{p}</span>
          </div>
        ))}
      </div>
    </section>
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
                  {selectedIdea ? 'Idea Forecast' : 'Your Performance'}
                </h2>
                <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>
                  {selectedIdea ? 'Projected numbers if you post this idea at peak time' : 'Click any idea below to see its reach, engagement, and best posting time'}
                </p>
              </div>
            </div>

            {selectedIdea && (
              <IdeaAnalyticsPanel idea={selectedIdea} onClose={() => setSelectedIdea(null)} />
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map(stat => <StatCard key={stat.label} stat={stat} />)}
            </div>
          </section>

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

          <WeekCalendar />

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

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
