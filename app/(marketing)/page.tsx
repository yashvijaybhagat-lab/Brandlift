import { HeroSection } from '@/components/blocks/hero-section-5'
import { AnimatedBackground } from '@/components/marketing/AnimatedBackground'
import SocialProof from '@/components/marketing/SocialProof'
import GlobalReach from '@/components/marketing/GlobalReach'
import Features from '@/components/marketing/Features'
import Pricing from '@/components/marketing/Pricing'
import Footer from '@/components/marketing/Footer'

export const metadata = {
  title: 'BrandLift — Your Digital Presence, Done',
  description:
    'We build your digital presence and keep it running — you just show up. Content, videos, and profiles that actually bring in customers.',
}

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Ambient orbit background — fixed, scroll-animated */}
      <AnimatedBackground />

      {/* Page content sits above z-0 */}
      <div className="relative z-10">
        <HeroSection />
        <SocialProof />
        <GlobalReach />
        <Features />
        <Pricing />
        <Footer />
      </div>
    </div>
  )
}
