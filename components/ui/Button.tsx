'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** If true, button fills the width of its container */
  fullWidth?: boolean
  children: React.ReactNode
}

// ─────────────────────────────────────────────
// Loading Dots
// ─────────────────────────────────────────────

function LoadingDots() {
  return (
    <span className="loading-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

// ─────────────────────────────────────────────
// Variant styles
// ─────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-br from-brand-primary to-brand-primary-hover',
    'text-[#0A0A0B]',
    'border border-transparent',
    'shadow-sm',
    'hover:brightness-105',
    'focus-visible:shadow-focus-amber',
  ].join(' '),

  secondary: [
    'bg-brand-surface',
    'text-brand-text-secondary',
    'border border-brand-border-strong',
    'hover:bg-brand-surface-elevated',
    'hover:text-brand-text',
    'hover:border-brand-border-strong',
    'focus-visible:shadow-focus-amber',
  ].join(' '),

  ghost: [
    'bg-transparent',
    'text-brand-text-secondary',
    'border border-transparent',
    'hover:bg-brand-surface',
    'hover:text-brand-text',
    'hover:border-brand-border',
    'focus-visible:shadow-focus-amber',
  ].join(' '),

  danger: [
    'bg-[rgba(248,113,113,0.12)]',
    'text-brand-error',
    'border border-[rgba(248,113,113,0.2)]',
    'hover:bg-[rgba(248,113,113,0.2)]',
    'hover:border-[rgba(248,113,113,0.35)]',
    'focus-visible:shadow-focus-error',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[8px]',
  md: 'h-9 px-4 text-[14px] gap-2 rounded-[8px]',
  lg: 'h-11 px-6 text-[15px] gap-2.5 rounded-[10px]',
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          // Base
          'inline-flex items-center justify-center',
          'font-medium font-sans',
          'select-none',
          'outline-none',
          'transition-all',
          'duration-130',
          // Variant
          variantStyles[variant],
          // Size
          sizeStyles[size],
          // Press effect
          'active:scale-[0.97]',
          'transition-transform duration-130',
          // Full width
          fullWidth && 'w-full',
          // Disabled
          isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {loading ? <LoadingDots /> : children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export default Button
