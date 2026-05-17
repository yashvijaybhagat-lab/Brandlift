'use client'

import * as React from 'react'
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

  const handleCollapsedChange = React.useCallback((next: boolean) => {
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0B]">
      {/* GPU-accelerated sidebar — width transitions only */}
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={handleCollapsedChange}
        businessName="Your Business"
        userEmail="hello@yourbusiness.com"
      />

      {/* Main content area */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
