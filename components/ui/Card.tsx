'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type CardVariant = 'default' | 'elevated' | 'outline'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Adds lift animation on hover */
  hoverable?: boolean
  /** If provided, adds interactive (pressable + cursor-pointer) styles */
  onClick?: React.MouseEventHandler<HTMLDivElement>
  children: React.ReactNode
  /** Override the internal content padding */
  noPadding?: boolean
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-1 pb-4 border-b border-brand-border', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

export function CardTitle({ className, children, as: Tag = 'h3', ...props }: CardTitleProps) {
  return (
    <Tag
      className={cn(
        'text-[15px] font-medium text-brand-text leading-snug',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn('text-[13px] text-brand-text-muted leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  )
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('pt-4', className)} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center pt-4 border-t border-brand-border mt-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// Variant styles
// ─────────────────────────────────────────────

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-brand-surface border border-brand-border',
  elevated: 'bg-brand-surface-elevated border border-brand-border',
  outline: 'bg-transparent border border-brand-border-strong',
}

// ─────────────────────────────────────────────
// Main Card Component
// ─────────────────────────────────────────────

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      hoverable = false,
      onClick,
      noPadding = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isInteractive = typeof onClick !== 'undefined'

    return (
      <div
        ref={ref}
        onClick={onClick}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
                }
              }
            : undefined
        }
        className={cn(
          // Base
          'rounded-card',
          // Variant
          variantStyles[variant],
          // Padding
          !noPadding && 'p-5',
          // Hover
          hoverable && 'card-hover',
          // Interactive
          isInteractive && [
            'cursor-pointer',
            'pressable',
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-brand-primary',
            'focus-visible:ring-offset-2',
            'focus-visible:ring-offset-brand-bg',
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card }
export default Card
