'use client'

import * as React from 'react'
import Link from 'next/link'
import { TrendingUp, Eye, Video, Lightbulb, BarChart2, X, Clock, Calendar, CheckCircle2, Circle, Zap, Sparkles, Activity, Globe, Users, Repeat2, CalendarDays, HelpCircle, Wand2 } from 'lucide-react'
import { TopBar } from '@/components/dashboard/TopBar'
import { ContentIdeasFeed, type ContentIdea } from '@/components/dashboard/ContentIdeasFeed'
import Particles from '@/components/reactbits/Particles'
import ShinyText from '@/components/reactbits/ShinyText'

/* ─── Sparkline ───────────────────────────────────────────────────────────── */
function Sparkline({ data, color = '#7C5CFF' }: { data: number[]; color?: string }) {
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
        color: '#7C5CFF',
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
        color: '#7C5CFF',
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

  // Default: TikTok Creator Analytics benchmarks for a new small business account
  return [
    {
      label: 'FYP Traffic Rate',
      value: '62–78%',
      raw: 70,
      delta: '+14% vs industry avg',
      deltaPositive: true,
      period: 'of views from For You Page',
      icon: TrendingUp,
      sparkData: [40, 48, 54, 62, 66, 72, 78],
      color: '#4ADE80',
    },
    {
      label: 'Avg Watch Duration',
      value: '14–18s',
      raw: 16,
      delta: '~47% completion rate',
      deltaPositive: true,
      period: 'on 30s videos in your niche',
      icon: Clock,
      sparkData: [6, 9, 11, 13, 14, 16, 18],
      color: '#7C5CFF',
    },
    {
      label: 'Viewer → Follower',
      value: '3.2%',
      raw: 3.2,
      delta: 'niche creator benchmark',
      deltaPositive: true,
      period: 'convert after 3+ videos seen',
      icon: BarChart2,
      sparkData: [0.4, 1.0, 1.6, 2.2, 2.6, 3.0, 3.2],
      color: '#7C5CFF',
    },
    {
      label: 'Critical Hook Window',
      value: '0–3s',
      raw: 3,
      delta: '2.5× more completions',
      deltaPositive: true,
      period: 'if hook lands in first 3 seconds',
      icon: Zap,
      sparkData: [100, 80, 64, 55, 50, 46, 44],
      color: '#f59e0b',
    },
  ]
}

/* ─── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon
  const [hovered, setHovered] = React.useState(false)
  return (
    <article
      className="relative flex flex-col gap-4 p-6 rounded-2xl overflow-hidden transition-all duration-200 cursor-default"
      style={{
        background: hovered ? '#1C2128' : '#161B22',
        border: `1px solid ${hovered ? 'rgba(240,246,252,0.18)' : 'rgba(240,246,252,0.08)'}`,
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.3)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200" style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}>
          <Icon className="w-4 h-4" style={{ color: stat.color }} />
        </div>
        <div className="flex-shrink-0"><Sparkline data={stat.sparkData} color={stat.color} /></div>
      </div>
      <div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: '#E6EDF3', letterSpacing: '-0.05em', lineHeight: 1, display: 'block' }}>{stat.value}</span>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#8B949E', marginTop: 4 }}>{stat.label}</p>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'rgba(240,246,252,0.06)' }}>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: stat.deltaPositive ? '#3FB950' : '#F85149' }}>
          <TrendingUp className="w-3 h-3" />
          {stat.delta}
        </span>
        <span style={{ fontSize: 12, color: '#484F58' }}>{stat.period}</span>
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
                    : 'rgba(124, 92, 255,0.25)',
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
  const trendEmoji = ''
  const [activePlatform, setActivePlatform] = React.useState(idea.platforms[0])

  // Reset active platform when idea changes
  React.useEffect(() => { setActivePlatform(idea.platforms[0]) }, [idea])

  return (
    <div
      className="flex flex-col gap-5 p-5 rounded-2xl"
      style={{ background: '#161B22', border: '1px solid rgba(124, 92, 255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7C5CFF' }}>Idea forecast</span>
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
          style={{ background: '#1A1530', color: '#52525B' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#52525B' }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Est. reach', value: `${formatCompact(lo)}–${formatCompact(hi)}`, sub: 'views/video', color: '#7C5CFF' },
          { label: 'Engagement', value: `${eng}%`, sub: 'likes + saves', color: '#4ADE80' },
          { label: 'Format', value: idea.format === 'talking-head' ? 'Talk' : idea.format === 'b-roll' ? 'B-roll' : idea.format === 'tutorial' ? 'Tutorial' : 'Text', sub: idea.format.replace(/-/g, ' '), color: '#7C5CFF' },
        ].map(item => (
          <div key={item.label} className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: '#1A1530', border: '0.5px solid rgba(255,255,255,0.06)' }}>
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
                  background: activePlatform === p ? 'rgba(124, 92, 255,0.12)' : '#1A1530',
                  border: activePlatform === p ? '0.5px solid rgba(124, 92, 255,0.4)' : '0.5px solid rgba(255,255,255,0.07)',
                  color: activePlatform === p ? '#C4C2F0' : '#52525B',
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

// Full per-day schedule — every platform scored for every day
const PLATFORM_SCHEDULE: { day: number; platform: string; time: string; score: number }[] = [
  // Sunday — YouTube & TikTok leisure browsing peaks
  { day: 0, platform: 'YouTube',   time: '8pm',  score: 1.00 },
  { day: 0, platform: 'TikTok',    time: '7pm',  score: 0.82 },
  { day: 0, platform: 'Instagram', time: '11am', score: 0.64 },
  // Monday — Instagram morning commute spike
  { day: 1, platform: 'Instagram', time: '8am',  score: 0.93 },
  { day: 1, platform: 'TikTok',    time: '9pm',  score: 1.00 },
  { day: 1, platform: 'LinkedIn',  time: '9am',  score: 0.88 },
  // Tuesday — TikTok peak day
  { day: 2, platform: 'TikTok',    time: '9pm',  score: 1.00 },
  { day: 2, platform: 'Instagram', time: '9am',  score: 0.90 },
  { day: 2, platform: 'LinkedIn',  time: '10am', score: 0.82 },
  // Wednesday — Instagram midweek peak, TikTok strong
  { day: 3, platform: 'Instagram', time: '6pm',  score: 1.00 },
  { day: 3, platform: 'TikTok',    time: '6pm',  score: 0.92 },
  { day: 3, platform: 'YouTube',   time: '3pm',  score: 0.74 },
  // Thursday — Multi-platform strong day
  { day: 4, platform: 'TikTok',    time: '9pm',  score: 1.00 },
  { day: 4, platform: 'YouTube',   time: '3pm',  score: 0.95 },
  { day: 4, platform: 'Instagram', time: '9am',  score: 0.88 },
  // Friday — Pre-weekend TikTok & Instagram surge
  { day: 5, platform: 'TikTok',    time: '5pm',  score: 1.00 },
  { day: 5, platform: 'Instagram', time: '12pm', score: 0.96 },
  { day: 5, platform: 'YouTube',   time: '7pm',  score: 0.80 },
  // Saturday — YouTube discovery + casual TikTok
  { day: 6, platform: 'YouTube',   time: '9pm',  score: 0.98 },
  { day: 6, platform: 'TikTok',    time: '11am', score: 0.87 },
  { day: 6, platform: 'Instagram', time: '10am', score: 0.75 },
]

const PLATFORM_COLORS: Record<string, string> = {
  TikTok:    '#4ADE80',
  Instagram: '#a78bfa',
  YouTube:   '#f87171',
  LinkedIn:  '#60a5fa',
}

// Day-specific platform health — scores, tips, and statuses rotate with the day
type DayHealth = { score: number; status: string; tip: string }
const DAILY_HEALTH: Record<string, DayHealth[]> = {
  TikTok: [
    { score: 74, status: 'Weekend wind-down',    tip: 'Sunday TikTok scrolling peaks after 7pm. Post feel-good or entertaining content.' },
    { score: 88, status: 'Strong week opener',   tip: 'Monday 9pm is prime time. Hook in the first 2 seconds — algorithm rewards completion rate.' },
    { score: 96, status: 'Peak day — post now',  tip: 'Tuesday is TikTok\'s highest-traffic day. Best for new content — expect 40% more impressions.' },
    { score: 85, status: 'Midweek momentum',     tip: 'Wednesday 6pm catches the after-work scroll. Use trending sounds to boost discoverability.' },
    { score: 91, status: 'Trending window open', tip: 'Thursday sees creators going viral before the weekend. Duet or stitch a trending video.' },
    { score: 94, status: 'Pre-weekend spike',    tip: 'Friday 5pm is the highest-engagement window. Post before 5pm for full evening coverage.' },
    { score: 80, status: 'Casual browse day',    tip: 'Saturday morning gets lighter traffic — good for evergreen content that builds over time.' },
  ],
  Instagram: [
    { score: 60, status: 'Low engagement day',   tip: 'Sunday Instagram traffic is low. Best to save your best content for weekdays.' },
    { score: 90, status: 'Monday commute peak',  tip: 'Monday 8am catches morning commuters. Reels get 3× more reach than static posts today.' },
    { score: 86, status: 'Good engagement zone', tip: 'Tuesday 9am works well. Stories before your Reel warms up your audience first.' },
    { score: 93, status: 'Peak reach day',       tip: 'Wednesday is Instagram\'s top day. Post Reels at 6pm — algorithm is actively pushing content.' },
    { score: 82, status: 'Solid for Reels',      tip: 'Thursday morning works for business content. Use 5–10 hashtags in the first comment.' },
    { score: 88, status: 'TGIF reach boost',     tip: 'Friday 12pm catches lunch breaks. Add a strong CTA — engagement is higher pre-weekend.' },
    { score: 68, status: 'Leisure browsing',     tip: 'Saturday morning sees casual scrollers. Great for lifestyle or behind-the-scenes content.' },
  ],
  YouTube: [
    { score: 92, status: 'Best day of the week', tip: 'Sunday is YouTube\'s #1 day. Viewers binge-watch in the evening — 8pm is peak upload time.' },
    { score: 54, status: 'Low discovery day',    tip: 'Monday YouTube traffic is low. Good day to optimize titles/thumbnails on existing videos.' },
    { score: 62, status: 'Moderate traffic',     tip: 'Tuesday is decent for Shorts. Keep them under 45s for maximum algorithm boost.' },
    { score: 70, status: 'Midweek opportunity',  tip: 'Wednesday 3pm hits the after-school and lunch crowd. Good for tutorial-style content.' },
    { score: 88, status: 'Strong upload day',    tip: 'Thursday is YouTube\'s second best day. Upload Thursday afternoon for peak weekend views.' },
    { score: 78, status: 'Growing into weekend', tip: 'Friday views build through the weekend. Upload before 7pm for algorithm indexing time.' },
    { score: 95, status: 'Weekend prime time',   tip: 'Saturday evening YouTube traffic spikes. Viewers stay longer — great for longer Shorts series.' },
  ],
}

function WeekCalendar() {
  const today = new Date().getDay()
  const [checked, setChecked] = React.useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setChecked(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })

  const todaySlots = PLATFORM_SCHEDULE.filter(s => s.day === today).sort((a, b) => b.score - a.score)
  const todayBest  = todaySlots[0]

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E6EDF3', letterSpacing: '-0.02em' }}>Posting Schedule</h2>
          <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>Best platforms and times · updates every day</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: '#1A1530', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <Calendar className="w-3 h-3" style={{ color: '#52525B' }} />
          <span style={{ fontSize: 11, color: '#52525B' }}>{WEEK_DAYS[today]}</span>
        </div>
      </div>

      {/* Today's callout */}
      {todayBest && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: `${PLATFORM_COLORS[todayBest.platform] ?? '#7C5CFF'}0d`, border: `0.5px solid ${PLATFORM_COLORS[todayBest.platform] ?? '#7C5CFF'}35` }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PLATFORM_COLORS[todayBest.platform] ?? '#7C5CFF', boxShadow: `0 0 6px ${PLATFORM_COLORS[todayBest.platform] ?? '#7C5CFF'}80` }} />
          <div className="flex-1 min-w-0">
            <span style={{ fontSize: 12, fontWeight: 700, color: PLATFORM_COLORS[todayBest.platform] ?? '#C4C2F0' }}>
              Post on {todayBest.platform} at {todayBest.time} today
            </span>
            {todaySlots.length > 1 && (
              <span style={{ fontSize: 11, color: '#52525B', marginLeft: 8 }}>
                also {todaySlots.slice(1).map(s => `${s.platform} ${s.time}`).join(' · ')}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: PLATFORM_COLORS[todayBest.platform] ?? '#C4C2F0', padding: '2px 7px', borderRadius: 5, background: `${PLATFORM_COLORS[todayBest.platform] ?? '#7C5CFF'}18`, flexShrink: 0 }}>
            {Math.round(todayBest.score * 100)}% reach
          </span>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_DAYS.map((day, idx) => {
          const isToday = idx === today
          const slots   = PLATFORM_SCHEDULE.filter(s => s.day === idx).sort((a, b) => b.score - a.score)
          const topSlot = slots[0]
          const isPast  = idx < today
          return (
            <div
              key={day}
              className="flex flex-col gap-1.5 p-2.5 rounded-xl transition-all duration-200"
              style={{
                background: isToday ? 'rgba(124, 92, 255,0.1)' : '#161B22',
                border: `1px solid ${isToday ? 'rgba(124, 92, 255,0.35)' : 'rgba(240,246,252,0.07)'}`,
                opacity: isPast ? 0.45 : 1,
              }}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span style={{ fontSize: 10, fontWeight: 600, color: isToday ? '#B9A5FF' : '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{day}</span>
                {isToday && <div className="w-1 h-1 rounded-full" style={{ background: '#7C5CFF' }} />}
              </div>

              {topSlot ? (
                <div className="flex flex-col gap-1">
                  <div className="w-full h-1 rounded-full" style={{ background: PLATFORM_COLORS[topSlot.platform] ?? '#7C5CFF', opacity: topSlot.score }} />
                  <p style={{ fontSize: 9, color: PLATFORM_COLORS[topSlot.platform] ?? '#C4C2F0', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                    {topSlot.platform.replace('Instagram', 'Insta')}
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
                  className="flex items-center justify-center w-full mt-auto"
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

/* ─── Quick Actions bar ───────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Create Video',  href: '/dashboard/videos',      Icon: Video,        color: '#7C5CFF', bg: 'rgba(124, 92, 255,0.1)',  border: 'rgba(124, 92, 255,0.25)' },
  { label: 'Repurpose',     href: '/dashboard/repurpose',   Icon: Repeat2,      color: '#7C5CFF', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
  { label: 'Viral Score',   href: '/dashboard/viral-score', Icon: Zap,          color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  { label: '7-Day Planner', href: '/dashboard/planner',     Icon: CalendarDays, color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)'  },
  { label: 'Feed',          href: '/dashboard/feed',        Icon: Users,        color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.25)' },
  { label: 'Analyze Website', href: '/dashboard/website',   Icon: Globe,        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)'  },
  { label: 'AI Studio',      href: '/dashboard/higgsfield', Icon: Wand2,        color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  { label: 'FAQ',            href: '/dashboard/faq',        Icon: HelpCircle,   color: '#B9A5FF', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)' },
]

function QuickActionsBar() {
  return (
    <div className="flex flex-col gap-3">
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E6EDF3', letterSpacing: '-0.02em' }}>
        <ShinyText text="Quick Actions" color="#A9A2C4" shineColor="#7C5CFF" speed={4} />
      </h2>
      <div className="flex items-center gap-3 flex-wrap">
        {QUICK_ACTIONS.map(({ label, href, Icon, color, bg, border }) => (
          <Link key={label} href={href}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 flex-shrink-0"
            style={{ background: bg, border: `1px solid ${border}`, color }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ─── Platform Health widget ──────────────────────────────────────────────── */
const PLATFORM_HEALTH_BASE = [
  { name: 'TikTok',    color: '#4ADE80' },
  { name: 'Instagram', color: '#a78bfa' },
  { name: 'YouTube',   color: '#f87171' },
]

function PlatformHealth() {
  const today = new Date().getDay()
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today]

  const platforms = PLATFORM_HEALTH_BASE.map(({ name, color }) => {
    const dayData = DAILY_HEALTH[name]?.[today] ?? { score: 70, status: 'Moderate traffic', tip: 'Post during peak hours for best reach.' }
    return { name, color, ...dayData }
  })

  // Sort by today's score so the best platform leads
  platforms.sort((a, b) => b.score - a.score)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E6EDF3', letterSpacing: '-0.02em' }}>Platform Health</h2>
          <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>Opportunity scores for {dayName} — reorders each day</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: '#1A1530', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <Activity className="w-3 h-3" style={{ color: '#52525B' }} />
          <span style={{ fontSize: 11, color: '#52525B' }}>Today</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {platforms.map(({ name, color, score, tip, status }, i) => (
          <div key={name} className="flex flex-col gap-4 p-6 rounded-2xl transition-all duration-200"
            style={{ background: '#161B22', border: `1px solid ${i === 0 ? `${color}35` : 'rgba(240,246,252,0.08)'}` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}35` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = i === 0 ? `${color}35` : 'rgba(240,246,252,0.08)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#E4E4E7' }}>{name}</p>
                  {i === 0 && <span style={{ fontSize: 8, fontWeight: 800, color, padding: '1px 5px', borderRadius: 3, background: `${color}18`, border: `0.5px solid ${color}40`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Best today</span>}
                </div>
                <p style={{ fontSize: 11, color, marginTop: 1 }}>{status}</p>
              </div>
              <div className="relative w-10 h-10 flex-shrink-0">
                <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90" aria-hidden>
                  <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle cx="20" cy="20" r="15" fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 15}`}
                    strokeDashoffset={`${2 * Math.PI * 15 * (1 - score / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{score}</span>
              </div>
            </div>

            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${score}%`, background: `linear-gradient(90deg,${color}80,${color})` }} />
            </div>

            <p style={{ fontSize: 11, color: '#71717A', lineHeight: 1.55 }}>{tip}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Statistics tab content ──────────────────────────────────────────────── */
// Source: TikTok Creator Analytics benchmarks for small business accounts
const BENCHMARK_ROWS: { label: string; smb: string; avg: string; top: string; color: string }[] = [
  { label: 'Monthly video views',       smb: '500–3K',   avg: '8K–25K',  top: '100K+',  color: '#7C5CFF' },
  { label: 'FYP traffic share',         smb: '55–65%',   avg: '68–75%',  top: '82%+',   color: '#4ADE80' },
  { label: 'Avg watch time (30s video)',smb: '8–12s',    avg: '14–18s',  top: '22s+',   color: '#7C5CFF' },
  { label: 'Follower growth / month',   smb: '30–200',   avg: '500–2K',  top: '10K+',   color: '#f59e0b' },
  { label: 'Profile views / month',     smb: '100–600',  avg: '2K–8K',   top: '50K+',   color: '#06b6d4' },
  { label: 'Like rate',                 smb: '3–5%',     avg: '6–9%',    top: '12%+',   color: '#f87171' },
]

// TikTok Creator Analytics — traffic source breakdown (industry average)
const TIKTOK_TRAFFIC_SOURCES = [
  { source: 'For You Page',   pct: 71, color: '#4ADE80',  desc: 'Algorithm-driven discovery' },
  { source: 'Following',      pct: 15, color: '#7C5CFF',  desc: 'Existing follower views' },
  { source: 'Profile',        pct: 8,  color: '#7C5CFF',  desc: 'Direct profile visits' },
  { source: 'Search',         pct: 4,  color: '#f59e0b',  desc: 'Keyword searches' },
  { source: 'Sound / Trend',  pct: 2,  color: '#06b6d4',  desc: 'Trending audio discovery' },
]

// TikTok video completion rates by length
const COMPLETION_BY_LENGTH = [
  { length: '7–10s',  completion: 84, label: 'Micro-clips',   color: '#4ADE80' },
  { length: '15s',    completion: 71, label: 'Short-form',    color: '#7C5CFF' },
  { length: '30s',    completion: 52, label: 'Standard',      color: '#7C5CFF' },
  { length: '60s',    completion: 38, label: 'Extended',      color: '#f59e0b' },
  { length: '3–5min', completion: 24, label: 'Long-form',     color: '#f87171' },
]

const FORMAT_PERFORMANCE: { format: string; avgViews: string; engRate: string; difficulty: string; color: string }[] = [
  { format: 'Talking Head',   avgViews: '2–8K',   engRate: '4.2%', difficulty: 'Easy',   color: '#7C5CFF' },
  { format: 'B-Roll + VO',    avgViews: '5–20K',  engRate: '5.8%', difficulty: 'Medium', color: '#4ADE80' },
  { format: 'Tutorial',       avgViews: '8–35K',  engRate: '7.1%', difficulty: 'Medium', color: '#f59e0b' },
  { format: 'Text-on-screen', avgViews: '3–12K',  engRate: '6.4%', difficulty: 'Easy',   color: '#7C5CFF' },
  { format: 'POV / Story',    avgViews: '10–50K', engRate: '8.9%', difficulty: 'Easy',   color: '#f87171' },
]

const GROWTH_MILESTONES: { followers: string; label: string; tip: string; color: string }[] = [
  { followers: '100',   label: 'First 100',    tip: 'Post 3×/week for 2–3 weeks. Focus on one platform.',         color: '#52525B' },
  { followers: '500',   label: '500 followers', tip: 'Use trending audio and niche hashtags consistently.',        color: '#7C5CFF' },
  { followers: '1K',    label: '1K milestone',  tip: 'Collab with one similar creator. Cross-post your best hit.', color: '#7C5CFF' },
  { followers: '5K',    label: '5K reach',      tip: 'Run a giveaway or challenge. Batch-create 10 videos at once.', color: '#4ADE80' },
  { followers: '10K+',  label: 'Brand deals',   tip: 'Micro-influencer territory — brands pay $50–$500/post.',     color: '#f59e0b' },
]

function StatisticsTab() {
  return (
    <div className="flex flex-col gap-8">

      {/* TikTok Creator Analytics header */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl" style={{ background: 'rgba(74,222,128,0.04)', border: '0.5px solid rgba(74,222,128,0.15)' }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
        <p style={{ fontSize: 12, color: '#A1A1AA' }}>
          Data sourced from <span style={{ color: '#4ADE80', fontWeight: 600 }}>TikTok Creator Analytics</span> — benchmarks reflect real small business accounts in the first 6 months
        </p>
      </div>

      {/* TikTok Traffic Sources */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Where Your Views Come From</h2>
          <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>TikTok Creator Analytics — traffic source breakdown (industry avg)</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {TIKTOK_TRAFFIC_SOURCES.map(s => (
            <div key={s.source} className="flex items-center gap-4">
              <div style={{ width: 120, flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#E4E4E7' }}>{s.source}</p>
                <p style={{ fontSize: 10, color: '#52525B' }}>{s.desc}</p>
              </div>
              <div className="flex-1 relative h-5 flex items-center">
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1A1530' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${s.pct}%`, background: `linear-gradient(90deg,${s.color}80,${s.color})` }} />
                </div>
              </div>
              <div style={{ width: 44, textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.pct}%</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#27272a' }}>FYP dominates — optimize for algorithm, not just your existing followers</p>
      </section>

      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

      {/* Completion rate by video length */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Completion Rate by Video Length</h2>
          <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>TikTok penalizes low completion — shorter videos consistently outperform</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {COMPLETION_BY_LENGTH.map(v => (
            <div key={v.length} className="flex flex-col items-center gap-2 p-3 rounded-xl"
              style={{ background: '#161B22', border: '1px solid rgba(240,246,252,0.08)' }}>
              <div className="relative w-12 h-12">
                <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden>
                  <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
                  <circle cx="24" cy="24" r="18" fill="none" stroke={v.color} strokeWidth="3.5"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - v.completion / 100)}`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center"
                  style={{ fontSize: 11, fontWeight: 800, color: v.color }}>{v.completion}%</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA', textAlign: 'center' }}>{v.length}</p>
              <p style={{ fontSize: 10, color: '#52525B', textAlign: 'center' }}>{v.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

      {/* Benchmarks table */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>TikTok Benchmarks for Small Business</h2>
          <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>Where accounts typically start vs what&apos;s possible — sourced from TikTok Creator Analytics</p>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div className="grid grid-cols-4 px-4 py-2.5" style={{ background: '#1A1530', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            {['Metric', 'New Account', 'Growing', 'Top 10%'].map((h, i) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i > 0 ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>
          {BENCHMARK_ROWS.map((row, i) => (
            <div key={row.label} className="grid grid-cols-4 px-4 py-3 transition-colors"
              style={{ borderBottom: i < BENCHMARK_ROWS.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <span style={{ fontSize: 12, color: '#A1A1AA' }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#52525B', textAlign: 'center', fontFamily: 'monospace' }}>{row.smb}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA', textAlign: 'center', fontFamily: 'monospace' }}>{row.avg}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: row.color, textAlign: 'center', fontFamily: 'monospace' }}>{row.top}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#27272a' }}>Source: TikTok Creator Analytics · Sprout Social 2025 benchmark report · Later Media</p>
      </section>

      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

      {/* Content format performance */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Content Format Performance</h2>
          <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>Average performance by video format across TikTok, Reels, and Shorts</p>
        </div>
        <div className="flex flex-col gap-2">
          {FORMAT_PERFORMANCE.map(row => (
            <div key={row.format} className="flex items-center gap-4 p-3.5 rounded-xl transition-colors"
              style={{ background: '#161B22', border: '1px solid rgba(240,246,252,0.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${row.color}25` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color, boxShadow: `0 0 6px ${row.color}60` }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E4E4E7', minWidth: 120 }}>{row.format}</span>
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1A1530' }}>
                  <div className="h-full rounded-full" style={{
                    width: row.format === 'POV / Story' ? '90%' : row.format === 'Tutorial' ? '76%' : row.format === 'B-Roll + VO' ? '62%' : row.format === 'Text-on-screen' ? '50%' : '38%',
                    background: `linear-gradient(90deg,${row.color}80,${row.color})`,
                  }} />
                </div>
              </div>
              <div className="flex items-center gap-4 text-right flex-shrink-0">
                <div className="flex flex-col items-end">
                  <span style={{ fontSize: 11, fontWeight: 700, color: row.color, fontFamily: 'monospace' }}>{row.avgViews}</span>
                  <span style={{ fontSize: 10, color: '#3f3f46' }}>avg views</span>
                </div>
                <div className="flex flex-col items-end">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', fontFamily: 'monospace' }}>{row.engRate}</span>
                  <span style={{ fontSize: 10, color: '#3f3f46' }}>eng rate</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    background: row.difficulty === 'Easy' ? 'rgba(74,222,128,0.08)' : 'rgba(245,158,11,0.08)',
                    color: row.difficulty === 'Easy' ? '#4ADE80' : '#f59e0b',
                    border: row.difficulty === 'Easy' ? '0.5px solid rgba(74,222,128,0.2)' : '0.5px solid rgba(245,158,11,0.2)',
                  }}>
                  {row.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

      {/* Growth roadmap */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>Growth Roadmap</h2>
          <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 2 }}>Milestones and what moves the needle at each stage</p>
        </div>
        <div className="relative flex flex-col gap-0">
          {GROWTH_MILESTONES.map((m, i) => (
            <div key={m.followers} className="flex items-start gap-4 relative">
              {/* Timeline line */}
              {i < GROWTH_MILESTONES.length - 1 && (
                <div className="absolute left-[19px] top-8 w-0.5 h-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
              )}
              {/* Dot */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{ background: `${m.color}15`, border: `1px solid ${m.color}40` }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: m.color }}>{m.followers}</span>
              </div>
              <div className="flex flex-col gap-0.5 pb-6">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#E4E4E7' }}>{m.label}</span>
                <span style={{ fontSize: 12, color: '#71717A', lineHeight: 1.55 }}>{m.tip}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
type DashTab = 'overview' | 'statistics'

export default function DashboardPage() {
  const [selectedIdea, setSelectedIdea] = React.useState<ContentIdea | null>(null)
  const [activeTab, setActiveTab] = React.useState<DashTab>('overview')
  const stats = React.useMemo(() => buildStats(selectedIdea), [selectedIdea])

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ zIndex: -1 }} aria-hidden>
        <Particles
          particleColors={['#7C5CFF', '#FF6FD8', '#22D3EE']}
          particleCount={90}
          particleSpread={14}
          speed={0.05}
          particleBaseSize={60}
          alphaParticles
          className=""
        />
      </div>
      <TopBar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-10 flex flex-col gap-10">

          <QuickActionsBar />

          {/* Tab bar */}
          <div className="flex items-center gap-1" style={{ borderBottom: '1px solid rgba(240,246,252,0.08)', paddingBottom: 0 }}>
            {(['overview', 'statistics'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="relative px-5 py-3 text-[13px] font-semibold capitalize transition-colors duration-150"
                style={{ color: activeTab === tab ? '#E6EDF3' : '#484F58', background: 'transparent', border: 'none' }}>
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: '#7C5CFF' }} />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Idea analytics — only when idea selected */}
              {selectedIdea && (
                <section className="flex flex-col gap-3">
                  <IdeaAnalyticsPanel idea={selectedIdea} onClose={() => setSelectedIdea(null)} />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {stats.map(stat => <StatCard key={stat.label} stat={stat} />)}
                  </div>
                </section>
              )}

              <WeekCalendar />

              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

              <PlatformHealth />

              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.05)' }} />

              <ContentIdeasFeed
                showFilters
                gridClass="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                onSelectIdea={setSelectedIdea}
              />
            </>
          )}

          {activeTab === 'statistics' && <StatisticsTab />}

        </div>
      </div>
    </div>
  )
}
