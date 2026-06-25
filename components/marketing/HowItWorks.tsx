'use client'
import { motion } from 'motion/react'

const STEPS = [
  {
    n: '01',
    title: 'Create your store',
    desc: 'Sign up, pick a name, and describe your product. AI generates your full storefront in seconds — or choose from a template.',
  },
  {
    n: '02',
    title: 'Add your products',
    desc: 'Upload photos, set a price, write a description (or let AI write it). Add variants like size or color. Publish instantly.',
  },
  {
    n: '03',
    title: 'Share your link',
    desc: 'Your store is live at yourname.brandlift.app the moment you publish. Share it anywhere — social, email, DMs.',
  },
  {
    n: '04',
    title: 'Get orders',
    desc: 'Customers browse, add to cart, and check out on your store. You get notified and can manage orders from your dashboard.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[12px] font-semibold text-[#7C5CFF] uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-[40px] font-extrabold text-[#FAFAFA] mb-4" style={{ letterSpacing: '-0.04em' }}>
            From idea to live store in 5 minutes
          </h2>
          <p className="text-[16px] text-[#71717A] max-w-lg mx-auto">
            No code. No design experience needed. Just describe your product and go.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.23, 1, 0.32, 1] }}
              className="relative"
            >
              {i < STEPS.length - 1 && (
                <div
                  className="hidden lg:block absolute top-8 left-full w-6 h-px"
                  style={{ background: 'linear-gradient(to right, rgba(124,92,255,0.3), transparent)', zIndex: 1 }}
                />
              )}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)' }}
              >
                <span className="text-[18px] font-extrabold text-[#7C5CFF]" style={{ letterSpacing: '-0.05em' }}>{step.n}</span>
              </div>
              <h3 className="text-[16px] font-semibold text-[#FAFAFA] mb-2">{step.title}</h3>
              <p className="text-[13px] text-[#71717A] leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
