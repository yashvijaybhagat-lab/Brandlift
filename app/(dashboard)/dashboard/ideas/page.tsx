'use client'

import { TopBar } from '@/components/dashboard/TopBar'
import { ContentIdeasFeed } from '@/components/dashboard/ContentIdeasFeed'

export default function IdeasPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 overflow-auto p-6">
        <ContentIdeasFeed
          showFilters={true}
          gridClass="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        />
      </div>
    </div>
  )
}
