'use client'
import Link from 'next/link'

export function Footer() {
  return (
    <footer
      className="py-12 mt-8"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#7C5CFF' }}
          >
            <svg viewBox="0 0 28 28" fill="none" width="16" height="16">
              <path d="M4 5h8a4 4 0 0 1 0 8H4V5zm0 8h8.5a4.5 4.5 0 0 1 0 9H4V13z" fill="white" opacity="0.95" />
            </svg>
          </div>
          <span className="font-bold text-[15px] text-[#FAFAFA]" style={{ letterSpacing: '-0.03em' }}>BrandLift</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/privacy" className="text-[13px] text-[#52525B] hover:text-[#A1A1AA] transition-colors duration-150">Privacy</Link>
          <Link href="/terms" className="text-[13px] text-[#52525B] hover:text-[#A1A1AA] transition-colors duration-150">Terms</Link>
          <Link href="/contact" className="text-[13px] text-[#52525B] hover:text-[#A1A1AA] transition-colors duration-150">Contact</Link>
        </div>

        <p className="text-[12px] text-[#3f3f46]">
          Made by Yash Bhagat & Ansh Thakar
        </p>
      </div>
    </footer>
  )
}
