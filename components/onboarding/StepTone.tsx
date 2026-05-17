'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StepToneData {
  tone: string
  platforms: string[]
}

interface StepToneProps {
  onComplete: (data: StepToneData) => void
}

interface PersonalityCard {
  id: string
  emoji: string
  name: string
  description: string
}

interface PlatformOption {
  id: string
  label: string
  selectedColor: string
  selectedBg: string
  selectedBorder: string
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

const PERSONALITIES: PersonalityCard[] = [
  {
    id: 'bold',
    emoji: '💥',
    name: 'Bold & Direct',
    description: "You don't waste words. You deliver results.",
  },
  {
    id: 'warm',
    emoji: '🤝',
    name: 'Warm & Community-Focused',
    description: 'Your neighborhood, your people.',
  },
  {
    id: 'premium',
    emoji: '✨',
    name: 'Premium & Exclusive',
    description: 'Quality over everything.',
  },
  {
    id: 'fun',
    emoji: '🎉',
    name: 'Fun & Energetic',
    description: "Good vibes only. Life's too short.",
  },
  {
    id: 'expert',
    emoji: '📚',
    name: 'Expert & Educational',
    description: 'You teach while you sell.',
  },
  {
    id: 'authentic',
    emoji: '📱',
    name: 'Authentic & Raw',
    description: 'No polish needed. Real is better.',
  },
]

const PLATFORMS: PlatformOption[] = [
  {
    id: 'tiktok',
    label: 'TikTok',
    selectedColor: 'text-white',
    selectedBg: 'bg-black',
    selectedBorder: 'border-white/30',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    selectedColor: 'text-[#E1306C]',
    selectedBg: 'bg-[rgba(225,48,108,0.15)]',
    selectedBorder: 'border-[rgba(225,48,108,0.4)]',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    selectedColor: 'text-[#FF4444]',
    selectedBg: 'bg-[rgba(255,0,0,0.12)]',
    selectedBorder: 'border-[rgba(255,0,0,0.3)]',
  },
  {
    id: 'website',
    label: 'Website',
    selectedColor: 'text-brand-primary',
    selectedBg: 'bg-brand-primary-muted',
    selectedBorder: 'border-brand-primary/40',
  },
  {
    id: 'google',
    label: 'Google',
    selectedColor: 'text-[#4285F4]',
    selectedBg: 'bg-[rgba(66,133,244,0.12)]',
    selectedBorder: 'border-[rgba(66,133,244,0.3)]',
  },
]

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function StepTone({ onComplete }: StepToneProps) {
  const [selectedTone, setSelectedTone] = useState<string | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleComplete = () => {
    if (!selectedTone) return
    onComplete({
      tone: selectedTone,
      platforms: Array.from(selectedPlatforms),
    })
  }

  const canContinue = selectedTone !== null && selectedPlatforms.size > 0

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Part A: Personality */}
      <div className="mb-10">
        <h2
          className="text-[32px] font-[500] tracking-tight text-brand-text mb-2"
          style={{ letterSpacing: '-0.02em' }}
        >
          What's your brand personality?
        </h2>
        <p className="text-[14px] text-brand-text-muted mb-6">
          Pick the one that feels most like you. This shapes every piece of content we create.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PERSONALITIES.map((card, i) => {
            const isSelected = selectedTone === card.id
            return (
              <button
                key={card.id}
                onClick={() => setSelectedTone(card.id)}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex flex-col items-start gap-2 p-4 rounded-card text-left',
                  'border transition-all duration-160',
                  'active:scale-[0.97]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg',
                  isSelected
                    ? 'border-brand-primary bg-brand-primary-muted'
                    : 'border-brand-border-strong bg-brand-surface hover:bg-brand-surface-elevated',
                  'opacity-0 animate-[stagger-in_280ms_cubic-bezier(0.23,1,0.32,1)_forwards]'
                )}
                style={{
                  animationDelay: `${i * 60}ms`,
                }}
              >
                {/* Emoji */}
                <span
                  className="text-[32px] leading-none"
                  aria-hidden="true"
                >
                  {card.emoji}
                </span>

                {/* Name */}
                <span
                  className={cn(
                    'text-[15px] font-[500] leading-snug',
                    isSelected ? 'text-brand-text' : 'text-brand-text-secondary'
                  )}
                >
                  {card.name}
                </span>

                {/* Description */}
                <span className="text-[13px] text-brand-text-muted leading-snug">
                  {card.description}
                </span>

                {/* Selected indicator */}
                {isSelected && (
                  <span
                    className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center"
                    style={{
                      animation: 'toneCheckIn 180ms cubic-bezier(0.23,1,0.32,1) forwards',
                    }}
                    aria-hidden="true"
                  >
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path
                        d="M1 3L3 5L7 1"
                        stroke="#0A0A0B"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Part B: Platform preference */}
      <div className="mb-8">
        <h3 className="text-[16px] font-[500] text-brand-text mb-2">
          Where do you want to show up?
        </h3>
        <p className="text-[13px] text-brand-text-muted mb-4">
          Select all that apply. We'll tailor content for each platform.
        </p>

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => {
            const isSelected = selectedPlatforms.has(platform.id)
            return (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                aria-pressed={isSelected}
                className={cn(
                  'px-4 py-2 rounded-pill text-[14px] font-[500]',
                  'border transition-all duration-160',
                  'active:scale-[0.97]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg',
                  isSelected
                    ? cn(platform.selectedBg, platform.selectedColor, platform.selectedBorder)
                    : 'border-brand-border-strong bg-brand-surface text-brand-text-secondary hover:bg-brand-surface-elevated hover:text-brand-text'
                )}
              >
                {platform.label}
              </button>
            )
          })}
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

      <style>{`
        @keyframes toneCheckIn {
          from { transform: scale(0.4); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
