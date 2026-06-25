import Link from 'next/link'

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center text-center px-6">
      <div>
        <p className="text-[12px] font-semibold text-[#7C5CFF] uppercase tracking-widest mb-3">Store not found</p>
        <h1 className="text-[40px] font-extrabold text-[#FAFAFA] mb-4" style={{ letterSpacing: '-0.04em' }}>
          This store doesn&apos;t exist
        </h1>
        <p className="text-[16px] text-[#71717A] mb-8">
          The store URL you visited doesn&apos;t match any active store on BrandLift.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: '#7C5CFF' }}
        >
          Start your own store →
        </Link>
      </div>
    </div>
  )
}
