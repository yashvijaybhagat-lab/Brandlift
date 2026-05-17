'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowRight } from 'lucide-react'
import { TopBar } from '@/components/dashboard/TopBar'
import { ContentIdeasFeed } from '@/components/dashboard/ContentIdeasFeed'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'

// ─────────────────────────────────────────────
// Count-up hook
// ─────────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setValue(target)
      return
    }

    let startTime: number | null = null

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3)
    }

    function step(timestamp: number) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(easeOut(progress) * target))
      if (progress < 1) requestAnimationFrame(step)
    }

    const raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

// ─────────────────────────────────────────────
// QuickStats
// ─────────────────────────────────────────────

interface Stat {
  label: string
  value: number
  suffix?: string
  trend: string
  positive: boolean
}

const STATS: Stat[] = [
  { label: 'Videos this month', value: 8, trend: '+3 vs last month', positive: true },
  { label: 'Content ideas used', value: 24, trend: '+12 this week', positive: true },
  { label: 'Profile views', value: 1847, suffix: '', trend: '+18%', positive: true },
]

function StatCard({ stat }: { stat: Stat }) {
  const count = useCountUp(stat.value)

  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-[12px] bg-[#111113] border border-white/[0.06]">
      <p className="text-[13px] text-[#71717A] leading-none">{stat.label}</p>
      <div className="flex items-end gap-2">
        <span className="text-[28px] font-semibold text-[#FAFAFA] leading-none tabular-nums">
          {count.toLocaleString()}{stat.suffix}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <ArrowUpRight
          className={cn('w-3 h-3', stat.positive ? 'text-[#4ADE80]' : 'text-[#F87171]')}
        />
        <span className={cn('text-[12px]', stat.positive ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
          {stat.trend}
        </span>
      </div>
    </div>
  )
}

function QuickStats() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[16px] font-medium text-[#FAFAFA]">Quick Stats</h2>
      <div className="flex flex-col gap-3">
        {STATS.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// RecentVideos
// ─────────────────────────────────────────────

interface VideoRow {
  id: string
  filename: string
  date: string
  status: 'published' | 'draft' | 'processing'
}

const RECENT_VIDEOS: VideoRow[] = [
  { id: '1', filename: 'Before & After — May Results.mp4', date: 'May 14', status: 'published' },
  { id: '2', filename: 'Meet Our Team.mp4', date: 'May 11', status: 'published' },
  { id: '3', filename: 'New Arrivals Walkthrough.mp4', date: 'May 9', status: 'draft' },
]

const STATUS_CONFIG: Record<VideoRow['status'], { label: string; variant: 'success' | 'default' | 'warning' }> = {
  published: { label: 'Published', variant: 'success' },
  draft: { label: 'Draft', variant: 'default' },
  processing: { label: 'Processing', variant: 'warning' },
}

function RecentVideos() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium text-[#FAFAFA]">Recent Videos</h2>
        <Link
          href="/dashboard/videos"
          className="flex items-center gap-1 text-[13px] text-[#71717A] hover:text-[#F5A623] transition-colors duration-160"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {RECENT_VIDEOS.map((video) => {
          const status = STATUS_CONFIG[video.status]
          return (
            <div
              key={video.id}
              className="flex items-center gap-3 p-3 rounded-[10px] bg-[#111113] border border-white/[0.06]"
            >
              {/* Thumbnail placeholder */}
              <div
                className="flex-shrink-0 rounded-[6px] bg-[#18181C]"
                style={{ width: 48, height: 32 }}
                aria-hidden="true"
              />

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#FAFAFA] truncate leading-tight">
                  {video.filename}
                </p>
                <p className="text-[12px] text-[#71717A] mt-0.5">{video.date}</p>
              </div>

              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Dashboard page
// ─────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 flex gap-0 min-h-0">
        {/* Main content */}
        <div className="flex-1 overflow-auto p-6 min-w-0">
          <ContentIdeasFeed
            limit={6}
            showFilters={false}
            gridClass="grid-cols-1 sm:grid-cols-2"
          />
        </div>

        {/* Right sidebar */}
        <aside className="hidden lg:flex flex-col gap-6 w-[300px] flex-shrink-0 overflow-auto p-6 border-l border-white/[0.06]">
          <QuickStats />
          <RecentVideos />
        </aside>
      </div>
    </div>
  )
}
