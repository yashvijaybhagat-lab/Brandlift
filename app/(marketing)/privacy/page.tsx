import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — BrandLift',
  description: 'How BrandLift collects, uses, and protects your data.',
}

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: `We collect information you provide directly — your name, email address, business details, and content you upload for processing. We also collect usage data (pages visited, features used, session duration) to improve the product, and technical data such as IP address, browser type, and device identifiers.`,
  },
  {
    title: 'How We Use Your Information',
    body: `We use your data to operate and improve BrandLift, generate AI-powered content tailored to your business, send product updates and marketing emails (you can opt out at any time), provide customer support, and comply with legal obligations. We do not sell your personal data to third parties.`,
  },
  {
    title: 'AI Processing',
    body: `Content you upload (videos, images, text) is processed by our AI systems to generate marketing material. This content is stored securely and used solely to deliver your requested outputs. We do not use your business content to train shared AI models without explicit consent.`,
  },
  {
    title: 'Data Sharing',
    body: `We share data only with trusted service providers who help us operate BrandLift (cloud hosting, payment processing, analytics). These providers are contractually bound to protect your data. We may disclose data when required by law or to protect the rights and safety of our users.`,
  },
  {
    title: 'Data Retention',
    body: `We retain your account data for as long as your account is active. If you delete your account, we remove your personal data within 30 days, except where retention is required by law. Aggregated, anonymised analytics data may be retained indefinitely.`,
  },
  {
    title: 'Your Rights',
    body: `You have the right to access, correct, or delete your personal data at any time. You may also request a portable copy of your data or object to certain processing. To exercise these rights, contact us at contact@brandlift.dev. We will respond within 30 days.`,
  },
  {
    title: 'Cookies',
    body: `We use essential cookies to keep you signed in and remember your preferences, and analytics cookies to understand how BrandLift is used. You can disable non-essential cookies in your browser settings at any time without affecting core functionality.`,
  },
  {
    title: 'Security',
    body: `We protect your data with industry-standard encryption in transit (TLS) and at rest. Access to personal data is restricted to authorised personnel. Despite these measures, no system is 100% secure — please use a strong, unique password for your account.`,
  },
  {
    title: 'Changes to This Policy',
    body: `We may update this policy as our product evolves. We will notify you of material changes by email or via an in-app notice at least 14 days before they take effect. Continued use of BrandLift after that date constitutes acceptance of the revised policy.`,
  },
]

export default function PrivacyPage() {
  return (
    <div style={{ background: '#08060F', minHeight: '100vh' }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(16px)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
      >
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#7C5CFF', letterSpacing: '-0.03em' }}>
          BrandLift
        </Link>
        <Link
          href="/"
          style={{ fontSize: 13, color: '#71717A' }}
          className="transition-colors duration-150 hover:text-[#FAFAFA]"
        >
          ← Back to home
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div
            className="inline-block text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5"
            style={{ background: 'rgba(124, 92, 255,0.1)', color: '#818cf8', border: '0.5px solid rgba(124, 92, 255,0.2)' }}
          >
            Legal
          </div>
          <h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '-0.04em', color: '#FAFAFA', lineHeight: 1.05 }}
          >
            Privacy Policy
          </h1>
          <p style={{ fontSize: 14, color: '#52525B', marginTop: 12 }}>
            Last updated: May 16, 2026 · Effective immediately
          </p>
        </div>

        {/* Intro */}
        <p style={{ fontSize: 16, color: '#A1A1AA', lineHeight: 1.7, marginBottom: 48 }}>
          BrandLift Inc. (&quot;BrandLift&quot;, &quot;we&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains what data we collect, why we collect it, and how we keep it safe.
        </p>

        {/* Sections */}
        <div className="flex flex-col" style={{ gap: 40 }}>
          {SECTIONS.map((section, i) => (
            <div key={section.title} style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: i === 0 ? 0 : 40 }}>
              <h2
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#FAFAFA', letterSpacing: '-0.02em', marginBottom: 12 }}
              >
                {section.title}
              </h2>
              <p style={{ fontSize: 15, color: '#71717A', lineHeight: 1.75 }}>
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div
          className="mt-16 p-6 rounded-2xl"
          style={{ background: 'rgba(124, 92, 255,0.06)', border: '0.5px solid rgba(124, 92, 255,0.15)' }}
        >
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#FAFAFA', marginBottom: 8 }}>
            Questions about this policy?
          </h3>
          <p style={{ fontSize: 14, color: '#71717A', lineHeight: 1.65 }}>
            Email us at{' '}
            <a href="mailto:contact@brandlift.dev" style={{ color: '#818cf8' }} className="hover:text-[#a5b4fc] transition-colors duration-150">
              contact@brandlift.dev
            </a>
            {' '}and we&apos;ll respond within 2 business days.
          </p>
        </div>
      </main>
    </div>
  )
}
