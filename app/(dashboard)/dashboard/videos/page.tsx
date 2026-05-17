'use client'

import { TopBar } from '@/components/dashboard/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Upload } from 'lucide-react'

interface VideoItem {
  id: string
  filename: string
  date: string
  status: 'published' | 'draft' | 'processing'
  duration: string
  platform: 'tiktok' | 'instagram' | 'youtube'
}

const VIDEOS: VideoItem[] = [
  { id: '1', filename: 'Before & After — May Results', date: 'May 14, 2026', status: 'published', duration: '0:42', platform: 'instagram' },
  { id: '2', filename: 'Meet Our Team', date: 'May 11, 2026', status: 'published', duration: '1:03', platform: 'tiktok' },
  { id: '3', filename: 'New Arrivals Walkthrough', date: 'May 9, 2026', status: 'draft', duration: '2:14', platform: 'youtube' },
  { id: '4', filename: 'Customer Story — Sarah M.', date: 'May 6, 2026', status: 'published', duration: '0:58', platform: 'tiktok' },
  { id: '5', filename: 'Behind the Scenes: Packaging Day', date: 'May 2, 2026', status: 'published', duration: '1:22', platform: 'instagram' },
  { id: '6', filename: 'FAQ: Shipping & Returns', date: 'Apr 28, 2026', status: 'processing', duration: '3:07', platform: 'youtube' },
]

const STATUS_MAP: Record<VideoItem['status'], { label: string; variant: 'success' | 'default' | 'warning' }> = {
  published: { label: 'Published', variant: 'success' },
  draft: { label: 'Draft', variant: 'default' },
  processing: { label: 'Processing', variant: 'warning' },
}

export default function VideosPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-medium text-[#FAFAFA]">My Videos</h1>
              <p className="text-[14px] text-[#71717A] mt-0.5">{VIDEOS.length} videos in your library</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Upload
              </Button>
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add video
              </Button>
            </div>
          </div>

          {/* Video list */}
          <div className="flex flex-col gap-2">
            {VIDEOS.map((video) => {
              const status = STATUS_MAP[video.status]
              return (
                <div
                  key={video.id}
                  className="flex items-center gap-4 p-4 rounded-[12px] bg-[#111113] border border-white/[0.06] group"
                  style={{
                    transition: 'background-color 160ms cubic-bezier(0.23,1,0.32,1)',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="flex-shrink-0 rounded-[8px] bg-[#18181C] flex items-center justify-center"
                    style={{ width: 80, height: 52 }}
                  >
                    <span className="text-[10px] text-[#71717A] font-mono">{video.duration}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#FAFAFA] truncate">{video.filename}</p>
                    <p className="text-[12px] text-[#71717A] mt-0.5">{video.date}</p>
                  </div>

                  {/* Platform */}
                  <Badge variant="platform" platform={video.platform} />

                  {/* Status */}
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
