import Hero from '@/components/marketing/Hero'
import SocialProof from '@/components/marketing/SocialProof'
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
    <>
      <Hero />
      <SocialProof />
      <Features />
      <Pricing />
      <Footer />
    </>
  )
}
