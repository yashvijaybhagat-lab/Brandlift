'use client'

import { useState } from 'react'
import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import { ExternalLink, Globe, ArrowRight } from 'lucide-react'

export default function WebsitePage() {
  const [url, setUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitted(true)
  }

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
            {submitted && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => window.open(`https://${url.replace(/^https?:\/\//, '')}`, '_blank')}>
                <ExternalLink className="w-3.5 h-3.5" />
                Open site
              </Button>
            )}
          </div>

          {!submitted ? (
            /* ── Connect website ── */
            <div
              className="flex flex-col items-center justify-center text-center py-16 rounded-2xl gap-6"
              style={{ border: '0.5px dashed rgba(255,255,255,0.1)', background: 'rgba(17,17,19,0.5)' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}
              >
                <Globe className="w-7 h-7 text-[#6366f1]" />
              </div>

              <div>
                <h2 className="text-[18px] font-semibold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.02em' }}>
                  Connect your website
                </h2>
                <p className="text-[14px] text-[#71717A] max-w-[36ch] mx-auto leading-relaxed">
                  Add your website URL and we&apos;ll analyze your content, SEO, and give you a real score based on what we find.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="yourbusiness.com"
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-[14px] text-[#FAFAFA] outline-none"
                  style={{
                    background: 'rgba(24,24,28,0.8)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <Button type="submit" variant="primary" size="sm" className="gap-1.5 flex-shrink-0">
                  Analyze
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </form>

              <p style={{ fontSize: 12, color: '#3f3f46' }}>
                We check your content quality, SEO metadata, and page structure.
              </p>
            </div>
          ) : (
            /* ── Analyzing state ── */
            <div className="flex flex-col gap-4">
              {/* Domain card */}
              <div className="flex items-center gap-4 p-4 rounded-[12px] bg-[#111113] border border-white/[0.06]">
                <div className="w-10 h-10 rounded-[10px] bg-[rgba(99,102,241,0.1)] flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#FAFAFA] truncate">
                    {url.replace(/^https?:\/\//, '')}
                  </p>
                  <p className="text-[12px] text-[#FBBF24] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] inline-block" />
                    Analyzing — check back shortly
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[24px] font-semibold text-[#52525B] leading-none">—</p>
                  <p className="text-[11px] text-[#71717A] mt-0.5">Website score</p>
                </div>
              </div>

              {/* Pending sections */}
              <div className="flex flex-col gap-2">
                <h2 className="text-[16px] font-medium text-[#FAFAFA]">Content audit</h2>
                {[
                  'Hero section',
                  'About us',
                  'Services',
                  'Testimonials',
                  'Contact & location',
                  'SEO metadata',
                ].map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 p-4 rounded-[10px] bg-[#111113] border border-white/[0.06]"
                  >
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-[#FAFAFA]">{label}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 rounded-full bg-[#18181C] overflow-hidden">
                        <div className="h-full rounded-full bg-[#27272A] animate-pulse" style={{ width: '60%' }} />
                      </div>
                      <span className="text-[13px] font-medium w-8 text-right text-[#3f3f46]">—</span>
                    </div>
                    <Button variant="ghost" size="sm" disabled>Edit</Button>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 12, color: '#52525B', textAlign: 'center', marginTop: 8 }}>
                Analysis usually takes 1–2 minutes. We&apos;ll notify you when it&apos;s ready.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
