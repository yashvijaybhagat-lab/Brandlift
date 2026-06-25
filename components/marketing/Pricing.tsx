'use client'
import { motion } from 'motion/react'
import Link from 'next/link'
import { Check } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect to start. No credit card.',
    features: [
      '1 store',
      'Up to 10 products',
      'yourstore.brandlift.app subdomain',
      'AI store builder',
      'Built-in checkout',
      'Basic analytics',
      'BrandLift branding',
    ],
    cta: 'Start for free',
    href: '/sign-up',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    desc: 'For serious sellers.',
    features: [
      'Unlimited stores',
      'Unlimited products',
      'Custom domain',
      'Remove BrandLift branding',
      'Advanced analytics',
      'Priority AI generation',
      'Email support',
    ],
    cta: 'Coming soon',
    href: '#',
    highlight: true,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[12px] font-semibold text-[#7C5CFF] uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-[40px] font-extrabold text-[#FAFAFA] mb-4" style={{ letterSpacing: '-0.04em' }}>
            Free to start. Upgrade when you grow.
          </h2>
          <p className="text-[16px] text-[#71717A] max-w-lg mx-auto">
            Start completely free — no credit card, no time limit. Upgrade for custom domains and more.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 rounded-2xl flex flex-col gap-6"
              style={{
                background: plan.highlight ? 'rgba(124,92,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: plan.highlight ? '1px solid rgba(124,92,255,0.35)' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {plan.highlight && (
                <div
                  className="self-start px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'rgba(124,92,255,0.2)', color: '#B9A5FF' }}
                >
                  Coming soon
                </div>
              )}
              <div>
                <p className="text-[13px] font-medium text-[#71717A] mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[44px] font-extrabold text-[#FAFAFA]" style={{ letterSpacing: '-0.05em' }}>{plan.price}</span>
                  <span className="text-[13px] text-[#52525B]">/{plan.period}</span>
                </div>
                <p className="text-[13px] text-[#71717A] mt-1">{plan.desc}</p>
              </div>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(124,92,255,0.15)', border: '1px solid rgba(124,92,255,0.3)' }}
                    >
                      <Check className="w-2.5 h-2.5 text-[#B9A5FF]" />
                    </div>
                    <span className="text-[13px] text-[#A1A1AA]">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className="w-full text-center py-3 rounded-xl text-[14px] font-semibold transition-all duration-150"
                style={plan.highlight
                  ? { background: 'rgba(124,92,255,0.15)', color: '#B9A5FF', border: '1px solid rgba(124,92,255,0.25)', cursor: 'default' }
                  : { background: '#7C5CFF', color: 'white', boxShadow: '0 0 0 1px rgba(124,92,255,0.4), 0 4px 16px rgba(124,92,255,0.25)' }
                }
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
