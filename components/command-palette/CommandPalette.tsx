'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useCommandPalette } from './CommandPaletteProvider'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CommandPaletteProps {
  currentPage?: string
}

// ─────────────────────────────────────────────
// Context-aware suggestion chips
// ─────────────────────────────────────────────

const DEFAULT_SUGGESTIONS = [
  'Generate 5 video ideas for this week',
  'What should I post tomorrow?',
  'How do I improve my content score?',
  'Write a caption for my latest video',
]

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard/videos': [
    'Suggest best caption for my latest video',
    'What format works best for TikTok?',
    'How can I repurpose this video for Instagram?',
    'Generate a script for a 60-second reel',
  ],
  '/dashboard/website': [
    'Write a compelling headline for my business',
    'Suggest a color palette for my brand',
    'What should my CTA button say?',
    'Write an about section for my business',
  ],
  '/dashboard/ideas': [
    'Give me 10 trending content ideas',
    'What hashtags should I use?',
    'What is my best performing content type?',
    'Plan my content calendar for next week',
  ],
}

// ─────────────────────────────────────────────
// Simulated AI responses per query type
// ─────────────────────────────────────────────

function generateResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('video idea') || lower.includes('ideas')) {
    return `Here are 5 video ideas tailored for your business this week:\n\n1. Behind-the-scenes: Show how you prepare your products or services each morning — authenticity builds trust.\n\n2. Customer story: Film a 30-second testimonial with a happy customer (with their permission).\n\n3. "Did you know?" tip: Share one surprising fact about your industry that your customers would find useful.\n\n4. Day-in-the-life: Follow your workday from open to close — humanizes your brand.\n\n5. Before & after: Show a transformation your service creates. Works especially well for service businesses.`
  }

  if (lower.includes('post tomorrow') || lower.includes('what should')) {
    return `Based on your business profile and typical engagement patterns, tomorrow is a great day to post a quick tip or how-to video. Tuesdays and Wednesdays between 9–11am tend to see the highest reach for local service businesses.\n\nI'd recommend a 30–45 second video showing one specific thing you do really well — keep it focused, end with a clear call to action like "Book a free consult" or "Visit us this week."`
  }

  if (lower.includes('content score') || lower.includes('improve')) {
    return `Your content score is at 74/100 — here's how to push it higher:\n\n• **Consistency** — posting 4–5x/week instead of 2–3x would give you a significant boost.\n• **Video length** — your best-performing content is under 45 seconds. Lean into that.\n• **Captions** — adding text overlays to your videos increases watch time by ~40%.\n• **Respond to comments** within the first hour of posting — platform algorithms reward early engagement.\n\nWant me to generate a posting schedule for the next 2 weeks?`
  }

  if (lower.includes('caption')) {
    return `Here are 3 caption options for your latest video:\n\n**Option 1 (Conversational):**\nThe little details matter. Here's how we make sure every order is perfect — and why our customers keep coming back. 🙌\n\n**Option 2 (Direct + CTA):**\nThis is exactly what happens behind the scenes before your order ships. Want to experience it yourself? Link in bio.\n\n**Option 3 (Question hook):**\nEver wondered what goes into making this? Now you know. Drop a ❤️ if this kind of content is useful.`
  }

  if (lower.includes('headline') || lower.includes('tagline')) {
    return `Here are 5 headline options based on your business:\n\n1. "Quality You Can See. Service You'll Remember."\n2. "The [City] Choice for [Service] — Done Right, Every Time."\n3. "From Our Hands to Your Hands — Built with Care."\n4. "Where Good Work Speaks for Itself."\n5. "Your [Service] Problem, Solved Today."\n\nI'd recommend option 2 or 4 for their specificity and emotional resonance. Want me to customize any of these for your exact business?`
  }

  // Default
  return `Great question. Based on your BrandLift profile and current business data, here's my recommendation:\n\nFocus on what makes your business unique and communicate it consistently across every platform. The most effective content for small businesses is authentic, specific, and speaks directly to the problems your customers are trying to solve.\n\nWould you like me to help you craft specific content, analyze your current performance, or plan your next campaign?`
}

// ─────────────────────────────────────────────
// Action buttons that appear after a response
// ─────────────────────────────────────────────

interface ActionButton {
  label: string
  href?: string
}

function inferActions(message: string): ActionButton[] {
  const lower = message.toLowerCase()
  if (lower.includes('video')) return [{ label: 'Open Videos →', href: '/dashboard/videos' }]
  if (lower.includes('idea')) return [{ label: 'See Content Ideas →', href: '/dashboard/ideas' }]
  if (lower.includes('website') || lower.includes('headline')) return [{ label: 'Edit Website →', href: '/dashboard/website' }]
  return []
}

// ─────────────────────────────────────────────
// Keyboard shortcut hint
// ─────────────────────────────────────────────

function KbdHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.12)',
        color: '#71717A',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </kbd>
  )
}

// ─────────────────────────────────────────────
// Focus trap hook
// ─────────────────────────────────────────────

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  React.useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusable = container.querySelectorAll<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"]), a[href]'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    container.addEventListener('keydown', trap)
    // Auto-focus the first focusable element
    first?.focus()

    return () => container.removeEventListener('keydown', trap)
  }, [isActive, containerRef])
}

// ─────────────────────────────────────────────
// Main CommandPalette component
// ─────────────────────────────────────────────

export function CommandPalette({ currentPage }: CommandPaletteProps) {
  const { isOpen, close } = useCommandPalette()

  const [query, setQuery] = React.useState('')
  const [streamedText, setStreamedText] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [streamDone, setStreamDone] = React.useState(false)
  const [actions, setActions] = React.useState<ActionButton[]>([])

  const panelRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const streamTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  useFocusTrap(panelRef, isOpen)

  // Suggestions: prefer page-specific, fall back to defaults
  const suggestions: string[] =
    (currentPage ? PAGE_SUGGESTIONS[currentPage] : null) ?? DEFAULT_SUGGESTIONS

  // Reset state when closed
  React.useEffect(() => {
    if (!isOpen) {
      // Delay reset until exit animation finishes
      const t = setTimeout(() => {
        setQuery('')
        setStreamedText('')
        setIsStreaming(false)
        setStreamDone(false)
        setActions([])
      }, 250)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Esc to close
  React.useEffect(() => {
    if (!isOpen) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [isOpen, close])

  // Cleanup stream on unmount / close
  React.useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current)
    }
  }, [])

  const submitQuery = React.useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming) return

      const fullResponse = generateResponse(text)
      const detectedActions = inferActions(text)

      setStreamedText('')
      setIsStreaming(true)
      setStreamDone(false)
      setActions([])

      let charIndex = 0

      if (streamTimerRef.current) clearInterval(streamTimerRef.current)

      streamTimerRef.current = setInterval(() => {
        charIndex++
        setStreamedText(fullResponse.slice(0, charIndex))

        if (charIndex >= fullResponse.length) {
          clearInterval(streamTimerRef.current!)
          setIsStreaming(false)
          setStreamDone(true)
          setActions(detectedActions)
        }
      }, 12) // ~12ms per char — feels fast but readable
    },
    [isStreaming]
  )

  const handleInputKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && query.trim()) {
        submitQuery(query)
      }
    },
    [query, submitQuery]
  )

  const handleChipClick = React.useCallback(
    (chip: string) => {
      setQuery(chip)
      // Submit immediately
      setTimeout(() => submitQuery(chip), 0)
    },
    [submitQuery]
  )

  const showSuggestions = !streamedText && !isStreaming
  const hasResponse = streamedText.length > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={close}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="AI assistant — command palette"
            className="fixed left-1/2 z-50 w-full"
            style={{
              top: '20%',
              maxWidth: 512,
              x: '-50%',
            }}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{
              duration: 0.2,
              ease: [0.23, 1, 0.32, 1],
            }}
            // transform-origin: top center
            transformTemplate={({ scale, y }) =>
              `translateX(-50%) translateY(${y}) scale(${scale})`
            }
          >
            <div
              className="mx-4 overflow-hidden"
              style={{
                background: '#18181C',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
              {/* Search input row */}
              <div
                className="flex items-center gap-3 px-4"
                style={{
                  borderBottom: hasResponse || isStreaming
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid transparent',
                  transition: 'border-color 200ms',
                }}
              >
                {/* Search icon */}
                <svg
                  className="flex-shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10ZM14 14l-3-3"
                    stroke="#71717A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>

                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ask anything about your content, videos, or business..."
                  aria-label="Ask the AI assistant"
                  className="flex-1 bg-transparent outline-none border-none ring-0 py-4"
                  style={{
                    fontSize: 16,
                    color: '#FAFAFA',
                    caretColor: '#F5A623',
                  }}
                />

                {/* Amber focus ring on the container — handled via box-shadow from globals */}
                {isStreaming && (
                  <span
                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#F5A623',
                      animation: 'amberCursorBlink 1s ease-in-out infinite',
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Body */}
              <div className="px-4 pb-4">
                {/* Suggestion chips — shown when empty */}
                {showSuggestions && (
                  <div className="pt-4">
                    <p
                      className="text-[12px] font-medium mb-2.5"
                      style={{ color: '#71717A', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                    >
                      Suggestions
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {suggestions.map((chip, i) => (
                        <button
                          key={chip}
                          onClick={() => handleChipClick(chip)}
                          className="text-left px-3 py-2 rounded-[8px] text-[13px] w-full outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '0.5px solid rgba(255,255,255,0.08)',
                            color: '#A1A1AA',
                            cursor: 'pointer',
                            transition: 'border-color 150ms, color 150ms, background 150ms',
                            opacity: 0,
                            animation: `chipIn 250ms cubic-bezier(0.23,1,0.32,1) ${i * 40}ms forwards`,
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget
                            el.style.borderColor = 'rgba(245,166,35,0.4)'
                            el.style.color = '#FAFAFA'
                            el.style.background = 'rgba(245,166,35,0.05)'
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget
                            el.style.borderColor = 'rgba(255,255,255,0.08)'
                            el.style.color = '#A1A1AA'
                            el.style.background = 'rgba(255,255,255,0.03)'
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Streamed response */}
                {(isStreaming || hasResponse) && (
                  <div className="pt-4">
                    <div
                      className="text-[15px] leading-relaxed whitespace-pre-wrap"
                      style={{ color: '#A1A1AA' }}
                      aria-live="polite"
                      aria-label="AI response"
                    >
                      {streamedText}
                      {/* Amber cursor — blinks at end while streaming */}
                      {isStreaming && (
                        <span
                          aria-hidden="true"
                          style={{
                            display: 'inline-block',
                            width: 2,
                            height: '1em',
                            background: '#F5A623',
                            marginLeft: 2,
                            verticalAlign: 'text-bottom',
                            animation: 'amberCursorBlink 900ms ease-in-out infinite',
                          }}
                        />
                      )}
                    </div>

                    {/* Action buttons — appear after streaming ends */}
                    {streamDone && actions.length > 0 && (
                      <div
                        className="flex flex-wrap gap-2 mt-4"
                        style={{
                          opacity: 0,
                          animation: 'chipIn 250ms cubic-bezier(0.23,1,0.32,1) 100ms forwards',
                        }}
                      >
                        {actions.map((action) => (
                          <a
                            key={action.label}
                            href={action.href ?? '#'}
                            onClick={() => close()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium"
                            style={{
                              background: 'rgba(245,166,35,0.1)',
                              border: '0.5px solid rgba(245,166,35,0.3)',
                              color: '#F5A623',
                              textDecoration: 'none',
                              transition: 'background 150ms, border-color 150ms',
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget
                              el.style.background = 'rgba(245,166,35,0.18)'
                              el.style.borderColor = 'rgba(245,166,35,0.5)'
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget
                              el.style.background = 'rgba(245,166,35,0.1)'
                              el.style.borderColor = 'rgba(245,166,35,0.3)'
                            }}
                          >
                            {action.label}
                          </a>
                        ))}

                        {/* Ask another question */}
                        <button
                          onClick={() => {
                            setStreamedText('')
                            setStreamDone(false)
                            setActions([])
                            setQuery('')
                            inputRef.current?.focus()
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px]"
                          style={{
                            background: 'transparent',
                            border: '0.5px solid rgba(255,255,255,0.1)',
                            color: '#71717A',
                            cursor: 'pointer',
                            transition: 'border-color 150ms, color 150ms',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                            e.currentTarget.style.color = '#A1A1AA'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                            e.currentTarget.style.color = '#71717A'
                          }}
                        >
                          Ask another
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: '#71717A' }}>
                  <KbdHint>↩</KbdHint> to submit
                </span>
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: '#71717A' }}>
                  <KbdHint>esc</KbdHint> to close
                </span>
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: '#71717A' }}>
                  <KbdHint>⌘K</KbdHint> to toggle
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Keyframes for cursor blink + chip stagger */}
      <style>{`
        @keyframes amberCursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes chipIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes amberCursorBlink { 0%, 100% { opacity: 1; } }
          @keyframes chipIn { from { opacity: 1; transform: none; } }
        }
      `}</style>
    </AnimatePresence>
  )
}

export default CommandPalette
