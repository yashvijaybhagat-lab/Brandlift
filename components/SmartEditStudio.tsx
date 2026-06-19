'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  type EditState, type EditPlan,
  initialEditState, applyPlanToState, opToEnglish,
} from '@/lib/editPlan'
import TimelineEditor from '@/components/TimelineEditor'
import {
  Send, Undo2, Redo2, X, Plus, Trash2, Check,
  MessageSquare, Type, Clock, Scissors,
  Volume2, PanelBottom, Sparkles,
} from 'lucide-react'

interface ChatMessage {
  id:    string
  role:  'user' | 'ai'
  text:  string
  plan?: EditPlan
  kind?: 'edit' | 'clarify' | 'unsupported' | 'error'
}

interface Props {
  videoUrl:        string
  duration:        number
  initialCaptions: { text: string; start: number; end: number }[]
  colorFilter:     string
  onClose:         () => void
  onApply:         (state: EditState) => void
}

const SIZE_PX: Record<string, number> = { sm: 13, md: 17, lg: 22, xl: 28 }
const FONT_FAMILY: Record<string, string> = {
  inter:  'Inter, sans-serif',
  impact: 'Impact, Arial Narrow, sans-serif',
  serif:  'Georgia, serif',
  mono:   'ui-monospace, monospace',
}

type Tool = 'ai' | 'caption' | 'text' | 'trim' | 'audio' | 'history'

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'ai',      icon: <Sparkles className="w-4 h-4" />,       label: 'AI Edit' },
  { id: 'caption', icon: <Type className="w-4 h-4" />,           label: 'Captions' },
  { id: 'text',    icon: <PanelBottom className="w-4 h-4" />,    label: 'Text' },
  { id: 'trim',    icon: <Scissors className="w-4 h-4" />,       label: 'Trim' },
  { id: 'audio',   icon: <Volume2 className="w-4 h-4" />,        label: 'Audio' },
  { id: 'history', icon: <Clock className="w-4 h-4" />,          label: 'History' },
]

/* ── Shared sub-components ───────────────────────────────── */

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
      background: active ? '#7C5CFF' : 'rgba(255,255,255,0.05)',
      border: active ? '1px solid #7C5CFF' : '1px solid rgba(255,255,255,0.08)',
      color: active ? '#fff' : '#666',
      cursor: 'pointer', transition: 'all 120ms ease',
    }}>{label}</button>
  )
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.05} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#7C5CFF', height: 4 }} />
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: '#3a3a3a', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
      {children}
    </span>
  )
}

/* ── Main component ──────────────────────────────────────── */

export default function SmartEditStudio({ videoUrl, duration, initialCaptions, colorFilter, onClose, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const [editState, setEditState] = useState<EditState>(() => initialEditState(duration, initialCaptions))
  const [undoStack, setUndoStack] = useState<EditState[]>([])
  const [redoStack, setRedoStack] = useState<EditState[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [activeZoom,  setActiveZoom]  = useState(1.0)

  const [messages,  setMessages]  = useState<ChatMessage[]>([
    { id: 'welcome', role: 'ai', text: 'Tell me what to change — "yellow captions", "cut first 3s", "speed up the middle", "add CTA at end".', kind: 'edit' },
  ])
  const [input,     setInput]     = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [editingIdx,  setEditingIdx]  = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addText,     setAddText]     = useState('')
  const [addDuration, setAddDuration] = useState(3)

  const [newOverlayText,  setNewOverlayText]  = useState('')
  const [newOverlayPos,   setNewOverlayPos]   = useState<'top'|'center'|'bottom'>('bottom')
  const [newOverlayStyle, setNewOverlayStyle] = useState<'title'|'cta'|'label'>('cta')

  const [activeTool, setActiveTool] = useState<Tool>('ai')

  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* ── Playback ─────────────────────────────────────────── */
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current; if (!v) return
    const t = v.currentTime; setCurrentTime(t)
    const segs = editState.segments
    const inSeg = segs.find(s => t >= s.start && t < s.end)
    if (!inSeg) {
      const next = segs.find(s => s.start > t)
      if (next) v.currentTime = next.start; else v.pause()
      return
    }
    const targetRate = inSeg.speed ?? 1.0
    if (Math.abs(v.playbackRate - targetRate) > 0.01) v.playbackRate = targetRate
    const punch = editState.zoomPunches.find(z => t >= z.at && t < z.at + z.duration)
    setActiveZoom(punch?.scale ?? 1.0)
  }, [editState.segments, editState.zoomPunches])

  const activeCaptions = editState.captionActive
    ? editState.captions.filter(c => currentTime >= c.start && currentTime <= c.end) : []
  const activeOverlays = editState.textOverlays.filter(
    o => currentTime >= o.at && currentTime < o.at + o.duration)

  /* ── Undo/redo ─────────────────────────────────────────── */
  const pushUndo = useCallback((s: EditState) => { setUndoStack(u => [...u, s]); setRedoStack([]) }, [])

  const undo = useCallback(() => {
    if (!undoStack.length) return
    setRedoStack(r => [...r, editState])
    setUndoStack(u => u.slice(0, -1))
    setEditState(undoStack[undoStack.length - 1])
  }, [undoStack, editState])

  const redo = useCallback(() => {
    if (!redoStack.length) return
    setUndoStack(u => [...u, editState])
    setRedoStack(r => r.slice(0, -1))
    setEditState(redoStack[redoStack.length - 1])
  }, [redoStack, editState])

  /* ── AI Edit ───────────────────────────────────────────── */
  const sendPrompt = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    setMessages(m => [...m, { id: `u-${Date.now()}`, role: 'user', text: text.trim() }])
    setInput('')
    setIsLoading(true)
    try {
      const history = messages.filter(m => m.role === 'ai' && m.plan).map(m => m.plan!.summary)
      const res = await fetch('/api/video/smart-edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text.trim(), duration, captions: editState.captions, history }),
      })

      let data: Record<string, unknown>
      try {
        data = await res.json()
      } catch {
        const status = res.status
        setMessages(m => [...m, {
          id: `e-${Date.now()}`, role: 'ai', kind: 'error',
          text: `Server error (${status}) — the AI returned an unreadable response. Try rephrasing your request.`,
        }])
        return
      }

      if (!res.ok || data.error) {
        setMessages(m => [...m, {
          id: `e-${Date.now()}`, role: 'ai', kind: 'error',
          text: typeof data.error === 'string' ? data.error : `Something went wrong (${res.status}). Try again.`,
        }])
        return
      }

      if (!data.plan || typeof data.plan !== 'object') {
        setMessages(m => [...m, {
          id: `e-${Date.now()}`, role: 'ai', kind: 'error',
          text: 'The AI returned an unexpected response format. Try a more specific instruction.',
        }])
        return
      }

      const plan = data.plan as EditPlan
      const ops = plan.ops
      const isClarify     = ops.length === 1 && ops[0].op === 'clarify'
      const isUnsupported = ops.some(o => o.op === 'unsupported')

      if (isClarify) {
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'ai', text: (ops[0] as {op:'clarify';question:string}).question, plan, kind: 'clarify' }])
        return
      }
      if (isUnsupported) {
        const u = ops.find(o => o.op === 'unsupported') as {op:string;instruction:string;suggestion:string}
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'ai', text: `Can't do "${u.instruction}" yet — ${u.suggestion}`, plan, kind: 'unsupported' }])
        return
      }

      pushUndo(editState)
      setEditState(s => applyPlanToState(s, plan, duration))
      const interpretOp = ops.find(o => o.op === 'interpret') as {op:string;message:string}|undefined
      setMessages(m => [...m, {
        id: `a-${Date.now()}`, role: 'ai', kind: 'edit',
        text: interpretOp ? `💡 ${interpretOp.message}` : plan.summary,
        plan,
      }])
    } catch (err) {
      setMessages(m => [...m, {
        id: `e-${Date.now()}`, role: 'ai', kind: 'error',
        text: `Network error — ${err instanceof Error ? err.message : 'check your connection and try again.'}`,
      }])
    } finally { setIsLoading(false); inputRef.current?.focus() }
  }, [isLoading, messages, editState, duration, pushUndo])

  /* ── Caption actions ───────────────────────────────────── */
  const addCaptionAtTime = useCallback(() => {
    if (!addText.trim()) return
    const t = videoRef.current?.currentTime ?? currentTime
    pushUndo(editState)
    setEditState(s => ({
      ...s,
      captions: [...s.captions, { text: addText.trim(), start: t, end: Math.min(t + addDuration, duration) }].sort((a,b) => a.start - b.start),
      captionActive: true,
    }))
    setAddText(''); setShowAddForm(false)
  }, [addText, addDuration, currentTime, duration, editState, pushUndo])

  const updateCaption = useCallback((idx: number, text: string) => {
    pushUndo(editState)
    setEditState(s => ({ ...s, captions: s.captions.map((c,i) => i===idx ? {...c,text} : c) }))
    setEditingIdx(null)
  }, [editState, pushUndo])

  const deleteCaption = useCallback((idx: number) => {
    pushUndo(editState)
    setEditState(s => ({ ...s, captions: s.captions.filter((_,i) => i!==idx) }))
  }, [editState, pushUndo])

  /* ── Text overlay ──────────────────────────────────────── */
  const addTextOverlay = useCallback(() => {
    if (!newOverlayText.trim()) return
    const t = videoRef.current?.currentTime ?? currentTime
    pushUndo(editState)
    setEditState(s => ({
      ...s, textOverlays: [...s.textOverlays, { text: newOverlayText.trim(), at: t, duration: 4, position: newOverlayPos, style: newOverlayStyle }],
    }))
    setNewOverlayText('')
  }, [newOverlayText, newOverlayPos, newOverlayStyle, currentTime, editState, pushUndo])

  /* ── Trim / Speed ──────────────────────────────────────── */
  const splitAtPlayhead = useCallback(() => {
    const t = videoRef.current?.currentTime ?? currentTime
    pushUndo(editState)
    setEditState(s => {
      const idx = s.segments.findIndex(sg => t > sg.start && t < sg.end)
      if (idx === -1) return s
      const seg = s.segments[idx]
      return { ...s, segments: [...s.segments.slice(0,idx), {...seg,end:t}, {...seg,start:t}, ...s.segments.slice(idx+1)] }
    })
  }, [currentTime, editState, pushUndo])

  const setSegmentSpeed = useCallback((idx: number, speed: number) => {
    pushUndo(editState)
    setEditState(s => ({ ...s, segments: s.segments.map((sg,i) => i===idx ? {...sg,speed} : sg) }))
  }, [editState, pushUndo])

  const deleteSegment = useCallback((idx: number) => {
    if (editState.segments.length <= 1) return
    pushUndo(editState)
    setEditState(s => ({ ...s, segments: s.segments.filter((_,i) => i!==idx) }))
  }, [editState, pushUndo])

  /* ── Caption position style ────────────────────────────── */
  const captionPosStyle: React.CSSProperties =
    editState.captionPos === 'top'    ? { top: '8%', bottom: 'auto' } :
    editState.captionPos === 'center' ? { top: '50%', transform: 'translateY(-50%)' } :
    { bottom: '10%', top: 'auto' }

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div style={{ background: '#0D0D0F', minHeight: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        background: '#0D0D0F',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 16px',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', borderRadius: 6 }}>
            <X className="w-4 h-4" style={{ color: '#555' }} />
          </button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#7C5CFF' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4f0', letterSpacing: '-0.02em' }}>Smart Edit</span>
          </div>
          <span style={{ fontSize: 10, color: '#3a3a3a', fontFamily: 'monospace' }}>{duration.toFixed(1)}s</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={undo} disabled={!undoStack.length} title="Undo" style={{
            background: 'none', border: 'none', padding: 6, cursor: undoStack.length ? 'pointer' : 'default',
            opacity: undoStack.length ? 1 : 0.25, display: 'flex', borderRadius: 6,
          }}>
            <Undo2 className="w-4 h-4" style={{ color: '#888' }} />
          </button>
          <button onClick={redo} disabled={!redoStack.length} title="Redo" style={{
            background: 'none', border: 'none', padding: 6, cursor: redoStack.length ? 'pointer' : 'default',
            opacity: redoStack.length ? 1 : 0.25, display: 'flex', borderRadius: 6,
          }}>
            <Redo2 className="w-4 h-4" style={{ color: '#888' }} />
          </button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)' }} />
          <button onClick={() => onApply(editState)} style={{
            background: '#7C5CFF', border: 'none', color: '#fff',
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '-0.01em',
            boxShadow: '0 0 0 1px rgba(124, 92, 255,0.5)',
          }}>
            Apply & Export
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }} className="se-body">

        {/* Video preview */}
        <div className="se-video-col" style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative', aspectRatio: '9/16', maxHeight: '42vh', width: 'auto', overflow: 'hidden', background: '#000', borderRadius: 12 }} className="se-video-wrap">
            <video
              ref={videoRef}
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              controls playsInline
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                filter: [colorFilter, 'brightness(1.10) contrast(1.18) saturate(1.14)'].filter(Boolean).join(' ') || undefined,
                transform: `scale(${activeZoom})`,
                transition: 'transform 0.2s ease',
              }}
            />

            {activeCaptions.map((c, i) => (
              <div key={i} className="absolute left-0 right-0 flex justify-center pointer-events-none px-3" style={{ ...captionPosStyle, zIndex: 10 }}>
                <span style={{
                  fontSize: SIZE_PX[editState.captionSize] ?? 17,
                  fontFamily: FONT_FAMILY[editState.captionFont] ?? 'Inter, sans-serif',
                  fontWeight: editState.captionBold ? 700 : 500,
                  color: editState.captionColor,
                  textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)',
                  textAlign: 'center', lineHeight: 1.3,
                }}>{c.text}</span>
              </div>
            ))}

            {activeOverlays.map((o, i) => {
              const y: React.CSSProperties = o.position === 'top' ? { top: '8%' } : o.position === 'center' ? { top: '50%', transform: 'translateY(-50%)' } : { bottom: '10%' }
              return (
                <div key={i} className="absolute left-0 right-0 flex justify-center pointer-events-none px-4" style={{ ...y, zIndex: 11 }}>
                  <span style={{
                    fontSize: o.style === 'title' ? 22 : o.style === 'cta' ? 17 : 13,
                    fontWeight: 800, color: '#fff',
                    textShadow: '0 2px 12px rgba(0,0,0,0.95)',
                    textAlign: 'center',
                    padding: o.style === 'cta' ? '5px 14px' : '0',
                    background: o.style === 'cta' ? 'rgba(124, 92, 255,0.9)' : 'transparent',
                    borderRadius: o.style === 'cta' ? 8 : 0,
                  }}>{o.text}</span>
                </div>
              )
            })}

            {/* Segment bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, zIndex: 20 }}>
              {editState.segments.map((seg, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${(seg.start/duration)*100}%`,
                  width: `${((seg.end-seg.start)/duration)*100}%`,
                  height: '100%',
                  background: seg.speed !== 1.0 ? '#facc15' : '#7C5CFF',
                }} />
              ))}
            </div>

            {/* Time badge */}
            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', borderRadius: 5, padding: '2px 7px', zIndex: 20 }}>
              <span style={{ fontSize: 10, color: '#888', fontFamily: 'monospace' }}>{currentTime.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* ── Tool panel ─────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: '#0D0D0F' }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#0D0D0F', flexShrink: 0, overflowX: 'auto',
          }}>
            {TOOLS.map(tool => (
              <button key={tool.id} onClick={() => setActiveTool(tool.id)} style={{
                flex: 1, minWidth: 64,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '10px 6px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: activeTool === tool.id ? '#7B78E8' : '#3a3a3a',
                borderBottom: activeTool === tool.id ? '2px solid #7C5CFF' : '2px solid transparent',
                transition: 'all 120ms ease',
              }}>
                {tool.icon}
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* ── AI EDIT ─────────────────────────────────── */}
            {activeTool === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none' }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '86%', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding: '10px 14px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, #7C5CFF, #4845b0)'
                          : msg.kind === 'error'
                          ? 'rgba(239,68,68,0.08)'
                          : msg.kind === 'clarify'
                          ? 'rgba(250,204,21,0.06)'
                          : 'rgba(255,255,255,0.05)',
                        border: msg.role === 'ai'
                          ? msg.kind === 'error' ? '1px solid rgba(239,68,68,0.2)'
                          : msg.kind === 'clarify' ? '1px solid rgba(250,204,21,0.15)'
                          : '1px solid rgba(255,255,255,0.07)'
                          : 'none',
                        boxShadow: msg.role === 'user' ? '0 2px 12px rgba(124, 92, 255,0.3)' : 'none',
                      }}>
                        <p style={{
                          fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0,
                          color: msg.role === 'user' ? '#fff'
                            : msg.kind === 'error' ? '#f87171'
                            : msg.kind === 'clarify' ? '#fde68a'
                            : '#c8c8d4',
                        }}>
                          {msg.text}
                        </p>
                        {msg.plan && msg.kind === 'edit' && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {msg.plan.ops.filter(o => !['interpret','clarify','unsupported'].includes(o.op)).slice(0,4).map((op,i) => (
                              <p key={i} style={{ fontSize: 10, color: '#4a4a5a', fontFamily: 'monospace', margin: '2px 0' }}>{opToEnglish(op)}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div style={{ display: 'flex' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center',
                      }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C5CFF', animation: `sePulse 1.2s ease ${i*0.2}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick prompts */}
                <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                  {['Yellow captions','Cut intro','Speed up','Add CTA','Lower music','Bigger text'].map(p => (
                    <button key={p} onClick={() => sendPrompt(p)} disabled={isLoading} style={{
                      padding: '5px 11px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.04)',
                      color: '#555', border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: 11, cursor: 'pointer', transition: 'all 120ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#999'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}>
                      {p}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(input) } }}
                    placeholder="Tell me what to edit…" rows={2} disabled={isLoading}
                    style={{
                      flex: 1, resize: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e4e4f0', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                      transition: 'border-color 150ms ease',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124, 92, 255,0.5)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                  <button onClick={() => sendPrompt(input)} disabled={isLoading || !input.trim()} style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none',
                    cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                    background: input.trim() && !isLoading ? '#7C5CFF' : 'rgba(255,255,255,0.05)',
                    color: input.trim() && !isLoading ? '#fff' : '#333',
                    transition: 'all 150ms ease',
                    boxShadow: input.trim() && !isLoading ? '0 2px 12px rgba(124, 92, 255,0.4)' : 'none',
                  }}>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── CAPTIONS ─────────────────────────────────── */}
            {activeTool === 'caption' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 16, overflowY: 'auto', height: '100%', scrollbarWidth: 'none' }}>
                {/* Add bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Label>Captions {editState.captions.length > 0 && `· ${editState.captions.length}`}</Label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {editState.captions.length > 0 && (
                      <button onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionActive: !s.captionActive})) }} style={{
                        fontSize: 11, color: editState.captionActive ? '#4ade80' : '#555',
                        background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
                      }}>
                        {editState.captionActive ? '● Visible' : '○ Hidden'}
                      </button>
                    )}
                    <button onClick={() => { setShowAddForm(p => !p); setAddText('') }} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                      background: '#7C5CFF', border: '1px solid #7C5CFF', color: '#fff', cursor: 'pointer',
                    }}>
                      <Plus className="w-3 h-3" />Add
                    </button>
                  </div>
                </div>

                {showAddForm && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input autoFocus value={addText} onChange={e => setAddText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCaptionAtTime()}
                      placeholder={`Caption at ${currentTime.toFixed(1)}s…`}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#e4e4f0', outline: 'none', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: '#444', whiteSpace: 'nowrap' }}>Show for</span>
                      <input type="range" min={1} max={8} step={0.5} value={addDuration}
                        onChange={e => setAddDuration(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#7C5CFF' }} />
                      <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{addDuration}s</span>
                      <button onClick={addCaptionAtTime} disabled={!addText.trim()} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7,
                        fontSize: 12, fontWeight: 700, background: '#7C5CFF', border: 'none', color: '#fff',
                        cursor: addText.trim() ? 'pointer' : 'default', opacity: addText.trim() ? 1 : 0.4,
                      }}>
                        <Check className="w-3.5 h-3.5" />Add
                      </button>
                    </div>
                  </div>
                )}

                {editState.captions.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <Type className="w-6 h-6" style={{ color: '#222', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12, color: '#333' }}>No captions yet. Click Add or use AI Edit.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
                    {editState.captions.map((c, i) => (
                      <div key={i} style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{ fontSize: 10, color: '#3a3a3a', fontFamily: 'monospace', flexShrink: 0, minWidth: 34 }}>{c.start.toFixed(1)}s</span>
                        {editingIdx === i ? (
                          <input autoFocus value={editingText} onChange={e => setEditingText(e.target.value)}
                            onBlur={() => editingText.trim() ? updateCaption(i, editingText) : setEditingIdx(null)}
                            onKeyDown={e => { if (e.key === 'Enter') editingText.trim() ? updateCaption(i, editingText) : setEditingIdx(null); if (e.key === 'Escape') setEditingIdx(null) }}
                            style={{ flex: 1, background: 'rgba(124, 92, 255,0.1)', border: '1px solid rgba(124, 92, 255,0.4)', borderRadius: 6, padding: '3px 8px', fontSize: 12, color: '#e4e4f0', outline: 'none', fontFamily: 'inherit' }} />
                        ) : (
                          <span onClick={() => { setEditingIdx(i); setEditingText(c.text) }}
                            title="Click to edit"
                            style={{ flex: 1, fontSize: 12, color: '#aaa', lineHeight: 1.4, cursor: 'text' }}>{c.text}</span>
                        )}
                        <span style={{ fontSize: 10, color: '#2a2a2a', fontFamily: 'monospace', flexShrink: 0 }}>{c.end.toFixed(1)}s</span>
                        <button onClick={() => deleteCaption(i)} style={{ color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#2a2a2a'}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {editState.captions.length > 1 && (
                      <button onClick={() => { pushUndo(editState); setEditState(s => ({...s, captions: []})) }}
                        style={{ marginTop: 4, fontSize: 11, color: '#444', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                        Clear all
                      </button>
                    )}
                  </div>
                )}

                {/* Style */}
                <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Label>Style</Label>
                  {/* Color swatches */}
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                    {[['#FFFFFF','White'],['#FFE600','Yellow'],['#60A5FA','Blue'],['#F472B6','Pink'],['#4ADE80','Green'],['#FB923C','Orange']].map(([hex,label]) => (
                      <button key={hex} onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionColor: hex})) }}
                        title={label}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: hex, border: editState.captionColor === hex ? '2px solid #7B78E8' : '2px solid transparent', cursor: 'pointer', outline: editState.captionColor === hex ? '1px solid rgba(123,120,232,0.4)' : 'none' }} />
                    ))}
                    <input type="color" value={editState.captionColor}
                      onChange={e => { pushUndo(editState); setEditState(s => ({...s, captionColor: e.target.value})) }}
                      style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }} />
                  </div>
                  {/* Size */}
                  <div style={{ display: 'flex', gap: 5 }}>
                    {(['sm','md','lg','xl'] as const).map(s => (
                      <Pill key={s} label={s.toUpperCase()} active={editState.captionSize === s} onClick={() => { pushUndo(editState); setEditState(st => ({...st, captionSize: s})) }} />
                    ))}
                  </div>
                  {/* Position */}
                  <div style={{ display: 'flex', gap: 5 }}>
                    {([['top','Top'],['center','Mid'],['bottom','Bottom']] as const).map(([p, label]) => (
                      <Pill key={p} label={label} active={editState.captionPos === p} onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionPos: p})) }} />
                    ))}
                  </div>
                  {/* Font */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                    {([['inter','Sans','Inter, sans-serif'],['impact','Impact','Impact, sans-serif'],['serif','Serif','Georgia,serif'],['mono','Mono','monospace']] as const).map(([id, label, ff]) => (
                      <Pill key={id} label={label} active={editState.captionFont === id} onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionFont: id})) }} />
                    ))}
                  </div>
                  <Pill label={editState.captionBold ? 'Bold On' : 'Bold Off'} active={editState.captionBold} onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionBold: !s.captionBold})) }} />
                </div>
              </div>
            )}

            {/* ── TEXT OVERLAYS ─────────────────────────────── */}
            {activeTool === 'text' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', height: '100%', scrollbarWidth: 'none' }}>
                <Label>Add text overlay</Label>
                <input value={newOverlayText} onChange={e => setNewOverlayText(e.target.value)}
                  placeholder="Text to show on video…"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: '#e4e4f0', outline: 'none', fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: 5 }}>
                  {(['title','label','cta'] as const).map(s => (
                    <Pill key={s} label={s.charAt(0).toUpperCase()+s.slice(1)} active={newOverlayStyle === s} onClick={() => setNewOverlayStyle(s)} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {([['top','Top'],['center','Center'],['bottom','Bottom']] as const).map(([p,label]) => (
                    <Pill key={p} label={label} active={newOverlayPos === p} onClick={() => setNewOverlayPos(p)} />
                  ))}
                </div>
                <button onClick={addTextOverlay} disabled={!newOverlayText.trim()} style={{
                  padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 700,
                  background: '#7C5CFF', border: 'none', color: '#fff',
                  cursor: newOverlayText.trim() ? 'pointer' : 'default', opacity: newOverlayText.trim() ? 1 : 0.4,
                }}>
                  Add at {currentTime.toFixed(1)}s
                </button>

                {editState.textOverlays.length > 0 && (
                  <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Label>On-screen text</Label>
                    {editState.textOverlays.map((o, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#3a3a3a', fontFamily: 'monospace', flexShrink: 0 }}>{o.at.toFixed(1)}s</span>
                        <span style={{ flex: 1, fontSize: 12, color: '#aaa' }}>{o.text}</span>
                        <span style={{ fontSize: 10, color: '#555', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>{o.style}</span>
                        <button onClick={() => { pushUndo(editState); setEditState(s => ({...s, textOverlays: s.textOverlays.filter((_,idx) => idx!==i)})) }}
                          style={{ color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#2a2a2a'}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TRIM / SPEED ──────────────────────────────── */}
            {activeTool === 'trim' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', height: '100%', scrollbarWidth: 'none' }}>
                <button onClick={splitAtPlayhead} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 700,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#888', cursor: 'pointer',
                }}>
                  <Scissors className="w-3.5 h-3.5" />Split at {currentTime.toFixed(1)}s
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label>Clips ({editState.segments.length})</Label>
                  {editState.segments.map((seg, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
                          Clip {i+1} · {seg.start.toFixed(1)}–{seg.end.toFixed(1)}s
                        </span>
                        {editState.segments.length > 1 && (
                          <button onClick={() => deleteSegment(i)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
                            Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[['0.5x',0.5],['1x',1.0],['1.5x',1.5],['2x',2.0]].map(([label, val]) => (
                          <Pill key={String(val)} label={label as string} active={Math.abs(seg.speed-(val as number))<0.01} onClick={() => setSegmentSpeed(i, val as number)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label>Timeline</Label>
                  <TimelineEditor
                    duration={duration}
                    currentTime={currentTime}
                    segments={editState.segments}
                    captions={editState.captions}
                    voiceVolume={editState.voiceVolume}
                    musicVolume={editState.musicVolume}
                    onSeek={t => { if (videoRef.current) videoRef.current.currentTime = t }}
                    onSegmentsChange={segs => { pushUndo(editState); setEditState(s => ({...s, segments: segs})) }}
                    onCaptionChange={(idx, updates) => { pushUndo(editState); setEditState(s => ({...s, captions: s.captions.map((c,i) => i===idx ? {...c,...updates} : c)})) }}
                    onAudioChange={(voice, music) => { pushUndo(editState); setEditState(s => ({...s, voiceVolume: voice, musicVolume: music})) }}
                  />
                </div>
              </div>
            )}

            {/* ── AUDIO ─────────────────────────────────────── */}
            {activeTool === 'audio' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', height: '100%', scrollbarWidth: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Label>Volume</Label>
                  <SliderRow label="Voice" value={editState.voiceVolume} onChange={v => { pushUndo(editState); setEditState(s => ({...s, voiceVolume: v})) }} />
                  <SliderRow label="Music" value={editState.musicVolume} onChange={v => { pushUndo(editState); setEditState(s => ({...s, musicVolume: v})) }} />
                </div>

                <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Label>Background music</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {[['none','None'],['lofi','Lo-fi'],['hype','Hype'],['cinematic','Cinematic'],['corporate','Corporate'],['ambient','Ambient'],['emotional','Emotional'],['acoustic','Acoustic']].map(([id, label]) => (
                      <button key={id} onClick={() => { pushUndo(editState); setEditState(s => ({...s, music: id})) }} style={{
                        padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'left' as const,
                        background: editState.music === id ? 'rgba(124, 92, 255,0.2)' : 'rgba(255,255,255,0.04)',
                        border: editState.music === id ? '1px solid rgba(124, 92, 255,0.5)' : '1px solid rgba(255,255,255,0.07)',
                        color: editState.music === id ? '#a5a3f0' : '#666',
                        cursor: 'pointer', transition: 'all 120ms ease',
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── HISTORY ───────────────────────────────────── */}
            {activeTool === 'history' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: '100%', scrollbarWidth: 'none' }}>
                {undoStack.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <Clock className="w-6 h-6" style={{ color: '#222', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12, color: '#333' }}>No edits yet.</p>
                  </div>
                ) : (
                  messages.filter(m => m.role === 'ai' && m.plan && m.kind === 'edit').map((m, idx) => (
                    <div key={m.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#c8c8d4', margin: 0 }}>{m.plan!.summary}</p>
                        <span style={{ fontSize: 10, color: '#2a2a2a', fontFamily: 'monospace' }}>#{idx+1}</span>
                      </div>
                      {m.plan!.ops.filter(o => !['interpret','clarify','unsupported'].includes(o.op)).map((op,i) => (
                        <p key={i} style={{ fontSize: 10, color: '#3a3a3a', fontFamily: 'monospace', margin: '2px 0' }}>{opToEnglish(op)}</p>
                      ))}
                    </div>
                  ))
                )}
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button onClick={undo} disabled={!undoStack.length} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#666', cursor: undoStack.length ? 'pointer' : 'default', opacity: undoStack.length ? 1 : 0.35,
                  }}>
                    <Undo2 className="w-3.5 h-3.5" />Undo ({undoStack.length})
                  </button>
                  <button onClick={redo} disabled={!redoStack.length} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#666', cursor: redoStack.length ? 'pointer' : 'default', opacity: redoStack.length ? 1 : 0.35,
                  }}>
                    <Redo2 className="w-3.5 h-3.5" />Redo ({redoStack.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .se-body { flex-direction: column; }
        .se-video-col { width: 100%; height: auto; }
        .se-video-wrap { max-height: 38vh !important; width: auto !important; }

        @media (min-width: 768px) {
          .se-body { flex-direction: row !important; }
          .se-video-col { width: 300px !important; height: 100% !important; flex-shrink: 0 !important; }
          .se-video-wrap { max-height: 82vh !important; }
        }

        @keyframes sePulse {
          0%,100% { opacity: 0.3; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
