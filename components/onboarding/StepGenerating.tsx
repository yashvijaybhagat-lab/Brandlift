'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { BusinessProfile } from '@/lib/claude'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface StepGeneratingProps {
  businessProfile: Partial<BusinessProfile>
  onComplete: () => void
}

interface StatusLine {
  icon: '✓' | '→'
  text: string
}

// ─────────────────────────────────────────────
// Status lines config
// ─────────────────────────────────────────────

const STATUS_LINES: StatusLine[] = [
  { icon: '✓', text: 'Business profile analyzed' },
  { icon: '✓', text: 'Audience mapped' },
  { icon: '✓', text: 'Content strategy generated' },
  { icon: '✓', text: 'Design system selected' },
  { icon: '→', text: 'Building your dashboard...' },
]

// Each line appears 120ms after the previous, then we wait 1s after all appear
const LINE_STAGGER = 120
const HOLD_AFTER_LAST = 1000
const PROGRESS_DURATION = 3000

// ─────────────────────────────────────────────
// Single status line
// ─────────────────────────────────────────────

interface StatusLineItemProps {
  line: StatusLine
  visible: boolean
  isLast: boolean
}

function StatusLineItem({ line, visible, isLast }: StatusLineItemProps) {
  const isArrow = line.icon === '→'
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (visible && isArrow) {
      const timer = setTimeout(() => setPulse(true), 200)
      return () => clearTimeout(timer)
    }
  }, [visible, isArrow])

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        'transition-all',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
      )}
      style={{
        transitionProperty: 'opacity, transform',
        transitionDuration: '200ms',
        transitionTimingFunction: 'cubic-bezier(0.23,1,0.32,1)',
      }}
      aria-hidden={!visible}
    >
      {/* Icon */}
      <span
        className={cn(
          'w-5 h-5 flex items-center justify-center text-[14px] font-[600] flex-shrink-0',
          'transition-all',
          isArrow
            ? cn(
                'text-brand-primary',
                isLast && pulse && 'animate-[arrowPulse_1.5s_ease-in-out_infinite]'
              )
            : 'text-brand-success',
          visible
            ? 'scale-100 opacity-100'
            : 'scale-[0.4] opacity-0'
        )}
        style={{
          transitionProperty: 'transform, opacity',
          transitionDuration: '180ms',
          transitionTimingFunction: 'cubic-bezier(0.23,1,0.32,1)',
        }}
        aria-hidden="true"
      >
        {line.icon}
      </span>

      {/* Text */}
      <span
        className={cn(
          'text-[15px] font-[400]',
          isArrow ? 'text-brand-primary font-[500]' : 'text-brand-text-secondary'
        )}
      >
        {line.text}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function StepGenerating({ onComplete }: StepGeneratingProps) {
  const [visibleLines, setVisibleLines] = useState<number>(-1)
  const [progressWidth, setProgressWidth] = useState(0)

  const totalDuration = LINE_STAGGER * STATUS_LINES.length + HOLD_AFTER_LAST

  useEffect(() => {
    // Reveal lines with stagger
    STATUS_LINES.forEach((_, i) => {
      const delay = i * LINE_STAGGER
      setTimeout(() => {
        setVisibleLines(i)
      }, delay)
    })

    // Navigate after all lines + hold
    const navTimer = setTimeout(() => {
      onComplete()
    }, totalDuration)

    return () => clearTimeout(navTimer)
  }, [onComplete, totalDuration])

  // Smooth progress bar using rAF
  useEffect(() => {
    const start = Date.now()

    const tick = () => {
      const elapsed = Date.now() - start
      const raw = Math.min(1, elapsed / PROGRESS_DURATION)
      // ease-in-out
      const eased = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw
      setProgressWidth(Math.round(eased * 100))

      if (elapsed < PROGRESS_DURATION) {
        requestAnimationFrame(tick)
      }
    }

    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full px-4"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(245,166,35,0.04) 0%, transparent 70%)',
      }}
    >
      {/* Logo mark */}
      <div
        className={cn(
          'w-10 h-10 rounded-full bg-brand-primary-muted border border-brand-primary/20',
          'flex items-center justify-center mb-8',
          'animate-[fadeIn_280ms_cubic-bezier(0.23,1,0.32,1)_forwards]',
          'opacity-0'
        )}
        aria-label="BrandLift"
      >
        <span className="text-brand-primary text-[14px] font-[700] tracking-tight">
          BL
        </span>
      </div>

      {/* Title */}
      <h1
        className={cn(
          'text-[24px] font-[500] text-brand-text mb-10 tracking-tight',
          'animate-[fadeIn_280ms_100ms_cubic-bezier(0.23,1,0.32,1)_forwards]',
          'opacity-0'
        )}
        style={{ letterSpacing: '-0.02em' }}
      >
        Building your presence...
      </h1>

      {/* Status lines */}
      <div
        className="flex flex-col gap-4 mb-12 w-full max-w-xs"
        aria-live="polite"
        aria-label="Setup progress"
      >
        {STATUS_LINES.map((line, i) => (
          <StatusLineItem
            key={line.text}
            line={line}
            visible={visibleLines >= i}
            isLast={i === STATUS_LINES.length - 1}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div
        className={cn(
          'w-full max-w-xs h-0.5 bg-brand-surface-elevated rounded-full overflow-hidden',
          'animate-[fadeIn_280ms_200ms_cubic-bezier(0.23,1,0.32,1)_forwards]',
          'opacity-0'
        )}
        role="progressbar"
        aria-valuenow={progressWidth}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Overall progress"
      >
        <div
          className="h-full bg-brand-primary rounded-full"
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes arrowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
