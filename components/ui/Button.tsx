'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/cn'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'default' | 'destructive' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Render as child element (Radix Slot — enables asChild pattern) */
  asChild?: boolean
  /** If true, button fills the width of its container */
  fullWidth?: boolean
  children?: React.ReactNode
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
    'focus-visible:shadow-focus-indigo',
  ].join(' '),
  // shadcn alias for primary
  default: [
    'bg-gradient-to-br from-brand-primary to-brand-primary-hover',
    'text-[#0A0A0B]',
    'border border-transparent',
    'shadow-sm',
    'hover:brightness-105',
    'focus-visible:shadow-focus-indigo',
  ].join(' '),

  secondary: [
    'bg-brand-surface',
    'text-brand-text-secondary',
    'border border-brand-border-strong',
    'hover:bg-brand-surface-elevated',
    'hover:text-brand-text',
    'hover:border-brand-border-strong',
    'focus-visible:shadow-focus-indigo',
  ].join(' '),

  outline: [
    'bg-transparent',
    'text-brand-text',
    'border border-brand-border-strong',
    'hover:bg-brand-surface',
    'hover:border-brand-border-strong',
    'focus-visible:shadow-focus-indigo',
  ].join(' '),

  ghost: [
    'bg-transparent',
    'text-brand-text-secondary',
    'border border-transparent',
    'hover:bg-brand-surface',
    'hover:text-brand-text',
    'hover:border-brand-border',
    'focus-visible:shadow-focus-indigo',
  ].join(' '),

  danger: [
    'bg-[rgba(248,113,113,0.12)]',
    'text-brand-error',
    'border border-[rgba(248,113,113,0.2)]',
    'hover:bg-[rgba(248,113,113,0.2)]',
    'hover:border-[rgba(248,113,113,0.35)]',
    'focus-visible:shadow-focus-error',
  ].join(' '),

  destructive: [
    'bg-[rgba(248,113,113,0.12)]',
    'text-brand-error',
    'border border-[rgba(248,113,113,0.2)]',
    'hover:bg-[rgba(248,113,113,0.2)]',
    'focus-visible:shadow-focus-error',
  ].join(' '),

  link: [
    'bg-transparent border-transparent underline-offset-4 hover:underline',
    'text-brand-primary',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[8px]',
  md: 'h-9 px-4 text-[14px] gap-2 rounded-[8px]',
  lg: 'h-11 px-6 text-[15px] gap-2.5 rounded-[10px]',
  icon: 'h-10 w-10 rounded-[8px]',
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
      asChild = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading

    return (
      <Comp
        ref={ref}
        disabled={asChild ? undefined : isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center',
          'font-medium font-sans',
          'select-none',
          'outline-none',
          'transition-all',
          'duration-130',
          variantStyles[variant],
          sizeStyles[size],
          'active:scale-[0.97]',
          'transition-transform duration-130',
          fullWidth && 'w-full',
          isDisabled && !asChild && 'opacity-40 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {loading ? <LoadingDots /> : children}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export default Button
