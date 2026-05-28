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
  Search, FileText, Sparkles, Download,
  GitPullRequest, GitBranch, Loader2, Monitor,
  Smartphone, Code2, Eye,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface CategoryScore { score: number; grade: string; note: string }
interface Issue { severity: 'critical'|'warning'|'tip'; category: string; title: string; description: string; fix: string }
interface PageSection { name: string; quality: 'good'|'needs-work'|'missing'; note: string; detectedCopy?: string }
interface Analysis {
  score: number; scoreLabel: string; headline: string
  categories: { seo: CategoryScore; content: CategoryScore; trust: CategoryScore; ctas: CategoryScore; structure: CategoryScore }
  issues: Issue[]; sections: PageSection[]; quickWins: string[]; summary: string; redesignBrief: string
}

type Phase          = 'idle'|'loading'|'done'|'error'
type ActiveTab      = 'issues'|'sections'|'brief'
type SeverityFilter = 'all'|'critical'|'warning'|'tip'
type ColorScheme    = 'dark'|'light'|'midnight'|'ocean'
type DeviceMode     = 'desktop'|'mobile'

interface RedesignState  { phase:'idle'|'generating'|'done'|'error'; html:string; error:string }
interface GitHubPushState{ phase:'idle'|'pushing'|'done'|'error'; result:{type:'pr'|'commit';url:string;number?:number}|null; error:string }

// ─── Color schemes ───────────────────────────────────────────

const SCHEMES: { id: ColorScheme; label: string; bg: string; accent: string }[] = [
  { id: 'dark',     label: 'Dark',     bg: '#05050a', accent: '#6366f1' },
  { id: 'light',    label: 'Light',    bg: '#f8f8fc', accent: '#6366f1' },
  { id: 'midnight', label: 'Midnight', bg: '#080412', accent: '#8b5cf6' },
  { id: 'ocean',    label: 'Ocean',    bg: '#020c1b', accent: '#0ea5e9' },
]

// ─── Score Ring ──────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r    = 44
  const circ = 2 * Math.PI * r
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#FBBF24' : '#EF4444'

  return (
    <div className="relative flex-shrink-0 w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.div className="text-[30px] font-bold leading-none" style={{ color }}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
          {score}
        </motion.div>
        <div className="text-[10px] text-[#52525B] mt-0.5">/ 100</div>
      </div>
    </div>
  )
}

// ─── Category Card ───────────────────────────────────────────

const CAT_ICONS  = { seo: Search, content: TrendingUp, trust: Shield, ctas: MousePointerClick, structure: Layout }
const CAT_LABELS = { seo: 'SEO', content: 'Content', trust: 'Trust', ctas: 'CTAs', structure: 'Structure' }

function CategoryCard({ name, data, index }: { name: string; data: CategoryScore; index: number }) {
  const Icon  = CAT_ICONS[name as keyof typeof CAT_ICONS]
  const label = CAT_LABELS[name as keyof typeof CAT_LABELS]
  const color = data.score >= 70 ? '#22c55e' : data.score >= 50 ? '#FBBF24' : '#EF4444'
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.08 + index * 0.06 }}
      className="flex flex-col gap-3 p-4 rounded-[14px]"
      style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Icon className="w-3.5 h-3.5 text-[#6366f1]" />
          </div>
          <span className="text-[12px] font-medium text-[#A1A1AA]">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[5px]" style={{ color, background: `${color}1a` }}>{data.grade}</span>
          <span className="text-[20px] font-bold leading-none tabular-nums" style={{ color }}>{data.score}</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-[#18181C] overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${data.score}%` }}
          transition={{ duration: 1, delay: 0.3 + index * 0.06, ease: 'easeOut' }} />
      </div>
      <p className="text-[11px] text-[#52525B] leading-relaxed">{data.note}</p>
    </motion.div>
  )
}

// ─── Issue Item ───────────────────────────────────────────────

function IssueItem({ issue, index }: { issue: Issue; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = {
    critical: { Icon: AlertCircle,   color: '#EF4444', bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.18)'  },
    warning:  { Icon: AlertTriangle, color: '#FBBF24', bg: 'rgba(251,191,36,0.07)',  border: 'rgba(251,191,36,0.18)' },
    tip:      { Icon: Lightbulb,     color: '#6366f1', bg: 'rgba(99,102,241,0.07)', border: 'rgba(99,102,241,0.18)' },
  }[issue.severity]
  return (
    <motion.div initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay: index * 0.035 }}
      className="rounded-[10px] border cursor-pointer select-none"
      style={{ background: cfg.bg, borderColor: cfg.border }}
      onClick={() => setExpanded(e => !e)}>
      <div className="flex items-start gap-3 p-3.5">
        <cfg.Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-[#FAFAFA]">{issue.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: cfg.color, background: `${cfg.color}22` }}>{issue.category}</span>
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }} className="overflow-hidden">
                <p className="text-[12px] text-[#A1A1AA] mt-2 leading-relaxed">{issue.description}</p>
                <div className="mt-2.5 p-3 rounded-[8px]" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: cfg.color }}>Fix</p>
                  <p className="text-[12px] text-[#E4E4E7] leading-relaxed">{issue.fix}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-[#3f3f46] transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} />
      </div>
    </motion.div>
  )
}

// ─── Section Card ─────────────────────────────────────────────

function SectionCard({ section, index, onImprove }: { section: PageSection; index: number; onImprove: (s: PageSection) => void }) {
  const cfg = {
    good:        { dot:'#22c55e', label:'Good',       bg:'rgba(34,197,94,0.07)'  },
    'needs-work':{ dot:'#FBBF24', label:'Needs work', bg:'rgba(251,191,36,0.07)' },
    missing:     { dot:'#EF4444', label:'Missing',    bg:'rgba(239,68,68,0.07)'  },
  }[section.quality]
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.05 + index * 0.05 }}
      className="flex flex-col gap-2.5 p-4 rounded-[12px]"
      style={{ background:'#111113', border:'0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:cfg.dot, boxShadow:`0 0 6px ${cfg.dot}80` }} />
        <span className="text-[13px] font-medium text-[#FAFAFA]">{section.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto font-medium" style={{ color:cfg.dot, background:cfg.bg }}>{cfg.label}</span>
      </div>
      <p className="text-[12px] text-[#71717A] leading-relaxed">{section.note}</p>
      {section.detectedCopy && <p className="text-[11px] text-[#3f3f46] italic truncate">"{section.detectedCopy}"</p>}
      <button onClick={() => onImprove(section)}
        className="flex items-center gap-1.5 text-[12px] font-medium text-[#6366f1] hover:text-[#818cf8] transition-colors mt-0.5 w-fit">
        {section.quality === 'missing' ? <Sparkles className="w-3 h-3" /> : <Wand2 className="w-3 h-3" />}
        {section.quality === 'missing' ? 'Generate copy' : 'Improve copy'}
      </button>
    </motion.div>
  )
}

// ─── Improve Modal ─────────────────────────────────────────────

function ImproveModal({ section, domain, context, onClose }: { section: PageSection; domain: string; context: string; onClose: () => void }) {
  const [status, setStatus] = useState<'idle'|'loading'|'done'>('idle')
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController|null>(null)

  const generate = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus('loading'); setResult('')
    try {
      const res = await fetch('/api/website/improve', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ sectionName:section.name, currentCopy:section.detectedCopy??'', context, domain }),
        signal: ctrl.signal,
      })
      if (!res.ok||!res.body){setStatus('idle');return}
      const reader=res.body.getReader(), dec=new TextDecoder()
      let text=''
      while(true){const{done,value}=await reader.read();if(done)break;text+=dec.decode(value,{stream:true});setResult(text)}
      setStatus('done')
    } catch(err){if((err as Error)?.name!=='AbortError')setStatus('idle')}
  }, [section, domain, context])

  const copy = useCallback(()=>{navigator.clipboard.writeText(result);setCopied(true);setTimeout(()=>setCopied(false),2000)},[result])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{background:'rgba(0,0,0,0.75)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <motion.div initial={{opacity:0,y:24,scale:0.97}} animate={{opacity:1,y:0,scale:1}}
        exit={{opacity:0,y:24,scale:0.97}} transition={{duration:0.18}}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{background:'#111113',border:'0.5px solid rgba(255,255,255,0.1)'}}>
        <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'0.5px solid rgba(255,255,255,0.07)'}}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{background:'rgba(99,102,241,0.12)'}}>
              <Wand2 className="w-3.5 h-3.5 text-[#6366f1]" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#FAFAFA]">{section.quality==='missing'?`Generate ${section.name}`:`Improve ${section.name}`}</p>
              <p className="text-[11px] text-[#52525B]">{domain}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-white/[0.05] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {section.detectedCopy&&section.quality!=='missing'&&(
            <div className="p-3 rounded-[10px]" style={{background:'rgba(18,18,22,0.8)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
              <p className="text-[10px] text-[#3f3f46] uppercase tracking-wider mb-1.5">Current</p>
              <p className="text-[12px] text-[#71717A] italic leading-relaxed">"{section.detectedCopy}"</p>
            </div>
          )}
          {status==='idle'&&!result&&(
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-[13px] text-[#71717A] text-center max-w-[30ch] leading-relaxed">
                {section.quality==='missing'?`AI will write ${section.name} copy tailored to your site.`:`AI rewrites your ${section.name} with stronger copy.`}
              </p>
              <Button variant="primary" size="sm" onClick={generate} className="gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {section.quality==='missing'?'Generate copy':'Improve copy'}
              </Button>
            </div>
          )}
          {(status==='loading'||result)&&(
            <div className="rounded-[10px] p-4 min-h-[120px]" style={{background:'rgba(99,102,241,0.04)',border:'0.5px solid rgba(99,102,241,0.15)'}}>
              <p className="text-[10px] text-[#6366f1] uppercase tracking-wider mb-2.5">
                {section.quality==='missing'?'Suggested copy':'Improved copy'}
              </p>
              <p className="text-[13px] text-[#E4E4E7] leading-relaxed whitespace-pre-wrap">
                {result}{status==='loading'&&<span className="inline-block w-1.5 h-3.5 bg-[#6366f1] animate-pulse ml-0.5 align-middle rounded-sm"/>}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-3.5" style={{borderTop:'0.5px solid rgba(255,255,255,0.07)'}}>
          <div>{status==='done'&&<button onClick={generate} className="flex items-center gap-1.5 text-[12px] text-[#52525B] hover:text-[#A1A1AA] transition-colors"><RotateCcw className="w-3 h-3"/>Regenerate</button>}</div>
          <div className="flex gap-2">
            {status==='done'&&result&&(
              <Button variant="ghost" size="sm" onClick={copy} className="gap-1.5">
                {copied?<Check className="w-3.5 h-3.5 text-[#22c55e]"/>:<Copy className="w-3.5 h-3.5"/>}{copied?'Copied!':'Copy'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Redesign Modal ───────────────────────────────────────────

const INSPIRATION_PRESETS = [
  { label: 'Stripe',   url: 'stripe.com',   hint: 'Clean, premium fintech' },
  { label: 'Linear',   url: 'linear.app',   hint: 'Dark, minimal, modern' },
  { label: 'Vercel',   url: 'vercel.com',   hint: 'Dev-focused, sleek' },
  { label: 'Notion',   url: 'notion.so',    hint: 'Clean, whitespace-heavy' },
  { label: 'Framer',   url: 'framer.com',   hint: 'Bold, animated' },
  { label: 'Apple',    url: 'apple.com',    hint: 'Premium, spacious' },
  { label: 'Airbnb',   url: 'airbnb.com',   hint: 'Warm, photo-forward' },
  { label: 'Figma',    url: 'figma.com',    hint: 'Colorful, playful' },
]

function RedesignModal({ domain, analysis, h1s, bodyPreview, onClose, buildFromScratch, businessDescription, initialReferenceUrl, initialFeatureRequest }: {
  domain: string; analysis: Analysis | null; h1s: string[]; bodyPreview: string; onClose: () => void;
  buildFromScratch?: boolean; businessDescription?: string;
  initialReferenceUrl?: string; initialFeatureRequest?: string;
}) {
  const [colorScheme, setColorScheme]   = useState<ColorScheme>('dark')
  const [device, setDevice]             = useState<DeviceMode>('desktop')
  const [viewMode, setViewMode]         = useState<'preview'|'code'>('preview')
  const [githubOpen, setGithubOpen]     = useState(false)
  const [state, setState]               = useState<RedesignState>({ phase:'idle', html:'', error:'' })
  const [referenceUrl, setReferenceUrl] = useState(initialReferenceUrl ?? '')
  const [featureRequest, setFeatureRequest] = useState(initialFeatureRequest ?? '')
  const [showInspiration, setShowInspiration] = useState(false)
  const abortRef = useRef<AbortController|null>(null)

  const generate = useCallback(async (scheme: ColorScheme) => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState({ phase:'generating', html:'', error:'' })

    try {
      const res = await fetch('/api/website/redesign', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          domain, analysis, h1s, bodyPreview, colorScheme: scheme,
          referenceUrl: referenceUrl.trim(),
          featureRequest: featureRequest.trim(),
          buildFromScratch: buildFromScratch ?? false,
          businessDescription: businessDescription ?? '',
        }),
        signal: ctrl.signal,
      })
      if (!res.ok||!res.body){setState({phase:'error',html:'',error:'Generation failed'});return}

      const reader=res.body.getReader(), dec=new TextDecoder()
      let html=''
      while(true){const{done,value}=await reader.read();if(done)break;html+=dec.decode(value,{stream:true});setState(s=>({...s,html}))}

      // Clean up any markdown artifacts
      let clean = html.trim()
      if(clean.startsWith('```')){clean=clean.replace(/^```[a-z]*\n?/i,'').replace(/\n?```$/,'').trim()}
      const idx = clean.toLowerCase().indexOf('<!doctype')
      if(idx>0) clean = clean.slice(idx)

      setState({phase:'done', html:clean, error:''})
    } catch(err){
      if((err as Error)?.name!=='AbortError') setState({phase:'error',html:'',error:'Generation failed — try again'})
    }
  }, [domain, analysis, h1s, bodyPreview])

  useEffect(() => {
    generate(colorScheme)
    return () => { if(abortRef.current) abortRef.current.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSchemeChange = (s: ColorScheme) => {
    setColorScheme(s)
    if (state.phase === 'done' || state.phase === 'error') generate(s)
  }

  const applyPreset = (url: string) => {
    setReferenceUrl(url)
    setShowInspiration(false)
  }

  const download = () => {
    const blob = new Blob([state.html], {type:'text/html'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`${domain}-redesign.html`; a.click()
    setTimeout(()=>URL.revokeObjectURL(url), 1000)
  }

  const [copied, setCopied] = useState(false)
  const copyCode = () => {
    navigator.clipboard.writeText(state.html)
    setCopied(true)
    setTimeout(()=>setCopied(false),2000)
  }

  const isGenerating = state.phase === 'generating'

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{background:'rgba(0,0,0,0.92)'}}>
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="flex flex-col h-full">

        {/* ── Top bar ── */}
        <div className="flex-shrink-0 flex flex-col"
          style={{background:'#0d0d10',borderBottom:'0.5px solid rgba(255,255,255,0.08)'}}>

          {/* Row 1: title + scheme picker + device + close */}
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{background:'rgba(99,102,241,0.12)'}}>
                <Sparkles className="w-3.5 h-3.5 text-[#6366f1]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#FAFAFA] leading-none">Redesigned page</p>
                <p className="text-[11px] text-[#52525B] mt-0.5">{domain}</p>
              </div>
            </div>

            {/* Scheme swatches */}
            <div className="flex items-center gap-1.5 ml-4">
              {SCHEMES.map(s => (
                <button key={s.id} onClick={()=>handleSchemeChange(s.id)}
                  title={s.label}
                  className="w-6 h-6 rounded-full transition-all duration-150 flex items-center justify-center"
                  style={{
                    background: s.bg,
                    outline: colorScheme===s.id ? `2px solid ${s.accent}` : '2px solid transparent',
                    outlineOffset: '2px',
                    boxShadow: colorScheme===s.id ? `0 0 8px ${s.accent}60` : 'none',
                  }}>
                  {colorScheme===s.id&&<span className="w-2 h-2 rounded-full" style={{background:s.accent}}/>}
                </button>
              ))}
              <span className="text-[11px] text-[#3f3f46] ml-1 capitalize hidden sm:inline">{colorScheme}</span>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              {/* Device toggle */}
              <div className="flex rounded-[8px] overflow-hidden p-0.5" style={{background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)'}}>
                <button onClick={()=>setDevice('desktop')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium transition-all"
                  style={{background:device==='desktop'?'rgba(99,102,241,0.15)':'transparent', color:device==='desktop'?'#818cf8':'#52525B'}}>
                  <Monitor className="w-3.5 h-3.5"/>
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button onClick={()=>setDevice('mobile')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium transition-all"
                  style={{background:device==='mobile'?'rgba(99,102,241,0.15)':'transparent', color:device==='mobile'?'#818cf8':'#52525B'}}>
                  <Smartphone className="w-3.5 h-3.5"/>
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              {/* View mode toggle */}
              <div className="flex rounded-[8px] overflow-hidden p-0.5 ml-1" style={{background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)'}}>
                <button onClick={()=>setViewMode('preview')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium transition-all"
                  style={{background:viewMode==='preview'?'rgba(99,102,241,0.15)':'transparent', color:viewMode==='preview'?'#818cf8':'#52525B'}}>
                  <Eye className="w-3.5 h-3.5"/>
                  <span className="hidden sm:inline">Preview</span>
                </button>
                <button onClick={()=>setViewMode('code')} disabled={!state.html}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium transition-all disabled:opacity-40"
                  style={{background:viewMode==='code'?'rgba(99,102,241,0.15)':'transparent', color:viewMode==='code'?'#818cf8':'#52525B'}}>
                  <Code2 className="w-3.5 h-3.5"/>
                  <span className="hidden sm:inline">Code</span>
                </button>
              </div>

              {state.phase==='done'&&(
                <div className="flex items-center gap-1.5 ml-2">
                  <Button variant="ghost" size="sm" onClick={()=>setGithubOpen(true)} className="gap-1.5">
                    <GitBranch className="w-3.5 h-3.5"/>
                    <span className="hidden sm:inline">Push to GitHub</span>
                  </Button>
                  <Button variant="primary" size="sm" onClick={download} className="gap-1.5">
                    <Download className="w-3.5 h-3.5"/>
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              )}

              <button onClick={onClose}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-white/[0.05] transition-colors ml-1">
                <X className="w-4 h-4"/>
              </button>
            </div>
          </div>

          {/* Row 2: inspiration + feature request — shown when not generating */}
          {!isGenerating && (
            <div className="flex items-start gap-3 px-5 pb-3 flex-wrap" style={{borderTop:'0.5px solid rgba(255,255,255,0.05)'}}>
              {/* Reference URL */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                <label className="text-[10px] text-[#3f3f46] uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3 h-3"/>Inspired by / base it on
                </label>
                <div className="flex items-center gap-1.5 relative">
                  <input
                    value={referenceUrl}
                    onChange={e => setReferenceUrl(e.target.value)}
                    placeholder="stripe.com, linear.app, etc."
                    className="flex-1 px-3 py-1.5 rounded-[8px] text-[12px] text-[#FAFAFA] outline-none"
                    style={{background:'rgba(24,24,28,0.9)',border:'0.5px solid rgba(255,255,255,0.1)'}}
                    onFocus={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'}}
                    onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}}
                  />
                  <button
                    onClick={() => setShowInspiration(v => !v)}
                    className="px-2.5 py-1.5 rounded-[7px] text-[11px] font-medium transition-colors flex-shrink-0"
                    style={{background:showInspiration?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.04)', color:showInspiration?'#818cf8':'#52525B', border:'0.5px solid rgba(255,255,255,0.08)'}}>
                    Presets
                  </button>
                </div>
                {showInspiration && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {INSPIRATION_PRESETS.map(p => (
                      <button key={p.url} onClick={() => applyPreset(p.url)}
                        title={p.hint}
                        className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all"
                        style={{
                          background: referenceUrl === p.url ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                          border: `0.5px solid ${referenceUrl === p.url ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          color: referenceUrl === p.url ? '#818cf8' : '#71717A',
                        }}>
                        {p.label}
                      </button>
                    ))}
                    {referenceUrl && (
                      <button onClick={() => setReferenceUrl('')}
                        className="px-2.5 py-1 rounded-[6px] text-[11px] transition-colors"
                        style={{color:'#52525B'}}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Feature request */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                <label className="text-[10px] text-[#3f3f46] uppercase tracking-wider flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3"/>Specific features to include
                </label>
                <input
                  value={featureRequest}
                  onChange={e => setFeatureRequest(e.target.value)}
                  placeholder="e.g. animated pricing table, logo carousel, dark hero…"
                  className="px-3 py-1.5 rounded-[8px] text-[12px] text-[#FAFAFA] outline-none"
                  style={{background:'rgba(24,24,28,0.9)',border:'0.5px solid rgba(255,255,255,0.1)'}}
                  onFocus={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'}}
                  onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}}
                />
              </div>

              {/* Regenerate with new settings */}
              {(referenceUrl || featureRequest) && (
                <div className="flex items-end pb-0.5">
                  <button onClick={() => generate(colorScheme)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all"
                    style={{background:'rgba(99,102,241,0.12)',border:'0.5px solid rgba(99,102,241,0.3)',color:'#818cf8'}}>
                    <Sparkles className="w-3.5 h-3.5"/>Apply
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Progress bar when generating */}
          {isGenerating && (
            <div className="h-0.5 w-full" style={{background:'rgba(255,255,255,0.04)'}}>
              <motion.div className="h-full" style={{background:'linear-gradient(90deg,#6366f1,#8b5cf6)'}}
                animate={{width:['0%','40%','70%','85%','90%']}}
                transition={{duration:8, times:[0,0.2,0.5,0.75,1], ease:'easeOut'}} />
            </div>
          )}
        </div>

        {/* ── Preview / Code area ── */}
        <div className="flex-1 min-h-0 relative overflow-hidden">

          {/* Generating overlay */}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10"
              style={{background:'rgba(5,5,10,0.85)',backdropFilter:'blur(8px)'}}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{background:'rgba(99,102,241,0.1)',border:'0.5px solid rgba(99,102,241,0.25)'}}>
                <Sparkles className="w-8 h-8 text-[#6366f1]"/>
              </div>
              <div className="text-center">
                <p className="text-[15px] font-medium text-[#FAFAFA] mb-1">Building your redesign…</p>
                <p className="text-[12px] text-[#52525B]">{state.html.length>0?`${state.html.length.toLocaleString()} chars generated`:'Starting generation…'}</p>
              </div>
              <div className="flex gap-1.5">
                {[0,1,2].map(i=>(
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{background:'#6366f1'}}
                    animate={{opacity:[0.2,1,0.2]}} transition={{duration:1.2,repeat:Infinity,delay:i*0.2}} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {state.phase==='error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <AlertCircle className="w-8 h-8 text-[#EF4444]"/>
              <p className="text-[14px] text-[#A1A1AA]">{state.error}</p>
              <Button variant="ghost" size="sm" onClick={()=>generate(colorScheme)}>Try again</Button>
            </div>
          )}

          {/* Preview */}
          {viewMode==='preview' && state.html && (
            <div className="w-full h-full flex items-start justify-center overflow-auto"
              style={{background:'#18181c', padding: device==='mobile'?'24px 0':'0'}}>
              <motion.div
                animate={{ width: device==='mobile'?'390px':'100%' }}
                transition={{duration:0.3,ease:'easeOut'}}
                className="h-full relative overflow-hidden"
                style={{ minHeight:'100%', boxShadow: device==='mobile'?'0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.5)':'none',
                  borderRadius: device==='mobile'?'20px':'0' }}>
                <iframe
                  srcDoc={state.html}
                  className="w-full border-0"
                  style={{ height: device==='mobile'?'780px':'100%', minHeight:'100%' }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title="Redesigned website preview"
                />
              </motion.div>
            </div>
          )}

          {/* Code view */}
          {viewMode==='code' && state.html && (
            <div className="w-full h-full overflow-auto" style={{background:'#0a0a0d'}}>
              <div className="flex items-center justify-between px-4 py-2 sticky top-0"
                style={{background:'#0d0d10',borderBottom:'0.5px solid rgba(255,255,255,0.06)'}}>
                <span className="text-[11px] text-[#52525B] font-mono">{domain}-redesign.html · {state.html.length.toLocaleString()} chars</span>
                <button onClick={copyCode} className="flex items-center gap-1.5 text-[11px] text-[#52525B] hover:text-[#A1A1AA] transition-colors">
                  {copied?<Check className="w-3 h-3 text-[#22c55e]"/>:<Copy className="w-3 h-3"/>}
                  {copied?'Copied!':'Copy all'}
                </button>
              </div>
              <pre className="p-5 text-[12px] font-mono leading-relaxed text-[#818cf8] whitespace-pre-wrap break-all">
                <code>{state.html}</code>
              </pre>
            </div>
          )}
        </div>

        {/* ── Bottom regen bar ── */}
        {(state.phase==='done'||state.phase==='error') && (
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3"
            style={{background:'#0d0d10',borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>
            <div className="flex items-center gap-3">
              <button onClick={()=>generate(colorScheme)}
                className="flex items-center gap-1.5 text-[12px] text-[#52525B] hover:text-[#A1A1AA] transition-colors">
                <RotateCcw className="w-3.5 h-3.5"/>Regenerate
              </button>
              <span className="text-[#27272a]">·</span>
              <span className="text-[11px] text-[#3f3f46]">Switch color scheme above to generate a different style</span>
            </div>
            {state.phase==='done' && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]"/>
                <span className="text-[11px] text-[#22c55e]">Ready</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {githubOpen&&(
          <GitHubPushModal domain={domain} html={state.html} onClose={()=>setGithubOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── GitHub Push Modal ────────────────────────────────────────

function GitHubPushModal({ domain, html, onClose }: { domain: string; html: string; onClose: () => void }) {
  const [owner,setOwner]=useState(''), [repo,setRepo]=useState(''), [filePath,setFilePath]=useState('index.html')
  const [branch,setBranch]=useState('main'), [pat,setPat]=useState(''), [createPR,setCreatePR]=useState(true)
  const [state,setState]=useState<GitHubPushState>({phase:'idle',result:null,error:''})

  const push = async () => {
    if(!owner||!repo||!pat)return
    setState({phase:'pushing',result:null,error:''})
    try {
      const res=await fetch('/api/website/push-github',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({owner,repo,filePath,branch,pat,content:html,createPR,domain})})
      const data=await res.json() as {success?:boolean;type?:'pr'|'commit';url?:string;number?:number;error?:string}
      if(!res.ok||!data.success){setState({phase:'error',result:null,error:data.error??'Push failed'});return}
      setState({phase:'done',result:{type:data.type!,url:data.url!,number:data.number},error:''})
    }catch{setState({phase:'error',result:null,error:'Request failed'})}
  }

  const inp="w-full px-3.5 py-2.5 rounded-[10px] text-[13px] text-[#FAFAFA] outline-none"
  const inpS={background:'rgba(24,24,28,0.8)',border:'0.5px solid rgba(255,255,255,0.1)'}

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.7)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <motion.div initial={{opacity:0,y:16,scale:0.97}} animate={{opacity:1,y:0,scale:1}}
        exit={{opacity:0,y:16,scale:0.97}} transition={{duration:0.15}}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{background:'#111113',border:'0.5px solid rgba(255,255,255,0.1)'}}>
        <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'0.5px solid rgba(255,255,255,0.07)'}}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{background:'rgba(99,102,241,0.12)'}}>
              <GitBranch className="w-3.5 h-3.5 text-[#6366f1]"/>
            </div>
            <p className="text-[14px] font-medium text-[#FAFAFA]">Push to GitHub</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-white/[0.05] transition-colors"><X className="w-4 h-4"/></button>
        </div>
        {state.phase==='done'&&state.result?(
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:'rgba(34,197,94,0.1)',border:'0.5px solid rgba(34,197,94,0.2)'}}>
              <CheckCircle2 className="w-6 h-6 text-[#22c55e]"/>
            </div>
            <div>
              <p className="text-[15px] font-medium text-[#FAFAFA] mb-1">{state.result.type==='pr'?'Pull request created!':'Pushed to GitHub!'}</p>
              <p className="text-[13px] text-[#71717A]">{state.result.type==='pr'?`PR #${state.result.number} is open for review.`:`Changes are live on ${branch}.`}</p>
            </div>
            <Button variant="primary" size="sm" onClick={()=>window.open(state.result!.url,'_blank')} className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5"/>
              {state.result.type==='pr'?'View pull request':'View commit'}
            </Button>
          </div>
        ):(
          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5"><label className="text-[11px] text-[#71717A]">GitHub username / org</label><input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="your-username" className={inp} style={inpS} disabled={state.phase==='pushing'}/></div>
              <div className="flex flex-col gap-1.5"><label className="text-[11px] text-[#71717A]">Repository name</label><input value={repo} onChange={e=>setRepo(e.target.value)} placeholder="my-website" className={inp} style={inpS} disabled={state.phase==='pushing'}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5"><label className="text-[11px] text-[#71717A]">File path</label><input value={filePath} onChange={e=>setFilePath(e.target.value)} placeholder="index.html" className={inp} style={inpS} disabled={state.phase==='pushing'}/></div>
              <div className="flex flex-col gap-1.5"><label className="text-[11px] text-[#71717A]">Base branch</label><input value={branch} onChange={e=>setBranch(e.target.value)} placeholder="main" className={inp} style={inpS} disabled={state.phase==='pushing'}/></div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#71717A]">Personal access token (repo scope)</label>
              <input type="password" value={pat} onChange={e=>setPat(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" className={inp} style={inpS} disabled={state.phase==='pushing'}/>
              <p className="text-[10px] text-[#3f3f46]">Only sent to GitHub API — never stored.</p>
            </div>
            <button onClick={()=>setCreatePR(v=>!v)} disabled={state.phase==='pushing'}
              className="flex items-center gap-2.5 p-3 rounded-[10px] text-left transition-colors"
              style={{background:createPR?'rgba(99,102,241,0.06)':'rgba(255,255,255,0.03)',border:`0.5px solid ${createPR?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.06)'}`}}>
              <div className="w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0"
                style={{background:createPR?'#6366f1':'transparent',border:`1.5px solid ${createPR?'#6366f1':'rgba(255,255,255,0.2)'}`}}>
                {createPR&&<Check className="w-2.5 h-2.5 text-white"/>}
              </div>
              <div>
                <div className="flex items-center gap-1.5"><GitPullRequest className="w-3 h-3 text-[#6366f1]"/><span className="text-[12px] font-medium text-[#FAFAFA]">Create pull request</span></div>
                <p className="text-[11px] text-[#52525B] mt-0.5">{createPR?'New branch + PR for review':'Push directly to base branch'}</p>
              </div>
            </button>
            {state.phase==='error'&&<p className="text-[12px] text-[#EF4444]">{state.error}</p>}
          </div>
        )}
        {state.phase!=='done'&&(
          <div className="flex items-center justify-between px-5 py-3.5" style={{borderTop:'0.5px solid rgba(255,255,255,0.07)'}}>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={push} disabled={!owner||!repo||!pat||state.phase==='pushing'} className="gap-1.5">
              {state.phase==='pushing'?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Pushing…</>:<><GitBranch className="w-3.5 h-3.5"/>{createPR?'Create PR':'Push to repo'}</>}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Loading View ─────────────────────────────────────────────

function LoadingView({ url }: { url: string }) {
  const steps = ['Fetching website','Reading page content','Running AI analysis']
  const [step, setStep] = useState(0)
  useEffect(()=>{const t1=setTimeout(()=>setStep(1),1800),t2=setTimeout(()=>setStep(2),4000);return()=>{clearTimeout(t1);clearTimeout(t2)}},[])
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
          style={{background:'rgba(99,102,241,0.08)',border:'0.5px solid rgba(99,102,241,0.2)'}}>
          <Globe className="w-10 h-10 text-[#6366f1]"/>
        </div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="3"/>
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${2*Math.PI*36*0.22} ${2*Math.PI*36*0.78}`}
            animate={{rotate:360}} transition={{repeat:Infinity,duration:1.6,ease:'linear'}}
            style={{transformOrigin:'40px 40px'}}/>
        </svg>
      </div>
      <div>
        <p className="text-[14px] font-medium text-[#FAFAFA] mb-4">{url.replace(/^https?:\/\//,'')}</p>
        <div className="flex flex-col gap-2 items-start">
          {steps.map((label,i)=>(
            <div key={i} className="flex items-center gap-2.5">
              {i<step?<CheckCircle2 className="w-4 h-4 text-[#22c55e]"/>
                :i===step?<div className="w-4 h-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin"/>
                :<div className="w-4 h-4 rounded-full" style={{border:'1.5px solid rgba(255,255,255,0.1)'}}/>}
              <span className="text-[13px]" style={{color:i<=step?'#A1A1AA':'#3f3f46'}}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

type BuildMode = 'analyze' | 'scratch'

export default function WebsitePage() {
  const [inputUrl,setInputUrl]       = useState('')
  const [phase,setPhase]             = useState<Phase>('idle')
  const [analysis,setAnalysis]       = useState<Analysis|null>(null)
  const [domain,setDomain]           = useState('')
  const [h1s,setH1s]                 = useState<string[]>([])
  const [bodyPreview,setBodyPreview] = useState('')
  const [errorMsg,setErrorMsg]       = useState('')
  const [activeTab,setActiveTab]     = useState<ActiveTab>('issues')
  const [severityFilter,setSeverityFilter] = useState<SeverityFilter>('all')
  const [improveSection,setImproveSection] = useState<PageSection|null>(null)
  const [showRedesign,setShowRedesign]     = useState(false)
  const [buildMode,setBuildMode]           = useState<BuildMode>('analyze')
  const [scratchDesc,setScratchDesc]       = useState('')
  const [scratchRef,setScratchRef]         = useState('')
  const [scratchFeatures,setScratchFeatures] = useState('')
  const submittedUrlRef = useRef('')

  const handleAnalyze = useCallback(async (url: string) => {
    const clean=url.trim()
    if(!clean)return
    submittedUrlRef.current=clean
    setPhase('loading'); setAnalysis(null); setH1s([]); setBodyPreview('')
    setErrorMsg(''); setActiveTab('issues'); setSeverityFilter('all'); setShowRedesign(false)

    try {
      const res=await fetch('/api/website/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:clean})})
      const data=await res.json() as {analysis?:Analysis;domain?:string;h1s?:string[];bodyPreview?:string;error?:string}
      if(!res.ok){setErrorMsg(data.error??'Analysis failed');setPhase('error');return}
      setAnalysis(data.analysis as Analysis); setDomain(data.domain??'')
      setH1s(data.h1s??[]); setBodyPreview(data.bodyPreview??'')
      setPhase('done')
    } catch {setErrorMsg('Something went wrong — please try again');setPhase('error')}
  }, [])

  const handleSubmit=(e:React.FormEvent)=>{e.preventDefault();handleAnalyze(inputUrl)}
  const reset=()=>{setPhase('idle');setAnalysis(null);setInputUrl('');setShowRedesign(false)}

  const counts = analysis ? {
    all: analysis.issues.length,
    critical: analysis.issues.filter(i=>i.severity==='critical').length,
    warning:  analysis.issues.filter(i=>i.severity==='warning').length,
    tip:      analysis.issues.filter(i=>i.severity==='tip').length,
  } : null

  const filteredIssues = analysis?.issues.filter(i=>severityFilter==='all'||i.severity===severityFilter)??[]
  const scoreColor = analysis ? (analysis.score>=70?'#22c55e':analysis.score>=50?'#FBBF24':'#EF4444') : '#71717A'
  const improveContext = analysis ? `${analysis.summary} ${analysis.headline}` : ''

  return (
    <div className="flex flex-col h-full">
      <TopBar/>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[20px] font-medium text-[#FAFAFA]">My Website</h1>
              <p className="text-[14px] text-[#71717A] mt-0.5">
                {phase==='done'?'AI analysis · redesign · copy improvements':'Analyze, redesign, and improve your web presence'}
              </p>
            </div>
            {phase==='done'&&(
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="primary" size="sm" onClick={()=>setShowRedesign(true)} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5"/>Generate redesign
                </Button>
                <Button variant="ghost" size="sm" onClick={()=>window.open(`https://${domain}`,'_blank')} className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5"/>Open site
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5"/>New
                </Button>
              </div>
            )}
          </div>

          {/* ── Idle ── */}
          {phase==='idle'&&(
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className="flex flex-col rounded-2xl overflow-hidden"
              style={{border:'0.5px solid rgba(255,255,255,0.08)',background:'rgba(17,17,19,0.5)'}}>

              {/* Mode tabs */}
              <div className="flex border-b" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                {([['analyze','Analyze my site',Globe],['scratch','Build from inspiration',Sparkles]] as const).map(([mode,label,Icon])=>(
                  <button key={mode} onClick={()=>setBuildMode(mode)}
                    className="flex items-center gap-2 px-5 py-3.5 text-[13px] font-medium transition-all relative"
                    style={{color:buildMode===mode?'#FAFAFA':'#52525B',background:'transparent',border:'none',cursor:'pointer'}}>
                    <Icon className="w-3.5 h-3.5"/>
                    {label}
                    {buildMode===mode&&(
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{background:'#6366f1'}}/>
                    )}
                  </button>
                ))}
              </div>

              {/* Analyze mode */}
              {buildMode==='analyze'&&(
                <div className="flex flex-col items-center text-center py-12 px-6 gap-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{background:'rgba(99,102,241,0.1)',border:'0.5px solid rgba(99,102,241,0.2)'}}>
                    <Globe className="w-6 h-6 text-[#6366f1]"/>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-semibold text-[#FAFAFA] mb-1.5" style={{letterSpacing:'-0.02em'}}>Analyze your website</h2>
                    <p className="text-[13px] text-[#71717A] max-w-[40ch] mx-auto leading-relaxed">
                      AI audit — SEO, content, trust signals, CTAs — then generate a redesign, optionally inspired by any site.
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
                    <input type="text" value={inputUrl} onChange={e=>setInputUrl(e.target.value)}
                      placeholder="yourbusiness.com"
                      className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-[14px] text-[#FAFAFA] outline-none"
                      style={{background:'rgba(24,24,28,0.8)',border:'0.5px solid rgba(255,255,255,0.1)'}}
                      onFocus={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,0.5)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(99,102,241,0.08)'}}
                      onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';e.currentTarget.style.boxShadow='none'}}/>
                    <Button type="submit" variant="primary" size="sm" className="gap-1.5 flex-shrink-0">
                      Analyze<ArrowRight className="w-3.5 h-3.5"/>
                    </Button>
                  </form>
                  <p className="text-[12px]" style={{color:'#3f3f46'}}>After analysis, you can reference any site in the redesign step.</p>
                </div>
              )}

              {/* Build from scratch mode */}
              {buildMode==='scratch'&&(
                <div className="flex flex-col py-10 px-6 gap-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{background:'rgba(99,102,241,0.1)',border:'0.5px solid rgba(99,102,241,0.2)'}}>
                      <Sparkles className="w-5 h-5 text-[#6366f1]"/>
                    </div>
                    <div>
                      <h2 className="text-[17px] font-semibold text-[#FAFAFA]" style={{letterSpacing:'-0.02em'}}>Build from inspiration</h2>
                      <p className="text-[13px] text-[#71717A] mt-0.5">Describe your business and reference a site you love — AI builds it.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 max-w-xl">
                    {/* Business description */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-[#71717A] font-medium">What is your business?</label>
                      <input value={scratchDesc} onChange={e=>setScratchDesc(e.target.value)}
                        placeholder="e.g. A SaaS tool for scheduling social media posts"
                        className="px-4 py-2.5 rounded-xl text-[13px] text-[#FAFAFA] outline-none"
                        style={{background:'rgba(24,24,28,0.8)',border:'0.5px solid rgba(255,255,255,0.1)'}}
                        onFocus={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'}}
                        onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}}/>
                    </div>

                    {/* Reference site */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-[#71717A] font-medium">Base it on / inspired by</label>
                      <input value={scratchRef} onChange={e=>setScratchRef(e.target.value)}
                        placeholder="stripe.com, linear.app, vercel.com…"
                        className="px-4 py-2.5 rounded-xl text-[13px] text-[#FAFAFA] outline-none"
                        style={{background:'rgba(24,24,28,0.8)',border:'0.5px solid rgba(255,255,255,0.1)'}}
                        onFocus={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'}}
                        onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}}/>
                      {/* Preset chips */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {INSPIRATION_PRESETS.map(p=>(
                          <button key={p.url} onClick={()=>setScratchRef(p.url)}
                            title={p.hint}
                            className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all"
                            style={{
                              background:scratchRef===p.url?'rgba(99,102,241,0.18)':'rgba(255,255,255,0.04)',
                              border:`0.5px solid ${scratchRef===p.url?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.08)'}`,
                              color:scratchRef===p.url?'#818cf8':'#52525B',
                            }}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feature requests */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-[#71717A] font-medium">Specific features to include <span style={{color:'#3f3f46'}}>(optional)</span></label>
                      <input value={scratchFeatures} onChange={e=>setScratchFeatures(e.target.value)}
                        placeholder="e.g. animated pricing table, testimonials, email signup, sticky nav"
                        className="px-4 py-2.5 rounded-xl text-[13px] text-[#FAFAFA] outline-none"
                        style={{background:'rgba(24,24,28,0.8)',border:'0.5px solid rgba(255,255,255,0.1)'}}
                        onFocus={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'}}
                        onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}}/>
                    </div>

                    <Button
                      variant="primary" size="sm"
                      className="gap-1.5 self-start mt-1"
                      disabled={!scratchDesc.trim()}
                      onClick={()=>{
                        setDomain(scratchDesc.slice(0,40))
                        setShowRedesign(true)
                      }}>
                      <Sparkles className="w-3.5 h-3.5"/>Build my website
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Loading ── */}
          {phase==='loading'&&<LoadingView url={submittedUrlRef.current}/>}

          {/* ── Error ── */}
          {phase==='error'&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              className="flex flex-col items-center gap-4 py-14 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{background:'rgba(239,68,68,0.1)',border:'0.5px solid rgba(239,68,68,0.2)'}}>
                <AlertCircle className="w-6 h-6 text-[#EF4444]"/>
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#FAFAFA] mb-1">Analysis failed</p>
                <p className="text-[13px] text-[#71717A]">{errorMsg}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>Try again</Button>
            </motion.div>
          )}

          {/* ── Results ── */}
          {phase==='done'&&analysis&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col gap-5">

              {/* Score header */}
              <div className="flex items-center gap-5 p-5 rounded-2xl relative overflow-hidden"
                style={{background:'#111113',border:'0.5px solid rgba(255,255,255,0.07)'}}>
                {/* Subtle glow behind ring */}
                <div className="absolute left-0 top-0 w-40 h-full pointer-events-none"
                  style={{background:`radial-gradient(ellipse at left center, ${scoreColor}12 0%, transparent 70%)`}}/>
                <ScoreRing score={analysis.score}/>
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Globe className="w-4 h-4 text-[#52525B]"/>
                    <span className="text-[14px] font-medium text-[#FAFAFA] truncate">{domain}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{color:scoreColor,background:`${scoreColor}18`}}>{analysis.scoreLabel}</span>
                  </div>
                  <p className="text-[13px] text-[#A1A1AA] leading-relaxed mb-3">{analysis.headline}</p>
                  {analysis.quickWins.length>0&&(
                    <div className="flex flex-col gap-1.5">
                      {analysis.quickWins.map((win,i)=>(
                        <div key={i} className="flex items-start gap-2">
                          <Zap className="w-3 h-3 text-[#FBBF24] mt-0.5 flex-shrink-0"/>
                          <span className="text-[12px] text-[#71717A] leading-relaxed">{win}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Category grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(analysis.categories).map(([key,val],i)=>(
                  <CategoryCard key={key} name={key} data={val} index={i}/>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-[10px]" style={{background:'rgba(24,24,28,0.8)'}}>
                {([
                  {id:'issues'  as ActiveTab, icon:AlertCircle, label:`Issues (${analysis.issues.length})`},
                  {id:'sections'as ActiveTab, icon:Layout,      label:`Sections (${analysis.sections.length})`},
                  {id:'brief'   as ActiveTab, icon:FileText,    label:'Brief'},
                ] as const).map(tab=>(
                  <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-medium transition-all"
                    style={{background:activeTab===tab.id?'rgba(99,102,241,0.15)':'transparent',
                      color:activeTab===tab.id?'#818cf8':'#52525B'}}>
                    <tab.icon className="w-3.5 h-3.5"/>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {/* Issues */}
              {activeTab==='issues'&&(
                <motion.div key="issues" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="flex flex-col gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {([
                      {id:'all'      as SeverityFilter, label:`All (${counts?.all??0})`,           color:'#A1A1AA'},
                      {id:'critical' as SeverityFilter, label:`Critical (${counts?.critical??0})`, color:'#EF4444'},
                      {id:'warning'  as SeverityFilter, label:`Warnings (${counts?.warning??0})`,  color:'#FBBF24'},
                      {id:'tip'      as SeverityFilter, label:`Tips (${counts?.tip??0})`,           color:'#6366f1'},
                    ]).map(f=>(
                      <button key={f.id} onClick={()=>setSeverityFilter(f.id)}
                        className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                        style={{color:severityFilter===f.id?f.color:'#52525B',
                          background:severityFilter===f.id?`${f.color}18`:'rgba(255,255,255,0.04)',
                          border:`0.5px solid ${severityFilter===f.id?`${f.color}40`:'rgba(255,255,255,0.06)'}`}}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {filteredIssues.length===0
                    ?<p className="text-[13px] text-[#52525B] text-center py-6">No issues in this category.</p>
                    :filteredIssues.map((issue,i)=><IssueItem key={i} issue={issue} index={i}/>)
                  }
                </motion.div>
              )}

              {/* Sections */}
              {activeTab==='sections'&&(
                <motion.div key="sections" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.sections.map((s,i)=>(
                    <SectionCard key={s.name} section={s} index={i} onImprove={setImproveSection}/>
                  ))}
                </motion.div>
              )}

              {/* Brief */}
              {activeTab==='brief'&&(
                <motion.div key="brief" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="flex flex-col gap-4">
                  <div className="p-5 rounded-[12px]" style={{background:'#111113',border:'0.5px solid rgba(255,255,255,0.06)'}}>
                    <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-[#6366f1]"/><span className="text-[13px] font-medium text-[#FAFAFA]">Summary</span></div>
                    <p className="text-[14px] text-[#A1A1AA] leading-relaxed">{analysis.summary}</p>
                  </div>
                  <div className="p-5 rounded-[12px]" style={{background:'rgba(99,102,241,0.04)',border:'0.5px solid rgba(99,102,241,0.15)'}}>
                    <div className="flex items-center gap-2 mb-3"><Wand2 className="w-4 h-4 text-[#6366f1]"/><span className="text-[13px] font-medium text-[#FAFAFA]">Redesign priorities</span></div>
                    <p className="text-[14px] text-[#A1A1AA] leading-relaxed">{analysis.redesignBrief}</p>
                  </div>
                  <div className="p-5 rounded-[12px]" style={{background:'#111113',border:'0.5px solid rgba(255,255,255,0.06)'}}>
                    <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-[#FBBF24]"/><span className="text-[13px] font-medium text-[#FAFAFA]">Quick wins</span></div>
                    <div className="flex flex-col gap-2.5">
                      {analysis.quickWins.map((win,i)=>(
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                            style={{background:'rgba(251,191,36,0.1)',color:'#FBBF24'}}>{i+1}</span>
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

      <AnimatePresence>
        {improveSection&&(
          <ImproveModal section={improveSection} domain={domain} context={improveContext} onClose={()=>setImproveSection(null)}/>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRedesign&&(analysis||buildMode==='scratch')&&(
          <RedesignModal
            domain={domain}
            analysis={analysis}
            h1s={h1s}
            bodyPreview={bodyPreview}
            onClose={()=>setShowRedesign(false)}
            buildFromScratch={buildMode==='scratch'}
            businessDescription={buildMode==='scratch' ? scratchDesc : undefined}
            initialReferenceUrl={buildMode==='scratch' ? scratchRef : undefined}
            initialFeatureRequest={buildMode==='scratch' ? scratchFeatures : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
