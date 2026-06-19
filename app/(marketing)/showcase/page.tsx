// @ts-nocheck
'use client'

/**
 * /showcase — live gallery of every React Bits effect integrated into BrandLift,
 * themed to the BrandLift violet→pink→cyan palette. Internal reference + "what's
 * possible" page. All 30 components are rendered here so each one is wired and
 * previewable in the app.
 */
import Link from 'next/link'
import { useEffect, useState } from 'react'

import ShinyText from '@/components/reactbits/ShinyText'
import BlurText from '@/components/reactbits/BlurText'
import GradientText from '@/components/reactbits/GradientText'
import CountUp from '@/components/reactbits/CountUp'
import ScrollFloat from '@/components/reactbits/ScrollFloat'
import ScrollReveal from '@/components/reactbits/ScrollReveal'
import SplitText from '@/components/reactbits/SplitText'
import TrueFocus from '@/components/reactbits/TrueFocus'
import RotatingText from '@/components/reactbits/RotatingText'
import Aurora from '@/components/reactbits/Aurora'
import Particles from '@/components/reactbits/Particles'
import Silk from '@/components/reactbits/Silk'
import Orb from '@/components/reactbits/Orb'
import Threads from '@/components/reactbits/Threads'
import Iridescence from '@/components/reactbits/Iridescence'
import Waves from '@/components/reactbits/Waves'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import AnimatedList from '@/components/reactbits/AnimatedList'
import TiltedCard from '@/components/reactbits/TiltedCard'
import BorderGlow from '@/components/reactbits/BorderGlow'
import GhostCursor from '@/components/reactbits/GhostCursor'
import GlareHover from '@/components/reactbits/GlareHover'
import FadeContent from '@/components/reactbits/FadeContent'
import Magnet from '@/components/reactbits/Magnet'
import ClickSpark from '@/components/reactbits/ClickSpark'
import StarBorder from '@/components/reactbits/StarBorder'
import PixelTransition from '@/components/reactbits/PixelTransition'
import ProfileCard from '@/components/reactbits/ProfileCard'
import FlowingMenu from '@/components/reactbits/FlowingMenu'
import ChromaGrid from '@/components/reactbits/ChromaGrid'

const VIOLET = '#7C5CFF'
const PINK = '#FF6FD8'
const CYAN = '#22D3EE'
const STOPS: [string, string, string] = [VIOLET, PINK, CYAN]

function Demo({ title, children, tall = false }: { title: string; children: React.ReactNode; tall?: boolean }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
    >
      <span className="text-label" style={{ color: 'var(--text-muted)' }}>
        {title}
      </span>
      <div
        className="flex items-center justify-center rounded-xl overflow-hidden"
        style={{ minHeight: tall ? 360 : 200, background: 'var(--base)', border: '1px solid var(--border-subtle)' }}
      >
        {children}
      </div>
    </div>
  )
}

const FLOWING_ITEMS = [
  { link: '#', text: 'Reels', image: 'https://picsum.photos/600/400?random=1' },
  { link: '#', text: 'TikTok', image: 'https://picsum.photos/600/400?random=2' },
  { link: '#', text: 'Shorts', image: 'https://picsum.photos/600/400?random=3' },
]

const CHROMA_ITEMS = [
  { image: 'https://i.pravatar.cc/300?img=12', title: 'Maya R.', subtitle: 'Bakery owner', handle: '@mayabakes', borderColor: VIOLET, gradient: `linear-gradient(145deg, ${VIOLET}, #000)`, url: '#' },
  { image: 'https://i.pravatar.cc/300?img=32', title: 'Devon K.', subtitle: 'Barber', handle: '@devoncuts', borderColor: PINK, gradient: `linear-gradient(210deg, ${PINK}, #000)`, url: '#' },
  { image: 'https://i.pravatar.cc/300?img=45', title: 'Sara L.', subtitle: 'Yoga studio', handle: '@flowwithsara', borderColor: CYAN, gradient: `linear-gradient(165deg, ${CYAN}, #000)`, url: '#' },
]

export default function ShowcasePage() {
  // Client-only render: this gallery mounts 8 WebGL canvases; skip SSR entirely.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <main style={{ background: 'var(--base)', minHeight: '100vh' }} />

  return (
    <main style={{ background: 'var(--base)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-12">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            ← Back to BrandLift
          </Link>
          <GradientText colors={[VIOLET, PINK, CYAN, VIOLET]} animationSpeed={6} className="text-5xl font-extrabold">
            BrandLift Effects
          </GradientText>
          <ShinyText
            text="Every React Bits component, themed to BrandLift — 30 live effects."
            color="#8b86a8"
            shineColor="#ffffff"
            speed={3}
            className="text-lg"
          />
        </div>

        {/* Text effects */}
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Demo title="ShinyText">
            <ShinyText text="✨ Polished in minutes" color="#9a93c0" shineColor={PINK} speed={2.5} className="text-2xl font-bold" />
          </Demo>
          <Demo title="GradientText">
            <GradientText colors={[VIOLET, PINK, CYAN, VIOLET]} animationSpeed={5} className="text-2xl font-bold">
              More customers, less filming
            </GradientText>
          </Demo>
          <Demo title="BlurText">
            <BlurText text="Raw footage to polished content" animateBy="words" className="text-2xl font-bold text-white justify-center" />
          </Demo>
          <Demo title="RotatingText">
            <div className="flex items-center gap-2 text-2xl font-bold text-white">
              Made for
              <RotatingText
                texts={['barbers', 'bakeries', 'gyms', 'food trucks']}
                mainClassName="px-2 bg-[#7C5CFF] text-white rounded-lg py-0.5 overflow-hidden justify-center"
                staggerFrom="last"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-120%' }}
                staggerDuration={0.025}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                rotationInterval={2200}
              />
            </div>
          </Demo>
          <Demo title="CountUp">
            <div className="flex flex-col items-center text-white">
              <span className="text-5xl font-extrabold" style={{ color: VIOLET }}>
                <CountUp to={10} duration={2} />×
              </span>
              <span className="text-sm text-white/50">more content output</span>
            </div>
          </Demo>
          <Demo title="TrueFocus">
            <TrueFocus sentence="Shoot Edit Post" borderColor={VIOLET} glowColor="rgba(124,92,255,0.6)" animationDuration={0.5} />
          </Demo>
          <Demo title="SplitText">
            <SplitText text="Hello, creator!" className="text-2xl font-bold text-white" splitType="chars" />
          </Demo>
          <Demo title="ScrollFloat">
            <ScrollFloat textClassName="!text-3xl text-white">BrandLift</ScrollFloat>
          </Demo>
          <Demo title="ScrollReveal">
            <ScrollReveal baseOpacity={0.1} enableBlur baseRotation={4} blurStrength={8} textClassName="!text-xl text-white">
              Turn raw clips into content that actually converts.
            </ScrollReveal>
          </Demo>
        </section>

        {/* Backgrounds (WebGL) */}
        <h2 className="text-label" style={{ color: 'var(--text-muted)' }}>Backgrounds</h2>
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Aurora', node: <Aurora colorStops={STOPS} amplitude={1.1} blend={0.5} /> },
            { title: 'Particles', node: <Particles particleColors={[VIOLET, PINK, CYAN]} particleCount={160} moveParticlesOnHover alphaParticles /> },
            { title: 'Silk', node: <Silk color="#3a2a6e" speed={4} scale={1} noiseIntensity={1.4} /> },
            { title: 'Orb', node: <Orb hue={265} hoverIntensity={0.4} rotateOnHover backgroundColor="#08060F" /> },
            { title: 'Threads', node: <Threads color={[0.49, 0.36, 1]} amplitude={1.2} distance={0} enableMouseInteraction /> },
            { title: 'Iridescence', node: <Iridescence color={[0.49, 0.36, 1]} amplitude={0.1} speed={1} /> },
          ].map(({ title, node }) => (
            <Demo key={title} title={title}>
              <div className="relative w-full" style={{ height: 200 }}>{node}</div>
            </Demo>
          ))}
          <Demo title="Waves">
            <div className="relative w-full" style={{ height: 200 }}>
              <Waves lineColor="rgba(124,92,255,0.6)" backgroundColor="transparent" />
            </div>
          </Demo>
          <Demo title="GhostCursor (hover)">
            <div className="relative w-full flex items-center justify-center text-white/60" style={{ height: 200 }}>
              Move your cursor here
              <GhostCursor color={PINK} brightness={1.1} />
            </div>
          </Demo>
        </section>

        {/* Cards & interactions */}
        <h2 className="text-label" style={{ color: 'var(--text-muted)' }}>Cards &amp; interactions</h2>
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Demo title="SpotlightCard">
            <SpotlightCard className="w-full !bg-transparent" spotlightColor="rgba(124,92,255,0.25)">
              <h3 className="text-white text-lg font-semibold">AI color grading</h3>
              <p className="text-white/50 text-sm mt-2">Hover to see the spotlight track your cursor.</p>
            </SpotlightCard>
          </Demo>
          <Demo title="BorderGlow">
            <BorderGlow glowColor="270 90 70" backgroundColor="#110E1C" colors={[VIOLET, PINK, CYAN]} className="w-full">
              <div className="p-6">
                <h3 className="text-white text-lg font-semibold">Auto-captions</h3>
                <p className="text-white/50 text-sm mt-2">Move near the edges for the glow.</p>
              </div>
            </BorderGlow>
          </Demo>
          <Demo title="GlareHover">
            <GlareHover width="100%" height="180px" background="#110E1C" borderColor="#251E42" glareColor="#ffffff" glareOpacity={0.25}>
              <span className="text-white text-xl font-bold">Hover me</span>
            </GlareHover>
          </Demo>
          <Demo title="TiltedCard">
            <TiltedCard
              imageSrc="https://picsum.photos/seed/brandlift/300/300"
              containerHeight="200px"
              containerWidth="200px"
              imageHeight="200px"
              imageWidth="200px"
              rotateAmplitude={12}
              scaleOnHover={1.1}
              showMobileWarning={false}
              showTooltip
              captionText="BrandLift"
            />
          </Demo>
          <Demo title="Magnet">
            <Magnet padding={80} magnetStrength={4}>
              <span className="inline-block px-6 py-3 rounded-xl font-semibold text-white" style={{ background: VIOLET }}>
                Pull me
              </span>
            </Magnet>
          </Demo>
          <Demo title="StarBorder">
            <StarBorder as="button" color={PINK} speed="5s" thickness={2}>
              Get started free
            </StarBorder>
          </Demo>
          <Demo title="ClickSpark">
            <ClickSpark sparkColor={CYAN} sparkCount={10} sparkRadius={20} sparkSize={12}>
              <div className="w-full h-[180px] flex items-center justify-center text-white/60">Click anywhere</div>
            </ClickSpark>
          </Demo>
          <Demo title="FadeContent">
            <FadeContent blur duration={800} className="w-full text-center">
              <p className="text-white text-lg font-semibold">Fades in on scroll</p>
            </FadeContent>
          </Demo>
          <Demo title="PixelTransition">
            <PixelTransition
              className="!w-[220px] !border-[#251E42]"
              gridSize={10}
              pixelColor={VIOLET}
              firstContent={
                <div className="w-full h-full grid place-items-center" style={{ background: '#110E1C' }}>
                  <span className="text-white/70">Before</span>
                </div>
              }
              secondContent={
                <div className="w-full h-full grid place-items-center" style={{ background: VIOLET }}>
                  <span className="text-white font-bold">After ✨</span>
                </div>
              }
            />
          </Demo>
          <Demo title="AnimatedList">
            <AnimatedList
              items={['Upload footage', 'AI enhance', 'Auto-caption', 'Export 4K', 'Post everywhere']}
              className="!w-full"
              displayScrollbar={false}
            />
          </Demo>
        </section>

        {/* Larger components */}
        <h2 className="text-label" style={{ color: 'var(--text-muted)' }}>Showpieces</h2>
        <section className="grid gap-5 lg:grid-cols-2">
          <Demo title="ProfileCard" tall>
            <ProfileCard
              name="Maya Rivera"
              title="Bakery owner"
              handle="mayabakes"
              status="Growing"
              contactText="Follow"
              avatarUrl="https://i.pravatar.cc/400?img=12"
              showUserInfo
              enableTilt
            />
          </Demo>
          <Demo title="FlowingMenu" tall>
            <div className="w-full" style={{ height: 360 }}>
              <FlowingMenu items={FLOWING_ITEMS} bgColor="#110E1C" textColor="#ffffff" marqueeBgColor={VIOLET} marqueeTextColor="#08060F" borderColor="#251E42" />
            </div>
          </Demo>
        </section>
        <Demo title="ChromaGrid" tall>
          <div className="w-full" style={{ minHeight: 480 }}>
            <ChromaGrid items={CHROMA_ITEMS} radius={300} columns={3} rows={1} />
          </div>
        </Demo>
      </div>
    </main>
  )
}
