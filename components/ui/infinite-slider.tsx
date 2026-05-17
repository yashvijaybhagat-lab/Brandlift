'use client'
import { cn } from '@/lib/utils'
import { useMotionValue, animate, motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import useMeasure from 'react-use-measure'

type InfiniteSliderProps = {
  children: React.ReactNode
  gap?: number
  /** Animation duration in seconds (lower = faster) */
  duration?: number
  /** duration alias used by some block components */
  speed?: number
  durationOnHover?: number
  /** durationOnHover alias used by some block components */
  speedOnHover?: number
  direction?: 'horizontal' | 'vertical'
  reverse?: boolean
  className?: string
}

export function InfiniteSlider({
  children,
  gap = 16,
  duration,
  speed,
  durationOnHover,
  speedOnHover,
  direction = 'horizontal',
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const effectiveDuration = duration ?? speed ?? 25
  const effectiveDurationOnHover = durationOnHover ?? speedOnHover

  const [currentDuration, setCurrentDuration] = useState(effectiveDuration)
  const [ref, { width, height }] = useMeasure()
  const translation = useMotionValue(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    let controls: ReturnType<typeof animate> | undefined
    const size = direction === 'horizontal' ? width : height
    const contentSize = size + gap
    const from = reverse ? -contentSize / 2 : 0
    const to = reverse ? 0 : -contentSize / 2

    if (isTransitioning) {
      controls = animate(translation, [translation.get(), to], {
        ease: 'linear',
        duration: currentDuration * Math.abs((translation.get() - to) / contentSize),
        onComplete: () => {
          setIsTransitioning(false)
          setKey((prev) => prev + 1)
        },
      })
    } else {
      controls = animate(translation, [from, to], {
        ease: 'linear',
        duration: currentDuration,
        repeat: Infinity,
        repeatType: 'loop',
        repeatDelay: 0,
        onRepeat: () => {
          translation.set(from)
        },
      })
    }

    return controls?.stop
  }, [key, translation, currentDuration, width, height, gap, isTransitioning, direction, reverse])

  const hoverProps = effectiveDurationOnHover
    ? {
        onHoverStart: () => {
          setIsTransitioning(true)
          setCurrentDuration(effectiveDurationOnHover)
        },
        onHoverEnd: () => {
          setIsTransitioning(true)
          setCurrentDuration(effectiveDuration)
        },
      }
    : {}

  return (
    <div className={cn('overflow-hidden', className)}>
      <motion.div
        className="flex w-max"
        style={{
          ...(direction === 'horizontal' ? { x: translation } : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}
