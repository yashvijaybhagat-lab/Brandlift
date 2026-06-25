'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(13,13,15,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.3), 0 4px 16px rgba(124,92,255,0.3)' }}
          >
            <svg viewBox="0 0 28 28" fill="none" width="18" height="18">
              <path d="M4 5h8a4 4 0 0 1 0 8H4V5zm0 8h8.5a4.5 4.5 0 0 1 0 9H4V13z" fill="white" opacity="0.95" />
            </svg>
          </div>
          <span className="font-bold text-[17px] text-[#FAFAFA]" style={{ letterSpacing: '-0.03em' }}>BrandLift</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] text-[#71717A] hover:text-[#FAFAFA] transition-colors duration-150">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/sign-in" className="text-[13px] text-[#71717A] hover:text-[#FAFAFA] transition-colors duration-150">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all duration-150 hover:opacity-90"
            style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4), 0 4px 16px rgba(124,92,255,0.25)' }}
          >
            Start for free
          </Link>
        </div>

        <button className="md:hidden p-2 text-[#71717A] hover:text-[#FAFAFA]" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t px-6 py-4 flex flex-col gap-4"
            style={{ background: 'rgba(13,13,15,0.98)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[14px] text-[#A1A1AA]" onClick={() => setOpen(false)}>{l.label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <Link href="/sign-in" className="text-center py-2.5 rounded-xl text-[13px] text-[#71717A] border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Sign in</Link>
              <Link href="/sign-up" className="text-center py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: '#7C5CFF' }}>Start for free</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
