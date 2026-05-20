// Server component — revalidates every 5 minutes automatically

interface CountryPublic {
  code: string
  flag: string
  name: string
}

interface ReachData {
  configured:     boolean
  totalCountries?: number
  flags?:          CountryPublic[]
}

async function getReachData(): Promise<ReachData> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://brandlift.app'
    const res  = await fetch(`${base}/api/analytics/countries`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return { configured: false }
    return res.json()
  } catch {
    return { configured: false }
  }
}

export default async function GlobalReach() {
  const data = await getReachData()

  // Only render if analytics is configured and we have real data
  if (!data.configured || !data.totalCountries || data.totalCountries < 2) return null

  const flags = data.flags ?? []

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Subtle divider glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-5xl mx-auto px-6 text-center">
        {/* Headline */}
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-400 mb-4">
          Global Reach
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#FAFAFA] mb-3">
          Creators in{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            {data.totalCountries} countries
          </span>{' '}
          trust BrandLift
        </h2>
        <p className="text-sm text-[#A1A1AA] mb-12 max-w-md mx-auto">
          From local shops to global brands — BrandLift helps small businesses everywhere show up and stand out.
        </p>

        {/* Flag grid */}
        {flags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {flags.map(c => (
              <div
                key={c.code}
                title={c.name}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                           bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]
                           hover:border-white/10 transition-all duration-200 cursor-default"
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="text-[11px] font-medium text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors">
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Live indicator */}
        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-[#52525B]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Live data — updates every 5 minutes
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  )
}
