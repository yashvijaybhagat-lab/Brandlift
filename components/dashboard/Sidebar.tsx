'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  LayoutDashboard,
  Lightbulb,
  Video,
  Globe,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface SidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  businessName?: string
  userEmail?: string
}

// ─────────────────────────────────────────────
// Nav items config
// ─────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Content Ideas', href: '/dashboard/ideas', icon: Lightbulb },
  { label: 'My Videos', href: '/dashboard/videos', icon: Video },
  { label: 'My Website', href: '/dashboard/website', icon: Globe },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

// ─────────────────────────────────────────────
// Business avatar
// ─────────────────────────────────────────────

function BusinessAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Deterministic color from name
  const colors = [
    'from-amber-500 to-orange-600',
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
  ]
  const colorIndex = name.charCodeAt(0) % colors.length

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-[8px] bg-gradient-to-br flex items-center justify-center font-semibold text-white',
        colors[colorIndex]
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={`${name} logo`}
    >
      {initials}
    </div>
  )
}

// ─────────────────────────────────────────────
// Tooltip wrapper for collapsed items
// ─────────────────────────────────────────────

function NavTooltip({
  children,
  label,
  collapsed,
}: {
  children: React.ReactNode
  label: string
  collapsed: boolean
}) {
  if (!collapsed) return <>{children}</>

  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className={cn(
            'z-50 rounded-[6px] px-2.5 py-1.5',
            'bg-[#18181C] border border-white/10',
            'text-[13px] font-medium text-[#FAFAFA]',
            'shadow-lg',
            'select-none',
            'animate-in fade-in-0 zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          {label}
          <Tooltip.Arrow className="fill-[#18181C]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

// ─────────────────────────────────────────────
// Sidebar component
// ─────────────────────────────────────────────

export function Sidebar({
  collapsed,
  onCollapsedChange,
  businessName = 'Your Business',
  userEmail = 'you@example.com',
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <Tooltip.Provider>
      {/* Sidebar shell — fixed width 60px when collapsed, 240px when expanded */}
      {/* Width transitions, text opacity transitions for GPU efficiency */}
      <aside
        style={{
          width: collapsed ? 60 : 240,
          transition: 'width 220ms cubic-bezier(0.23,1,0.32,1)',
          willChange: 'width',
        }}
        className="relative flex flex-col h-full bg-[#111113] border-r border-white/[0.06] overflow-hidden flex-shrink-0"
        aria-label="Main navigation"
      >
        {/* ── Top section ── */}
        <div className="flex items-center gap-3 px-3 pt-4 pb-3 border-b border-white/[0.06] min-h-[60px] flex-shrink-0">
          <BusinessAvatar name={businessName} size={32} />

          {/* Business name — fades out when collapsed */}
          <span
            className="flex-1 text-[14px] font-medium text-[#FAFAFA] truncate leading-tight"
            style={{
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 160ms cubic-bezier(0.23,1,0.32,1)',
              pointerEvents: collapsed ? 'none' : 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {businessName}
          </span>

          {/* Collapse toggle */}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-[6px] flex items-center justify-center',
              'text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#18181C]',
              'transition-colors duration-160',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/60',
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex flex-col gap-0.5 px-2 pt-2 flex-1" role="navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            // Exact match for dashboard, prefix match for others
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <NavTooltip key={item.href} label={item.label} collapsed={collapsed}>
                <Link
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-3 rounded-[8px] h-9 px-2.5',
                    'text-[14px] font-medium select-none',
                    'transition-colors duration-160',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/60',
                    isActive
                      ? [
                          'bg-[rgba(245,166,35,0.1)]',
                          'text-[#F5A623]',
                          // Left border via pseudo-element workaround using box-shadow
                        ]
                      : [
                          'text-[#71717A]',
                          'hover:bg-[#18181C]',
                          'hover:text-[#A1A1AA]',
                        ]
                  )}
                  style={{
                    boxShadow: isActive
                      ? 'inset 2px 0 0 0 #F5A623'
                      : undefined,
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className="flex-shrink-0 w-4 h-4"
                    style={{ color: isActive ? '#F5A623' : undefined }}
                  />
                  <span
                    className="truncate"
                    style={{
                      opacity: collapsed ? 0 : 1,
                      transition: 'opacity 160ms cubic-bezier(0.23,1,0.32,1)',
                      pointerEvents: collapsed ? 'none' : 'auto',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </NavTooltip>
            )
          })}
        </nav>

        {/* ── Bottom section ── */}
        <div className="flex flex-col gap-3 px-2 pb-4 pt-3 border-t border-white/[0.06] flex-shrink-0">
          {/* Upgrade card — only visible when expanded */}
          <div
            style={{
              opacity: collapsed ? 0 : 1,
              maxHeight: collapsed ? 0 : 120,
              overflow: 'hidden',
              transition:
                'opacity 200ms cubic-bezier(0.23,1,0.32,1), max-height 220ms cubic-bezier(0.23,1,0.32,1)',
              pointerEvents: collapsed ? 'none' : 'auto',
            }}
          >
            <div
              className="rounded-[10px] p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(245,166,35,0.08) 0%, rgba(232,130,92,0.08) 100%)',
                border: '0.5px solid rgba(245,166,35,0.25)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-[#F5A623] flex-shrink-0" />
                <span className="text-[12px] font-medium text-[#F5A623]">Upgrade to Pro</span>
              </div>
              <p className="text-[11px] text-[#71717A] leading-relaxed mb-2.5">
                Unlock unlimited videos and AI content ideas.
              </p>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                className="text-[12px] h-7"
              >
                Upgrade
              </Button>
            </div>
          </div>

          {/* User row */}
          <NavTooltip label={userEmail} collapsed={collapsed}>
            <div className="flex items-center gap-2.5 px-1 py-1 rounded-[8px] hover:bg-[#18181C] transition-colors duration-160 cursor-pointer">
              {/* User avatar */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold"
                style={{ fontSize: 11 }}
              >
                {userEmail[0]?.toUpperCase() ?? 'U'}
              </div>

              <div
                className="flex-1 min-w-0"
                style={{
                  opacity: collapsed ? 0 : 1,
                  transition: 'opacity 160ms cubic-bezier(0.23,1,0.32,1)',
                  pointerEvents: collapsed ? 'none' : 'auto',
                }}
              >
                <p className="text-[12px] text-[#A1A1AA] truncate leading-none">{userEmail}</p>
              </div>
            </div>
          </NavTooltip>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}

export default Sidebar
