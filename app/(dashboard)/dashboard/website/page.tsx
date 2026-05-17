'use client'

import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import { ExternalLink, Globe, CheckCircle } from 'lucide-react'

const WEBSITE_SECTIONS = [
  { label: 'Hero section', status: 'complete', score: 95 },
  { label: 'About us', status: 'complete', score: 88 },
  { label: 'Services', status: 'complete', score: 91 },
  { label: 'Testimonials', status: 'needs-update', score: 62 },
  { label: 'Contact & location', status: 'complete', score: 100 },
  { label: 'SEO metadata', status: 'needs-update', score: 54 },
]

export default function WebsitePage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-medium text-[#FAFAFA]">My Website</h1>
              <p className="text-[14px] text-[#71717A] mt-0.5">Monitor and improve your web presence</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Open site
            </Button>
          </div>

          {/* Domain card */}
          <div className="flex items-center gap-4 p-4 rounded-[12px] bg-[#111113] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-[10px] bg-[rgba(245,166,35,0.1)] flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#FAFAFA]">mapleandco.com</p>
              <p className="text-[12px] text-[#4ADE80] mt-0.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Online · SSL active
              </p>
            </div>
            <div className="text-right">
              <p className="text-[24px] font-semibold text-[#F5A623] leading-none">72</p>
              <p className="text-[11px] text-[#71717A] mt-0.5">Website score</p>
            </div>
          </div>

          {/* Sections audit */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[16px] font-medium text-[#FAFAFA]">Content audit</h2>
            {WEBSITE_SECTIONS.map((section) => (
              <div
                key={section.label}
                className="flex items-center gap-4 p-4 rounded-[10px] bg-[#111113] border border-white/[0.06]"
              >
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#FAFAFA]">{section.label}</p>
                </div>

                {/* Score bar */}
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-[#18181C] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${section.score}%`,
                        background: section.score >= 80 ? '#4ADE80' : section.score >= 60 ? '#FBBF24' : '#F87171',
                        transition: 'width 600ms cubic-bezier(0.23,1,0.32,1)',
                      }}
                    />
                  </div>
                  <span
                    className="text-[13px] font-medium w-8 text-right"
                    style={{
                      color: section.score >= 80 ? '#4ADE80' : section.score >= 60 ? '#FBBF24' : '#F87171',
                    }}
                  >
                    {section.score}
                  </span>
                </div>

                <Button
                  variant={section.status === 'needs-update' ? 'primary' : 'ghost'}
                  size="sm"
                >
                  {section.status === 'needs-update' ? 'Improve' : 'Edit'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
