'use client'
import { motion } from 'motion/react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

const STORE_EXAMPLES = [
  { name: 'Peak Coffee', tag: 'Coffee', color: '#C8873A' },
  { name: 'Nova Skincare', tag: 'Beauty', color: '#E891B8' },
  { name: 'Forge Tools', tag: 'Hardware', color: '#5B9EFF' },
  { name: 'Luma Candles', tag: 'Home', color: '#F0C45E' },
]

function StoreCard({ name, tag, color, delay }: { name: string; tag: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
    >
      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: color + '33', border: `1px solid ${color}44` }} />
      <div>
        <p className="text-[13px] font-semibold text-[#FAFAFA]">{name}</p>
        <p className="text-[11px] text-[#52525B]">{tag}</p>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        <span className="text-[11px] text-[#52525B]">Live</span>
      </div>
    </motion.div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{ width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,255,0.18) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -60%)' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center py-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.25)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B9A5FF]" />
            <span className="text-[12px] font-medium text-[#B9A5FF]">AI-powered store builder</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease: [0.23, 1, 0.32, 1] }}
            className="text-[52px] md:text-[64px] font-extrabold leading-[1.05] mb-6"
            style={{ letterSpacing: '-0.04em', color: '#FAFAFA' }}
          >
            Your product.{' '}
            <span style={{ color: '#7C5CFF' }}>Your store.</span>{' '}
            Live in minutes.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className="text-[17px] text-[#71717A] mb-10 leading-relaxed max-w-md"
          >
            Describe your product and let AI generate a full storefront — hero, gallery, copy, checkout. Or pick a template and fill it in. Free forever.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-3 flex-wrap"
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4), 0 8px 32px rgba(124,92,255,0.35)' }}
            >
              Build your store
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how-it-works" className="text-[14px] text-[#71717A] hover:text-[#FAFAFA] transition-colors duration-150">
              See how it works →
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-6 text-[12px] text-[#3f3f46]"
          >
            No credit card required · Free custom subdomain · Live in under 5 minutes
          </motion.p>
        </div>

        <div className="flex flex-col gap-3">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-[11px] font-semibold text-[#3f3f46] uppercase tracking-widest mb-1"
          >
            Stores built on BrandLift
          </motion.p>
          {STORE_EXAMPLES.map((s, i) => (
            <StoreCard key={s.name} {...s} delay={0.3 + i * 0.08} />
          ))}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="mt-2 p-4 rounded-2xl"
            style={{ background: 'rgba(124,92,255,0.06)', border: '1px solid rgba(124,92,255,0.15)' }}
          >
            <p className="text-[12px] text-[#71717A]">
              <span className="text-[#B9A5FF] font-semibold">AI Store Builder</span> — describe your product in plain English and get a complete storefront in seconds.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
