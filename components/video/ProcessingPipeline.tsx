'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PipelineStage {
  label: string
  progress: number
  complete: boolean
}

export interface ProcessingPipelineProps {
  stages: PipelineStage[]
  className?: string
}

// ─────────────────────────────────────────────
// Stage status indicator
// ─────────────────────────────────────────────

function StageIndicator({ progress, complete }: { progress: number; complete: boolean }) {
  const isInProgress = progress > 0 && !complete
  void (progress === 0 && !complete)

  if (complete) {
    return (
      <span
        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(74, 222, 128, 0.15)',
          border: '1px solid rgba(74, 222, 128, 0.3)',
        }}
        aria-label="Complete"
      >
        <svg
          className="checkmark-icon"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 5L4 7L8 3"
            stroke="#4ADE80"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  if (isInProgress) {
    return (
      <span
        className="flex-shrink-0 w-5 h-5 rounded-full"
        style={{
          border: '1.5px solid rgba(124, 92, 255, 0.2)',
          borderLeftColor: '#7C5CFF',
          animation: 'pipelineSpin 800ms linear infinite',
        }}
        aria-label="In progress"
        role="status"
      />
    )
  }

  // Pending
  return (
    <span
      className="flex-shrink-0 w-5 h-5 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      aria-label="Pending"
    />
  )
}

// ─────────────────────────────────────────────
// Single stage row
// ─────────────────────────────────────────────

function StageRow({ stage, index }: { stage: PipelineStage; index: number }) {
  const isActive = stage.progress > 0
  const [showPercent, setShowPercent] = React.useState(false)

  // Fade in percentage when stage becomes active
  React.useEffect(() => {
    if (isActive && !showPercent) {
      setShowPercent(true)
    }
  }, [isActive, showPercent])

  return (
    <div
      className="flex items-center gap-3"
      style={{
        opacity: 0,
        animation: `pipelineStaggerIn 300ms cubic-bezier(0.23,1,0.32,1) ${index * 60}ms forwards`,
      }}
    >
      {/* Status indicator */}
      <StageIndicator progress={stage.progress} complete={stage.complete} />

      {/* Label + bar */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[13px] font-medium truncate"
            style={{
              color: stage.complete
                ? '#4ADE80'
                : stage.progress > 0
                ? '#FAFAFA'
                : '#71717A',
              transition: 'color 300ms cubic-bezier(0.23,1,0.32,1)',
            }}
          >
            {stage.label}
          </span>

          {/* Percentage — fades in when stage becomes active */}
          <span
            className="text-[12px] tabular-nums flex-shrink-0"
            style={{
              color: stage.complete ? '#4ADE80' : '#7C5CFF',
              opacity: showPercent ? 1 : 0,
              transition: 'opacity 280ms cubic-bezier(0.23,1,0.32,1)',
            }}
            aria-live="polite"
          >
            {stage.complete ? '✓' : `${stage.progress}%`}
          </span>
        </div>

        {/* Progress bar track */}
        <div
          className="w-full h-[3px] rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          role="progressbar"
          aria-valuenow={stage.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${stage.label} — ${stage.progress}%`}
        >
          {/* Fill — CSS transition for smooth fill, not keyframes */}
          <div
            style={{
              height: '100%',
              borderRadius: 'inherit',
              background: stage.complete
                ? '#4ADE80'
                : 'linear-gradient(90deg, #7C5CFF 0%, #6A45F5 100%)',
              width: `${stage.progress}%`,
              transition: 'width 400ms ease-in-out, background 300ms cubic-bezier(0.23,1,0.32,1)',
              // Completion bounce — scale-x pulse when hitting 100%
              animation: stage.complete ? 'completionBounce 300ms cubic-bezier(0.23,1,0.32,1)' : undefined,
              transformOrigin: 'left center',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function ProcessingPipeline({ stages, className }: ProcessingPipelineProps) {
  const allComplete = stages.every((s) => s.complete)
  const completedCount = stages.filter((s) => s.complete).length

  return (
    <>
      {/* Scoped keyframes — injected once per render via style tag */}
      <style>{`
        @keyframes pipelineSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes pipelineStaggerIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes completionBounce {
          0%   { transform: scaleX(1); }
          40%  { transform: scaleX(1.02); }
          100% { transform: scaleX(1); }
        }
        @keyframes checkmarkPop {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .checkmark-icon {
          animation: checkmarkPop 180ms cubic-bezier(0.23,1,0.32,1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .checkmark-icon { animation: none; }
          @keyframes pipelineSpin { to { transform: none; } }
          @keyframes pipelineStaggerIn { from { opacity: 1; transform: none; } }
        }
      `}</style>

      <div
        className={cn('flex flex-col gap-4', className)}
        aria-label="Processing pipeline"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#71717A] uppercase tracking-wider">
            Processing
          </span>
          <span className="text-[12px] text-[#71717A] tabular-nums">
            {completedCount}/{stages.length} steps
          </span>
        </div>

        {/* Stage rows */}
        <div className="flex flex-col gap-3">
          {stages.map((stage, i) => (
            <StageRow key={stage.label} stage={stage} index={i} />
          ))}
        </div>

        {/* All-complete state */}
        {allComplete && (
          <div
            className="flex items-center gap-2 pt-1"
            style={{
              opacity: 0,
              animation: 'pipelineStaggerIn 280ms cubic-bezier(0.23,1,0.32,1) 100ms forwards',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#4ADE80' }}
              aria-hidden="true"
            />
            <span className="text-[13px] text-[#4ADE80] font-medium">
              Ready to download
            </span>
          </div>
        )}
      </div>
    </>
  )
}

export default ProcessingPipeline
