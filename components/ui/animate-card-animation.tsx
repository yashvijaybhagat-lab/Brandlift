"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, Video, Lightbulb } from "lucide-react"

interface Card {
  id: number
  contentType: 1 | 2 | 3
}

const cardData = {
  1: {
    title: "Content Ideas",
    description: "AI-generated hooks & scripts",
    icon: Lightbulb,
    stat: "24 ideas this week",
    color: "#6366f1",
  },
  2: {
    title: "My Videos",
    description: "Published & scheduled content",
    icon: Video,
    stat: "8 videos published",
    color: "#8b5cf6",
  },
  3: {
    title: "Growth Stats",
    description: "Est. reach & engagement",
    icon: TrendingUp,
    stat: "+28% reach this month",
    color: "#06b6d4",
  },
}

const initialCards: Card[] = [
  { id: 1, contentType: 1 },
  { id: 2, contentType: 2 },
  { id: 3, contentType: 3 },
]

const positionStyles = [
  { scale: 1, y: 12 },
  { scale: 0.95, y: -16 },
  { scale: 0.9, y: -44 },
]

const exitAnimation = { y: 340, scale: 1, zIndex: 10 }
const enterAnimation = { y: -16, scale: 0.9 }

function CardContent({ contentType }: { contentType: 1 | 2 | 3 }) {
  const data = cardData[contentType]
  const Icon = data.icon

  return (
    <div className="flex h-full w-full flex-col gap-4">
      {/* Visual panel */}
      <div
        className="flex h-[180px] w-full items-center justify-center overflow-hidden rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${data.color}15 0%, ${data.color}08 100%)`,
          border: `1px solid ${data.color}25`,
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `${data.color}20`, border: `1px solid ${data.color}30` }}
          >
            <Icon className="w-6 h-6" style={{ color: data.color }} />
          </div>
          <span
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ background: `${data.color}15`, color: data.color, border: `1px solid ${data.color}25` }}
          >
            {data.stat}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex w-full items-center justify-between gap-2 px-3 pb-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-[#e2e8f0] text-sm">{data.title}</span>
          <span className="text-[#64748b] text-xs mt-0.5">{data.description}</span>
        </div>
        <button
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full pl-3 pr-2.5 text-xs font-medium text-[#0a0a0f] transition-opacity hover:opacity-90"
          style={{ background: data.color }}
        >
          View
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
            <path d="M9.5 18L15.5 12L9.5 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function AnimatedCard({ card, index, isAnimating }: { card: Card; index: number; isAnimating: boolean }) {
  const { scale, y } = positionStyles[index] ?? positionStyles[2]
  const zIndex = index === 0 && isAnimating ? 10 : 3 - index
  const exitAnim = index === 0 ? exitAnimation : undefined
  const initialAnim = index === 2 ? enterAnimation : undefined

  return (
    <motion.div
      key={card.id}
      initial={initialAnim}
      animate={{ y, scale }}
      exit={exitAnim}
      transition={{ type: "spring", duration: 1, bounce: 0 }}
      style={{
        zIndex,
        left: "50%",
        x: "-50%",
        bottom: 0,
      }}
      className="absolute flex h-[260px] w-[300px] items-center justify-center overflow-hidden rounded-t-xl will-change-transform sm:w-[440px]"
    >
      <div className="w-full h-full p-1" style={{ background: "#0f0f14", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "inherit" }}>
        <CardContent contentType={card.contentType} />
      </div>
    </motion.div>
  )
}

export default function AnimatedCardStack({ className }: { className?: string }) {
  const [cards, setCards] = useState(initialCards)
  const [isAnimating, setIsAnimating] = useState(false)
  const [nextId, setNextId] = useState(4)

  const handleAnimate = () => {
    setIsAnimating(true)
    const nextContentType = ((cards[2].contentType % 3) + 1) as 1 | 2 | 3
    setCards([...cards.slice(1), { id: nextId, contentType: nextContentType }])
    setNextId((prev) => prev + 1)
    setIsAnimating(false)
  }

  return (
    <div className={`flex w-full flex-col items-center justify-center pt-2 ${className ?? ""}`}>
      <div className="relative h-[360px] w-full overflow-hidden sm:w-[540px]">
        <AnimatePresence initial={false}>
          {cards.slice(0, 3).map((card, index) => (
            <AnimatedCard key={card.id} card={card} index={index} isAnimating={isAnimating} />
          ))}
        </AnimatePresence>
      </div>

      <div
        className="relative z-10 -mt-px flex w-full items-center justify-center py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={handleAnimate}
          className="flex h-8 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-lg px-4 text-sm font-medium text-[#94a3b8] transition-all hover:text-white active:scale-[0.98]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
