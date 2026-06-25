import { Nav } from '@/components/marketing/Nav'
import { Hero } from '@/components/marketing/Hero'
import { Features } from '@/components/marketing/Features'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Pricing } from '@/components/marketing/Pricing'
import { Footer } from '@/components/marketing/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  )
}
