'use client'
import { useScroll, useTransform, motion } from 'motion/react'

export function AnimatedBackground() {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.65, 1], [1, 0.5, 0.1])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const blobY = useTransform(scrollYProgress, [0, 1], [0, 80])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Dot matrix */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Animated blob layer */}
      <motion.div className="absolute inset-0" style={{ opacity, scale }}>
        {/* Top-left primary blob */}
        <motion.div
          className="absolute rounded-full"
          style={{
            y: blobY,
            top: '-30%',
            left: '-20%',
            width: '70%',
            height: '80%',
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.13) 0%, transparent 68%)',
            filter: 'blur(55px)',
          }}
          animate={{ x: [0, 35, -18, 0], y: [0, -25, 22, 0], scale: [1, 1.04, 0.97, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Bottom-right violet blob */}
        <motion.div
          className="absolute rounded-full"
          style={{
            bottom: '-20%',
            right: '-15%',
            width: '60%',
            height: '65%',
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.09) 0%, transparent 68%)',
            filter: 'blur(75px)',
          }}
          animate={{ x: [0, -45, 22, 0], y: [0, 35, -18, 0], scale: [1, 1.07, 0.94, 1] }}
          transition={{ duration: 29, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        />

        {/* Center soft accent */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: '25%',
            left: '28%',
            width: '48%',
            height: '50%',
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.05) 0%, transparent 68%)',
            filter: 'blur(90px)',
          }}
          animate={{ x: [0, 20, -12, 0], y: [0, -18, 28, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut', delay: 11 }}
        />
      </motion.div>

      {/* Horizontal vignette fade at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '35%',
          background: 'linear-gradient(to bottom, transparent, #0A0A0B)',
        }}
      />

      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 85% at 50% 45%, transparent 55%, #0A0A0B 100%)',
        }}
      />
    </div>
  )
}
