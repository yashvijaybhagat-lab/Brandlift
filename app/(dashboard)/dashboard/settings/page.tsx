'use client'
import { useSession } from 'next-auth/react'
import { Settings, Globe, CreditCard, Bell } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold text-[#FAFAFA] mb-1" style={{ letterSpacing: '-0.04em' }}>Settings</h1>
        <p className="text-[14px] text-[#71717A]">Manage your account and billing.</p>
      </div>

      {/* Profile */}
      <div className="mb-6 p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-[16px] font-semibold text-[#FAFAFA] mb-4">Profile</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[12px] text-[#52525B] block mb-1">Name</label>
            <p className="text-[14px] text-[#FAFAFA]">{session?.user?.name ?? '—'}</p>
          </div>
          <div>
            <label className="text-[12px] text-[#52525B] block mb-1">Email</label>
            <p className="text-[14px] text-[#FAFAFA]">{session?.user?.email ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="mb-6 p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#FAFAFA]">Plan</h2>
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(124,92,255,0.15)', color: '#B9A5FF' }}
          >
            Free
          </span>
        </div>
        <p className="text-[13px] text-[#71717A] mb-4">
          You&apos;re on the free plan — 1 store, up to 10 products, yourstore.brandlift.app subdomain.
        </p>
        <button
          className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
          style={{ background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.25)', color: '#B9A5FF', cursor: 'not-allowed', opacity: 0.7 }}
        >
          Pro plan — coming soon
        </button>
      </div>

      {/* Sections */}
      {[
        { icon: Globe, label: 'Custom domain', desc: 'Connect your own domain. Available on Pro plan.', locked: true },
        { icon: CreditCard, label: 'Billing', desc: 'Manage your subscription and payment methods.', locked: true },
        { icon: Bell, label: 'Notifications', desc: 'Email notifications for new orders and visitors.', locked: false },
      ].map((s) => (
        <div
          key={s.label}
          className="mb-3 p-5 rounded-2xl flex items-center gap-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', opacity: s.locked ? 0.5 : 1 }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,92,255,0.1)' }}>
            <s.icon className="w-4 h-4 text-[#7C5CFF]" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-[#FAFAFA]">{s.label}</p>
            <p className="text-[12px] text-[#52525B]">{s.desc}</p>
          </div>
          {s.locked && (
            <span className="ml-auto text-[11px] text-[#3f3f46] border rounded-full px-2 py-0.5" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Pro</span>
          )}
        </div>
      ))}
    </div>
  )
}
