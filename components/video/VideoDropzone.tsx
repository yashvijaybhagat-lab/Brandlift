'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface VideoDropzoneProps {
  onFiles: (files: File[]) => void
  compact?: boolean
  className?: string
  /** Show how many files are already staged */
  fileCount?: number
}

// ─────────────────────────────────────────────
// Marching-ants SVG border
// Strategy: absolute SVG over the dropzone, pointer-events:none
// strokeDashoffset animation runs in CSS keyframe
// ─────────────────────────────────────────────

interface MarchingBorderProps {
  active: boolean
}

function MarchingBorder({ active }: MarchingBorderProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="calc(100% - 2px)"
        height="calc(100% - 2px)"
        rx="12"
        ry="12"
        fill="none"
        stroke={active ? '#6366f1' : 'rgba(255,255,255,0.12)'}
        strokeWidth="1.5"
        strokeDasharray="8 4"
        style={{
          animation: 'marchingAnts 1.5s linear infinite',
          transition: 'stroke 200ms cubic-bezier(0.23,1,0.32,1)',
        }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────
// Upload icon
// ─────────────────────────────────────────────

function UploadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 13V7M10 7L7.5 9.5M10 7L12.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 13.5C2.12 13.5 1 12.38 1 11C1 9.78 1.86 8.77 3 8.55C3 8.52 3 8.51 3 8.5C3 6.57 4.57 5 6.5 5C7.36 5 8.15 5.31 8.76 5.83C9.28 4.18 10.82 3 12.62 3C14.84 3 16.62 4.79 16.62 7C16.62 7.07 16.62 7.14 16.61 7.21C17.96 7.68 19 8.96 19 10.5C19 12.43 17.43 14 15.5 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────
// VideoDropzone
// ─────────────────────────────────────────────

export function VideoDropzone({
  onFiles,
  compact = false,
  className,
  fileCount = 0,
}: VideoDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)

  // ── Drag handlers ──

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const items = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('video/')
      )
      if (items.length > 0) {
        onFiles(items)
      }
    },
    [onFiles]
  )

  const handleClick = React.useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) {
        onFiles(files)
      }
      e.target.value = ''
    },
    [onFiles]
  )

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  const height = compact ? 140 : 200

  return (
    <>
      {/* Marching ants keyframe — scoped */}
      <style>{`
        @keyframes marchingAnts {
          to { stroke-dashoffset: -24; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes marchingAnts { to { stroke-dashoffset: 0; } }
        }
      `}</style>

      <div
        role="button"
        tabIndex={0}
        aria-label={
          fileCount > 0
            ? `${fileCount} video${fileCount === 1 ? '' : 's'} selected. Click or drop to add more.`
            : 'Drop videos here or click to browse'
        }
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'rounded-[12px]',
          'cursor-pointer',
          'select-none',
          'outline-none',
          'transition-colors duration-200',
          'focus-visible:ring-2 focus-visible:ring-[#6366f1]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0B]',
          className
        )}
        style={{
          height,
          background: isDragOver
            ? 'rgba(99, 102, 241, 0.06)'
            : 'rgba(255,255,255,0.02)',
          transition: 'background 200ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {/* Animated dashed border via SVG overlay */}
        <MarchingBorder active={isDragOver} />

        {/* Content */}
        {fileCount > 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full"
              style={{
                background: 'rgba(99,102,241,0.1)',
                color: '#6366f1',
              }}
            >
              <UploadIcon size={18} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#FAFAFA]">
                {fileCount} video{fileCount === 1 ? '' : 's'} added
              </p>
              <p className="text-[12px] text-[#71717A] mt-0.5">
                Drop more or click to browse
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 px-4 text-center">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full"
              style={{
                background: isDragOver ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                color: isDragOver ? '#6366f1' : '#71717A',
                transition: 'background 200ms cubic-bezier(0.23,1,0.32,1), color 200ms cubic-bezier(0.23,1,0.32,1)',
              }}
            >
              <UploadIcon size={18} />
            </div>
            <div>
              <p
                className="text-[13px] font-medium"
                style={{
                  color: isDragOver ? '#6366f1' : '#A1A1AA',
                  transition: 'color 200ms cubic-bezier(0.23,1,0.32,1)',
                }}
              >
                {isDragOver ? 'Release to upload' : 'Drop videos here or click to browse'}
              </p>
              {!compact && (
                <p className="text-[12px] text-[#71717A] mt-0.5">
                  MP4, MOV, WebM — up to 2GB
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </>
  )
}

export default VideoDropzone
