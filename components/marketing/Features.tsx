'use client'
import { motion } from 'motion/react'
import { Sparkles, Layout, Globe, ShoppingCart, BarChart2, Lock } from 'lucide-react'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Store Builder',
    description: 'Describe your product in plain English. AI generates your entire storefront — hero section, product copy, gallery layout, and CTA — in seconds.',
    color: '#7C5CFF',
  },
  {
    icon: Layout,
    title: 'Beautiful Templates',
    description: 'Start from a curated template — Minimal, Bold, Luxury, or Tech. Every template is mobile-first and conversion-optimized.',
    color: '#5B9EFF',
  },
  {
    icon: Globe,
    title: 'Instant Store Link',
    description: 'Every store gets a free yourstore.brandlift.app subdomain. Bring your own custom domain when you\'re ready to upgrade.',
    color: '#4ADE80',
  },
  {
    icon: ShoppingCart,
    title: 'Built-in Checkout',
    description: 'Cart and checkout are built in. Customers can browse, add to cart, and buy — all on your storefront, no third-party redirects.',
    color: '#F97316',
  },
  {
    icon: BarChart2,
    title: 'Store Analytics',
    description: 'See visits, product views, add-to-carts, and conversions. Know exactly what\'s working and where visitors drop off.',
    color: '#E891B8',
  },
  {
    icon: Lock,
    title: 'Secure by Default',
    description: 'HTTPS on every store, secure checkout, and PCI-compliant payments via Stripe. Security is handled so you don\'t have to.',
    color: '#F0C45E',
  },
]

function Card({ icon: Icon, title, description, color, i }: typeof FEATURES[0] & { i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
      className="p-6 rounded-2xl flex flex-col gap-4 group"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: color + '15', border: `1px solid ${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-[#FAFAFA] mb-2">{title}</h3>
        <p className="text-[13px] text-[#71717A] leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[12px] font-semibold text-[#7C5CFF] uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-[40px] font-extrabold text-[#FAFAFA] mb-4" style={{ letterSpacing: '-0.04em' }}>
            Everything you need to sell
          </h2>
          <p className="text-[16px] text-[#71717A] max-w-lg mx-auto">
            BrandLift handles the storefront, hosting, checkout, and analytics — so you can focus on your product.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Card key={f.title} {...f} i={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
