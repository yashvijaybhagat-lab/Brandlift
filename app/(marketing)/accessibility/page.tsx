import Link from 'next/link'

export const metadata = {
  title: 'Accessibility Statement — BrandLift',
  description: 'Our commitment to making BrandLift accessible to everyone.',
}

const SECTIONS = [
  {
    title: 'Our Commitment',
    body: `BrandLift is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards to achieve these goals. Our target is conformance with WCAG 2.1 Level AA.`,
  },
  {
    title: 'Measures We Take',
    body: `We include accessibility as part of our design and engineering process. Specific measures include: keyboard navigation for all interactive controls; sufficient colour contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text); visible focus indicators on all interactive elements; semantic HTML with appropriate ARIA roles and labels; descriptive alt text on all meaningful images; captions and transcripts for video content we produce; no flashing content above three flashes per second; and text that can be resized up to 200% without loss of content or function.`,
  },
  {
    title: 'Known Limitations',
    body: `While we strive for full WCAG 2.1 AA conformance, some areas may not yet fully meet that standard. Current known limitations include: the video timeline editor relies on pointer-drag interactions that may require alternative input support; user-uploaded video content may not include captions (we provide auto-captioning tools to address this); and some third-party embedded content (such as payment processors) falls outside our direct control. We are actively working to address these gaps.`,
  },
  {
    title: 'Technical Specification',
    body: `BrandLift relies on the following technologies for conformance: HTML5, CSS, JavaScript (React / Next.js), WAI-ARIA. These technologies are used in combination with the following user agents and assistive technologies: NVDA with Firefox on Windows; VoiceOver with Safari on macOS and iOS; TalkBack with Chrome on Android.`,
  },
  {
    title: 'Assessment Approach',
    body: `We assess the accessibility of BrandLift using a combination of self-evaluation against WCAG 2.1 success criteria, automated scanning tools (axe-core, Lighthouse), and manual keyboard and screen-reader testing. We intend to commission an independent third-party audit before our public launch and publish the results on this page.`,
  },
  {
    title: 'Formal Complaints',
    body: `If you are not satisfied with our response to an accessibility issue, you may contact your national or regional equality body. In the United States, you may file a complaint with the U.S. Department of Justice Civil Rights Division. In the United Kingdom, you may contact the Equality and Human Rights Commission. In the European Union, the European Disability Forum can provide guidance.`,
  },
]

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen" style={{ background: '#09090B' }}>
      <main
        className="mx-auto px-6 py-24"
        style={{ maxWidth: 720 }}
        aria-labelledby="accessibility-heading"
      >
        {/* Back nav */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-12 text-sm transition-colors duration-150"
          style={{ color: '#52525B' }}
        >
          ← Back to BrandLift
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: '#7C5CFF', letterSpacing: '0.12em' }}
          >
            Legal
          </p>
          <h1
            id="accessibility-heading"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 36,
              color: '#FAFAFA',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: 16,
            }}
          >
            Accessibility Statement
          </h1>
          <p style={{ fontSize: 13, color: '#52525B' }}>
            Last updated: June 2026 &nbsp;·&nbsp; Status: Partially conforms to WCAG 2.1 Level AA
          </p>
          <p style={{ fontSize: 16, color: '#A1A1AA', lineHeight: 1.7, marginTop: 16 }}>
            BrandLift believes that technology should work for everyone. This statement explains
            what we do to make our platform accessible and where we still have work to do.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col" style={{ gap: 40 }}>
          {SECTIONS.map((section, i) => (
            <div
              key={section.title}
              style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: i === 0 ? 0 : 40 }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 18,
                  color: '#FAFAFA',
                  letterSpacing: '-0.02em',
                  marginBottom: 12,
                }}
              >
                {section.title}
              </h2>
              <p style={{ fontSize: 15, color: '#71717A', lineHeight: 1.75 }}>
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Feedback box */}
        <div
          className="mt-16 p-6 rounded-2xl"
          style={{ background: 'rgba(124, 92, 255,0.06)', border: '0.5px solid rgba(124, 92, 255,0.15)' }}
          role="complementary"
          aria-label="Accessibility feedback"
        >
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: '#FAFAFA',
              marginBottom: 8,
            }}
          >
            Found an accessibility barrier?
          </h3>
          <p style={{ fontSize: 14, color: '#71717A', lineHeight: 1.65, marginBottom: 12 }}>
            We want to hear about it. Email us with a description of the barrier and the page or
            feature where you encountered it. We aim to respond within 5 business days and to
            provide an accessible alternative while we work on a permanent fix.
          </p>
          <a
            href="mailto:accessibility@brandlift.dev"
            style={{ color: '#818cf8', fontSize: 14, fontWeight: 600 }}
            className="hover:text-[#a5b4fc] transition-colors duration-150"
          >
            accessibility@brandlift.dev
          </a>
        </div>

        {/* Footer links */}
        <div className="mt-12 flex gap-6 flex-wrap" style={{ fontSize: 13, color: '#52525B' }}>
          <Link href="/privacy" className="hover:text-[#818cf8] transition-colors duration-150">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#818cf8] transition-colors duration-150">Terms of Service</Link>
          <Link href="/contact" className="hover:text-[#818cf8] transition-colors duration-150">Contact</Link>
        </div>
      </main>
    </div>
  )
}
