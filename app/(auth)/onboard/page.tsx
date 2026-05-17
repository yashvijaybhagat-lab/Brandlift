'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { BusinessProfile } from '@/lib/claude'

import StepBasics, { StepBasicsData } from '@/components/onboarding/StepBasics'
import StepServices, { StepServicesData } from '@/components/onboarding/StepServices'
import StepTone, { StepToneData } from '@/components/onboarding/StepTone'
import StepUpload, { StepUploadData } from '@/components/onboarding/StepUpload'
import StepGenerating from '@/components/onboarding/StepGenerating'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type PartialBusinessProfile = Partial<BusinessProfile>

const TOTAL_STEPS = 5

// ─────────────────────────────────────────────
// Framer-motion variants
// ─────────────────────────────────────────────

// Forward (next step): exit left, enter from right
// Backward (prev step): exit right, enter from left
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -24 : 24,
    opacity: 0,
  }),
}

const stepTransition = {
  duration: 0.26,
  ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
}

// ─────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100

  return (
    <div
      className="w-full h-0.5 bg-brand-surface-elevated"
      role="progressbar"
      aria-valuenow={step + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${step + 1} of ${total}`}
    >
      <div
        className="h-full bg-brand-primary rounded-full"
        style={{
          width: `${pct}%`,
          transition: 'width 400ms ease-in-out',
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function OnboardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [businessProfile, setBusinessProfile] = useState<PartialBusinessProfile>({})

  const goNext = useCallback(() => {
    setDirection(1)
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }, [])

  const goBack = useCallback(() => {
    setDirection(-1)
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

  // Step completion handlers
  const handleBasicsComplete = useCallback(
    (data: StepBasicsData) => {
      setBusinessProfile((prev) => ({
        ...prev,
        businessName: data.businessName,
        description: data.description,
        audience: data.audience,
        location: data.location,
      }))
      goNext()
    },
    [goNext]
  )

  const handleServicesComplete = useCallback(
    (data: StepServicesData) => {
      setBusinessProfile((prev) => ({
        ...prev,
        services: data.services,
        differentiator: data.differentiator,
      }))
      goNext()
    },
    [goNext]
  )

  const handleToneComplete = useCallback(
    (data: StepToneData) => {
      setBusinessProfile((prev) => ({
        ...prev,
        tone: data.tone as BusinessProfile['tone'],
        platforms: data.platforms as BusinessProfile['platforms'],
      }))
      goNext()
    },
    [goNext]
  )

  const handleUploadComplete = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_data: StepUploadData) => {
      // files not persisted to profile — video processing is separate
      goNext()
    },
    [goNext]
  )

  const handleGeneratingComplete = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  // Determine if this is the generating step (no header/back)
  const isGenerating = currentStep === 4

  // Step renderer
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepBasics onComplete={handleBasicsComplete} />
      case 1:
        return (
          <StepServices
            businessType={businessProfile.businessName}
            onComplete={handleServicesComplete}
          />
        )
      case 2:
        return <StepTone onComplete={handleToneComplete} />
      case 3:
        return <StepUpload onComplete={handleUploadComplete} />
      case 4:
        return (
          <StepGenerating
            businessProfile={businessProfile}
            onComplete={handleGeneratingComplete}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Header — hidden during generating step */}
      {!isGenerating && (
        <header className="flex-shrink-0">
          {/* Progress bar — full width at top */}
          <ProgressBar step={currentStep} total={TOTAL_STEPS - 1} />

          {/* Nav row */}
          <div className="flex items-center justify-between px-6 py-4">
            {/* Logo */}
            <span className="text-[14px] font-[600] text-brand-primary tracking-tight">
              BrandLift
            </span>

            {/* Step counter */}
            <span className="text-[13px] text-brand-text-muted tabular-nums">
              {currentStep + 1} / {TOTAL_STEPS - 1}
            </span>
          </div>
        </header>
      )}

      {/* Main content */}
      <main
        className={cn(
          'flex-1 flex flex-col',
          isGenerating
            ? 'items-center justify-center'
            : 'items-center justify-center px-4 pb-8'
        )}
      >
        <div className={cn('w-full', !isGenerating && 'max-w-2xl mx-auto')}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="w-full"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Back link — shown when step > 0 and not generating */}
      {currentStep > 0 && !isGenerating && (
        <footer className="flex-shrink-0 flex items-center justify-center pb-8">
          <button
            onClick={goBack}
            className={cn(
              'text-[13px] text-brand-text-muted',
              'hover:text-brand-text transition-colors duration-160',
              'active:scale-[0.97] transition-transform duration-130',
              'flex items-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg rounded'
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 2L4 7L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>
        </footer>
      )}
    </div>
  )
}
