'use client'

import * as React from 'react'
import { RefreshCw, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Platform = 'tiktok' | 'instagram' | 'youtube'
type Format = 'talking-head' | 'b-roll' | 'tutorial' | 'text-overlay'
type Trend = 'trending' | 'rising' | 'classic'

interface ContentIdea {
  id: string
  hook: string
  format: Format
  platforms: Platform[]
  trend: Trend
  reach: string
}

type PlatformFilter = 'all' | Platform
type FormatFilter = 'all' | Format

// ─────────────────────────────────────────────
// Static content ideas (15 realistic ideas)
// ─────────────────────────────────────────────

const ALL_IDEAS: ContentIdea[] = [
  {
    id: '1',
    hook: "I asked 10 customers what they wish they'd known before coming to us. Their answers surprised me.",
    format: 'talking-head',
    platforms: ['tiktok', 'instagram'],
    trend: 'trending',
    reach: '2.1K–14K',
  },
  {
    id: '2',
    hook: 'POV: you finally stop guessing and just let the expert handle it. Here\'s what changed in 30 days.',
    format: 'b-roll',
    platforms: ['tiktok', 'instagram'],
    trend: 'trending',
    reach: '3.5K–22K',
  },
  {
    id: '3',
    hook: 'The one mistake 90% of people make before reaching out to a business like ours — and how to avoid it.',
    format: 'talking-head',
    platforms: ['youtube', 'instagram'],
    trend: 'rising',
    reach: '1.8K–9K',
  },
  {
    id: '4',
    hook: "Here's what your Saturday morning could look like. No stress. No second-guessing.",
    format: 'b-roll',
    platforms: ['instagram', 'tiktok'],
    trend: 'trending',
    reach: '4.2K–18K',
  },
  {
    id: '5',
    hook: 'Before vs. after we got involved. I\'ll let the results speak for themselves.',
    format: 'b-roll',
    platforms: ['tiktok', 'instagram', 'youtube'],
    trend: 'classic',
    reach: '2.8K–16K',
  },
  {
    id: '6',
    hook: '3 questions to ask any business in our industry before you hand them your money.',
    format: 'talking-head',
    platforms: ['youtube', 'tiktok'],
    trend: 'rising',
    reach: '1.4K–7K',
  },
  {
    id: '7',
    hook: "A day in our operation — what actually happens behind the scenes so your experience is seamless.",
    format: 'b-roll',
    platforms: ['instagram', 'youtube'],
    trend: 'classic',
    reach: '900–5K',
  },
  {
    id: '8',
    hook: 'How we turned a complete disaster into our most loyal client story.',
    format: 'talking-head',
    platforms: ['tiktok', 'youtube'],
    trend: 'trending',
    reach: '5.1K–28K',
  },
  {
    id: '9',
    hook: "We break down the exact process so you know what you're getting before day one.",
    format: 'tutorial',
    platforms: ['youtube', 'instagram'],
    trend: 'rising',
    reach: '1.2K–6K',
  },
  {
    id: '10',
    hook: '5 things our best customers have in common — and what that tells us about great results.',
    format: 'text-overlay',
    platforms: ['instagram', 'tiktok'],
    trend: 'rising',
    reach: '2.3K–11K',
  },
  {
    id: '11',
    hook: "If you're still DIY-ing this, here's the real cost most people forget to calculate.",
    format: 'talking-head',
    platforms: ['youtube', 'tiktok'],
    trend: 'trending',
    reach: '3.9K–21K',
  },
  {
    id: '12',
    hook: "Real talk: what we'd tell you if you were our close friend asking for advice.",
    format: 'talking-head',
    platforms: ['tiktok', 'instagram'],
    trend: 'trending',
    reach: '6.2K–35K',
  },
  {
    id: '13',
    hook: 'Step by step: what to expect from first contact to final delivery. Zero surprises.',
    format: 'tutorial',
    platforms: ['youtube'],
    trend: 'classic',
    reach: '800–4K',
  },
  {
    id: '14',
    hook: 'Why we say no to about 20% of projects — and why that makes us better for you.',
    format: 'talking-head',
    platforms: ['youtube', 'instagram'],
    trend: 'rising',
    reach: '1.7K–8K',
  },
  {
    id: '15',
    hook: "The review we didn't expect — and what it taught us about raising our own standards.",
    format: 'b-roll',
    platforms: ['tiktok', 'instagram', 'youtube'],
    trend: 'trending',
    reach: '4.8K–26K',
  },
]

// Shuffle deterministically for "refresh" (returns different 12-item set)
function shuffleWithSeed(arr: ContentIdea[], seed: number): ContentIdea[] {
  const copy = [...arr]
  let s = seed
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ─────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────

const FORMAT_LABELS: Record<Format, string> = {
  'talking-head': 'Talking Head',
  'b-roll': 'B-roll',
  tutorial: 'Tutorial',
  'text-overlay': 'Text Overlay',
}

const TREND_CONFIG: Record<Trend, { emoji: string; label: string; color: string }> = {
  trending: { emoji: '🔥', label: 'Trending', color: 'text-orange-400' },
  rising: { emoji: '📈', label: 'Rising', color: 'text-emerald-400' },
  classic: { emoji: '⭐', label: 'Classic', color: 'text-[#A1A1AA]' },
}

// ─────────────────────────────────────────────
// ContentIdeaCard
// ─────────────────────────────────────────────

const TREND_ACCENT: Record<Trend, string> = {
  trending: 'rgba(251,191,36,0.15)',
  rising: 'rgba(74,222,128,0.12)',
  classic: 'rgba(161,161,170,0.1)',
}
const TREND_BORDER: Record<Trend, string> = {
  trending: 'rgba(251,191,36,0.25)',
  rising: 'rgba(74,222,128,0.2)',
  classic: 'rgba(255,255,255,0.06)',
}

function ContentIdeaCard({
  idea,
  style,
}: {
  idea: ContentIdea
  style?: React.CSSProperties
}) {
  const trend = TREND_CONFIG[idea.trend]
  const [hovered, setHovered] = React.useState(false)

  return (
    <article
      style={{
        ...style,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 0 0 1px rgba(99,102,241,0.15), 0 12px 36px rgba(0,0,0,0.45)'
          : '0 0 0 0.5px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.2)',
        transition: 'transform 180ms cubic-bezier(0.23,1,0.32,1), box-shadow 180ms cubic-bezier(0.23,1,0.32,1), background 180ms ease',
        background: hovered ? '#141416' : '#111113',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'default',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-200"
        style={{
          background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)',
          opacity: hovered ? 1 : 0,
          borderRadius: '0 2px 2px 0',
        }}
        aria-hidden
      />

      {/* Indigo glow on top edge */}
      <div
        className="absolute top-0 left-0 right-0 h-px transition-opacity duration-200"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 50%, transparent 100%)',
          opacity: hovered ? 1 : 0,
        }}
        aria-hidden
      />

      <div className="flex flex-col gap-3 p-4">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              background: '#18181C',
              color: '#52525B',
              border: '0.5px solid rgba(255,255,255,0.07)',
            }}
          >
            {FORMAT_LABELS[idea.format]}
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.02em',
              background: TREND_ACCENT[idea.trend],
              border: `0.5px solid ${TREND_BORDER[idea.trend]}`,
              color: idea.trend === 'trending' ? '#FBBF24' : idea.trend === 'rising' ? '#4ADE80' : '#A1A1AA',
            }}
          >
            <span aria-hidden>{trend.emoji}</span>
            {trend.label}
          </span>
        </div>

        {/* Hook */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: hovered ? '#FAFAFA' : '#E4E4E7',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            transition: 'color 180ms ease',
            flex: 1,
          }}
        >
          {idea.hook}
        </p>

        {/* Platform badges */}
        <div className="flex flex-wrap gap-1.5">
          {idea.platforms.map((p) => (
            <Badge key={p} variant="platform" platform={p} />
          ))}
        </div>

        {/* Footer row */}
        <div
          className="flex items-center justify-between gap-2 pt-2.5"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          <span style={{ fontSize: 11, color: '#3f3f46', fontFamily: 'var(--font-mono)' }}>
            {idea.reach} est. reach
          </span>

          <button
            className="inline-flex items-center gap-1 text-[12px] font-medium rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60"
            style={{ color: hovered ? '#818cf8' : '#52525B' }}
            aria-label={`Use idea: ${idea.hook.slice(0, 50)}…`}
          >
            Use this idea
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────
// Filter chips
// ─────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center px-3 py-1 rounded-pill text-[13px] font-medium',
        'transition-colors duration-160',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60',
        'overflow-hidden',
        active
          ? 'text-[#0A0A0B]'
          : 'text-[#71717A] bg-[#18181C] border border-white/[0.06] hover:text-[#A1A1AA]',
      )}
    >
      {/* Clip-path fill reveal for active state */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[#6366f1] rounded-pill"
        style={{
          clipPath: active ? 'inset(0 0 0 0 round 24px)' : 'inset(0 100% 0 0 round 24px)',
          transition: 'clip-path 200ms cubic-bezier(0.23,1,0.32,1)',
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  )
}

// ─────────────────────────────────────────────
// ContentIdeasFeed
// ─────────────────────────────────────────────

interface ContentIdeasFeedProps {
  /** Limit cards shown — useful for dashboard sidebar panel */
  limit?: number
  /** Show full filter controls */
  showFilters?: boolean
  /** Grid columns class */
  gridClass?: string
}

export function ContentIdeasFeed({
  limit,
  showFilters = true,
  gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}: ContentIdeasFeedProps) {
  const [platformFilter, setPlatformFilter] = React.useState<PlatformFilter>('all')
  const [formatFilter, setFormatFilter] = React.useState<FormatFilter>('all')
  const [seed, setSeed] = React.useState(1)
  const [refreshing, setRefreshing] = React.useState(false)
  const [visible, setVisible] = React.useState(true)
  const [rotating, setRotating] = React.useState(false)

  // Filter ideas
  const filtered = React.useMemo(() => {
    let ideas = shuffleWithSeed(ALL_IDEAS, seed)
    if (platformFilter !== 'all') {
      ideas = ideas.filter((i) => i.platforms.includes(platformFilter as Platform))
    }
    if (formatFilter !== 'all') {
      ideas = ideas.filter((i) => i.format === formatFilter)
    }
    return limit ? ideas.slice(0, limit) : ideas
  }, [seed, platformFilter, formatFilter, limit])

  const handleRefresh = React.useCallback(async () => {
    if (refreshing) return

    setRotating(true)
    setRefreshing(true)

    // Exit animation
    setVisible(false)
    await new Promise((r) => setTimeout(r, 220))

    // New seed → new shuffle
    setSeed((s) => s + 1)

    // Enter animation
    setVisible(true)
    setRefreshing(false)

    // Stop rotation after one full turn
    setTimeout(() => setRotating(false), 420)
  }, [refreshing])

  const platformOptions: { label: string; value: PlatformFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'TikTok', value: 'tiktok' },
    { label: 'Instagram', value: 'instagram' },
    { label: 'YouTube', value: 'youtube' },
  ]

  const formatOptions: { label: string; value: FormatFilter }[] = [
    { label: 'All formats', value: 'all' },
    { label: 'Talking Head', value: 'talking-head' },
    { label: 'B-roll', value: 'b-roll' },
    { label: 'Tutorial', value: 'tutorial' },
    { label: 'Text Overlay', value: 'text-overlay' },
  ]

  return (
    <section className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: '#FAFAFA',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
            }}
          >
            Content Ideas
          </h2>
          <p style={{ fontSize: 13, color: '#52525B', marginTop: 4 }}>
            AI-tailored hooks for your business
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh ideas"
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg',
            'text-[12px] font-medium',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
          style={{ color: '#52525B', border: '0.5px solid rgba(255,255,255,0.07)', background: '#111113' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = '#A1A1AA'
            el.style.borderColor = 'rgba(255,255,255,0.12)'
            el.style.background = '#18181C'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = '#52525B'
            el.style.borderColor = 'rgba(255,255,255,0.07)'
            el.style.background = '#111113'
          }}
        >
          <RefreshCw
            className="w-3 h-3"
            style={{
              transform: rotating ? 'rotate(360deg)' : 'rotate(0deg)',
              transition: rotating ? 'transform 400ms cubic-bezier(0.23,1,0.32,1)' : 'transform 0ms',
            }}
          />
          Refresh
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-col gap-2">
          {/* Platform filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {platformOptions.map((opt) => (
              <FilterChip
                key={opt.value}
                active={platformFilter === opt.value}
                onClick={() => setPlatformFilter(opt.value)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>

          {/* Format filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {formatOptions.map((opt) => (
              <FilterChip
                key={opt.value}
                active={formatFilter === opt.value}
                onClick={() => setFormatFilter(opt.value)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {/* Card grid with stagger animation */}
      <div
        className={cn('grid gap-4', gridClass)}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-4px)',
          transition: 'opacity 180ms cubic-bezier(0.23,1,0.32,1), transform 180ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {filtered.map((idea, index) => (
          <ContentIdeaCard
            key={`${idea.id}-${seed}`}
            idea={idea}
            style={{
              opacity: 0,
              animation: visible
                ? `stagger-in 280ms cubic-bezier(0.23,1,0.32,1) ${index * 55}ms forwards`
                : 'none',
            }}
          />
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center gap-2 text-center">
            <p className="text-[14px] text-[#A1A1AA]">No ideas match those filters.</p>
            <button
              onClick={() => { setPlatformFilter('all'); setFormatFilter('all') }}
              className="text-[13px] text-[#6366f1] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default ContentIdeasFeed
