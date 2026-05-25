'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import {
  Globe, ArrowRight, ExternalLink, X, AlertCircle,
  AlertTriangle, Lightbulb, CheckCircle2, Zap,
  RotateCcw, Copy, Check, ChevronRight, Wand2,
  TrendingUp, Shield, MousePointerClick, Layout,
  Search, FileText, Sparkles,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface CategoryScore { score: number; grade: string; note: string }

interface Issue {
  severity: 'critical' | 'warning' | 'tip'
  category: string
  title: string
  description: string
  fix: string
}

interface PageSection {
  name: string
  quality: 'good' | 'needs-work' | 'missing'
  note: string
  detectedCopy?: string
}

interface Analysis {
  score: number
  scoreLabel: string
  headline: string
  categories: {
    seo: CategoryScore
    content: CategoryScore
    trust: CategoryScore
    ctas: CategoryScore
    structure: CategoryScore
  }
  issues: Issue[]
  sections: PageSection[]
  quickWins: string[]
  summary: string
  redesignBrief: string
}

type Phase = 'idle' | 'loading' | 'done' | 'error'
type ActiveTab = 'issues' | 'sections' | 'brief'
type SeverityFilter = 'all' | 'critical' | 'warning' | 'tip'

// ─── Score Ring ──────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#FBBF24' : '#EF4444'

  return (
    <div className="relative flex-shrink-0 w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.div
          className="text-[30px] font-bold leading-none"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {score}
        </motion.div>
        <div className="text-[10px] text-[#52525B] mt-0.5">/ 100</div>
      </div>
    </div>
  )
}

// ─── Category Card ───────────────────────────────────────────

const CAT_ICONS = {
  seo: Search,
  content: TrendingUp,
  trust: Shield,
  ctas: MousePointerClick,
  structure: Layout,
}
const CAT_LABELS = {
  seo: 'SEO',
  content: 'Content',
  trust: 'Trust',
  ctas: 'CTAs',
  structure: 'Structure',
}

function CategoryCard({ name, data, index }: { name: string; data: CategoryScore; index: number }) {
  const Icon = CAT_ICONS[name as keyof typeof CAT_ICONS]
  const label = CAT_LABELS[name as keyof typeof CAT_LABELS]
  const color = data.score >= 70 ? '#22c55e' : data.score >= 50 ? '#FBBF24' : '#EF4444'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06 }}
      className="flex flex-col gap-2.5 p-4 rounded-[12px]"
      style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Icon className="w-3 h-3 text-[#6366f1]" />
          </div>
          <span className="text-[12px] font-medium text-[#A1A1AA]">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-[5px]"
            style={{ color, background: `${color}1a` }}
          >
            {data.grade}
          </span>
          <span className="text-[18px] font-semibold leading-none" style={{ color }}>{data.score}</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-[#18181C] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${data.score}%` }}
          transition={{ duration: 0.9, delay: 0.3 + index * 0.06, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[11px] text-[#52525B] leading-relaxed">{data.note}</p>
    </motion.div>
  )
}

// ─── Issue Item ───────────────────────────────────────────────

function IssueItem({ issue, index }: { issue: Issue; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = {
    critical: { Icon: AlertCircle,   color: '#EF4444', bg: 'rgba(239,68,68,0.07)',   label: 'Critical' },
    warning:  { Icon: AlertTriangle, color: '#FBBF24', bg: 'rgba(251,191,36,0.07)',  label: 'Warning'  },
    tip:      { Icon: Lightbulb,     color: '#6366f1', bg: 'rgba(99,102,241,0.07)', label: 'Tip'      },
  }[issue.severity]

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-[10px] border cursor-pointer select-none transition-all"
      style={{ background: cfg.bg, borderColor: `${cfg.color}22` }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start gap-3 p-3.5">
        <cfg.Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-[#FAFAFA]">{issue.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: cfg.color, background: `${cfg.color}25` }}>
              {issue.category}
            </span>
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="text-[12px] text-[#A1A1AA] mt-1.5 leading-relaxed">{issue.description}</p>
                <div className="mt-2.5 p-2.5 rounded-[8px]" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: cfg.color }}>Fix</p>
                  <p className="text-[12px] text-[#E4E4E7] leading-relaxed">{issue.fix}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ChevronRight
          className="w-3.5 h-3.5 flex-shrink-0 text-[#3f3f46] transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
        />
      </div>
    </motion.div>
  )
}

// ─── Section Card ─────────────────────────────────────────────

function SectionCard({ section, index, onImprove }: {
  section: PageSection
  index: number
  onImprove: (s: PageSection) => void
}) {
  const cfg = {
    good:        { dot: '#22c55e', label: 'Good',       bg: 'rgba(34,197,94,0.07)'   },
    'needs-work':{ dot: '#FBBF24', label: 'Needs work', bg: 'rgba(251,191,36,0.07)'  },
    missing:     { dot: '#EF4444', label: 'Missing',    bg: 'rgba(239,68,68,0.07)'   },
  }[section.quality]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05 }}
      className="flex flex-col gap-2.5 p-4 rounded-[12px]"
      style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}80` }}
        />
        <span className="text-[13px] font-medium text-[#FAFAFA]">{section.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ color: cfg.dot, background: cfg.bg }}>
          {cfg.label}
        </span>
      </div>
      <p className="text-[12px] text-[#71717A] leading-relaxed">{section.note}</p>
      {section.detectedCopy && (
        <p className="text-[11px] text-[#3f3f46] italic truncate">"{section.detectedCopy}"</p>
      )}
      {section.quality !== 'missing' && (
        <button
          onClick={() => onImprove(section)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#6366f1] hover:text-[#818cf8] transition-colors mt-0.5 w-fit"
        >
          <Wand2 className="w-3 h-3" />
          Improve copy
        </button>
      )}
      {section.quality === 'missing' && (
        <button
          onClick={() => onImprove(section)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#6366f1] hover:text-[#818cf8] transition-colors mt-0.5 w-fit"
        >
          <Sparkles className="w-3 h-3" />
          Generate copy
        </button>
      )}
    </motion.div>
  )
}

// ─── Improve Modal ─────────────────────────────────────────────

function ImproveModal({ section, domain, context, onClose }: {
  section: PageSection
  domain: string
  context: string
  onClose: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus('loading')
    setResult('')

    try {
      const res = await fetch('/api/website/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: section.name,
          currentCopy: section.detectedCopy ?? '',
          context,
          domain,
        }),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) { setStatus('idle'); return }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += dec.decode(value, { stream: true })
        setResult(text)
      }
      setStatus('done')
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') setStatus('idle')
    }
  }, [section, domain, context])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Wand2 className="w-3.5 h-3.5 text-[#6366f1]" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#FAFAFA]">
                {section.quality === 'missing' ? `Generate ${section.name}` : `Improve ${section.name}`}
              </p>
              <p className="text-[11px] text-[#52525B]">{domain}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {section.detectedCopy && section.quality !== 'missing' && (
            <div className="p-3 rounded-[10px]" style={{ background: 'rgba(18,18,22,0.8)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] text-[#3f3f46] uppercase tracking-wider mb-1.5">Current copy</p>
              <p className="text-[12px] text-[#71717A] italic leading-relaxed">"{section.detectedCopy}"</p>
            </div>
          )}

          {status === 'idle' && !result && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-[13px] text-[#71717A] text-center max-w-[30ch] leading-relaxed">
                {section.quality === 'missing'
                  ? `AI will write suggested ${section.name} copy tailored to your site.`
                  : `AI will rewrite your ${section.name} with stronger, more compelling copy.`
                }
              </p>
              <Button variant="primary" size="sm" onClick={generate} className="gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {section.quality === 'missing' ? 'Generate copy' : 'Improve copy'}
              </Button>
            </div>
          )}

          {(status === 'loading' || result) && (
            <div className="rounded-[10px] p-4 min-h-[120px]" style={{ background: 'rgba(99,102,241,0.04)', border: '0.5px solid rgba(99,102,241,0.15)' }}>
              <p className="text-[10px] text-[#6366f1] uppercase tracking-wider mb-2.5">
                {section.quality === 'missing' ? 'Suggested copy' : 'Improved copy'}
              </p>
              <p className="text-[13px] text-[#E4E4E7] leading-relaxed whitespace-pre-wrap">
                {result}
                {status === 'loading' && (
                  <span className="inline-block w-1.5 h-3.5 bg-[#6366f1] animate-pulse ml-0.5 align-middle rounded-sm" />
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div>
            {status === 'done' && (
              <button
                onClick={generate}
                className="flex items-center gap-1.5 text-[12px] text-[#52525B] hover:text-[#A1A1AA] transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Regenerate
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {status === 'done' && result && (
              <Button variant="ghost" size="sm" onClick={copy} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Loading State ────────────────────────────────────────────

function LoadingView({ url }: { url: string }) {
  const steps = ['Fetching website', 'Reading page content', 'Running AI analysis']
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1800)
    const t2 = setTimeout(() => setStep(2), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-8">
      <div className="relative w-20 h-20">
        <div
          className="absolute inset-0 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.2)' }}
        >
          <Globe className="w-10 h-10 text-[#6366f1]" />
        </div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="3" />
          <motion.circle
            cx="40" cy="40" r="36" fill="none"
            stroke="#6366f1" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 36 * 0.22} ${2 * Math.PI * 36 * 0.78}`}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
            style={{ transformOrigin: '40px 40px' }}
          />
        </svg>
      </div>

      <div>
        <p className="text-[14px] font-medium text-[#FAFAFA] mb-4">
          {url.replace(/^https?:\/\//, '')}
        </p>
        <div className="flex flex-col gap-2 items-start">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {i < step
                ? <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                : i === step
                ? <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
                : <div className="w-4 h-4 rounded-full" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }} />
              }
              <span className="text-[13px]" style={{ color: i <= step ? '#A1A1AA' : '#3f3f46' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function WebsitePage() {
  const [inputUrl, setInputUrl]         = useState('')
  const [phase, setPhase]               = useState<Phase>('idle')
  const [analysis, setAnalysis]         = useState<Analysis | null>(null)
  const [domain, setDomain]             = useState('')
  const [errorMsg, setErrorMsg]         = useState('')
  const [activeTab, setActiveTab]       = useState<ActiveTab>('issues')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [improveSection, setImproveSection] = useState<PageSection | null>(null)

  const submittedUrlRef = useRef('')

  const handleAnalyze = useCallback(async (url: string) => {
    const clean = url.trim()
    if (!clean) return

    submittedUrlRef.current = clean
    setPhase('loading')
    setAnalysis(null)
    setErrorMsg('')
    setActiveTab('issues')
    setSeverityFilter('all')

    try {
      const res = await fetch('/api/website/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clean }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Analysis failed')
        setPhase('error')
        return
      }

      setAnalysis(data.analysis as Analysis)
      setDomain(data.domain ?? '')
      setPhase('done')
    } catch {
      setErrorMsg('Something went wrong — please try again')
      setPhase('error')
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAnalyze(inputUrl)
  }

  const reset = () => {
    setPhase('idle')
    setAnalysis(null)
    setInputUrl('')
  }

  const issueFilterCounts = analysis ? {
    all: analysis.issues.length,
    critical: analysis.issues.filter(i => i.severity === 'critical').length,
    warning: analysis.issues.filter(i => i.severity === 'warning').length,
    tip: analysis.issues.filter(i => i.severity === 'tip').length,
  } : null

  const filteredIssues = analysis?.issues.filter(
    i => severityFilter === 'all' || i.severity === severityFilter
  ) ?? []

  const scoreColor = analysis
    ? (analysis.score >= 70 ? '#22c55e' : analysis.score >= 50 ? '#FBBF24' : '#EF4444')
    : '#71717A'

  const improveContext = analysis
    ? `${analysis.summary} ${analysis.headline}`
    : ''

  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-medium text-[#FAFAFA]">My Website</h1>
              <p className="text-[14px] text-[#71717A] mt-0.5">
                {phase === 'done' ? 'AI-powered analysis and improvements' : 'Analyze and improve your web presence'}
              </p>
            </div>
            {phase === 'done' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => window.open(`https://${domain}`, '_blank')}
                  className="gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open site
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  New analysis
                </Button>
              </div>
            )}
          </div>

          {/* ── Idle: URL input ── */}
          {phase === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center py-16 rounded-2xl gap-6"
              style={{ border: '0.5px dashed rgba(255,255,255,0.1)', background: 'rgba(17,17,19,0.5)' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)' }}
              >
                <Globe className="w-7 h-7 text-[#6366f1]" />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-[#FAFAFA] mb-2" style={{ letterSpacing: '-0.02em' }}>
                  Analyze your website
                </h2>
                <p className="text-[14px] text-[#71717A] max-w-[38ch] mx-auto leading-relaxed">
                  Get a full AI audit — SEO, content quality, trust signals, CTAs, and a section-by-section improvement plan.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  placeholder="yourbusiness.com"
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-[14px] text-[#FAFAFA] outline-none"
                  style={{ background: 'rgba(24,24,28,0.8)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <Button type="submit" variant="primary" size="sm" className="gap-1.5 flex-shrink-0">
                  Analyze
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </form>
              <p className="text-[12px]" style={{ color: '#3f3f46' }}>
                Checks SEO, content, trust signals, CTAs, and structure.
              </p>
            </motion.div>
          )}

          {/* ── Loading ── */}
          {phase === 'loading' && (
            <LoadingView url={submittedUrlRef.current} />
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-14 text-center"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle className="w-6 h-6 text-[#EF4444]" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#FAFAFA] mb-1">Analysis failed</p>
                <p className="text-[13px] text-[#71717A]">{errorMsg}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>Try again</Button>
            </motion.div>
          )}

          {/* ── Results ── */}
          {phase === 'done' && analysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-5"
            >
              {/* Score header card */}
              <div
                className="flex items-center gap-5 p-5 rounded-2xl"
                style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)' }}
              >
                <ScoreRing score={analysis.score} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-[#52525B]" />
                    <span className="text-[14px] font-medium text-[#FAFAFA] truncate">{domain}</span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ color: scoreColor, background: `${scoreColor}18` }}
                    >
                      {analysis.scoreLabel}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#A1A1AA] leading-relaxed mb-3">{analysis.headline}</p>
                  {analysis.quickWins.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {analysis.quickWins.map((win, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Zap className="w-3 h-3 text-[#FBBF24] mt-0.5 flex-shrink-0" />
                          <span className="text-[12px] text-[#71717A] leading-relaxed">{win}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Category scores */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(analysis.categories).map(([key, val], i) => (
                  <CategoryCard key={key} name={key} data={val} index={i} />
                ))}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-[10px]" style={{ background: 'rgba(24,24,28,0.8)' }}>
                {([
                  { id: 'issues' as ActiveTab,   icon: AlertCircle,  label: `Issues (${analysis.issues.length})`   },
                  { id: 'sections' as ActiveTab, icon: Layout,        label: `Sections (${analysis.sections.length})` },
                  { id: 'brief' as ActiveTab,    icon: FileText,      label: 'Redesign Brief'                        },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-medium transition-all"
                    style={{
                      background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: activeTab === tab.id ? '#818cf8' : '#52525B',
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {/* Issues tab */}
              {activeTab === 'issues' && (
                <motion.div
                  key="issues"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3"
                >
                  {/* Severity filter */}
                  <div className="flex gap-1.5 flex-wrap">
                    {([
                      { id: 'all' as SeverityFilter,      label: `All (${issueFilterCounts?.all ?? 0})`,           color: '#A1A1AA' },
                      { id: 'critical' as SeverityFilter, label: `Critical (${issueFilterCounts?.critical ?? 0})`, color: '#EF4444' },
                      { id: 'warning' as SeverityFilter,  label: `Warnings (${issueFilterCounts?.warning ?? 0})`,  color: '#FBBF24' },
                      { id: 'tip' as SeverityFilter,      label: `Tips (${issueFilterCounts?.tip ?? 0})`,          color: '#6366f1' },
                    ]).map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSeverityFilter(f.id)}
                        className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                        style={{
                          color: severityFilter === f.id ? f.color : '#52525B',
                          background: severityFilter === f.id ? `${f.color}18` : 'rgba(255,255,255,0.04)',
                          border: `0.5px solid ${severityFilter === f.id ? `${f.color}40` : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {filteredIssues.length === 0 ? (
                    <p className="text-[13px] text-[#52525B] text-center py-6">No issues in this category.</p>
                  ) : (
                    filteredIssues.map((issue, i) => (
                      <IssueItem key={i} issue={issue} index={i} />
                    ))
                  )}
                </motion.div>
              )}

              {/* Sections tab */}
              {activeTab === 'sections' && (
                <motion.div
                  key="sections"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {analysis.sections.map((section, i) => (
                    <SectionCard
                      key={section.name}
                      section={section}
                      index={i}
                      onImprove={setImproveSection}
                    />
                  ))}
                </motion.div>
              )}

              {/* Redesign brief tab */}
              {activeTab === 'brief' && (
                <motion.div
                  key="brief"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4"
                >
                  <div
                    className="p-5 rounded-[12px]"
                    style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[#6366f1]" />
                      <span className="text-[13px] font-medium text-[#FAFAFA]">Summary</span>
                    </div>
                    <p className="text-[14px] text-[#A1A1AA] leading-relaxed">{analysis.summary}</p>
                  </div>
                  <div
                    className="p-5 rounded-[12px]"
                    style={{ background: 'rgba(99,102,241,0.04)', border: '0.5px solid rgba(99,102,241,0.15)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="w-4 h-4 text-[#6366f1]" />
                      <span className="text-[13px] font-medium text-[#FAFAFA]">Redesign brief</span>
                    </div>
                    <p className="text-[14px] text-[#A1A1AA] leading-relaxed">{analysis.redesignBrief}</p>
                  </div>
                  <div
                    className="p-5 rounded-[12px]"
                    style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-[#FBBF24]" />
                      <span className="text-[13px] font-medium text-[#FAFAFA]">Quick wins</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {analysis.quickWins.map((win, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                            style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24' }}
                          >
                            {i + 1}
                          </span>
                          <p className="text-[13px] text-[#A1A1AA] leading-relaxed">{win}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Improve Modal ── */}
      <AnimatePresence>
        {improveSection && (
          <ImproveModal
            section={improveSection}
            domain={domain}
            context={improveContext}
            onClose={() => setImproveSection(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
