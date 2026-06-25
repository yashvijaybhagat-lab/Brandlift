'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Store, Package, ShoppingCart, ArrowRight, Plus, TrendingUp } from 'lucide-react'

const STAT_CARDS = [
  { label: 'Total Stores', value: '0', icon: Store, color: '#7C5CFF' },
  { label: 'Total Products', value: '0', icon: Package, color: '#5B9EFF' },
  { label: 'Orders Today', value: '0', icon: ShoppingCart, color: '#4ADE80' },
  { label: 'Revenue (30d)', value: '$0', icon: TrendingUp, color: '#F97316' },
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const name = session?.user?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold text-[#FAFAFA] mb-1" style={{ letterSpacing: '-0.04em' }}>
          Hey, {name} 👋
        </h1>
        <p className="text-[14px] text-[#71717A]">Here&apos;s what&apos;s happening across your stores.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((s) => (
          <div
            key={s.label}
            className="p-5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{ background: s.color + '15', border: `1px solid ${s.color}30` }}
            >
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-[26px] font-extrabold text-[#FAFAFA]" style={{ letterSpacing: '-0.05em' }}>{s.value}</p>
            <p className="text-[12px] text-[#52525B] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-10 flex flex-col items-center text-center"
        style={{ background: 'rgba(124,92,255,0.05)', border: '1px dashed rgba(124,92,255,0.25)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)' }}
        >
          <Store className="w-7 h-7 text-[#7C5CFF]" />
        </div>
        <h2 className="text-[20px] font-bold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.03em' }}>
          Create your first store
        </h2>
        <p className="text-[14px] text-[#71717A] mb-6 max-w-sm">
          Describe your product to our AI and get a full storefront — hero, gallery, copy, and checkout — in under a minute.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/stores/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90"
            style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4), 0 4px 16px rgba(124,92,255,0.25)' }}
          >
            <Plus className="w-4 h-4" />
            Build with AI
          </Link>
          <Link
            href="/dashboard/stores/new?mode=template"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-medium text-[#A1A1AA] transition-all duration-150 hover:text-[#FAFAFA]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Choose a template
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
