'use client'

import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StepUploadData {
  files: File[]
}

interface StepUploadProps {
  onComplete: (data: StepUploadData) => void
}

interface UploadedFile {
  file: File
  id: string
  progress: number
  done: boolean
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─────────────────────────────────────────────
// Upload zone SVG border (marching ants)
// ─────────────────────────────────────────────

function MarchingAntsBorder({ active }: { active: boolean }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ borderRadius: 12 }}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="calc(100% - 2px)"
        height="calc(100% - 2px)"
        rx="11"
        ry="11"
        fill="none"
        stroke={active ? 'rgba(245,166,35,0.6)' : 'rgba(255,255,255,0.08)'}
        strokeWidth="2"
        strokeDasharray="8 6"
        style={{
          strokeDashoffset: 0,
          animation: 'marchingAnts 20s linear infinite',
          transition: 'stroke 200ms cubic-bezier(0.23,1,0.32,1)',
        }}
      />
      <style>{`
        @keyframes marchingAnts {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -140; }
        }
      `}</style>
    </svg>
  )
}

// ─────────────────────────────────────────────
// File thumbnail
// ─────────────────────────────────────────────

function FileThumbnail({ item }: { item: UploadedFile }) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-3 p-3 rounded-card',
        'bg-brand-surface border border-brand-border',
        'overflow-hidden'
      )}
    >
      {/* Pulsing overlay while processing */}
      {!item.done && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(245,166,35,0.03), rgba(245,166,35,0.06))',
            animation: 'thumbnailPulse 3s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-[8px] bg-brand-surface-elevated flex items-center justify-center text-brand-text-muted">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="2" y="1" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7L11 9L7 11V7Z" fill="currentColor" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-[500] text-brand-text truncate">
          {item.file.name}
        </p>
        <p className="text-[12px] text-brand-text-muted">
          {formatBytes(item.file.size)}{' '}
          <span className="text-brand-text-muted/60">·</span>{' '}
          <span
            className={cn(
              'text-[12px]',
              item.done ? 'text-brand-success' : 'text-brand-text-muted'
            )}
          >
            {item.done ? 'Ready' : 'Processing...'}
          </span>
        </p>

        {/* Progress bar */}
        <div className="mt-1.5 h-0.5 bg-brand-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-primary rounded-full"
            style={{
              width: `${item.progress}%`,
              transition: 'width 50ms linear',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes thumbnailPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────
// Upload icon
// ─────────────────────────────────────────────

function UploadIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={cn(
        'transition-colors duration-160',
        active ? 'text-brand-primary' : 'text-brand-text-muted'
      )}
      aria-hidden="true"
    >
      <path
        d="M12 16V8M12 8L9 11M12 8L15 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16.5C4 18.43 5.57 20 7.5 20H16.5C18.43 20 20 18.43 20 16.5V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function StepUpload({ onComplete }: StepUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback((rawFiles: FileList | null) => {
    if (!rawFiles || rawFiles.length === 0) return

    const newItems: UploadedFile[] = Array.from(rawFiles).map((f) => ({
      file: f,
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      progress: 0,
      done: false,
    }))

    setFiles((prev) => [...prev, ...newItems])

    // Animate progress for each file independently
    newItems.forEach((item) => {
      const startTime = Date.now()
      const duration = 1500

      const tick = () => {
        const elapsed = Date.now() - startTime
        const raw = elapsed / duration
        // ease-in-out progress
        const eased = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw
        const progress = Math.min(100, Math.round(eased * 100))

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, progress, done: progress >= 100 }
              : f
          )
        )

        if (progress < 100) {
          requestAnimationFrame(tick)
        }
      }
      requestAnimationFrame(tick)
    })
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set false if leaving the zone itself
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)
    // Reset so same file can be re-added
    e.target.value = ''
  }

  const handleContinue = () => {
    onComplete({ files: files.map((f) => f.file) })
  }

  const handleSkip = () => {
    onComplete({ files: [] })
  }

  const hasFiles = files.length > 0

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2
        className="text-[32px] font-[500] tracking-tight text-brand-text mb-2"
        style={{ letterSpacing: '-0.02em' }}
      >
        Got any video content?
      </h2>
      <p className="text-[14px] text-brand-text-muted mb-8">
        Upload clips from your business and we'll use them to craft posts that show the real you.
      </p>

      {!hasFiles ? (
        /* Upload zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop video files here or click to browse"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className={cn(
            'relative w-full rounded-card',
            'flex flex-col items-center justify-center gap-3',
            'py-16 px-8',
            'cursor-pointer',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg',
            isDragging
              ? 'bg-[rgba(245,166,35,0.02)]'
              : 'bg-brand-surface hover:bg-[rgba(245,166,35,0.015)]'
          )}
        >
          {/* Marching ants SVG border */}
          <MarchingAntsBorder active={isDragging} />

          <UploadIcon active={isDragging} />

          <div className="text-center">
            <p
              className={cn(
                'text-[20px] font-[500] transition-colors duration-160',
                isDragging ? 'text-brand-primary' : 'text-brand-text'
              )}
            >
              Drop your videos here
            </p>
            <p className="text-[14px] text-brand-text-muted mt-1">
              or click to browse
            </p>
          </div>

          <p className="text-[12px] text-brand-text-muted/60">
            MP4, MOV, AVI · Up to multiple files
          </p>
        </div>
      ) : (
        /* Thumbnail grid */
        <div className="flex flex-col gap-2">
          {files.map((item) => (
            <FileThumbnail key={item.id} item={item} />
          ))}

          {/* Add more */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'w-full py-3 rounded-card text-[13px] font-[500]',
              'border border-dashed border-brand-border-strong',
              'text-brand-text-muted hover:text-brand-text hover:border-brand-primary/40',
              'transition-all duration-160',
              'active:scale-[0.97]'
            )}
          >
            + Add more files
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.mov,.avi"
        multiple
        onChange={handleFileInput}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {hasFiles && (
          <Button
            onClick={handleContinue}
            size="lg"
            variant="primary"
            className="w-full"
          >
            Continue with {files.length} {files.length === 1 ? 'video' : 'videos'} →
          </Button>
        )}

        <button
          onClick={handleSkip}
          className={cn(
            'text-[14px] text-brand-text-muted',
            'hover:text-brand-text transition-colors duration-160',
            'active:scale-[0.97]',
            'flex flex-col items-center gap-0.5'
          )}
        >
          Skip for now →
          <span className="text-[12px] text-brand-text-muted/60">
            We'll remind you when you're ready.
          </span>
        </button>
      </div>
    </div>
  )
}
