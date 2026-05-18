'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ArrowRight, Bookmark, BookmarkCheck, Sparkles } from 'lucide-react'
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

type ActiveTab = 'foryou' | 'saved'

// Cache helpers (localStorage, per user, 24h TTL)
// ─────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function cacheKey(email: string) {
  return `bl_ideas_v2_${email}`
}

function readCache(email: string): ContentIdea[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(email))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    return parsed.ideas as ContentIdea[]
  } catch { return null }
}

function writeCache(email: string, ideas: ContentIdea[]) {
  try {
    localStorage.setItem(cacheKey(email), JSON.stringify({ ts: Date.now(), ideas }))
  } catch {}
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

const TREND_CONFIG: Record<string, { emoji: string; label: string }> = {
  trending: { emoji: '🔥', label: 'Trending' },
  rising:   { emoji: '📈', label: 'Rising' },
  classic:  { emoji: '⭐', label: 'Classic' },
}

const TREND_ACCENT: Record<string, string> = {
  trending: 'rgba(251,191,36,0.15)',
  rising:   'rgba(74,222,128,0.12)',
  classic:  'rgba(161,161,170,0.1)',
}
const TREND_BORDER: Record<string, string> = {
  trending: 'rgba(251,191,36,0.25)',
  rising:   'rgba(74,222,128,0.2)',
  classic:  'rgba(255,255,255,0.06)',
}
const TREND_TEXT: Record<string, string> = {
  trending: '#FBBF24',
  rising:   '#4ADE80',
  classic:  '#A1A1AA',
}

// ─────────────────────────────────────────────
// ContentIdeaCard
// ─────────────────────────────────────────────

function ContentIdeaCard({
  idea,
  style,
  onSelect,
  isSelected,
  isSaved,
  onToggleSave,
}: {
  idea: ContentIdea
  style?: React.CSSProperties
  onSelect?: (idea: ContentIdea) => void
  isSelected?: boolean
  isSaved?: boolean
  onToggleSave?: (idea: ContentIdea) => void
}) {
  const router = useRouter()
  const trendKey = idea.trend in TREND_CONFIG ? idea.trend : 'classic'
  const trend = TREND_CONFIG[trendKey]
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
        style={{ background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)', opacity: hovered ? 1 : 0, borderRadius: '0 2px 2px 0' }}
        aria-hidden
      />

      {/* Top glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px transition-opacity duration-200"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 50%, transparent 100%)', opacity: hovered ? 1 : 0 }}
        aria-hidden
      />

      <div className="flex flex-col gap-3 p-4">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', background: '#18181C', color: '#52525B', border: '0.5px solid rgba(255,255,255,0.07)' }}>
            {FORMAT_LABELS[idea.format]}
          </span>

          <div className="flex items-center gap-2">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, letterSpacing: '0.02em', background: TREND_ACCENT[trendKey], border: `0.5px solid ${TREND_BORDER[trendKey]}`, color: TREND_TEXT[trendKey] }}>
              <span aria-hidden>{trend.emoji}</span>
              {trend.label}
            </span>

            {/* Bookmark button */}
            <button
              onClick={e => { e.stopPropagation(); onToggleSave?.(idea) }}
              aria-label={isSaved ? 'Remove from saved' : 'Save idea'}
              className="transition-colors duration-150"
              style={{ color: isSaved ? '#6366f1' : '#3f3f46', padding: '2px' }}
              onMouseEnter={e => { if (!isSaved) (e.currentTarget as HTMLButtonElement).style.color = '#71717A' }}
              onMouseLeave={e => { if (!isSaved) (e.currentTarget as HTMLButtonElement).style.color = '#3f3f46' }}
            >
              {isSaved
                ? <BookmarkCheck className="w-3.5 h-3.5" />
                : <Bookmark className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        </div>

        {/* Hook */}
        <p style={{ fontSize: 14, fontWeight: 500, color: hovered ? '#FAFAFA' : '#E4E4E7', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 180ms ease', flex: 1 }}>
          {idea.hook}
        </p>

        {/* Platform badges */}
        <div className="flex flex-wrap gap-1.5">
          {(idea.platforms ?? []).map(p => <Badge key={p} variant="platform" platform={p} />)}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2.5" style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 11, color: '#3f3f46', fontFamily: 'var(--font-mono)' }}>
            {idea.reach} est. reach
          </span>

          <button
            className="inline-flex items-center gap-1 text-[12px] font-medium rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60"
            style={{ color: selected ? '#818cf8' : hovered ? '#818cf8' : '#52525B' }}
            aria-label={`Create video for: ${idea.hook.slice(0, 50)}…`}
            onClick={e => {
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
// Skeleton card for loading state
// ─────────────────────────────────────────────

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      style={{
        borderRadius: 14,
        background: '#111113',
        border: '0.5px solid rgba(255,255,255,0.06)',
        padding: 16,
        opacity: 0,
        animation: `stagger-in 280ms cubic-bezier(0.23,1,0.32,1) ${index * 40}ms forwards`,
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded" style={{ background: '#18181C', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div className="h-4 w-16 rounded" style={{ background: '#18181C', animation: 'pulse 1.5s ease-in-out infinite 0.3s' }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-full rounded" style={{ background: '#18181C', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div className="h-3.5 w-5/6 rounded" style={{ background: '#18181C', animation: 'pulse 1.5s ease-in-out infinite 0.2s' }} />
          <div className="h-3.5 w-4/6 rounded" style={{ background: '#18181C', animation: 'pulse 1.5s ease-in-out infinite 0.4s' }} />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded-full" style={{ background: '#18181C', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div className="h-5 w-14 rounded-full" style={{ background: '#18181C', animation: 'pulse 1.5s ease-in-out infinite 0.2s' }} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab chip
// ─────────────────────────────────────────────

function TabChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center px-3.5 py-1.5 rounded-pill text-[13px] font-medium',
        'transition-colors duration-160 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60 overflow-hidden',
        active ? 'text-[#FAFAFA]' : 'text-[#71717A] bg-[#18181C] border border-white/[0.06] hover:text-[#A1A1AA]',
      )}
    >
      <span aria-hidden className="absolute inset-0 rounded-pill" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', clipPath: active ? 'inset(0 0 0 0 round 24px)' : 'inset(0 100% 0 0 round 24px)', transition: 'clip-path 200ms cubic-bezier(0.23,1,0.32,1)' }} />
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
  gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  onSelectIdea,
}: ContentIdeasFeedProps) {
  const { data: session, status } = useSession()
  const email = session?.user?.email ?? ''

  const [activeTab, setActiveTab] = React.useState<ActiveTab>('foryou')
  const [ideas, setIdeas] = React.useState<ContentIdea[]>([])
  const [savedIds, setSavedIds] = React.useState<Set<string>>(new Set())
  const [savedIdeas, setSavedIdeas] = React.useState<ContentIdea[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [visible, setVisible] = React.useState(true)
  const [rotating, setRotating] = React.useState(false)
  const [selectedIdeaId, setSelectedIdeaId] = React.useState<string | null>(null)

  // Stop loading if session finished and no user
  React.useEffect(() => {
    if (status !== 'loading' && !email) setLoading(false)
  }, [status, email])

  // Load ideas on mount (or when email is ready)
  React.useEffect(() => {
    if (!email) return
    let cancelled = false

    const load = async () => {
      // Check localStorage cache first
      const cached = readCache(email)
      if (cached) {
        if (!cancelled) { setIdeas(cached); setLoading(false) }
      } else {
        // Fetch from AI
        try {
          const res = await fetch('/api/ideas/generate', { method: 'POST' })
          const data = await res.json()
          if (!cancelled && Array.isArray(data.ideas) && data.ideas.length > 0) {
            setIdeas(data.ideas)
            writeCache(email, data.ideas)
          }
        } catch {}
        if (!cancelled) setLoading(false)
      }

      // Load saved ideas from server
      try {
        const res = await fetch('/api/user/saved-ideas')
        const data = await res.json()
        if (!cancelled && Array.isArray(data.ideas)) {
          setSavedIdeas(data.ideas)
          setSavedIds(new Set(data.ideas.map((i: ContentIdea) => i.id)))
        }
      } catch {}
    }

    load()
    return () => { cancelled = true }
  }, [email])

  // Refresh: generate fresh ideas, bypass cache
  const handleRefresh = React.useCallback(async () => {
    if (refreshing || !email) return
    setRotating(true)
    setRefreshing(true)
    setVisible(false)
    await new Promise(r => setTimeout(r, 220))

    try {
      const res = await fetch('/api/ideas/generate', { method: 'POST' })
      const data = await res.json()
      if (Array.isArray(data.ideas) && data.ideas.length > 0) {
        writeCache(email, data.ideas)
        setIdeas(data.ideas)
      }
    } catch {}

    setVisible(true)
    setRefreshing(false)
    setTimeout(() => setRotating(false), 420)
  }, [refreshing, email])

  // Toggle save/unsave
  const handleToggleSave = React.useCallback(async (idea: ContentIdea) => {
    const isSaved = savedIds.has(idea.id)
    let nextSaved: ContentIdea[]

    if (isSaved) {
      nextSaved = savedIdeas.filter(s => s.id !== idea.id)
    } else {
      nextSaved = [...savedIdeas, idea]
    }

    setSavedIdeas(nextSaved)
    setSavedIds(new Set(nextSaved.map(i => i.id)))

    // Persist to server
    try {
      await fetch('/api/user/saved-ideas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideas: nextSaved }),
      })
    } catch {}
  }, [savedIds, savedIdeas])

  const displayIdeas = activeTab === 'saved' ? savedIdeas : (limit ? ideas.slice(0, limit) : ideas)

  return (
    <section className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Content Ideas
          </h2>
          <p style={{ fontSize: 13, color: '#52525B', marginTop: 4 }}>
            AI-tailored hooks for your business — refreshed daily
          </p>
        </div>

        {activeTab === 'foryou' && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh ideas"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg',
              'text-[12px] font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            style={{ color: '#52525B', border: '0.5px solid rgba(255,255,255,0.07)', background: '#111113' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#A1A1AA'; el.style.borderColor = 'rgba(255,255,255,0.12)'; el.style.background = '#18181C' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#52525B'; el.style.borderColor = 'rgba(255,255,255,0.07)'; el.style.background = '#111113' }}
          >
            <RefreshCw className="w-3 h-3" style={{ transform: rotating ? 'rotate(360deg)' : 'rotate(0deg)', transition: rotating ? 'transform 400ms cubic-bezier(0.23,1,0.32,1)' : 'transform 0ms' }} />
            {refreshing ? 'Generating…' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-2">
        <TabChip active={activeTab === 'foryou'} onClick={() => setActiveTab('foryou')}>
          For You
        </TabChip>
        <TabChip active={activeTab === 'saved'} onClick={() => setActiveTab('saved')}>
          Saved {savedIdeas.length > 0 && <span className="ml-1 text-[11px] opacity-70">({savedIdeas.length})</span>}
        </TabChip>
      </div>

      {/* Card grid */}
      <div
        className={cn('grid gap-4', gridClass)}
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-4px)', transition: 'opacity 180ms cubic-bezier(0.23,1,0.32,1), transform 180ms cubic-bezier(0.23,1,0.32,1)' }}
      >
        {loading && activeTab === 'foryou' ? (
          Array.from({ length: limit ?? 6 }).map((_, i) => <SkeletonCard key={i} index={i} />)
        ) : displayIdeas.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center gap-3 text-center">
            {activeTab === 'saved' ? (
              <>
                <BookmarkCheck className="w-8 h-8 text-[#3f3f46]" />
                <p className="text-[14px] text-[#A1A1AA]">No saved ideas yet.</p>
                <p className="text-[13px] text-[#52525B]">Tap the bookmark icon on any idea to save it here.</p>
              </>
            ) : (
              <>
                <Sparkles className="w-8 h-8 text-[#3f3f46]" />
                <p className="text-[14px] text-[#A1A1AA]">Generating ideas for you…</p>
                <button onClick={handleRefresh} className="text-[13px] text-[#6366f1] hover:underline">Try again</button>
              </>
            )}
          </div>
        ) : (
          displayIdeas.map((idea, index) => (
            <ContentIdeaCard
              key={`${idea.id}-${activeTab}`}
              idea={idea}
              isSelected={selectedIdeaId === idea.id}
              isSaved={savedIds.has(idea.id)}
              onToggleSave={handleToggleSave}
              onSelect={selected => {
                setSelectedIdeaId(selected.id)
                onSelectIdea?.(selected)
              }}
              style={{
                opacity: 0,
                animation: visible ? `stagger-in 280ms cubic-bezier(0.23,1,0.32,1) ${index * 55}ms forwards` : 'none',
              }}
            />
          ))
        )}
      </div>
    </section>
  )
}

export default ContentIdeasFeed
