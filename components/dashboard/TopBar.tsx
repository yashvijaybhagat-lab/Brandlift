'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
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
            stroke="#6366f1"
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
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'

  return (
    <header
      className="flex items-center h-13 px-6 sticky top-0 z-10 gap-4"
      style={{
        height: 52,
        background: 'rgba(10,10,11,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Left: page title */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <h1
          className="truncate"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 700,
            color: '#FAFAFA',
            letterSpacing: '-0.03em',
          }}
        >
          {title}
        </h1>
        {/* Breadcrumb separator */}
        <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} aria-hidden />
        <span style={{ fontSize: 12, color: '#3f3f46', fontFamily: 'var(--font-mono)' }}>
          May 2025
        </span>
      </div>

      {/* Center: content score */}
      <div className="flex-shrink-0">
        <ContentScoreGauge score={72} />
      </div>

      {/* Right: actions */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 rounded-lg text-[12px] h-8"
        >
          <Plus className="w-3 h-3" />
          Add video
        </Button>

        <button
          aria-label="Notifications"
          className={cn(
            'relative flex items-center justify-center w-8 h-8 rounded-lg',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/60',
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
            style={{ background: '#6366f1', boxShadow: '0 0 4px rgba(99,102,241,0.6)' }}
            aria-hidden
          />
        </button>
      </div>
    </header>
  )
}

export default TopBar
