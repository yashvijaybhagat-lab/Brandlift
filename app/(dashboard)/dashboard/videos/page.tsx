'use client'

import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import { Upload, Video, Plus } from 'lucide-react'

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
              <p className="text-[14px] text-[#71717A] mt-0.5">Your video library is empty — upload your first one</p>
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

          {/* Empty state */}
          <div
            className="flex flex-col items-center justify-center text-center py-24 rounded-2xl gap-6"
            style={{ border: '0.5px dashed rgba(255,255,255,0.09)', background: 'rgba(17,17,19,0.5)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: '#18181C', border: '0.5px solid rgba(255,255,255,0.08)' }}
            >
              <Video className="w-8 h-8 text-[#3f3f46]" />
            </div>

            <div>
              <h2 className="text-[18px] font-semibold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.02em' }}>
                No videos yet
              </h2>
              <p className="text-[14px] text-[#71717A] max-w-[36ch] mx-auto leading-relaxed">
                Upload your raw iPhone footage and BrandLift will transform it into polished, branded content ready to post.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)',
                  boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 12px 32px rgba(99,102,241,0.35)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)'
                }}
              >
                <Upload className="w-4 h-4" />
                Upload your first video
              </button>
              <span style={{ fontSize: 13, color: '#3f3f46' }}>or drag &amp; drop a file here</span>
            </div>

            <div className="flex items-center gap-6 mt-2">
              {[
                { icon: '📱', label: 'iPhone footage' },
                { icon: '✂️', label: 'Auto-edited' },
                { icon: '📲', label: 'Ready to post' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <span className="text-xl">{icon}</span>
                  <span style={{ fontSize: 11, color: '#52525B', fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
