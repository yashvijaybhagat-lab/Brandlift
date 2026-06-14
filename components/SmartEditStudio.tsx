'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  type EditState, type EditPlan, type EditOp,
  initialEditState, applyPlanToState, opToEnglish,
} from '@/lib/editPlan'
import TimelineEditor from '@/components/TimelineEditor'
import { Send, Undo2, Redo2, X, Plus, Trash2, Check, Zap, MessageSquare, Type, Clock, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { analyzeSource } from '@/lib/enhancePipeline'

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

type Tool = 'caption' | 'text' | 'ai' | 'history' | 'timeline'

export default function SmartEditStudio({ videoUrl, duration, initialCaptions, colorFilter, onClose, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const [editState, setEditState] = useState<EditState>(() => initialEditState(duration, initialCaptions))
  const [undoStack, setUndoStack] = useState<EditState[]>([])
  const [redoStack, setRedoStack] = useState<EditState[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [activeZoom, setActiveZoom]   = useState(1.0)

  const [messages,  setMessages]  = useState<ChatMessage[]>([
    { id: 'welcome', role: 'ai', text: 'Tell me what to edit — "make captions yellow", "cut the first 3 seconds", "add a CTA at the end".', kind: 'edit' },
  ])
  const [input,     setInput]     = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [enhanceStatus,   setEnhanceStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [enhanceProgress, setEnhanceProgress] = useState(0)
  const [enhancedUrl,     setEnhancedUrl]     = useState<string | null>(null)

  const [activeTool, setActiveTool] = useState<Tool>('caption')
  const [panelOpen,  setPanelOpen]  = useState(true)

  // Caption editing
  const [editingIdx,    setEditingIdx]    = useState<number | null>(null)
  const [editingText,   setEditingText]   = useState('')
  const [showAddForm,   setShowAddForm]   = useState(false)
  const [addText,       setAddText]       = useState('')
  const [addDuration,   setAddDuration]   = useState(3)

  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const t = v.currentTime
    setCurrentTime(t)
    const segs = editState.segments
    const inSeg = segs.find(s => t >= s.start && t < s.end)
    if (!inSeg) {
      const next = segs.find(s => s.start > t)
      if (next) { v.currentTime = next.start } else { v.pause() }
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

  const sendPrompt = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: text.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setIsLoading(true)
    try {
      const history = messages.filter(m => m.role === 'ai' && m.plan).map(m => m.plan!.summary)
      const res  = await fetch('/api/video/smart-edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text.trim(), duration, captions: editState.captions, history }),
      })
      const data = await res.json().catch(() => ({ error: 'Invalid response' }))
      if (!res.ok || data.error) {
        setMessages(m => [...m, { id: `e-${Date.now()}`, role: 'ai', text: data.error ?? 'Something went wrong. Try rephrasing.', kind: 'error' }])
        return
      }
      const plan: EditPlan = data.plan
      const ops = plan.ops
      const isClarify     = ops.length === 1 && ops[0].op === 'clarify'
      const isUnsupported = ops.some(o => o.op === 'unsupported')
      if (isClarify) {
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'ai', text: (ops[0] as { op: 'clarify'; question: string }).question, plan, kind: 'clarify' }])
        return
      }
      if (isUnsupported) {
        const u = ops.find(o => o.op === 'unsupported') as { op: string; instruction: string; suggestion: string }
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'ai', text: `Can't do "${u.instruction}" yet — ${u.suggestion}`, plan, kind: 'unsupported' }])
        return
      }
      setUndoStack(u => [...u, editState])
      setRedoStack([])
      setEditState(s => applyPlanToState(s, plan, duration))
      const interpretOp = ops.find(o => o.op === 'interpret') as { op: string; message: string } | undefined
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'ai', text: interpretOp ? `${interpretOp.message}\n\n${plan.summary}` : plan.summary, plan, kind: 'edit' }])
    } catch (err) {
      setMessages(m => [...m, { id: `e-${Date.now()}`, role: 'ai', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, kind: 'error' }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [isLoading, messages, editState, duration])

  const handleEnhance = useCallback(async () => {
    if (enhanceStatus === 'loading') return
    setEnhanceStatus('loading')
    setEnhanceProgress(5)
    try {
      const v = videoRef.current
      const analysis = analyzeSource({ width: v?.videoWidth ?? 1080, height: v?.videoHeight ?? 1920, fps: 30, duration })
      const res = await fetch('/api/video/enhance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, analysis }),
      })
      const data = await res.json().catch(() => ({ error: 'Failed' }))
      if (!res.ok) throw new Error(data.error ?? 'Enhance failed')
      if (data.status === 'succeeded' && data.outputUrl) {
        setEnhancedUrl(data.outputUrl); setEnhanceStatus('done'); setEnhanceProgress(100); return
      }
      const predId = data.id
      let attempts = 0
      while (attempts < 120) {
        await new Promise(r => setTimeout(r, 3000))
        const poll = await fetch(`/api/video/enhance/status/${predId}`)
        const pollData = await poll.json().catch(() => ({}))
        setEnhanceProgress(pollData.progress ?? enhanceProgress)
        if (pollData.status === 'succeeded' && pollData.outputUrl) {
          setEnhancedUrl(pollData.outputUrl); setEnhanceStatus('done'); setEnhanceProgress(100); return
        }
        if (pollData.status === 'failed' || pollData.fallback) throw new Error(pollData.error ?? 'Upscale failed')
        attempts++
      }
      throw new Error('Timed out')
    } catch { setEnhanceStatus('error') }
  }, [enhanceStatus, videoUrl, duration, enhanceProgress])

  const addCaptionAtTime = useCallback(() => {
    if (!addText.trim()) return
    const t = videoRef.current?.currentTime ?? currentTime
    const end = Math.min(t + addDuration, duration)
    pushUndo(editState)
    setEditState(s => ({
      ...s,
      captions: [...s.captions, { text: addText.trim(), start: t, end }].sort((a, b) => a.start - b.start),
      captionActive: true,
    }))
    setAddText('')
    setShowAddForm(false)
  }, [addText, addDuration, currentTime, duration, editState, pushUndo])

  const updateCaption = useCallback((idx: number, text: string) => {
    pushUndo(editState)
    setEditState(s => ({ ...s, captions: s.captions.map((c, i) => i === idx ? { ...c, text } : c) }))
    setEditingIdx(null)
  }, [editState, pushUndo])

  const deleteCaption = useCallback((idx: number) => {
    pushUndo(editState)
    setEditState(s => ({ ...s, captions: s.captions.filter((_, i) => i !== idx) }))
  }, [editState, pushUndo])

  const captionPosStyle: React.CSSProperties =
    editState.captionPos === 'top'    ? { top: '8%', bottom: 'auto' } :
    editState.captionPos === 'center' ? { top: '50%', transform: 'translateY(-50%)' } :
    { bottom: '10%', top: 'auto' }

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'caption',  icon: <Type className="w-5 h-5" />,          label: 'Caption' },
    { id: 'ai',       icon: <MessageSquare className="w-5 h-5" />,  label: 'AI Edit' },
    { id: 'history',  icon: <Clock className="w-5 h-5" />,          label: 'History' },
    { id: 'timeline', icon: <Layers className="w-5 h-5" />,         label: 'Timeline' },
  ]

  return (
    <div className="flex flex-col w-full" style={{ background: '#000', minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <X className="w-5 h-5" />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Edit</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!undoStack.length}
            style={{ color: undoStack.length ? '#aaa' : '#333', background: 'none', border: 'none', cursor: undoStack.length ? 'pointer' : 'default', padding: 6, display: 'flex' }}>
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={!redoStack.length}
            style={{ color: redoStack.length ? '#aaa' : '#333', background: 'none', border: 'none', cursor: redoStack.length ? 'pointer' : 'default', padding: 6, display: 'flex' }}>
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleEnhance}
            disabled={enhanceStatus === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{
              background: enhanceStatus === 'done' ? 'rgba(34,197,94,0.15)' : enhanceStatus === 'error' ? 'rgba(239,68,68,0.12)' : '#1a1a1a',
              color: enhanceStatus === 'done' ? '#4ade80' : enhanceStatus === 'error' ? '#f87171' : enhanceStatus === 'loading' ? '#facc15' : '#999',
              border: '1px solid #222',
            }}>
            <Zap className="w-3 h-3" />
            {enhanceStatus === 'loading' ? `${enhanceProgress}%` : enhanceStatus === 'done' ? '4K done' : enhanceStatus === 'error' ? 'Failed' : 'Enhance 4K'}
          </button>
          <button
            onClick={() => onApply(editState)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: '#5855D4', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Export
          </button>
        </div>
      </div>

      {/* Video preview */}
      <div className="relative flex-shrink-0" style={{ background: '#000', aspectRatio: '9/16', maxHeight: '52vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          src={enhancedUrl ?? videoUrl}
          onTimeUpdate={handleTimeUpdate}
          controls
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', filter: colorFilter || undefined, transform: `scale(${activeZoom})`, transition: 'transform 0.2s ease' }}
        />

        {activeCaptions.map((c, i) => (
          <div key={i} className="absolute left-0 right-0 flex justify-center pointer-events-none px-4" style={{ ...captionPosStyle, zIndex: 10 }}>
            <span style={{ fontSize: SIZE_PX[editState.captionSize] ?? 17, fontFamily: FONT_FAMILY[editState.captionFont] ?? 'Inter, sans-serif', fontWeight: editState.captionBold ? 700 : 500, color: editState.captionColor, textShadow: '0 2px 8px rgba(0,0,0,0.95)', textAlign: 'center', lineHeight: 1.3 }}>{c.text}</span>
          </div>
        ))}

        {activeOverlays.map((o, i) => {
          const y: React.CSSProperties = o.position === 'top' ? { top: '8%' } : o.position === 'center' ? { top: '50%', transform: 'translateY(-50%)' } : { bottom: '10%' }
          return (
            <div key={i} className="absolute left-0 right-0 flex justify-center pointer-events-none px-6" style={{ ...y, zIndex: 11 }}>
              <span style={{ fontSize: o.style === 'title' ? 22 : o.style === 'cta' ? 18 : 14, fontWeight: 800, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.95)', textAlign: 'center', padding: o.style === 'cta' ? '6px 16px' : '0', background: o.style === 'cta' ? 'rgba(88,85,212,0.85)' : 'transparent', borderRadius: o.style === 'cta' ? 8 : 0 }}>{o.text}</span>
            </div>
          )
        })}

        {/* Trim bar at bottom of video */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 pointer-events-none" style={{ zIndex: 20 }}>
          {editState.segments.map((seg, i) => (
            <div key={i} style={{ position: 'absolute', left: `${(seg.start / duration) * 100}%`, width: `${((seg.end - seg.start) / duration) * 100}%`, height: '100%', background: seg.speed !== 1.0 ? 'rgba(250,204,21,0.9)' : '#5855D4' }} />
          ))}
        </div>

        {/* Time indicator */}
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 20 }}>
          <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{currentTime.toFixed(1)}s / {duration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Tool panel */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0d0d0d' }}>

        {/* Panel toggle */}
        <button
          onClick={() => setPanelOpen(p => !p)}
          className="flex items-center justify-center gap-1 py-1.5 flex-shrink-0"
          style={{ background: '#111', border: 'none', borderBottom: '1px solid #1a1a1a', color: '#444', cursor: 'pointer' }}>
          {panelOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {panelOpen && (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

            {/* CAPTION TOOL */}
            {activeTool === 'caption' && (
              <div className="p-4 flex flex-col gap-4">

                {/* Add caption */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Captions</span>
                    <button
                      onClick={() => { setShowAddForm(p => !p); setAddText('') }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ background: showAddForm ? '#1a1a1a' : '#5855D4', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      <Plus className="w-3 h-3" />
                      {showAddForm ? 'Cancel' : 'Add at ' + currentTime.toFixed(1) + 's'}
                    </button>
                  </div>

                  {showAddForm && (
                    <div className="flex flex-col gap-2 p-3 rounded-xl mb-3" style={{ background: '#111', border: '1px solid #222' }}>
                      <input
                        autoFocus
                        value={addText}
                        onChange={e => setAddText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCaptionAtTime() }}
                        placeholder="Type caption text…"
                        style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'inherit' }}
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>Show for</span>
                          <input
                            type="range" min={1} max={8} step={0.5} value={addDuration}
                            onChange={e => setAddDuration(Number(e.target.value))}
                            style={{ flex: 1, accentColor: '#5855D4' }}
                          />
                          <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{addDuration}s</span>
                        </div>
                        <button
                          onClick={addCaptionAtTime}
                          disabled={!addText.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-shrink-0"
                          style={{ background: addText.trim() ? '#5855D4' : '#1a1a1a', color: addText.trim() ? '#fff' : '#444', border: 'none', cursor: addText.trim() ? 'pointer' : 'default' }}>
                          <Check className="w-3.5 h-3.5" />Add
                        </button>
                      </div>
                      <p style={{ fontSize: 10, color: '#333' }}>Starts at {currentTime.toFixed(1)}s · pausing the video first gives you a precise timestamp</p>
                    </div>
                  )}

                  {/* Caption list */}
                  {editState.captions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Type className="w-6 h-6" style={{ color: '#2a2a2a' }} />
                      <p style={{ fontSize: 12, color: '#444', textAlign: 'center' }}>No captions yet. Use "Add at Xs" above, or go to the main Captions tab to generate from audio.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {editState.captions.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl group" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
                          <span style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', flexShrink: 0, minWidth: 32 }}>{c.start.toFixed(1)}s</span>
                          {editingIdx === i ? (
                            <input
                              autoFocus
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              onBlur={() => { if (editingText.trim()) updateCaption(i, editingText.trim()); else setEditingIdx(null) }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { if (editingText.trim()) updateCaption(i, editingText.trim()); else setEditingIdx(null) }
                                if (e.key === 'Escape') setEditingIdx(null)
                              }}
                              style={{ flex: 1, background: '#1a1a1a', border: '1px solid #5855D4', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#fff', outline: 'none', fontFamily: 'inherit' }}
                            />
                          ) : (
                            <span
                              onClick={() => { setEditingIdx(i); setEditingText(c.text) }}
                              style={{ flex: 1, fontSize: 12, color: '#ccc', lineHeight: 1.5, cursor: 'text' }}
                              title="Click to edit">
                              {c.text}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace', flexShrink: 0 }}>{c.end.toFixed(1)}s</span>
                          <button
                            onClick={() => deleteCaption(i)}
                            style={{ color: '#333', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#333'}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Caption style controls */}
                {editState.captions.length > 0 && (
                  <div className="flex flex-col gap-3 pt-3" style={{ borderTop: '1px solid #1a1a1a' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Style</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { val: '#FFFFFF', label: 'White' },
                        { val: '#FFE600', label: 'Yellow' },
                        { val: '#60A5FA', label: 'Blue' },
                        { val: '#F472B6', label: 'Pink' },
                      ].map(c => (
                        <button key={c.val} onClick={() => { pushUndo(editState); setEditState(s => ({ ...s, captionColor: c.val })) }}
                          style={{ height: 28, borderRadius: 8, background: c.val, border: editState.captionColor === c.val ? '2px solid #5855D4' : '2px solid transparent', cursor: 'pointer' }}
                          title={c.label} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {(['sm', 'md', 'lg', 'xl'] as const).map(s => (
                        <button key={s} onClick={() => { pushUndo(editState); setEditState(st => ({ ...st, captionSize: s })) }}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: editState.captionSize === s ? '#5855D4' : '#111', color: editState.captionSize === s ? '#fff' : '#555', border: '1px solid #1a1a1a', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {(['bottom', 'center', 'top'] as const).map(p => (
                        <button key={p} onClick={() => { pushUndo(editState); setEditState(s => ({ ...s, captionPos: p })) }}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: editState.captionPos === p ? '#222' : '#111', color: editState.captionPos === p ? '#ccc' : '#444', border: `1px solid ${editState.captionPos === p ? '#333' : '#1a1a1a'}`, cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI EDIT TOOL */}
            {activeTool === 'ai' && (
              <div className="flex flex-col" style={{ height: '100%' }}>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%] rounded-2xl px-4 py-2.5" style={{
                        background: msg.role === 'user' ? '#5855D4'
                          : msg.kind === 'error'       ? 'rgba(239,68,68,0.12)'
                          : msg.kind === 'clarify'     ? 'rgba(250,204,21,0.08)'
                          : '#141414',
                        border: msg.role === 'ai'
                          ? msg.kind === 'error'   ? '1px solid rgba(239,68,68,0.25)'
                          : msg.kind === 'clarify' ? '1px solid rgba(250,204,21,0.2)'
                          : '1px solid #1e1e1e'
                          : 'none',
                      }}>
                        <p style={{ fontSize: 13, color: msg.role === 'user' ? '#fff' : msg.kind === 'error' ? '#f87171' : msg.kind === 'clarify' ? '#fde68a' : '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                        {msg.plan && msg.kind === 'edit' && (
                          <div className="mt-2 flex flex-col gap-0.5">
                            {msg.plan.ops.filter(o => !['interpret','clarify','unsupported'].includes(o.op)).slice(0, 3).map((op, i) => (
                              <p key={i} style={{ fontSize: 10, color: '#444', fontFamily: 'monospace' }}>{opToEnglish(op)}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl px-4 py-3" style={{ background: '#141414', border: '1px solid #1e1e1e' }}>
                        <div className="flex gap-1.5 items-center">
                          {[0,1,2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#5855D4', animation: `capcut-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick chips */}
                <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                  {['Cut intro', 'Yellow captions', 'Faster pace', 'Add CTA'].map(p => (
                    <button key={p} onClick={() => sendPrompt(p)} disabled={isLoading}
                      style={{ padding: '4px 10px', borderRadius: 20, background: '#141414', color: '#666', border: '1px solid #222', fontSize: 11, cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                </div>

                <div className="p-3" style={{ borderTop: '1px solid #1a1a1a' }}>
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(input) } }}
                      placeholder="Tell me what to edit…"
                      rows={2}
                      disabled={isLoading}
                      style={{ flex: 1, resize: 'none', borderRadius: 12, padding: '10px 14px', fontSize: 13, background: '#141414', border: '1px solid #222', color: '#fff', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                    />
                    <button
                      onClick={() => sendPrompt(input)}
                      disabled={isLoading || !input.trim()}
                      style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: input.trim() && !isLoading ? '#5855D4' : '#141414', color: input.trim() && !isLoading ? '#fff' : '#333', border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY TOOL */}
            {activeTool === 'history' && (
              <div className="p-4 flex flex-col gap-3">
                {undoStack.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Clock className="w-7 h-7" style={{ color: '#2a2a2a' }} />
                    <p style={{ fontSize: 12, color: '#444', textAlign: 'center' }}>No edits yet. Use AI Edit or edit captions to see history.</p>
                  </div>
                ) : (
                  messages.filter(m => m.role === 'ai' && m.plan && m.kind === 'edit').map((m, idx) => (
                    <div key={m.id} className="rounded-xl p-3" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#ccc', lineHeight: 1.4 }}>{m.plan!.summary}</p>
                        <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace', flexShrink: 0 }}>#{idx + 1}</span>
                      </div>
                      {m.plan!.ops.filter(o => !['interpret','clarify','unsupported'].includes(o.op)).map((op, i) => (
                        <p key={i} style={{ fontSize: 10, color: '#444', fontFamily: 'monospace' }}>{opToEnglish(op)}</p>
                      ))}
                    </div>
                  ))
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={undo} disabled={!undoStack.length}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5"
                    style={{ background: '#111', color: undoStack.length ? '#888' : '#333', border: '1px solid #1a1a1a' }}>
                    <Undo2 className="w-3.5 h-3.5" /> Undo ({undoStack.length})
                  </button>
                  <button onClick={redo} disabled={!redoStack.length}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5"
                    style={{ background: '#111', color: redoStack.length ? '#888' : '#333', border: '1px solid #1a1a1a' }}>
                    <Redo2 className="w-3.5 h-3.5" /> Redo ({redoStack.length})
                  </button>
                </div>
              </div>
            )}

            {/* TIMELINE TOOL */}
            {activeTool === 'timeline' && (
              <TimelineEditor
                duration={duration}
                currentTime={currentTime}
                segments={editState.segments}
                captions={editState.captions}
                voiceVolume={editState.voiceVolume}
                musicVolume={editState.musicVolume}
                onSeek={t => { if (videoRef.current) videoRef.current.currentTime = t }}
                onSegmentsChange={segs => { pushUndo(editState); setEditState(s => ({ ...s, segments: segs })) }}
                onCaptionChange={(idx, updates) => { pushUndo(editState); setEditState(s => ({ ...s, captions: s.captions.map((c, i) => i === idx ? { ...c, ...updates } : c) })) }}
                onAudioChange={(voice, music) => { pushUndo(editState); setEditState(s => ({ ...s, voiceVolume: voice, musicVolume: music })) }}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex flex-shrink-0" style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => { setActiveTool(tool.id); setPanelOpen(true) }}
            className="flex-1 flex flex-col items-center gap-1 py-3"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeTool === tool.id ? '#5855D4' : '#444', transition: 'color 0.15s' }}>
            {tool.icon}
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>{tool.label}</span>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes capcut-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.1);  }
        }
      `}</style>
    </div>
  )
}
