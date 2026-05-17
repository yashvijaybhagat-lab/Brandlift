'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StepServicesData {
  services: string[]
  differentiator: string
}

interface StepServicesProps {
  businessType?: string
  onComplete: (data: StepServicesData) => void
}

interface ServiceCard {
  emoji: string
  name: string
  category: string
}

// ─────────────────────────────────────────────
// Static service categories
// ─────────────────────────────────────────────

const ALL_SERVICES: ServiceCard[] = [
  { emoji: '🍽️', name: 'Restaurant & Food', category: 'restaurant' },
  { emoji: '✂️', name: 'Barbershop & Salon', category: 'barbershop' },
  { emoji: '💪', name: 'Fitness & Wellness', category: 'fitness' },
  { emoji: '🛍️', name: 'Retail & Shop', category: 'retail' },
  { emoji: '🏠', name: 'Home Services', category: 'home services' },
  { emoji: '🎨', name: 'Creative & Design', category: 'creative' },
  { emoji: '🏥', name: 'Health & Medical', category: 'health' },
  { emoji: '📚', name: 'Education & Tutoring', category: 'education' },
  { emoji: '🚗', name: 'Automotive', category: 'automotive' },
  { emoji: '🐾', name: 'Pet Care', category: 'pet care' },
  { emoji: '💅', name: 'Beauty & Aesthetics', category: 'beauty' },
  { emoji: '🏡', name: 'Real Estate', category: 'real estate' },
]

// Simulated streaming insight
const MOCK_INSIGHTS: string[] = [
  'Your standout factor is the personal touch — customers will choose you for the relationship, not just the service.',
  'You offer what big chains can\'t: local expertise and genuine care that keeps people coming back.',
  'Your edge is authenticity — people in your area trust what you\'ve built because it\'s real.',
  'What makes you different translates into loyalty — customers who try you once tend to stay.',
]

// ─────────────────────────────────────────────
// Service card component
// ─────────────────────────────────────────────

interface ServiceCardProps {
  service: ServiceCard
  selected: boolean
  onToggle: () => void
  index: number
}

function ServiceCardItem({ service, selected, onToggle, index }: ServiceCardProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative flex flex-col items-start gap-2 p-4 rounded-card text-left',
        'border transition-all duration-160',
        'active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg',
        selected
          ? 'border-brand-primary bg-brand-primary-muted'
          : 'border-brand-border-strong bg-brand-surface hover:border-brand-border-strong hover:bg-brand-surface-elevated',
        'opacity-0 animate-[stagger-in_280ms_cubic-bezier(0.23,1,0.32,1)_forwards]'
      )}
      style={{
        animationDelay: `${index * 55}ms`,
      }}
      aria-pressed={selected}
    >
      {/* Checkmark badge */}
      {selected && (
        <span
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center"
          style={{
            animation: 'checkIn 180ms cubic-bezier(0.23,1,0.32,1) forwards',
          }}
          aria-hidden="true"
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="#0A0A0B"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}

      <span className="text-2xl leading-none" aria-hidden="true">
        {service.emoji}
      </span>
      <span
        className={cn(
          'text-[14px] font-[500] leading-snug',
          selected ? 'text-brand-text' : 'text-brand-text-secondary'
        )}
      >
        {service.name}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function StepServices({ onComplete }: StepServicesProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [differentiator, setDifferentiator] = useState('')
  const [streamedInsight, setStreamedInsight] = useState('')
  const [showInsight, setShowInsight] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const insightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const toggleService = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  // Simulated streaming insight
  const triggerInsightStream = (value: string) => {
    if (value.trim().length < 15) {
      setShowInsight(false)
      setStreamedInsight('')
      return
    }

    if (insightDebounceRef.current) clearTimeout(insightDebounceRef.current)
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)

    insightDebounceRef.current = setTimeout(() => {
      const insight = MOCK_INSIGHTS[Math.floor(Math.random() * MOCK_INSIGHTS.length)]
      setIsStreaming(true)
      setShowInsight(true)
      setStreamedInsight('')

      let i = 0
      streamIntervalRef.current = setInterval(() => {
        i++
        setStreamedInsight(insight.slice(0, i))
        if (i >= insight.length) {
          clearInterval(streamIntervalRef.current!)
          setIsStreaming(false)
        }
      }, 18)
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (insightDebounceRef.current) clearTimeout(insightDebounceRef.current)
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
    }
  }, [])

  const handleDifferentiatorChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setDifferentiator(e.target.value)
    triggerInsightStream(e.target.value)
  }

  const handleComplete = () => {
    onComplete({
      services: Array.from(selected),
      differentiator,
    })
  }

  const canContinue = selected.size > 0

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Part A: Service categories */}
      <div className="mb-10">
        <h2
          className="text-[32px] font-[500] tracking-tight text-brand-text mb-2"
          style={{ letterSpacing: '-0.02em' }}
        >
          What do you offer?
        </h2>
        <p className="text-[14px] text-brand-text-muted mb-6">
          Select everything that applies — you can always add more later.
        </p>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          {ALL_SERVICES.map((service, i) => (
            <ServiceCardItem
              key={service.category}
              service={service}
              selected={selected.has(service.name)}
              onToggle={() => toggleService(service.name)}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* Part B: Differentiator */}
      <div className="mb-8">
        <label
          htmlFor="differentiator"
          className="block text-[14px] font-[500] text-brand-text-secondary mb-3"
        >
          What makes you different from competitors?
        </label>
        <textarea
          id="differentiator"
          value={differentiator}
          onChange={handleDifferentiatorChange}
          rows={3}
          placeholder="We use only locally-sourced ingredients and our owner is on-site every day..."
          className={cn(
            'w-full bg-brand-surface border border-brand-border-strong',
            'rounded-card px-4 py-3',
            'text-[14px] text-brand-text',
            'placeholder:text-brand-text-muted',
            'resize-none outline-none',
            'transition-colors duration-160',
            'focus:border-brand-primary focus:shadow-focus-indigo',
            'caret-brand-primary'
          )}
        />

        {/* AI insight card — streams in */}
        <div
          className={cn(
            'mt-3 overflow-hidden',
            'transition-all duration-200',
            showInsight ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none h-0'
          )}
          style={{
            transition: 'opacity 200ms cubic-bezier(0.23,1,0.32,1), transform 200ms cubic-bezier(0.23,1,0.32,1)',
          }}
          aria-live="polite"
          aria-label="AI insight"
        >
          {showInsight && (
            <div className="bg-brand-surface-elevated border-l-2 border-brand-primary rounded-r-card px-4 py-3">
              <p className="text-[11px] font-[500] text-brand-text-muted uppercase tracking-widest mb-1.5">
                Your key advantage:
              </p>
              <p className="text-[14px] text-brand-text leading-relaxed">
                {streamedInsight}
                {isStreaming && (
                  <span
                    className="inline-block w-0.5 h-3.5 bg-brand-primary ml-0.5 align-middle"
                    style={{ animation: 'blink 1s step-end infinite' }}
                    aria-hidden="true"
                  />
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Continue */}
      <div className="flex justify-end">
        <Button
          onClick={handleComplete}
          disabled={!canContinue}
          size="lg"
          variant="primary"
        >
          Continue →
        </Button>
      </div>

      {/* Inline keyframes for checkmark and cursor blink */}
      <style>{`
        @keyframes checkIn {
          from { transform: scale(0.4); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
