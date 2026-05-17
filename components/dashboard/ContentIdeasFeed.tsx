'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ArrowRight, Sparkles } from 'lucide-react'
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
// API fetch
// ─────────────────────────────────────────────

async function fetchIdeas(): Promise<ContentIdea[]> {
  const res = await fetch('/api/content/ideas')
  if (!res.ok) throw new Error('Failed to fetch ideas')
  const data = await res.json() as { ideas: ContentIdea[] }
  return data.ideas
}

// ─────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      style={{
        background: '#111113',
        borderRadius: 14,
        overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.06)',
        animation: `stagger-in 280ms cubic-bezier(0.23,1,0.32,1) ${index * 55}ms forwards`,
        opacity: 0,
      }}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="h-5 w-20 rounded-md bg-white/[0.05] animate-pulse" />
          <div className="h-5 w-16 rounded-md bg-white/[0.05] animate-pulse" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-full rounded bg-white/[0.05] animate-pulse" />
          <div className="h-3.5 w-5/6 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-3.5 w-4/6 rounded bg-white/[0.05] animate-pulse" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded-full bg-white/[0.05] animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-white/[0.05] animate-pulse" />
        </div>
        <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
          <div className="h-3 w-20 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-3 w-16 rounded bg-white/[0.05] animate-pulse" />
        </div>
      </div>
    </div>
  )
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
  onSelect,
  isSelected,
}: {
  idea: ContentIdea
  style?: React.CSSProperties
  onSelect?: (idea: ContentIdea) => void
  isSelected?: boolean
}) {
  const router = useRouter()
  const trend = TREND_CONFIG[idea.trend]
  const [hovered, setHovered] = React.useState(false)
  const selected = isSelected ?? false

  return (
    <article
      onClick={() => onSelect?.(idea)}
      style={{
        ...style,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: selected
          ? '0 0 0 1.5px rgba(99,102,241,0.5), 0 12px 36px rgba(0,0,0,0.45)'
          : hovered
          ? '0 0 0 1px rgba(99,102,241,0.15), 0 12px 36px rgba(0,0,0,0.45)'
          : '0 0 0 0.5px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.2)',
        transition: 'transform 180ms cubic-bezier(0.23,1,0.32,1), box-shadow 180ms cubic-bezier(0.23,1,0.32,1), background 180ms ease',
        background: selected ? '#13131a' : hovered ? '#141416' : '#111113',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
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
            className="inline-flex items-center gap-1 text-[12px] font-medium rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60"
            style={{ color: selected ? '#818cf8' : hovered ? '#818cf8' : '#52525B' }}
            aria-label={`Create video for: ${idea.hook.slice(0, 50)}…`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect?.(idea)
              router.push(`/dashboard/videos?idea=${encodeURIComponent(idea.hook)}&format=${idea.format}`)
            }}
          >
            {selected ? 'Create video' : 'Use this idea'}
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

export type { ContentIdea }

interface ContentIdeasFeedProps {
  limit?: number
  showFilters?: boolean
  gridClass?: string
  onSelectIdea?: (idea: ContentIdea) => void
}

export function ContentIdeasFeed({
  limit,
  showFilters = true,
  gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  onSelectIdea,
}: ContentIdeasFeedProps) {
  const [platformFilter, setPlatformFilter] = React.useState<PlatformFilter>('all')
  const [formatFilter, setFormatFilter] = React.useState<FormatFilter>('all')
  const [ideas, setIdeas] = React.useState<ContentIdea[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)
  const [visible, setVisible] = React.useState(true)
  const [rotating, setRotating] = React.useState(false)
  const [selectedIdeaId, setSelectedIdeaId] = React.useState<string | null>(null)

  const loadIdeas = React.useCallback(async () => {
    try {
      const data = await fetchIdeas()
      setIdeas(data)
      setError(null)
    } catch {
      setError('Could not generate ideas. Check that ANTHROPIC_API_KEY is set.')
    }
  }, [])

  React.useEffect(() => {
    loadIdeas().finally(() => setLoading(false))
  }, [loadIdeas])

  // Filter ideas
  const filtered = React.useMemo(() => {
    let result = ideas
    if (platformFilter !== 'all') {
      result = result.filter((i) => i.platforms.includes(platformFilter as Platform))
    }
    if (formatFilter !== 'all') {
      result = result.filter((i) => i.format === formatFilter)
    }
    return limit ? result.slice(0, limit) : result
  }, [ideas, platformFilter, formatFilter, limit])

  const handleRefresh = React.useCallback(async () => {
    if (refreshing) return

    setRotating(true)
    setRefreshing(true)
    setVisible(false)
    await new Promise((r) => setTimeout(r, 220))

    await loadIdeas()

    setVisible(true)
    setRefreshing(false)
    setTimeout(() => setRotating(false), 420)
  }, [refreshing, loadIdeas])

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
            {loading ? 'Generating ideas…' : 'AI-tailored hooks for your business'}
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
          {refreshing ? (
            <Sparkles className="w-3 h-3 animate-pulse" />
          ) : (
            <RefreshCw
              className="w-3 h-3"
              style={{
                transform: rotating ? 'rotate(360deg)' : 'rotate(0deg)',
                transition: rotating ? 'transform 400ms cubic-bezier(0.23,1,0.32,1)' : 'transform 0ms',
              }}
            />
          )}
          {refreshing ? 'Generating…' : 'Refresh'}
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

      {/* Card grid */}
      {error ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-[14px] text-[#A1A1AA]">{error}</p>
          <button
            onClick={() => { setLoading(true); loadIdeas().finally(() => setLoading(false)) }}
            className="text-[13px] text-[#6366f1] hover:underline"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className={cn('grid gap-4', gridClass)}>
          {Array.from({ length: limit ?? 6 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : (
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
              key={idea.id}
              idea={idea}
              isSelected={selectedIdeaId === idea.id}
              onSelect={(selected) => {
                setSelectedIdeaId(selected.id)
                onSelectIdea?.(selected)
              }}
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
      )}
    </section>
  )
}

export default ContentIdeasFeed
