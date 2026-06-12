'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

// ─────────────────────────────────────────────
// Route → page title map
// ─────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/ideas': 'Content Ideas',
  '/dashboard/videos': 'My Videos',
  '/dashboard/website': 'My Website',
  '/dashboard/settings': 'Settings',
}

// ─────────────────────────────────────────────
// Animated radial gauge
// ─────────────────────────────────────────────

function ContentScoreGauge({ score = 72 }: { score?: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const [animatedScore, setAnimatedScore] = React.useState(0)
  const [offset, setOffset] = React.useState(circumference)

  React.useEffect(() => {
    // Respect reduced motion preference
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setAnimatedScore(score)
      setOffset(circumference - (score / 100) * circumference)
      return
    }

    let startTime: number | null = null
    const duration = 1500

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    }

    function step(timestamp: number) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOut(progress)
      const current = Math.round(eased * score)

      setAnimatedScore(current)
      setOffset(circumference - (current / 100) * circumference)

      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    const raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [score, circumference])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
        <svg
          width={48}
          height={48}
          viewBox="0 0 48 48"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={24}
            cy={24}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={4}
          />
          {/* Progress arc */}
          <circle
            cx={24}
            cy={24}
            r={radius}
            fill="none"
            stroke="#5855D4"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.016s linear',
            }}
          />
        </svg>

        {/* Score number */}
        <span
          className="absolute inset-0 flex items-center justify-center text-[13px] font-medium text-[#FAFAFA]"
          aria-label={`Content score: ${animatedScore} out of 100`}
        >
          {animatedScore}
        </span>
      </div>

      <span className="text-[11px] font-medium text-[#71717A] whitespace-nowrap">
        Content Score
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// TopBar component
// ─────────────────────────────────────────────

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'

  return (
    <header
      className="flex items-center px-8 sticky top-0 z-10 gap-4"
      style={{
        height: 60,
        background: 'rgba(13,17,23,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(240,246,252,0.08)',
      }}
    >
      {/* Left: page title */}
      <div className="flex-1 min-w-0 flex items-center gap-4">
        <h1
          className="truncate"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 700,
            color: '#E6EDF3',
            letterSpacing: '-0.03em',
          }}
        >
          {title}
        </h1>
        <div className="h-4 w-px" style={{ background: 'rgba(240,246,252,0.1)' }} aria-hidden />
        <span style={{ fontSize: 12, color: '#484F58', fontFamily: 'var(--font-mono)' }}>
          Jun 2026
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 rounded-lg text-[12px] h-8"
          onClick={() => router.push('/dashboard/videos?upload=1')}
        >
          <Plus className="w-3 h-3" />
          Add video
        </Button>

        <button
          aria-label="Notifications"
          className={cn(
            'relative flex items-center justify-center w-8 h-8 rounded-lg',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5855D4]/60',
          )}
          style={{ color: '#52525B', border: '0.5px solid rgba(255,255,255,0.07)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = '#FAFAFA'
            el.style.background = '#18181C'
            el.style.borderColor = 'rgba(255,255,255,0.12)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = '#52525B'
            el.style.background = 'transparent'
            el.style.borderColor = 'rgba(255,255,255,0.07)'
          }}
        >
          <Bell className="w-3.5 h-3.5" />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#5855D4', boxShadow: '0 0 4px rgba(88,85,212,0.6)' }}
            aria-hidden
          />
        </button>
      </div>
    </header>
  )
}

export default TopBar
