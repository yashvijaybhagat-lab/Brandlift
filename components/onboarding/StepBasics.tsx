'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StepBasicsData {
  businessName: string
  email: string
  address: string
  description: string
  audience: string
  location: string
}

interface StepBasicsProps {
  onComplete: (data: StepBasicsData) => void
}

interface SubQuestion {
  id: keyof StepBasicsData
  question: string
  placeholder: string
  type: 'input' | 'textarea'
  maxLength?: number
  hint?: string
}

// ─────────────────────────────────────────────
// Sub-questions config
// ─────────────────────────────────────────────

const SUB_QUESTIONS: SubQuestion[] = [
  {
    id: 'businessName',
    question: "What's your business called?",
    placeholder: "e.g. Maria's Bakehouse",
    type: 'input',
  },
  {
    id: 'email',
    question: "What's your business email?",
    placeholder: 'e.g. hello@mariabakehouse.com',
    type: 'input',
    hint: "We'll send your content ideas and reports here",
  },
  {
    id: 'address',
    question: "What's your business address?",
    placeholder: 'e.g. 123 Main St, Austin, TX 78701',
    type: 'input',
    hint: 'Used to tailor local content for your area',
  },
  {
    id: 'description',
    question: 'What do you do in one sentence?',
    placeholder: 'e.g. We bake handmade sourdough bread...',
    type: 'textarea',
    maxLength: 120,
    hint: 'Keep it short and specific',
  },
  {
    id: 'audience',
    question: "Who's your typical customer?",
    placeholder: 'Families in the neighborhood, young professionals...',
    type: 'input',
  },
]

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function StepBasics({ onComplete }: StepBasicsProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [values, setValues] = useState<StepBasicsData>({
    businessName: '',
    email: '',
    address: '',
    description: '',
    audience: '',
    location: '',
  })
  const [phase, setPhase] = useState<'idle' | 'exiting' | 'entering'>('idle')
  const [charCount, setCharCount] = useState(0)

  // AI description rewrite
  const [isStreaming, setIsStreaming] = useState(false)
  const descriptionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamingRef = useRef(false)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const q = SUB_QUESTIONS[currentQ]

  // Focus input on mount and question change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (q.type === 'input') {
        inputRef.current?.focus()
      } else {
        textareaRef.current?.focus()
      }
    }, 270)
    return () => clearTimeout(timer)
  }, [currentQ, q.type])

  // Debounced AI description validation
  const triggerDescriptionValidate = useCallback(
    (value: string, businessName: string) => {
      if (descriptionDebounceRef.current) {
        clearTimeout(descriptionDebounceRef.current)
      }
      descriptionDebounceRef.current = setTimeout(async () => {
        if (!value.trim() || value.length < 10) return
        if (streamingRef.current) return

        streamingRef.current = true
        setIsStreaming(true)

        try {
          const res = await fetch('/api/onboard/validate-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: value, businessName }),
          })

          if (!res.ok || !res.body) return

          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let improved = ''

          // Start with empty, stream character by character
          setValues((prev) => ({ ...prev, description: '' }))

          while (true) {
            const { done, value: chunk } = await reader.read()
            if (done) break
            const text = decoder.decode(chunk, { stream: true })
            improved += text
            setValues((prev) => ({ ...prev, description: improved }))
          }
        } catch {
          // silently fail — leave original text in place
        } finally {
          streamingRef.current = false
          setIsStreaming(false)
        }
      }, 1200)
    },
    []
  )

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { value } = e.target
    setValues((prev) => ({ ...prev, [q.id]: value }))

    if (q.id === 'description') {
      setCharCount(value.length)
      if (!streamingRef.current) {
        triggerDescriptionValidate(value, values.businessName)
      }
    }
  }

  const advanceQuestion = () => {
    const currentValue = values[q.id].trim()
    if (!currentValue) return

    if (currentQ === SUB_QUESTIONS.length - 1) {
      // Done — call onComplete
      onComplete(values)
      return
    }

    // Animate out → then next question slides in
    setPhase('exiting')
    setTimeout(() => {
      setCurrentQ((prev) => prev + 1)
      setCharCount(0)
      setPhase('entering')
      setTimeout(() => setPhase('idle'), 260)
    }, 180)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (q.type === 'textarea' && e.shiftKey) return // allow shift+enter in textarea
      if (q.type === 'textarea' && !e.shiftKey) {
        e.preventDefault()
      }
      advanceQuestion()
    }
  }

  const cardStyle: React.CSSProperties = {
    transition:
      'opacity 180ms cubic-bezier(0.23,1,0.32,1), transform 180ms cubic-bezier(0.23,1,0.32,1)',
    opacity: phase === 'exiting' ? 0 : 1,
    transform:
      phase === 'exiting'
        ? 'translateX(-16px)'
        : phase === 'entering'
          ? 'translateX(16px)'
          : 'translateX(0)',
  }

  // When entering, we apply a separate entering style so it springs in
  const enteringStyle: React.CSSProperties =
    phase === 'entering'
      ? {
          transition:
            'opacity 260ms cubic-bezier(0.23,1,0.32,1), transform 260ms cubic-bezier(0.23,1,0.32,1)',
          opacity: 0,
          transform: 'translateX(16px)',
        }
      : {}

  const combinedStyle =
    phase === 'entering' ? enteringStyle : cardStyle

  const currentValue = values[q.id]
  const canAdvance = currentValue.trim().length > 0

  return (
    <div className="w-full max-w-lg mx-auto" style={combinedStyle}>
      {/* Question */}
      <h2
        className="text-[22px] font-[600] tracking-tight text-brand-text mb-4"
        style={{ letterSpacing: '-0.02em' }}
      >
        {q.question}
      </h2>

      {/* Input area */}
      <div className="mb-6">
        {q.type === 'input' ? (
          <input
            ref={inputRef}
            value={currentValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={q.placeholder}
            className={cn(
              'w-full rounded-xl px-4 py-3',
              'text-[15px] font-[400] text-brand-text',
              'placeholder:text-brand-text-muted/50',
              'outline-none',
              'transition-all duration-160',
              'caret-brand-primary'
            )}
            style={{
              background: 'rgba(24,24,28,0.7)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              letterSpacing: '-0.01em',
              lineHeight: 1.5,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.5)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 92, 255,0.1), 0 1px 3px rgba(0,0,0,0.2)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'
            }}
          />
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={currentValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={q.placeholder}
              rows={3}
              maxLength={q.maxLength}
              className={cn(
                'w-full rounded-xl px-4 py-3',
                'text-[15px] font-[400] text-brand-text resize-none',
                'placeholder:text-brand-text-muted/50',
                'outline-none',
                'transition-all duration-160',
                'caret-brand-primary',
                isStreaming && 'text-brand-primary'
              )}
              style={{
                background: 'rgba(24,24,28,0.7)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                letterSpacing: '-0.01em',
                lineHeight: 1.6,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.5)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 92, 255,0.1), 0 1px 3px rgba(0,0,0,0.2)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'
              }}
            />
            {/* Char count */}
            {q.maxLength && (
              <span
                className={cn(
                  'absolute bottom-3 right-3 text-[11px] tabular-nums',
                  charCount > (q.maxLength * 0.9)
                    ? 'text-brand-warning'
                    : 'text-brand-text-muted'
                )}
              >
                {charCount}/{q.maxLength}
              </span>
            )}
          </div>
        )}

        {/* Hint */}
        {q.hint && (
          <p className="mt-2 text-[13px] text-brand-text-muted">{q.hint}</p>
        )}
      </div>

      {/* Continue button */}
      <div className="flex justify-end">
        <Button
          onClick={advanceQuestion}
          disabled={!canAdvance}
          size="lg"
          variant="primary"
          className="min-w-[140px]"
        >
          {currentQ === SUB_QUESTIONS.length - 1 ? 'Finish →' : 'Continue →'}
        </Button>
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 mt-10">
        {SUB_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full transition-all duration-280',
              i === currentQ
                ? 'w-4 h-1.5 bg-brand-primary'
                : i < currentQ
                  ? 'w-1.5 h-1.5 bg-brand-primary/40'
                  : 'w-1.5 h-1.5 bg-brand-border-strong'
            )}
          />
        ))}
      </div>
    </div>
  )
}
