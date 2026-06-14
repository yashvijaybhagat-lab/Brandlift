'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  type EditState, type EditPlan,
  initialEditState, applyPlanToState, opToEnglish,
} from '@/lib/editPlan'
import TimelineEditor from '@/components/TimelineEditor'
import {
  Send, Undo2, Redo2, X, Plus, Trash2, Check,
  MessageSquare, Type, Clock, Layers, Scissors,
  Volume2, PanelBottom,
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

type Tool = 'caption' | 'text' | 'trim' | 'audio' | 'ai' | 'history'

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'caption', icon: <Type className="w-5 h-5" />,          label: 'Caption' },
  { id: 'text',    icon: <PanelBottom className="w-5 h-5" />,   label: 'Text' },
  { id: 'trim',    icon: <Scissors className="w-5 h-5" />,      label: 'Trim' },
  { id: 'audio',   icon: <Volume2 className="w-5 h-5" />,       label: 'Audio' },
  { id: 'ai',      icon: <MessageSquare className="w-5 h-5" />, label: 'AI Edit' },
  { id: 'history', icon: <Clock className="w-5 h-5" />,         label: 'History' },
]

const BTN = {
  ghost: { background: '#161616', border: '1px solid #222', color: '#666', cursor: 'pointer' as const },
  active: { background: '#5855D4', border: '1px solid #5855D4', color: '#fff', cursor: 'pointer' as const },
  subtle: { background: '#111', border: '1px solid #1e1e1e', color: '#888', cursor: 'pointer' as const },
}

export default function SmartEditStudio({ videoUrl, duration, initialCaptions, colorFilter, onClose, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const [editState, setEditState] = useState<EditState>(() => initialEditState(duration, initialCaptions))
  const [undoStack, setUndoStack] = useState<EditState[]>([])
  const [redoStack, setRedoStack] = useState<EditState[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [activeZoom,  setActiveZoom]  = useState(1.0)
  const [isPlaying,   setIsPlaying]   = useState(false)

  // Chat
  const [messages,  setMessages]  = useState<ChatMessage[]>([
    { id: 'welcome', role: 'ai', text: 'Describe what you want — "yellow captions", "cut first 3s", "speed up the middle", "add CTA text at end".', kind: 'edit' },
  ])
  const [input,     setInput]     = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Caption editing
  const [editingIdx,  setEditingIdx]  = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addText,     setAddText]     = useState('')
  const [addDuration, setAddDuration] = useState(3)

  // Text overlay editing
  const [newOverlayText, setNewOverlayText] = useState('')
  const [newOverlayPos,  setNewOverlayPos]  = useState<'top'|'center'|'bottom'>('bottom')
  const [newOverlayStyle, setNewOverlayStyle] = useState<'title'|'cta'|'label'>('cta')

  const [activeTool, setActiveTool] = useState<Tool>('caption')

  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* ── Playback ─────────────────────────────────────────── */
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const t = v.currentTime
    setCurrentTime(t)
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
    ? editState.captions.filter(c => currentTime >= c.start && currentTime <= c.end)
    : []
  const activeOverlays = editState.textOverlays.filter(
    o => currentTime >= o.at && currentTime < o.at + o.duration,
  )

  /* ── Undo/redo ─────────────────────────────────────────── */
  const pushUndo = useCallback((s: EditState) => {
    setUndoStack(u => [...u, s])
    setRedoStack([])
  }, [])

  const undo = useCallback(() => {
    if (!undoStack.length) return
    const prev = undoStack[undoStack.length - 1]
    setRedoStack(r => [...r, editState])
    setUndoStack(u => u.slice(0, -1))
    setEditState(prev)
  }, [undoStack, editState])

  const redo = useCallback(() => {
    if (!redoStack.length) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(u => [...u, editState])
    setRedoStack(r => r.slice(0, -1))
    setEditState(next)
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
      const data = await res.json().catch(() => ({ error: 'Invalid response' }))
      if (!res.ok || data.error) {
        setMessages(m => [...m, { id: `e-${Date.now()}`, role: 'ai', text: data.error ?? 'Something went wrong.', kind: 'error' }])
        return
      }
      const plan: EditPlan = data.plan
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
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'ai', text: interpretOp ? `${interpretOp.message}\n\n${plan.summary}` : plan.summary, plan, kind: 'edit' }])
    } catch (err) {
      setMessages(m => [...m, { id: `e-${Date.now()}`, role: 'ai', text: `Error: ${err instanceof Error ? err.message : 'Unknown'}`, kind: 'error' }])
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
    setEditState(s => ({ ...s, captions: s.captions.map((c,i) => i===idx ? {...c, text} : c) }))
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
      ...s,
      textOverlays: [...s.textOverlays, { text: newOverlayText.trim(), at: t, duration: 4, position: newOverlayPos, style: newOverlayStyle }],
    }))
    setNewOverlayText('')
  }, [newOverlayText, newOverlayPos, newOverlayStyle, currentTime, editState, pushUndo])

  /* ── Trim / Speed ──────────────────────────────────────── */
  const splitAtPlayhead = useCallback(() => {
    const t = videoRef.current?.currentTime ?? currentTime
    pushUndo(editState)
    setEditState(s => {
      const segs = s.segments
      const idx = segs.findIndex(sg => t > sg.start && t < sg.end)
      if (idx === -1) return s
      const seg = segs[idx]
      const newSegs = [
        ...segs.slice(0, idx),
        { ...seg, end: t },
        { ...seg, start: t },
        ...segs.slice(idx + 1),
      ]
      return { ...s, segments: newSegs }
    })
  }, [currentTime, editState, pushUndo])

  const setSegmentSpeed = useCallback((idx: number, speed: number) => {
    pushUndo(editState)
    setEditState(s => ({ ...s, segments: s.segments.map((sg,i) => i===idx ? {...sg, speed} : sg) }))
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

  /* ── Shared panel wrapper ──────────────────────────────── */
  const Panel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full" style={{ scrollbarWidth: 'none' }}>
      {children}
    </div>
  )

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <span style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{children}</span>
  )

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div style={{ background: '#000', minHeight: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ ...BTN.ghost, border: 'none', background: 'none', padding: 4, display: 'flex', borderRadius: 6 }}>
            <X className="w-5 h-5" style={{ color: '#555' }} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Smart Edit</span>
          <span style={{ fontSize: 11, color: '#333', fontFamily: 'monospace' }}>{duration.toFixed(1)}s</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={undo} disabled={!undoStack.length} title="Undo"
            style={{ ...BTN.ghost, border: 'none', background: 'none', padding: 6, display: 'flex', opacity: undoStack.length ? 1 : 0.3, cursor: undoStack.length ? 'pointer' : 'default' }}>
            <Undo2 className="w-4 h-4" style={{ color: '#888' }} />
          </button>
          <button onClick={redo} disabled={!redoStack.length} title="Redo"
            style={{ ...BTN.ghost, border: 'none', background: 'none', padding: 6, display: 'flex', opacity: redoStack.length ? 1 : 0.3, cursor: redoStack.length ? 'pointer' : 'default' }}>
            <Redo2 className="w-4 h-4" style={{ color: '#888' }} />
          </button>
          <button onClick={() => onApply(editState)}
            style={{ ...BTN.active, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
            Export
          </button>
        </div>
      </div>

      {/* Body — responsive: mobile=col, desktop=row */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }} className="flex-col md:flex-row">

        {/* ── Video preview ─────────────────────────────── */}
        <div
          className="flex-shrink-0 md:flex-shrink-0"
          style={{
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Mobile: constrained height. Desktop: fixed sidebar width
          }}
        >
          {/* 9:16 constrained box */}
          <div
            className="relative"
            style={{
              // Mobile: full width, auto height capped at 42vh
              // Desktop (via CSS class injection below): fixed width
              aspectRatio: '9/16',
              maxHeight: '42vh',
              width: 'auto',
              overflow: 'hidden',
              background: '#000',
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls
              playsInline
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                filter: colorFilter || undefined,
                transform: `scale(${activeZoom})`,
                transition: 'transform 0.2s ease',
              }}
            />

            {/* Caption overlay */}
            {activeCaptions.map((c, i) => (
              <div key={i} className="absolute left-0 right-0 flex justify-center pointer-events-none px-3"
                style={{ ...captionPosStyle, zIndex: 10 }}>
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

            {/* Text overlays */}
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
                    background: o.style === 'cta' ? 'rgba(88,85,212,0.9)' : 'transparent',
                    borderRadius: o.style === 'cta' ? 8 : 0,
                  }}>{o.text}</span>
                </div>
              )
            })}

            {/* Segment progress bar */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 2, zIndex: 20 }}>
              {editState.segments.map((seg, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left:  `${(seg.start/duration)*100}%`,
                  width: `${((seg.end-seg.start)/duration)*100}%`,
                  height: '100%',
                  background: seg.speed !== 1.0 ? '#facc15' : '#5855D4',
                }} />
              ))}
            </div>

            {/* Time badge */}
            <div className="absolute top-2 right-2" style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '2px 7px', zIndex: 20 }}>
              <span style={{ fontSize: 10, color: '#888', fontFamily: 'monospace' }}>{currentTime.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* ── Tool panel (right on desktop, below video on mobile) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, background: '#0d0d0d' }}>

          {/* Tool content */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* CAPTION */}
            {activeTool === 'caption' && (
              <Panel>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <SectionLabel>Captions {editState.captions.length > 0 && `· ${editState.captions.length}`}</SectionLabel>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {editState.captions.length > 0 && (
                        <button onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionActive: !s.captionActive})) }}
                          style={{ fontSize: 11, color: editState.captionActive ? '#4ade80' : '#555', background: 'none', border: 'none', cursor: 'pointer' }}>
                          {editState.captionActive ? 'Visible' : 'Hidden'}
                        </button>
                      )}
                      <button onClick={() => { setShowAddForm(p => !p); setAddText('') }}
                        style={{ ...BTN.active, padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Plus className="w-3 h-3" />Add at {currentTime.toFixed(1)}s
                      </button>
                    </div>
                  </div>

                  {showAddForm && (
                    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input autoFocus value={addText} onChange={e => setAddText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCaptionAtTime()}
                        placeholder="Type caption…"
                        style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: '#444', whiteSpace: 'nowrap' }}>Show for</span>
                        <input type="range" min={1} max={8} step={0.5} value={addDuration}
                          onChange={e => setAddDuration(Number(e.target.value))}
                          style={{ flex: 1, accentColor: '#5855D4' }} />
                        <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{addDuration}s</span>
                        <button onClick={addCaptionAtTime} disabled={!addText.trim()}
                          style={{ ...BTN.active, padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, opacity: addText.trim() ? 1 : 0.4 }}>
                          <Check className="w-3.5 h-3.5" />Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Caption list */}
                  {editState.captions.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: '#333' }}>No captions. Click "Add" above, or use AI Edit to generate from script.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {editState.captions.map((c, i) => (
                        <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace', flexShrink: 0, minWidth: 30 }}>{c.start.toFixed(1)}s</span>
                          {editingIdx === i ? (
                            <input autoFocus value={editingText} onChange={e => setEditingText(e.target.value)}
                              onBlur={() => editingText.trim() ? updateCaption(i, editingText) : setEditingIdx(null)}
                              onKeyDown={e => { if (e.key === 'Enter') editingText.trim() ? updateCaption(i, editingText) : setEditingIdx(null); if (e.key === 'Escape') setEditingIdx(null) }}
                              style={{ flex: 1, background: '#1a1a1a', border: '1px solid #5855D4', borderRadius: 6, padding: '3px 8px', fontSize: 12, color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                          ) : (
                            <span onClick={() => { setEditingIdx(i); setEditingText(c.text) }}
                              title="Click to edit"
                              style={{ flex: 1, fontSize: 12, color: '#bbb', lineHeight: 1.4, cursor: 'text' }}>{c.text}</span>
                          )}
                          <span style={{ fontSize: 10, color: '#2a2a2a', fontFamily: 'monospace', flexShrink: 0 }}>{c.end.toFixed(1)}s</span>
                          <button onClick={() => deleteCaption(i)}
                            style={{ color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#2a2a2a'}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {editState.captions.length > 1 && (
                        <button onClick={() => { pushUndo(editState); setEditState(s => ({...s, captions: []})) }}
                          style={{ marginTop: 4, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                          Clear all captions
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Style controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '1px solid #1a1a1a' }}>
                  <SectionLabel>Style</SectionLabel>
                  {/* Color swatches */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                    {[['#FFFFFF','White'],['#FFE600','Yellow'],['#60A5FA','Blue'],['#F472B6','Pink'],['#4ADE80','Green'],['#FB923C','Orange']].map(([hex,label]) => (
                      <button key={hex} onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionColor: hex})) }}
                        title={label}
                        style={{ width: 26, height: 26, borderRadius: '50%', background: hex, border: editState.captionColor === hex ? '2px solid #5855D4' : '2px solid #1a1a1a', cursor: 'pointer', flexShrink: 0 }} />
                    ))}
                    <input type="color" value={editState.captionColor}
                      onChange={e => { pushUndo(editState); setEditState(s => ({...s, captionColor: e.target.value})) }}
                      style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #1a1a1a', padding: 0, cursor: 'pointer', background: 'transparent' }} />
                  </div>
                  {/* Size */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['sm','md','lg','xl'] as const).map(s => (
                      <button key={s} onClick={() => { pushUndo(editState); setEditState(st => ({...st, captionSize: s})) }}
                        style={{ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, ...(editState.captionSize === s ? BTN.active : BTN.ghost) }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {/* Position */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([['top','Top'],['center','Mid'],['bottom','Bot']] as const).map(([p, label]) => (
                      <button key={p} onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionPos: p})) }}
                        style={{ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, ...(editState.captionPos === p ? BTN.active : BTN.ghost) }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Font */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                    {([['inter','Sans','Inter, sans-serif'],['impact','Impact','Impact, sans-serif'],['serif','Serif','Georgia,serif'],['mono','Mono','monospace']] as const).map(([id, label, ff]) => (
                      <button key={id} onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionFont: id})) }}
                        style={{ padding: '6px 4px', borderRadius: 7, fontSize: 10, fontWeight: 600, fontFamily: ff, ...(editState.captionFont === id ? BTN.active : BTN.ghost) }}>
                        Aa {label}
                      </button>
                    ))}
                  </div>
                  {/* Bold toggle */}
                  <button onClick={() => { pushUndo(editState); setEditState(s => ({...s, captionBold: !s.captionBold})) }}
                    style={{ padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, alignSelf: 'flex-start' as const, ...(editState.captionBold ? BTN.active : BTN.ghost) }}>
                    Bold {editState.captionBold ? 'On' : 'Off'}
                  </button>
                </div>
              </Panel>
            )}

            {/* TEXT OVERLAYS */}
            {activeTool === 'text' && (
              <Panel>
                <div>
                  <SectionLabel>Add text on screen</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    <input value={newOverlayText} onChange={e => setNewOverlayText(e.target.value)}
                      placeholder="Text to show on video…"
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                    {/* Style */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['title','label','cta'] as const).map(s => (
                        <button key={s} onClick={() => setNewOverlayStyle(s)}
                          style={{ flex: 1, padding: '6px 4px', borderRadius: 7, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' as const, ...(newOverlayStyle === s ? BTN.active : BTN.ghost) }}>
                          {s}
                        </button>
                      ))}
                    </div>
                    {/* Position */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([['top','Top'],['center','Center'],['bottom','Bottom']] as const).map(([p,label]) => (
                        <button key={p} onClick={() => setNewOverlayPos(p)}
                          style={{ flex: 1, padding: '6px 4px', borderRadius: 7, fontSize: 11, fontWeight: 600, ...(newOverlayPos === p ? BTN.active : BTN.ghost) }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button onClick={addTextOverlay} disabled={!newOverlayText.trim()}
                      style={{ padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#5855D4', border: '1px solid #5855D4', color: '#fff', cursor: newOverlayText.trim() ? 'pointer' : 'default', opacity: newOverlayText.trim() ? 1 : 0.4 }}>
                      Add at {currentTime.toFixed(1)}s
                    </button>
                  </div>
                </div>

                {/* Overlay list */}
                {editState.textOverlays.length > 0 && (
                  <div>
                    <SectionLabel>On-screen text</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {editState.textOverlays.map((o, i) => (
                        <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace', flexShrink: 0 }}>{o.at.toFixed(1)}s</span>
                          <span style={{ flex: 1, fontSize: 12, color: '#bbb' }}>{o.text}</span>
                          <span style={{ fontSize: 10, color: '#444', background: '#1a1a1a', padding: '1px 6px', borderRadius: 4 }}>{o.style}</span>
                          <button onClick={() => { pushUndo(editState); setEditState(s => ({...s, textOverlays: s.textOverlays.filter((_,idx) => idx!==i)})) }}
                            style={{ color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#2a2a2a'}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* TRIM / SPEED */}
            {activeTool === 'trim' && (
              <Panel>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={splitAtPlayhead}
                    style={{ ...BTN.subtle, flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Scissors className="w-3.5 h-3.5" />Split at {currentTime.toFixed(1)}s
                  </button>
                </div>

                <div>
                  <SectionLabel>Clips</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {editState.segments.map((seg, i) => (
                      <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                            Clip {i+1} · {seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s
                          </span>
                          {editState.segments.length > 1 && (
                            <button onClick={() => deleteSegment(i)}
                              style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                              Remove
                            </button>
                          )}
                        </div>
                        {/* Speed picker */}
                        <div>
                          <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.08em' }}>SPEED</span>
                          <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                            {[['0.25x',0.25],['0.5x',0.5],['1x',1.0],['1.5x',1.5],['2x',2.0]].map(([label, val]) => (
                              <button key={String(val)} onClick={() => setSegmentSpeed(i, val as number)}
                                style={{ flex: 1, padding: '5px 2px', borderRadius: 6, fontSize: 10, fontWeight: 700, ...(Math.abs(seg.speed - (val as number)) < 0.01 ? BTN.active : BTN.ghost) }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <SectionLabel>Timeline</SectionLabel>
                  <div style={{ marginTop: 8 }}>
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
              </Panel>
            )}

            {/* AUDIO */}
            {activeTool === 'audio' && (
              <Panel>
                <div>
                  <SectionLabel>Volume</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    {[['Voice', editState.voiceVolume, (v: number) => { pushUndo(editState); setEditState(s => ({...s, voiceVolume: v})) }],
                      ['Music', editState.musicVolume, (v: number) => { pushUndo(editState); setEditState(s => ({...s, musicVolume: v})) }]]
                      .map(([label, val, setter]) => (
                        <div key={String(label)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>{String(label)}</span>
                            <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{Math.round((val as number)*100)}%</span>
                          </div>
                          <input type="range" min={0} max={1} step={0.05} value={val as number}
                            onChange={e => (setter as (v:number)=>void)(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#5855D4' }} />
                        </div>
                      ))}
                  </div>
                </div>
                <div style={{ paddingTop: 12, borderTop: '1px solid #1a1a1a' }}>
                  <SectionLabel>Background music</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {[['none','No music'],['lofi','Lo-fi chill'],['hype','Hype'],['cinematic','Cinematic'],['corporate','Corporate'],['ambient','Ambient']].map(([id, label]) => (
                      <button key={id} onClick={() => { pushUndo(editState); setEditState(s => ({...s, music: id})) }}
                        style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'left' as const, ...(editState.music === id ? BTN.active : BTN.ghost) }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>
            )}

            {/* AI EDIT */}
            {activeTool === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none' }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '88%', borderRadius: 16, padding: '9px 14px',
                        background: msg.role === 'user' ? '#5855D4'
                          : msg.kind === 'error'   ? 'rgba(239,68,68,0.1)'
                          : msg.kind === 'clarify' ? 'rgba(250,204,21,0.07)'
                          : '#141414',
                        border: msg.role === 'ai'
                          ? msg.kind === 'error' ? '1px solid rgba(239,68,68,0.2)'
                          : '1px solid #1e1e1e' : 'none',
                      }}>
                        <p style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: msg.role === 'user' ? '#fff' : msg.kind === 'error' ? '#f87171' : msg.kind === 'clarify' ? '#fde68a' : '#ccc' }}>
                          {msg.text}
                        </p>
                        {msg.plan && msg.kind === 'edit' && (
                          <div style={{ marginTop: 6 }}>
                            {msg.plan.ops.filter(o => !['interpret','clarify','unsupported'].includes(o.op)).slice(0,3).map((op,i) => (
                              <p key={i} style={{ fontSize: 10, color: '#444', fontFamily: 'monospace' }}>{opToEnglish(op)}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div style={{ display: 'flex' }}>
                      <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: '10px 14px', display: 'flex', gap: 5 }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#5855D4', animation: `sePulse 1.2s ease ${i*0.2}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick prompts */}
                <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                  {['Yellow captions','Cut intro','Speed up 2x','Add CTA text','Fade audio','Louder voice'].map(p => (
                    <button key={p} onClick={() => sendPrompt(p)} disabled={isLoading}
                      style={{ padding: '4px 10px', borderRadius: 20, background: '#141414', color: '#555', border: '1px solid #222', fontSize: 11, cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div style={{ padding: 12, borderTop: '1px solid #1a1a1a', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(input) } }}
                    placeholder="Tell me what to edit…" rows={2} disabled={isLoading}
                    style={{ flex: 1, resize: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 13, background: '#141414', border: '1px solid #222', color: '#fff', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
                  <button onClick={() => sendPrompt(input)} disabled={isLoading || !input.trim()}
                    style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default', background: input.trim() && !isLoading ? '#5855D4' : '#141414', color: input.trim() && !isLoading ? '#fff' : '#333' }}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* HISTORY */}
            {activeTool === 'history' && (
              <Panel>
                {undoStack.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <Clock className="w-7 h-7" style={{ color: '#222', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12, color: '#333' }}>No edits yet.</p>
                  </div>
                ) : (
                  messages.filter(m => m.role === 'ai' && m.plan && m.kind === 'edit').map((m, idx) => (
                    <div key={m.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>{m.plan!.summary}</p>
                        <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace' }}>#{idx+1}</span>
                      </div>
                      {m.plan!.ops.filter(o => !['interpret','clarify','unsupported'].includes(o.op)).map((op,i) => (
                        <p key={i} style={{ fontSize: 10, color: '#444', fontFamily: 'monospace' }}>{opToEnglish(op)}</p>
                      ))}
                    </div>
                  ))
                )}
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button onClick={undo} disabled={!undoStack.length}
                    style={{ ...BTN.ghost, flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: undoStack.length ? 1 : 0.35 }}>
                    <Undo2 className="w-3.5 h-3.5" />Undo ({undoStack.length})
                  </button>
                  <button onClick={redo} disabled={!redoStack.length}
                    style={{ ...BTN.ghost, flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: redoStack.length ? 1 : 0.35 }}>
                    <Redo2 className="w-3.5 h-3.5" />Redo ({redoStack.length})
                  </button>
                </div>
              </Panel>
            )}
          </div>

          {/* Bottom toolbar */}
          <div style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a', display: 'flex', flexShrink: 0 }}>
            {TOOLS.map(tool => (
              <button key={tool.id} onClick={() => setActiveTool(tool.id)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', color: activeTool === tool.id ? '#5855D4' : '#3a3a3a', transition: 'color 0.12s' }}>
                {tool.icon}
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: side-by-side via CSS */}
      <style>{`
        @media (min-width: 768px) {
          .flex-col.md\\:flex-row { flex-direction: row !important; }
          .flex-shrink-0.md\\:flex-shrink-0 {
            width: 320px !important;
            height: 100% !important;
            max-height: none !important;
            justify-content: center;
            background: #000;
          }
          .flex-shrink-0.md\\:flex-shrink-0 > div {
            max-height: 85vh !important;
            height: auto !important;
          }
        }
        @keyframes sePulse {
          0%,100% { opacity: 0.3; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
