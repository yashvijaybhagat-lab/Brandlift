'use client'
import Link from 'next/link'
import { Plus, Globe, Package, ExternalLink, MoreHorizontal } from 'lucide-react'

export default function StoresPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-extrabold text-[#FAFAFA] mb-1" style={{ letterSpacing: '-0.04em' }}>My Stores</h1>
          <p className="text-[14px] text-[#71717A]">Manage your storefronts and products.</p>
        </div>
        <Link
          href="/dashboard/stores/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4)' }}
        >
          <Plus className="w-4 h-4" />
          New Store
        </Link>
      </div>

      {/* Empty state */}
      <div
        className="rounded-2xl p-16 flex flex-col items-center text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.15)' }}
        >
          <Globe className="w-7 h-7 text-[#7C5CFF]" />
        </div>
        <h2 className="text-[18px] font-bold text-[#FAFAFA] mb-2">No stores yet</h2>
        <p className="text-[13px] text-[#52525B] mb-6 max-w-xs">
          Create your first store with AI or start from a template. It takes under 5 minutes.
        </p>
        <Link
          href="/dashboard/stores/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: '#7C5CFF' }}
        >
          <Plus className="w-4 h-4" />
          Create your first store
        </Link>
      </div>
    </div>
  )
}
