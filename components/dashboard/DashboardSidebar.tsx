'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, Store, Package, ShoppingCart, BarChart2, Settings, LogOut, Plus } from 'lucide-react'
import Image from 'next/image'

const NAV = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Stores', href: '/dashboard/stores', icon: Store },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface Props {
  userName: string
  userEmail: string
  avatarUrl?: string
}

export function DashboardSidebar({ userName, userEmail, avatarUrl }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-full"
      style={{ background: '#111113', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#7C5CFF' }}
        >
          <svg viewBox="0 0 28 28" fill="none" width="16" height="16">
            <path d="M4 5h8a4 4 0 0 1 0 8H4V5zm0 8h8.5a4.5 4.5 0 0 1 0 9H4V13z" fill="white" opacity="0.95" />
          </svg>
        </div>
        <span className="font-bold text-[15px] text-[#FAFAFA]" style={{ letterSpacing: '-0.03em' }}>BrandLift</span>
      </div>

      {/* New store CTA */}
      <div className="px-3 py-4">
        <Link
          href="/dashboard/stores/new"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white w-full transition-all duration-150 hover:opacity-90"
          style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4)' }}
        >
          <Plus className="w-4 h-4" />
          New Store
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150"
              style={{
                background: active ? 'rgba(124,92,255,0.12)' : 'transparent',
                color: active ? '#FAFAFA' : '#71717A',
                border: active ? '1px solid rgba(124,92,255,0.2)' : '1px solid transparent',
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {avatarUrl ? (
            <Image src={avatarUrl} alt={userName} width={28} height={28} className="rounded-full" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-semibold"
              style={{ background: '#7C5CFF', color: 'white' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#FAFAFA] truncate">{userName}</p>
            <p className="text-[11px] text-[#52525B] truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-2 px-3 py-2 w-full text-[12px] text-[#52525B] hover:text-[#A1A1AA] transition-colors duration-150 mt-1 rounded-lg"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
