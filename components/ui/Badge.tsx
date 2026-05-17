import * as React from 'react'
import { cn } from '@/lib/cn'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'trending' | 'platform'
type PlatformType = 'tiktok' | 'instagram' | 'youtube' | 'website' | 'google'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  platform?: PlatformType
  children?: React.ReactNode
}

// ─────────────────────────────────────────────
// Variant styles
// ─────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-brand-surface-elevated text-brand-text-secondary border border-brand-border-strong',
  success: 'bg-[rgba(74,222,128,0.12)] text-brand-success border border-[rgba(74,222,128,0.2)]',
  warning: 'bg-[rgba(251,191,36,0.12)] text-brand-warning border border-[rgba(251,191,36,0.2)]',
  error: 'bg-[rgba(248,113,113,0.12)] text-brand-error border border-[rgba(248,113,113,0.2)]',
  trending: [
    'bg-gradient-to-r from-[rgba(245,166,35,0.15)] to-[rgba(232,130,92,0.15)]',
    'text-brand-primary',
    'border border-[rgba(245,166,35,0.25)]',
  ].join(' '),
  platform: '', // handled by platformStyles
}

// ─────────────────────────────────────────────
// Platform-specific styles
// ─────────────────────────────────────────────

const platformStyles: Record<PlatformType, string> = {
  tiktok: 'bg-black text-white border border-white/10',
  instagram: 'bg-[rgba(225,48,108,0.15)] text-[#E1306C] border border-[rgba(225,48,108,0.25)]',
  youtube: 'bg-[rgba(255,0,0,0.12)] text-[#FF4444] border border-[rgba(255,0,0,0.2)]',
  website: 'bg-brand-surface-elevated text-brand-primary border border-[rgba(245,166,35,0.3)]',
  google: 'bg-[rgba(66,133,244,0.12)] text-[#4285F4] border border-[rgba(66,133,244,0.2)]',
}

// ─────────────────────────────────────────────
// Platform icons (SVG paths, inline)
// ─────────────────────────────────────────────

const platformLabels: Record<PlatformType, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  website: 'Website',
  google: 'Google',
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', platform, className, children, ...props }, ref) => {
    const isPlatformVariant = variant === 'platform' && platform

    const resolvedStyles = isPlatformVariant
      ? platformStyles[platform]
      : variantStyles[variant]

    return (
      <span
        ref={ref}
        className={cn(
          // Base
          'inline-flex items-center gap-1',
          'text-[12px] font-medium',
          'rounded-pill',
          'px-2.5 py-0.5',
          'whitespace-nowrap',
          'leading-none',
          // Resolved variant
          resolvedStyles,
          className
        )}
        {...props}
      >
        {isPlatformVariant && platform && (
          <PlatformDot platform={platform} />
        )}
        {isPlatformVariant && platform && !children
          ? platformLabels[platform]
          : children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// ─────────────────────────────────────────────
// Platform dot indicator
// ─────────────────────────────────────────────

function PlatformDot({ platform }: { platform: PlatformType }) {
  const dotColors: Record<PlatformType, string> = {
    tiktok: 'bg-white',
    instagram: 'bg-[#E1306C]',
    youtube: 'bg-[#FF4444]',
    website: 'bg-brand-primary',
    google: 'bg-[#4285F4]',
  }

  return (
    <span
      className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[platform])}
      aria-hidden="true"
    />
  )
}

export { Badge }
export default Badge
