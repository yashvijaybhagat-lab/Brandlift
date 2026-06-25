'use client'
import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react'

const TEMPLATES = [
  { id: 'minimal', name: 'Minimal', desc: 'Clean, whitespace-forward. Great for premium products.', color: '#FAFAFA', bg: '#1a1a1a' },
  { id: 'bold', name: 'Bold', desc: 'High contrast and expressive. Perfect for streetwear or lifestyle brands.', color: '#F97316', bg: '#0D0D0F' },
  { id: 'luxury', name: 'Luxury', desc: 'Gold accents and refined typography. Ideal for jewelry or cosmetics.', color: '#F0C45E', bg: '#0a0a08' },
  { id: 'tech', name: 'Tech', desc: 'Dark and data-forward. Built for gadgets, software, and tools.', color: '#5B9EFF', bg: '#040810' },
]

type Step = 'mode' | 'ai-prompt' | 'template' | 'details' | 'generating' | 'done'

function NewStoreInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'template' ? 'template' : 'mode'

  const [step, setStep] = useState<Step>(initialMode as Step)
  const [mode, setMode] = useState<'ai' | 'template' | null>(null)
  const [prompt, setPrompt] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedSections, setGeneratedSections] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function handleGenerate() {
    setStep('generating')
    setGenerating(true)
    setGeneratedSections([])

    const sections = ['Hero section', 'Product gallery', 'Feature highlights', 'Customer reviews', 'Checkout ready']
    for (let i = 0; i < sections.length; i++) {
      await new Promise((r) => setTimeout(r, 800 + i * 400))
      setGeneratedSections((prev) => [...prev, sections[i]])
    }

    setGenerating(false)
    setStep('done')
  }

  async function handleCreateStore() {
    await new Promise((r) => setTimeout(r, 600))
    router.push('/dashboard/stores')
  }

  return (
    <div className="min-h-screen p-8 flex items-start justify-center">
      <div className="w-full max-w-2xl">
        {/* Back */}
        {step !== 'mode' && step !== 'generating' && step !== 'done' && (
          <button
            onClick={() => {
              if (step === 'ai-prompt' || step === 'template') setStep('mode')
              else if (step === 'details') setStep(mode === 'ai' ? 'ai-prompt' : 'template')
            }}
            className="flex items-center gap-1.5 text-[13px] text-[#52525B] hover:text-[#A1A1AA] mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <AnimatePresence mode="wait">

          {/* Step: Mode selection */}
          {step === 'mode' && (
            <motion.div key="mode" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <h1 className="text-[32px] font-extrabold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.04em' }}>Create a new store</h1>
              <p className="text-[14px] text-[#71717A] mb-10">How do you want to build it?</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => { setMode('ai'); setStep('ai-prompt') }}
                  className="p-6 rounded-2xl text-left flex flex-col gap-4 transition-all duration-150 hover:-translate-y-0.5"
                  style={{ background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.3)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,92,255,0.15)' }}>
                    <Sparkles className="w-5 h-5 text-[#B9A5FF]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#FAFAFA] mb-1">Build with AI</p>
                    <p className="text-[13px] text-[#71717A]">Describe your product and let AI generate the entire storefront.</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-[12px] text-[#B9A5FF]">
                    Recommended <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                <button
                  onClick={() => { setMode('template'); setStep('template') }}
                  className="p-6 rounded-2xl text-left flex flex-col gap-4 transition-all duration-150 hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <svg className="w-5 h-5 text-[#71717A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#FAFAFA] mb-1">Start from a template</p>
                    <p className="text-[13px] text-[#71717A]">Pick a pre-built design and customize it with your products.</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-[12px] text-[#52525B]">
                    4 templates available <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step: AI prompt */}
          {step === 'ai-prompt' && (
            <motion.div key="ai-prompt" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-[#B9A5FF]" />
                <p className="text-[12px] font-semibold text-[#B9A5FF] uppercase tracking-widest">AI Builder</p>
              </div>
              <h1 className="text-[32px] font-extrabold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.04em' }}>Describe your product</h1>
              <p className="text-[14px] text-[#71717A] mb-8">Tell AI about what you&apos;re selling — the more detail, the better the result.</p>

              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. I sell handmade soy candles in minimalist glass jars. They come in 6 scents — vanilla, cedar, lavender, citrus, eucalyptus, and rose. Each candle burns for 50 hours. My target customers are people who love home decor and wellness. I want the store to feel calm and premium."
                className="w-full rounded-2xl p-5 text-[14px] text-[#FAFAFA] placeholder-[#3f3f46] outline-none resize-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  minHeight: 180,
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(124,92,255,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,92,255,0.1)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
              />

              <button
                onClick={() => setStep('details')}
                disabled={prompt.trim().length < 20}
                className="mt-4 flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4)' }}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="mt-3 text-[12px] text-[#3f3f46]">At least 20 characters — the more detail, the better.</p>
            </motion.div>
          )}

          {/* Step: Template picker */}
          {step === 'template' && (
            <motion.div key="template" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <h1 className="text-[32px] font-extrabold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.04em' }}>Pick a template</h1>
              <p className="text-[14px] text-[#71717A] mb-8">Choose a style to start with. You can customize everything later.</p>

              <div className="grid sm:grid-cols-2 gap-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className="p-5 rounded-2xl text-left flex flex-col gap-3 transition-all duration-150 hover:-translate-y-0.5 relative"
                    style={{
                      background: selectedTemplate === t.id ? 'rgba(124,92,255,0.1)' : 'rgba(255,255,255,0.03)',
                      border: selectedTemplate === t.id ? '1px solid rgba(124,92,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {selectedTemplate === t.id && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#7C5CFF' }}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="h-24 rounded-xl" style={{ background: t.bg, border: `2px solid ${t.color}20` }}>
                      <div className="h-full flex items-center justify-center">
                        <div className="w-16 h-2 rounded-full" style={{ background: t.color, opacity: 0.6 }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: t.color }}>{t.name}</p>
                      <p className="text-[12px] text-[#71717A] mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep('details')}
                disabled={!selectedTemplate}
                className="mt-6 flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4)' }}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step: Store details */}
          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <h1 className="text-[32px] font-extrabold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.04em' }}>Name your store</h1>
              <p className="text-[14px] text-[#71717A] mb-8">This is your store&apos;s name and public URL. You can change it later.</p>

              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-[13px] font-medium text-[#A1A1AA] block mb-2">Store name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => { setStoreName(e.target.value); setStoreSlug(slugify(e.target.value)) }}
                    placeholder="e.g. Luma Candles"
                    className="w-full px-4 py-3 rounded-xl text-[14px] text-[#FAFAFA] placeholder-[#3f3f46] outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(124,92,255,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,92,255,0.1)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>

                <div>
                  <label className="text-[13px] font-medium text-[#A1A1AA] block mb-2">Store URL</label>
                  <div
                    className="flex items-center rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <span className="px-4 text-[13px] text-[#52525B] select-none border-r" style={{ borderColor: 'rgba(255,255,255,0.08)', paddingTop: 12, paddingBottom: 12 }}>
                      brandlift.app/
                    </span>
                    <input
                      type="text"
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(slugify(e.target.value))}
                      placeholder="luma-candles"
                      className="flex-1 px-4 py-3 text-[14px] text-[#FAFAFA] placeholder-[#3f3f46] outline-none bg-transparent"
                      style={{ fontFamily: 'inherit' }}
                    />
                  </div>
                  {storeSlug && (
                    <p className="mt-2 text-[12px] text-[#52525B]">Your store will be live at <span className="text-[#B9A5FF]">{storeSlug}.brandlift.app</span></p>
                  )}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!storeName.trim() || !storeSlug.trim()}
                className="mt-8 flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4)' }}
              >
                {mode === 'ai' ? (
                  <><Sparkles className="w-4 h-4" /> Generate my store</>
                ) : (
                  <>Create store <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </motion.div>
          )}

          {/* Step: Generating */}
          {step === 'generating' && (
            <motion.div key="generating" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="text-center py-20">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)' }}
              >
                <Sparkles className="w-8 h-8 text-[#7C5CFF] animate-pulse" />
              </div>
              <h2 className="text-[24px] font-extrabold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.04em' }}>AI is building your store…</h2>
              <p className="text-[14px] text-[#71717A] mb-10">Generating sections, copy, and layout.</p>

              <div className="flex flex-col gap-3 max-w-xs mx-auto text-left">
                {['Hero section', 'Product gallery', 'Feature highlights', 'Customer reviews', 'Checkout ready'].map((s, i) => {
                  const done = generatedSections.includes(s)
                  const active = !done && generatedSections.length === i
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: done ? 'rgba(74,222,128,0.15)' : active ? 'rgba(124,92,255,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${done ? 'rgba(74,222,128,0.3)' : active ? 'rgba(124,92,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {done ? <Check className="w-3 h-3 text-green-400" /> : active ? <Loader2 className="w-3 h-3 text-[#7C5CFF] animate-spin" /> : null}
                      </div>
                      <span className="text-[13px]" style={{ color: done ? '#FAFAFA' : active ? '#A1A1AA' : '#3f3f46' }}>{s}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-center py-20">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}
              >
                <Check className="w-8 h-8 text-green-400" />
              </motion.div>
              <h2 className="text-[28px] font-extrabold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.04em' }}>
                {storeName} is ready!
              </h2>
              <p className="text-[14px] text-[#71717A] mb-8">
                Your store is live at <span className="text-[#B9A5FF]">{storeSlug}.brandlift.app</span>
              </p>
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={handleCreateStore}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: '#7C5CFF', boxShadow: '0 0 0 1px rgba(124,92,255,0.4)' }}
                >
                  Go to dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  className="px-5 py-3.5 rounded-xl text-[14px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onClick={() => window.open(`https://${storeSlug}.brandlift.app`, '_blank')}
                >
                  Preview store ↗
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default function NewStorePage() {
  return (
    <Suspense>
      <NewStoreInner />
    </Suspense>
  )
}
