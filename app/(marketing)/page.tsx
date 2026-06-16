import type { Metadata } from 'next'
import { HeroSection } from '@/components/blocks/hero-section-5'
import { AnimatedBackground } from '@/components/marketing/AnimatedBackground'
import SocialProof from '@/components/marketing/SocialProof'
import GlobalReach from '@/components/marketing/GlobalReach'
import HowItWorks from '@/components/marketing/HowItWorks'
import Features from '@/components/marketing/Features'
import Pricing from '@/components/marketing/Pricing'
import FAQ from '@/components/marketing/FAQ'
import Footer from '@/components/marketing/Footer'

export const metadata: Metadata = {
  // `absolute` bypasses the "%s — BrandLift" template so the brand name isn't doubled.
  title: { absolute: 'BrandLift — Turn Raw Footage Into Polished Content in Minutes' },
  description:
    'AI-powered video editing for small businesses. Upload your raw iPhone clips, get back professional content for TikTok, Instagram, and YouTube. Free during beta.',
  alternates: { canonical: '/' },
}

export default function LandingPage() {
  return (
    <div className="relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <HeroSection />
        <SocialProof />
        <GlobalReach />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <Footer />
      </div>
    </div>
  )
}
