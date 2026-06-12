'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/dashboard/Sidebar'

const STORAGE_KEY = 'brandlift:sidebar-collapsed'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Initialise from localStorage synchronously to avoid flash
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const { data: session } = useSession()

  const handleCollapsedChange = React.useCallback((next: boolean) => {
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {}
  }, [])

  const userEmail = session?.user?.email ?? 'hello@yourbusiness.com'
  const businessName = session?.user?.name ?? 'Your Business'

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D1117]">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={handleCollapsedChange}
        businessName={businessName}
        userEmail={userEmail}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>

    </div>
  )
}
