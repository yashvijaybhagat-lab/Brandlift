'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'
import { Progress } from '@/components/ui/Progress'

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

// Enum for upload status, mirroring Replicate API statuses plus initial states
export enum UploadStatus {
  Idle = 'idle',
  Uploading = 'uploading',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

// Interface for the state of an uploaded file
export interface UploadedFile {
  file: File
  id: string // Vercel Blob ID or unique identifier
  status: UploadStatus
  progress: number // 0-100
  error?: string
  pathname?: string // The final path in Vercel Blob
  replicateId?: string // The Replicate prediction ID if processing
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
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])

  // Function to start polling for status
  const pollStatus = React.useCallback(async (uploadedFile: UploadedFile) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/video/status/${uploadedFile.replicateId}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        
        setUploadedFiles(currentFiles =>
          currentFiles.map(f => {
            if (f.id === uploadedFile.id) {
              let newStatus = f.status
              let newProgress = f.progress
              let newError = f.error

              switch (data.status) {
                case 'starting':
                case 'processing':
                  newStatus = UploadStatus.Processing
                  // Replicate API doesn't give direct progress, we'll use a simple progress indicator
                  newProgress = Math.max(newProgress, 50) // Assume some progress if processing
                  break
                case 'succeeded':
                  newStatus = UploadStatus.Succeeded
                  newProgress = 100
                  onFiles([uploadedFile.file]) // Notify parent component when successful
                  clearInterval(intervalId)
                  break
                case 'failed':
                  newStatus = UploadStatus.Failed
                  newError = data.error || 'Unknown error'
                  clearInterval(intervalId)
                  break
                default:
                  // Keep current status if unknown
                  break
              }
              
              return { ...f, status: newStatus, progress: newProgress, error: newError }
            }            
            return f
          })
        )

      } catch (error) {
        console.error('Error polling video status:', error)
        setUploadedFiles(currentFiles =>
          currentFiles.map(f => {
            if (f.id === uploadedFile.id) {
              clearInterval(intervalId)
              return { ...f, status: UploadStatus.Failed, error: 'Failed to fetch status' }
            }
            return f
          })
        )
      }
    }, 3000) // Poll every 3 seconds
  }, [onFiles])

  // Function to upload a file to Vercel Blob
  const uploadFileToBlob = React.useCallback(async (file: File) => {
    const { pathname, clientToken, uploadUrl } = await fetch(`/api/video/upload?filename=${file.name}`).then(res => res.json())

    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}` // Local unique ID

    setUploadedFiles(prev => [
      ...prev,
      { file, id: uniqueId, status: UploadStatus.Uploading, progress: 0, pathname },
    ])

    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100
        setUploadedFiles(currentFiles =>
          currentFiles.map(f => {
            if (f.id === uniqueId) {
              return { ...f, progress: Math.round(percentComplete) }
            }
            return f
          })
        )
      }
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // File uploaded to Vercel Blob successfully.
        // Now, trigger Replicate processing.
        try {
          const replicateResponse = await fetch('/api/replicate/video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: `${window.location.origin}/${pathname}` }), // Assuming pathname is publically accessible
          })
          
          if (!replicateResponse.ok) {
            const errorData = await replicateResponse.json()
            throw new Error(errorData.error || 'Failed to start Replicate processing')
          }
          
          const replicateData = await replicateResponse.json()
          const replicatePredictionId = replicateData.id

          setUploadedFiles(currentFiles =>
            currentFiles.map(f => {
              if (f.id === uniqueId) {
                return { ...f, status: UploadStatus.Uploading, replicateId: replicatePredictionId, progress: 100 } // Indicate upload complete, now entering processing phase
              }
              return f
            })
          )
          // Start polling for the Replicate prediction status
          pollStatus({ file, id: uniqueId, status: UploadStatus.Uploading, progress: 100, pathname, replicateId: replicatePredictionId })

        } catch (error) {
          console.error('Error triggering Replicate:', error)
          setUploadedFiles(currentFiles =>
            currentFiles.map(f => {
              if (f.id === uniqueId) {
                return { ...f, status: UploadStatus.Failed, error: error instanceof Error ? error.message : 'Unknown error' }
              }
              return f
            })
          )
        }
      } else {
        // Upload failed
        setUploadedFiles(currentFiles =>
          currentFiles.map(f => {
            if (f.id === uniqueId) {
              return { ...f, status: UploadStatus.Failed, error: `Upload failed: ${xhr.statusText}` }
            }
            return f
          })
        )
      }
    }

    xhr.onerror = () => {
      // Network error
      setUploadedFiles(currentFiles =>
        currentFiles.map(f => {
          if (f.id === uniqueId) {
            return { ...f, status: UploadStatus.Failed, error: 'Network error during upload' }
          }
          return f
        })
      )
    }

    const formData = new FormData()
    formData.append('file', file)

    // Vercel Blob expects the file directly in the request body for PUT
    xhr.send(file)

  }, [pollStatus])


  // ─────────────────────────────────────────────
  // Drop handlers
  // ─────────────────────────────────────────────

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only clear if leaving the dropzone element itself (not a child)
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
        items.forEach(uploadFileToBlob)
      }
    },
    [uploadFileToBlob]
  )

  const handleClick = React.useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) =>
        f.type.startsWith('video/')
      )
      if (files.length > 0) {
        files.forEach(uploadFileToBlob)
      }
      // Reset so same file can be picked again
      e.target.value = ''
    },
    [uploadFileToBlob]
  )

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  const height = compact ? 140 : 200

  // Get the count of files that are not yet succeeded
  const pendingFileCount = uploadedFiles.filter(f => f.status !== UploadStatus.Succeeded).length

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
          pendingFileCount > 0
            ? `${pendingFileCount} video${pendingFileCount === 1 ? '' : 's'} uploading or processing. Click or drop to add more.`
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
        {pendingFileCount > 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 text-center w-full">
            {uploadedFiles.filter(f => f.status !== UploadStatus.Succeeded).map((uploadedFile) => (
              <div key={uploadedFile.id} className="w-full">
                <p className="text-[13px] font-medium text-[#FAFAFA] truncate mb-1">
                  {uploadedFile.file.name}
                </p>
                <Progress 
                  value={uploadedFile.progress}
                  max={100}
                  variant={uploadedFile.status === UploadStatus.Failed ? 'error' : 'default'}
                  showLabel={true}
                  statusText={uploadedFile.status === UploadStatus.Failed ? 'Failed' : uploadedFile.status === UploadStatus.Succeeded ? 'Complete' : 'Uploading...'}
                  height={6}
                />
                {uploadedFile.status === UploadStatus.Failed && (
                  <p className="text-xs text-brand-error mt-1">{uploadedFile.error}</p>
                )}
              </div>
            ))}
            {/* Show prompt to add more if there are still pending files */}
            <p className="text-[12px] text-[#71717A] mt-0.5">
              {pendingFileCount} video{pendingFileCount === 1 ? '' : 's'} uploading. Drop more or click to browse.
            </p>
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
