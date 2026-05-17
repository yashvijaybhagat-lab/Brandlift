'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Error message — triggers red border + shake + fade-in error text */
  error?: string
  /** Label text rendered above the input */
  label?: string
  /** Helper text rendered below in non-error states */
  helperText?: string
  /** Left-side adornment (icon, prefix text) */
  prefix?: React.ReactNode
  /** Right-side adornment (icon, button) */
  suffix?: React.ReactNode
  /** Controlled — lets parent trigger the shake externally */
  shaking?: boolean
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error,
      label,
      helperText,
      prefix,
      suffix,
      shaking,
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const hasError = Boolean(error)

    // Trigger shake animation when error first appears
    const [isShaking, setIsShaking] = React.useState(false)
    const prevError = React.useRef<string | undefined>(undefined)

    React.useEffect(() => {
      if (error && error !== prevError.current) {
        setIsShaking(true)
        const timer = setTimeout(() => setIsShaking(false), 420)
        return () => clearTimeout(timer)
      }
      prevError.current = error
    }, [error])

    React.useEffect(() => {
      if (shaking) {
        setIsShaking(true)
        const timer = setTimeout(() => setIsShaking(false), 420)
        return () => clearTimeout(timer)
      }
    }, [shaking])

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-brand-text-secondary"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div
          className={cn(
            'relative flex items-center w-full',
            'rounded-interactive',
            'bg-brand-surface',
            'border',
            // Border color
            hasError
              ? 'border-brand-error'
              : 'border-brand-border-strong',
            // Transition
            'transition-all duration-160',
            // Shake
            (isShaking || shaking) && 'shake',
            // Disabled
            disabled && 'opacity-50 cursor-not-allowed',
            // Focus within
            !hasError && 'focus-within:border-brand-primary focus-within:shadow-focus-indigo',
            hasError && 'focus-within:shadow-focus-error',
          )}
        >
          {/* Prefix */}
          {prefix && (
            <span className="flex-shrink-0 flex items-center pl-3 text-brand-text-muted">
              {prefix}
            </span>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              'flex-1 min-w-0 w-full',
              'bg-transparent',
              'text-[14px] text-brand-text',
              'placeholder:text-brand-text-muted',
              'py-2.5',
              prefix ? 'pl-2' : 'pl-3',
              suffix ? 'pr-2' : 'pr-3',
              'outline-none',
              'border-none',
              'ring-0',
              disabled && 'cursor-not-allowed',
              className
            )}
            {...props}
          />

          {/* Suffix */}
          {suffix && (
            <span className="flex-shrink-0 flex items-center pr-3 text-brand-text-muted">
              {suffix}
            </span>
          )}
        </div>

        {/* Error message */}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            className={cn(
              'text-[12px] text-brand-error',
              'animate-[slide-up_200ms_cubic-bezier(0.23,1,0.32,1)_forwards]',
            )}
          >
            {error}
          </p>
        )}

        {/* Helper text — only shown when no error */}
        {helperText && !hasError && (
          <p id={helperId} className="text-[12px] text-brand-text-muted">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
export default Input
