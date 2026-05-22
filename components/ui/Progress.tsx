'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ProgressVariant = 'default' | 'success' | 'error'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  /** Maximum value — defaults to 100 */
  max?: number
  variant?: ProgressVariant
  /** Show percentage label inside/above the bar */
  showLabel?: boolean
  /** Optional status text shown to the right */
  statusText?: string
  /** Height in px — defaults to 4 */
  height?: number
}

// ─────────────────────────────────────────────
// Variant fill colors
// ─────────────────────────────────────────────

const fillStyles: Record<ProgressVariant, string> = {
  default: 'bg-gradient-to-r from-brand-primary to-brand-primary-hover',
  success: 'bg-brand-success',
  error: 'bg-brand-error',
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value,
      max = 100,
      variant = 'default',
      showLabel = false,
      statusText,
      height = 4,
      className,
      ...props
    },
    ref
  ) => {
    const clamped = Math.min(Math.max(value, 0), max)
    const percentage = Math.round((clamped / max) * 100)
    const isComplete = percentage >= 100

    return (
      <div ref={ref} className={cn('w-full flex flex-col gap-1.5', className)} {...props}>
        {/* Label row */}
        {(showLabel || statusText) && (
          <div className="flex items-center justify-between">
            {showLabel && (
              <span className="text-[12px] font-medium text-brand-text-secondary tabular-nums">
                {percentage}%
              </span>
            )}
            {statusText && (
              <span className={`text-[12px] ml-auto ${variant === 'error' ? 'text-brand-error' : 'text-brand-text-muted'}`}>
                {statusText}
              </span>
            )}
          </div>
        )}

        {/* Track */}
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={statusText ?? `${percentage}% complete`}
          className={cn(
            'w-full rounded-full overflow-hidden',
            'bg-brand-surface-elevated border border-brand-border'
          )}
          style={{ height }}
        >
          {/* Fill */}
          <div
            className={cn(
              'h-full rounded-full',
              'transition-all ease-in-out',
              'duration-500',
              fillStyles[variant],
              // On completion: subtle bounce via animation
              isComplete && 'animate-completion-bounce'
            )}
            style={{
              width: `${percentage}%`,
              // Force hardware acceleration for smooth animation
              willChange: 'width',
            }}
          />
        </div>
      </div>
    )
  }
)

Progress.displayName = 'Progress'

export { Progress }
export default Progress
