import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — BrandLift',
  description: 'The terms governing your use of BrandLift.',
}

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: `By creating an account or using BrandLift in any way, you agree to these Terms of Service. If you are using BrandLift on behalf of a business, you represent that you have the authority to bind that business to these terms. If you do not agree, do not use BrandLift.`,
  },
  {
    title: 'Your Account',
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must be at least 18 years old to create an account. Notify us immediately at contact@brandlift.dev if you suspect unauthorised access.`,
  },
  {
    title: 'Acceptable Use',
    body: `You may use BrandLift only for lawful purposes and in accordance with these terms. You agree not to: upload content that infringes third-party intellectual property; use BrandLift to generate misleading, defamatory, or illegal content; attempt to reverse-engineer or disrupt our systems; share your account with others on paid plans beyond what your plan allows; or resell BrandLift without a white-label agreement.`,
  },
  {
    title: 'Your Content',
    body: `You retain full ownership of the content you upload. By uploading content, you grant BrandLift a limited, non-exclusive licence to process and transform that content solely to deliver the services you request. We do not claim ownership of your content and will not use it for any purpose outside of providing BrandLift services.`,
  },
  {
    title: 'AI-Generated Content',
    body: `BrandLift uses AI to generate marketing content based on your inputs. You are solely responsible for reviewing and approving all AI-generated content before publishing or distributing it. BrandLift does not guarantee the accuracy, originality, or legal clearance of AI outputs. Always verify that generated content complies with applicable laws and platform policies.`,
  },
  {
    title: 'Subscription & Billing',
    body: `Paid plans are billed monthly or annually in advance. Prices are listed on our pricing page and may change with 30 days notice. You may cancel at any time; cancellation takes effect at the end of your current billing period. We do not offer refunds for partial billing periods, except where required by law.`,
  },
  {
    title: 'Free Plan Limits',
    body: `The Starter (Free) plan is subject to usage limits stated on the pricing page. We reserve the right to throttle or suspend free accounts that place excessive load on our systems. We will notify you before suspension and offer the opportunity to upgrade.`,
  },
  {
    title: 'Intellectual Property',
    body: `BrandLift and its original content, features, and technology are owned by BrandLift Inc. and are protected by copyright, trademark, and other laws. You may not use our name, logo, or branding without prior written permission, except as permitted by a white-label agreement.`,
  },
  {
    title: 'Disclaimers',
    body: `BrandLift is provided "as is" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that AI outputs will meet your specific requirements. Your use of BrandLift is at your own risk.`,
  },
  {
    title: 'Limitation of Liability',
    body: `To the maximum extent permitted by law, BrandLift Inc. shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total aggregate liability shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    title: 'Termination',
    body: `We may suspend or terminate your account for material breach of these terms, including but not limited to uploading illegal content or engaging in abuse. You may delete your account at any time from your account settings. Termination does not entitle you to a refund of prepaid fees.`,
  },
  {
    title: 'Indemnification',
    body: `You agree to indemnify, defend, and hold harmless BrandLift Inc. and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any way connected with: (a) your use of BrandLift; (b) your violation of these terms; (c) content you upload, submit, or transmit through BrandLift; or (d) your violation of any third-party right, including any intellectual property or privacy right. BrandLift reserves the right, at its own expense, to assume the exclusive defence and control of any matter subject to indemnification by you.`,
  },
  {
    title: 'Content Reporting',
    body: `If you encounter content on BrandLift that you believe violates these terms, infringes your intellectual property, or is otherwise unlawful, please report it by emailing abuse@brandlift.dev with the subject line "Content Report." Include a description of the content at issue and, if applicable, the URL or account identifier. We will review all reports and take appropriate action, which may include removing content or suspending accounts, within a reasonable timeframe.`,
  },
  {
    title: 'DMCA Takedown',
    body: `BrandLift respects intellectual property rights. If you believe that content on BrandLift infringes your copyright, please send a written notice to our designated DMCA agent at dmca@brandlift.dev containing: (1) a description of the copyrighted work you claim has been infringed; (2) identification of the infringing material and its location on BrandLift; (3) your contact information (name, address, email, phone); (4) a statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent, or law; and (5) a statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorised to act on their behalf. Upon receiving a valid DMCA notice, we will remove or disable access to the alleged infringing content and notify the uploader, who may submit a counter-notice.`,
  },
  {
    title: 'Dispute Resolution & Arbitration',
    body: `PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS. Any dispute, claim, or controversy arising out of or relating to these terms or your use of BrandLift that cannot be resolved informally (by emailing contact@brandlift.dev and giving us 30 days to respond) shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. The arbitration shall take place in Austin, Texas, or by video if mutually agreed. Each party shall bear its own costs. You may opt out of this arbitration agreement within 30 days of first accepting these terms by emailing arbitration-opt-out@brandlift.dev. Nothing in this clause prevents either party from seeking injunctive or other equitable relief in court for intellectual property violations.`,
  },
  {
    title: 'Governing Law',
    body: `These terms are governed by the laws of the State of Texas, United States, without regard to conflict-of-law principles. Subject to the arbitration clause above, any disputes not subject to arbitration shall be resolved in the state or federal courts located in Austin, Texas, and you consent to personal jurisdiction there.`,
  },
]

export default function TermsPage() {
  return (
    <div style={{ background: '#0A0A0B', minHeight: '100vh' }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(16px)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
      >
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#6366f1', letterSpacing: '-0.03em' }}>
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
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '0.5px solid rgba(99,102,241,0.2)' }}
          >
            Legal
          </div>
          <h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '-0.04em', color: '#FAFAFA', lineHeight: 1.05 }}
          >
            Terms of Service
          </h1>
          <p style={{ fontSize: 14, color: '#52525B', marginTop: 12 }}>
            Last updated: June 11, 2026 · Effective immediately
          </p>
        </div>

        <p style={{ fontSize: 16, color: '#A1A1AA', lineHeight: 1.7, marginBottom: 48 }}>
          Please read these terms carefully before using BrandLift. They govern your relationship with BrandLift Inc. and outline both your rights and your responsibilities.
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
          style={{ background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.15)' }}
        >
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#FAFAFA', marginBottom: 8 }}>
            Questions about these terms?
          </h3>
          <p style={{ fontSize: 14, color: '#71717A', lineHeight: 1.65 }}>
            Email us at{' '}
            <a href="mailto:contact@brandlift.dev" style={{ color: '#818cf8' }} className="hover:text-[#a5b4fc] transition-colors duration-150">
              contact@brandlift.dev
            </a>
            {' '}and we&apos;ll get back to you within 2 business days.
          </p>
        </div>
      </main>
    </div>
  )
}
