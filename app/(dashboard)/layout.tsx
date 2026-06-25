'use client'
import * as React from 'react'
import { useSession } from 'next-auth/react'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? 'Your Store'
  const userEmail = session?.user?.email ?? ''
  const avatarUrl = session?.user?.image ?? undefined

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D0D0F]">
      <DashboardSidebar userName={userName} userEmail={userEmail} avatarUrl={avatarUrl} />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
