'use client'

import { useEffect, useState } from 'react'
import { InfiniteSlider } from '@/components/ui/infinite-slider'

interface CountryItem {
  code: string
  flag: string
  name: string
}

interface ReachData {
  configured:     boolean
  totalCountries?: number
  flags?:          CountryItem[]
}

// Fallback flags shown before data loads (so the slider is never empty)
const PLACEHOLDER_FLAGS: CountryItem[] = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore' },
]

export default function GlobalReach() {
  const [data,  setData]  = useState<ReachData | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/analytics/countries')
      .then(r => r.json())
      .then((d: ReachData) => { setData(d); setReady(true) })
      .catch(() => setReady(true))

    // Re-fetch every 5 minutes
    const id = setInterval(() => {
      fetch('/api/analytics/countries')
        .then(r => r.json())
        .then((d: ReachData) => setData(d))
        .catch(() => {})
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const flags          = data?.flags?.length ? data.flags : PLACEHOLDER_FLAGS
  const totalCountries = data?.totalCountries ?? null
  const isConfigured   = data?.configured ?? false

  // Don't flash placeholder if real data arrives quickly
  if (!ready && !data) return null

  return (
    <section className="relative py-16 overflow-hidden">
      {/* Top edge fade */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="mb-8 text-center px-6">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.02]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-semibold text-[#52525B] tracking-wide uppercase">Live</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFA]">
          {isConfigured && totalCountries ? (
            <>
              Visited from{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                {totalCountries} countries
              </span>
            </>
          ) : (
            <>
              Creators{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                worldwide
              </span>
            </>
          )}
        </h2>
        <p className="mt-2 text-sm text-[#52525B]">
          Real visitors from around the world — tracked live via Vercel Analytics.
        </p>
      </div>

      {/* Slider — left fade mask */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
          style={{ background: 'linear-gradient(to right, #0A0A0B, transparent)' }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
          style={{ background: 'linear-gradient(to left, #0A0A0B, transparent)' }} />

        <InfiniteSlider gap={12} duration={35} durationOnHover={80}>
          {flags.map((c) => (
            <div
              key={c.code}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                         bg-white/[0.03] border border-white/[0.06]
                         hover:bg-white/[0.06] hover:border-white/[0.10]
                         transition-all duration-200 cursor-default select-none whitespace-nowrap"
            >
              <span className="text-2xl leading-none">{c.flag}</span>
              <span className="text-[13px] font-medium text-[#A1A1AA]">{c.name}</span>
            </div>
          ))}
        </InfiniteSlider>
      </div>

      {/* Bottom edge fade */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </section>
  )
}
