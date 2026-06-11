'use client'

/**
 * Smart Edit Studio — Layer 1 (AI prompt editor) + Layer 2 (manual timeline).
 *
 * Architecture:
 *  - EditState holds all non-destructive edits (segments, caption style, overlays, etc.)
 *  - undoStack / redoStack for full undo/redo
 *  - Video preview simulates edits live via onTimeUpdate + CSS transforms
 *  - API call → validated EditPlan → applyPlanToState() → re-render
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  type EditState, type EditPlan, type EditOp,
  initialEditState, applyPlanToState, opToEnglish,
} from '@/lib/editPlan'
import TimelineEditor from '@/components/TimelineEditor'
import { Send, Undo2, Redo2, X, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react'

/* ── Types ─────────────────────────────────────────────── */

interface ChatMessage {
  id:      string
  role:    'user' | 'ai'
  text:    string            // user prompt or AI summary
  plan?:   EditPlan          // attached edit plan (AI messages only)
  kind?:   'edit' | 'clarify' | 'unsupported' | 'error'
}

interface Props {
  videoUrl:         string
  duration:         number
  initialCaptions:  { text: string; start: number; end: number }[]
  colorFilter:      string   // CSS filter string from the grade system
  onClose:          () => void
  onApply:          (state: EditState) => void
}

/* ── Caption size map ──────────────────────────────────── */
const SIZE_PX: Record<string, number> = { sm: 14, md: 18, lg: 22, xl: 28 }
const FONT_FAMILY: Record<string, string> = {
  inter:  'Inter, sans-serif',
  impact: 'Impact, Arial Narrow, sans-serif',
  serif:  'Georgia, serif',
  mono:   'ui-monospace, monospace',
}

/* ── Component ─────────────────────────────────────────── */

export default function SmartEditStudio({ videoUrl, duration, initialCaptions, colorFilter, onClose, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Edit state + history stacks
  const [editState, setEditState]   = useState<EditState>(() => initialEditState(duration, initialCaptions))
  const [undoStack, setUndoStack]   = useState<EditState[]>([])
  const [redoStack, setRedoStack]   = useState<EditState[]>([])

  // Playback
  const [currentTime, setCurrentTime] = useState(0)
  const [activeZoom,  setActiveZoom]  = useState(1.0)

  // Chat
  const [messages,    setMessages]    = useState<ChatMessage[]>([
    { id: 'welcome', role: 'ai', text: 'Tell me what to edit. Try: "cut the intro", "make captions yellow", "add a CTA at the end", or "make it faster paced".', kind: 'edit' },
  ])
  const [input,       setInput]       = useState('')
  const [isLoading,   setIsLoading]   = useState(false)

  // UI
  const [activeTab,   setActiveTab]   = useState<'chat' | 'history' | 'timeline'>('chat')
  const [historyOpen, setHistoryOpen] = useState(true)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll chat to bottom on new message
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* ── Playback: skip trimmed segments, apply speed ─────── */
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const t = v.currentTime
    setCurrentTime(t)

    const segs = editState.segments
    const inSeg = segs.find(s => t >= s.start && t < s.end)

    if (!inSeg) {
      const next = segs.find(s => s.start > t)
      if (next) { v.currentTime = next.start }
      else { v.pause() }
      return
    }

    // Apply per-segment speed
    const targetRate = inSeg.speed ?? 1.0
    if (Math.abs(v.playbackRate - targetRate) > 0.01) v.playbackRate = targetRate

    // Zoom punch
    const punch = editState.zoomPunches.find(z => t >= z.at && t < z.at + z.duration)
    setActiveZoom(punch?.scale ?? 1.0)
  }, [editState.segments, editState.zoomPunches])

  /* ── Active caption for current time ─────────────────── */
  const activeCaptions = editState.captionActive
    ? editState.captions.filter(c => currentTime >= c.start && currentTime <= c.end)
    : []

  const activeOverlays = editState.textOverlays.filter(
    o => currentTime >= o.at && currentTime < o.at + o.duration,
  )

  /* ── Undo / Redo ──────────────────────────────────────── */
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

  /* ── Send prompt ──────────────────────────────────────── */
  const sendPrompt = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: text.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages
        .filter(m => m.role === 'ai' && m.plan)
        .map(m => m.plan!.summary)

      const res  = await fetch('/api/video/smart-edit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:   text.trim(),
          duration,
          captions: editState.captions,
          history,
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setMessages(m => [...m, {
          id:   `e-${Date.now()}`,
          role: 'ai',
          text: data.error ?? 'Something went wrong. Try rephrasing.',
          kind: 'error',
        }])
        return
      }

      const plan: EditPlan = data.plan
      const ops = plan.ops

      // Handle special ops (clarify / unsupported — no state change)
      const isClarify    = ops.length === 1 && ops[0].op === 'clarify'
      const isUnsupported = ops.some(o => o.op === 'unsupported')

      if (isClarify) {
        setMessages(m => [...m, {
          id: `a-${Date.now()}`, role: 'ai',
          text: (ops[0] as { op: 'clarify'; question: string }).question,
          plan, kind: 'clarify',
        }])
        return
      }

      if (isUnsupported) {
        const u = ops.find(o => o.op === 'unsupported') as { op: string; instruction: string; suggestion: string }
        setMessages(m => [...m, {
          id: `a-${Date.now()}`, role: 'ai',
          text: `I can't do "${u.instruction}" yet — ${u.suggestion}`,
          plan, kind: 'unsupported',
        }])
        return
      }

      // Apply the plan
      setUndoStack(u => [...u, editState])
      setRedoStack([])
      setEditState(s => applyPlanToState(s, plan, duration))

      // Find interpret message if present
      const interpretOp = ops.find(o => o.op === 'interpret') as { op: string; message: string } | undefined

      setMessages(m => [...m, {
        id:   `a-${Date.now()}`,
        role: 'ai',
        text: interpretOp ? `💡 ${interpretOp.message}\n\n${plan.summary}` : plan.summary,
        plan,
        kind: 'edit',
      }])

    } catch (err) {
      setMessages(m => [...m, {
        id:   `e-${Date.now()}`,
        role: 'ai',
        text: `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        kind: 'error',
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [isLoading, messages, editState, duration])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(input) }
  }

  /* ── Caption position style ───────────────────────────── */
  const captionPosStyle: React.CSSProperties =
    editState.captionPos === 'top'    ? { top: '8%',  bottom: 'auto' } :
    editState.captionPos === 'center' ? { top: '50%', transform: 'translateY(-50%)' } :
    { bottom: '10%', top: 'auto' }

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="flex flex-col w-full h-full" style={{ background: '#09090B', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: '#818cf8' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.02em' }}>Smart Edit</span>
          <span style={{ fontSize: 11, color: '#52525B', fontFamily: 'monospace' }}>{duration.toFixed(1)}s</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!undoStack.length}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: undoStack.length ? 'rgba(255,255,255,0.06)' : 'transparent', color: undoStack.length ? '#A1A1AA' : '#3f3f46', border: '0.5px solid rgba(255,255,255,0.07)' }}>
            <Undo2 className="w-3 h-3" /> Undo
          </button>
          <button onClick={redo} disabled={!redoStack.length}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: redoStack.length ? 'rgba(255,255,255,0.06)' : 'transparent', color: redoStack.length ? '#A1A1AA' : '#3f3f46', border: '0.5px solid rgba(255,255,255,0.07)' }}>
            <Redo2 className="w-3 h-3" /> Redo
          </button>
          <button onClick={() => onApply(editState)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '0.5px solid rgba(99,102,241,0.3)' }}>
            Apply &amp; Export
          </button>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#71717A' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Video preview ───────────────────────────────── */}
      <div className="relative w-full" style={{ background: '#000', aspectRatio: '9/16', maxHeight: '50vh', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          controls
          playsInline
          className="w-full h-full object-contain"
          style={{ filter: colorFilter || undefined, transform: `scale(${activeZoom})`, transition: 'transform 0.2s ease' }}
        />

        {/* Caption overlay */}
        {activeCaptions.map((c, i) => (
          <div key={i} className="absolute left-0 right-0 flex justify-center pointer-events-none px-4"
            style={{ ...captionPosStyle, zIndex: 10 }}>
            <span style={{
              fontSize:   SIZE_PX[editState.captionSize] ?? 18,
              fontFamily: FONT_FAMILY[editState.captionFont] ?? 'Inter, sans-serif',
              fontWeight: editState.captionBold ? 700 : 500,
              color:      editState.captionColor,
              textShadow: '0 2px 8px rgba(0,0,0,0.9)',
              textAlign:  'center',
              lineHeight: 1.2,
            }}>{c.text}</span>
          </div>
        ))}

        {/* Text overlays */}
        {activeOverlays.map((o, i) => {
          const y: React.CSSProperties = o.position === 'top' ? { top: '8%' } : o.position === 'center' ? { top: '50%', transform: 'translateY(-50%)' } : { bottom: '10%' }
          return (
            <div key={i} className="absolute left-0 right-0 flex justify-center pointer-events-none px-6" style={{ ...y, zIndex: 11 }}>
              <span style={{
                fontSize: o.style === 'title' ? 22 : o.style === 'cta' ? 18 : 14,
                fontWeight: 800,
                color: '#FAFAFA',
                textShadow: '0 2px 12px rgba(0,0,0,0.95)',
                letterSpacing: '-0.01em',
                textAlign: 'center',
                padding: o.style === 'cta' ? '6px 16px' : '0',
                background: o.style === 'cta' ? 'rgba(99,102,241,0.85)' : 'transparent',
                borderRadius: o.style === 'cta' ? 8 : 0,
              }}>{o.text}</span>
            </div>
          )
        })}

        {/* Trim indicator — show gaps */}
        <div className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none" style={{ zIndex: 20 }}>
          {editState.segments.map((seg, i) => (
            <div key={i} style={{
              position: 'absolute',
              left:   `${(seg.start / duration) * 100}%`,
              width:  `${((seg.end - seg.start) / duration) * 100}%`,
              height: '100%',
              background: seg.speed !== 1.0 ? 'rgba(250,204,21,0.7)' : 'rgba(99,102,241,0.6)',
            }} />
          ))}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────── */}
      <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['chat', 'history', 'timeline'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-all relative"
            style={{ color: activeTab === tab ? '#FAFAFA' : '#52525B', background: 'transparent' }}>
            {tab === 'chat' ? '💬 Chat' : tab === 'history' ? '📋 History' : '🎬 Timeline'}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5" style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                      : msg.kind === 'error'       ? 'rgba(239,68,68,0.12)'
                      : msg.kind === 'clarify'     ? 'rgba(250,204,21,0.08)'
                      : msg.kind === 'unsupported' ? 'rgba(249,115,22,0.1)'
                      : 'rgba(255,255,255,0.05)',
                    border: msg.role === 'ai'
                      ? msg.kind === 'error'       ? '0.5px solid rgba(239,68,68,0.3)'
                      : msg.kind === 'clarify'     ? '0.5px solid rgba(250,204,21,0.25)'
                      : msg.kind === 'unsupported' ? '0.5px solid rgba(249,115,22,0.3)'
                      : '0.5px solid rgba(255,255,255,0.07)'
                      : 'none',
                  }}>
                    <p style={{
                      fontSize: 13,
                      color: msg.role === 'user' ? '#fff' : msg.kind === 'error' ? '#fca5a5' : msg.kind === 'clarify' ? '#fde68a' : '#D4D4D8',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}>{msg.text}</p>
                    {msg.plan && msg.kind === 'edit' && msg.plan.ops.filter(o => !['interpret','clarify','unsupported'].includes(o.op)).length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        {msg.plan.ops
                          .filter(o => !['interpret','clarify','unsupported'].includes(o.op))
                          .slice(0, 4)
                          .map((op, i) => (
                            <p key={i} style={{ fontSize: 10, color: '#71717A', fontFamily: 'monospace' }}>{opToEnglish(op)}</p>
                          ))}
                        {msg.plan.ops.filter(o => !['interpret','clarify','unsupported'].includes(o.op)).length > 4 && (
                          <p style={{ fontSize: 10, color: '#52525B' }}>+{msg.plan.ops.length - 4} more ops</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex gap-1.5 items-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{
                          background: '#6366f1',
                          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Quick prompts */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  'Cut the intro',
                  'Bigger yellow captions',
                  'Make it faster',
                  'Lower music',
                  'Add CTA at end',
                ].map(p => (
                  <button key={p} onClick={() => sendPrompt(p)} disabled={isLoading}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                    style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '0.5px solid rgba(99,102,241,0.2)' }}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell me what to edit…"
                  rows={2}
                  disabled={isLoading}
                  className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-[13px] transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    color: '#FAFAFA',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={() => sendPrompt(input)}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 transition-all"
                  style={{
                    background: input.trim() && !isLoading ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                    color: input.trim() && !isLoading ? '#fff' : '#52525B',
                  }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p style={{ fontSize: 10, color: '#3f3f46', marginTop: 6, textAlign: 'center' }}>Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
            {undoStack.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Clock className="w-8 h-8" style={{ color: '#3f3f46' }} />
                <p style={{ fontSize: 12, color: '#52525B', textAlign: 'center' }}>No edits yet. Use the Chat tab to start editing.</p>
              </div>
            )}
            {messages
              .filter(m => m.role === 'ai' && m.plan && m.kind === 'edit')
              .map((m, idx) => (
                <div key={m.id} className="rounded-xl p-3.5" style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', lineHeight: 1.4 }}>{m.plan!.summary}</p>
                    <span style={{ fontSize: 10, color: '#52525B', fontFamily: 'monospace', flexShrink: 0 }}>#{idx + 1}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {m.plan!.ops
                      .filter(o => !['interpret', 'clarify', 'unsupported'].includes(o.op))
                      .map((op, i) => (
                        <p key={i} style={{ fontSize: 10, color: '#71717A', fontFamily: 'monospace' }}>{opToEnglish(op)}</p>
                      ))}
                  </div>
                </div>
              ))}
            <div className="mt-2 flex gap-2">
              <button onClick={undo} disabled={!undoStack.length}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5"
                style={{ background: undoStack.length ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', color: undoStack.length ? '#A1A1AA' : '#3f3f46', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <Undo2 className="w-3.5 h-3.5" /> Undo ({undoStack.length})
              </button>
              <button onClick={redo} disabled={!redoStack.length}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5"
                style={{ background: redoStack.length ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', color: redoStack.length ? '#A1A1AA' : '#3f3f46', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <Redo2 className="w-3.5 h-3.5" /> Redo ({redoStack.length})
              </button>
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="flex-1 overflow-y-auto">
            <TimelineEditor
              duration={duration}
              currentTime={currentTime}
              segments={editState.segments}
              captions={editState.captions}
              voiceVolume={editState.voiceVolume}
              musicVolume={editState.musicVolume}
              onSeek={t => { if (videoRef.current) videoRef.current.currentTime = t }}
              onSegmentsChange={segs => {
                setUndoStack(u => [...u, editState])
                setRedoStack([])
                setEditState(s => ({ ...s, segments: segs }))
              }}
              onCaptionChange={(idx, updates) => {
                setUndoStack(u => [...u, editState])
                setRedoStack([])
                setEditState(s => ({
                  ...s,
                  captions: s.captions.map((c, i) => i === idx ? { ...c, ...updates } : c),
                }))
              }}
              onAudioChange={(voice, music) => {
                setUndoStack(u => [...u, editState])
                setRedoStack([])
                setEditState(s => ({ ...s, voiceVolume: voice, musicVolume: music }))
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.1);  }
        }
      `}</style>
    </div>
  )
}
