'use client'

/**
 * TimelineEditor — Layer 2 manual editor.
 *
 * Controls (thumb-sized, mobile-first):
 *  • Click to seek
 *  • Drag segment handles to trim in/out points
 *  • Split at playhead button
 *  • Delete segment button (tap segment to select, then delete)
 *  • Tap caption chip to edit text inline
 *  • Drag caption chip to retime
 *  • Voice / music volume sliders
 */

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { type Segment, type EditCaption } from '@/lib/editPlan'
import { Scissors, Trash2, Volume2 } from 'lucide-react'

interface Props {
  duration:         number
  currentTime:      number
  segments:         Segment[]
  captions:         EditCaption[]
  voiceVolume:      number
  musicVolume:      number
  onSeek:           (t: number) => void
  onSegmentsChange: (segs: Segment[]) => void
  onCaptionChange:  (idx: number, updates: Partial<EditCaption>) => void
  onAudioChange:    (voice: number, music: number) => void
}

export default function TimelineEditor({
  duration, currentTime, segments, captions,
  voiceVolume, musicVolume,
  onSeek, onSegmentsChange, onCaptionChange, onAudioChange,
}: Props) {
  const trackRef      = useRef<HTMLDivElement>(null)
  const [selectedSeg, setSelectedSeg]   = useState<number | null>(null)
  const [editCap,     setEditCap]       = useState<{ idx: number; text: string } | null>(null)
  const [dragState,   setDragState]     = useState<{
    type:   'seg-start' | 'seg-end' | 'caption' | 'playhead'
    segIdx: number
    capIdx: number
    startX: number
    startVal: number
  } | null>(null)

  /* ── Coordinate helpers ─────────────────────────────────── */

  const pxToTime = useCallback((px: number): number => {
    const w = trackRef.current?.clientWidth ?? 1
    return Math.max(0, Math.min(duration, (px / w) * duration))
  }, [duration])

  const timeToPct = (t: number) => `${(t / duration) * 100}%`

  /* ── Click to seek ──────────────────────────────────────── */

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (dragState) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    onSeek(pxToTime(e.clientX - rect.left))
  }, [dragState, pxToTime, onSeek])

  /* ── Pointer drag (handles, captions, playhead) ─────────── */

  const startDrag = useCallback((
    e: React.PointerEvent,
    type: 'seg-start' | 'seg-end' | 'caption',
    segIdx: number,
    capIdx: number,
    currentVal: number,
  ) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragState({ type, segIdx, capIdx, startX: e.clientX, startVal: currentVal })
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState || !trackRef.current) return
    const w    = trackRef.current.clientWidth
    const dt   = ((e.clientX - dragState.startX) / w) * duration
    const newT = Math.max(0, Math.min(duration, dragState.startVal + dt))

    if (dragState.type === 'seg-start') {
      const segs = segments.map((s, i) => {
        if (i !== dragState.segIdx) return s
        const newStart = Math.min(newT, s.end - 0.1)
        return { ...s, start: newStart }
      })
      onSegmentsChange(segs)
    } else if (dragState.type === 'seg-end') {
      const segs = segments.map((s, i) => {
        if (i !== dragState.segIdx) return s
        const newEnd = Math.max(newT, s.start + 0.1)
        return { ...s, end: newEnd }
      })
      onSegmentsChange(segs)
    } else if (dragState.type === 'caption') {
      const cap = captions[dragState.capIdx]
      if (!cap) return
      const dur = cap.end - cap.start
      const newStart = Math.max(0, Math.min(duration - dur, newT))
      onCaptionChange(dragState.capIdx, { start: newStart, end: newStart + dur })
    }
  }, [dragState, duration, segments, captions, onSegmentsChange, onCaptionChange])

  const endDrag = useCallback(() => setDragState(null), [])

  /* ── Split at playhead ──────────────────────────────────── */

  const splitAtPlayhead = useCallback(() => {
    const t = currentTime
    const idx = segments.findIndex(s => t > s.start + 0.1 && t < s.end - 0.1)
    if (idx === -1) return
    const seg = segments[idx]
    const newSegs = [
      ...segments.slice(0, idx),
      { ...seg, end: t },
      { ...seg, start: t },
      ...segments.slice(idx + 1),
    ]
    onSegmentsChange(newSegs)
  }, [currentTime, segments, onSegmentsChange])

  /* ── Delete selected segment ────────────────────────────── */

  const deleteSegment = useCallback((idx: number) => {
    if (segments.length <= 1) return  // can't delete last segment
    onSegmentsChange(segments.filter((_, i) => i !== idx))
    setSelectedSeg(null)
  }, [segments, onSegmentsChange])

  /* ── Caption inline edit ────────────────────────────────── */

  const commitCaption = useCallback(() => {
    if (!editCap) return
    onCaptionChange(editCap.idx, { text: editCap.text })
    setEditCap(null)
  }, [editCap, onCaptionChange])

  /* ── Format time ────────────────────────────────────────── */
  const fmt = (s: number) => {
    const m = Math.floor(s / 60), sec = (s % 60).toFixed(1)
    return `${m}:${sec.padStart(4, '0')}`
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4 p-4" style={{ userSelect: 'none' }}>

      {/* ── Action buttons ──────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button onClick={splitAtPlayhead}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '0.5px solid rgba(99,102,241,0.25)' }}>
          <Scissors className="w-3.5 h-3.5" /> Split here
        </button>
        {selectedSeg !== null && (
          <button onClick={() => deleteSegment(selectedSeg)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '0.5px solid rgba(239,68,68,0.25)' }}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )}
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#52525B', marginLeft: 'auto' }}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>

      {/* ── Track area ──────────────────────────────────── */}
      <div
        ref={trackRef}
        className="relative rounded-xl overflow-visible cursor-pointer"
        style={{ height: 56, background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.07)' }}
        onClick={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Full track background */}
        <div className="absolute inset-0 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />

        {/* Gap regions (trimmed) */}
        {(() => {
          const gaps: { start: number; end: number }[] = []
          const sorted = [...segments].sort((a, b) => a.start - b.start)
          if (sorted.length && sorted[0].start > 0) gaps.push({ start: 0, end: sorted[0].start })
          for (let i = 0; i < sorted.length - 1; i++) gaps.push({ start: sorted[i].end, end: sorted[i + 1].start })
          if (sorted.length && sorted[sorted.length - 1].end < duration) gaps.push({ start: sorted[sorted.length - 1].end, end: duration })
          return gaps.map((g, i) => (
            <div key={`gap-${i}`} className="absolute top-0 bottom-0"
              style={{ left: timeToPct(g.start), width: timeToPct(g.end - g.start), background: 'rgba(0,0,0,0.6)', zIndex: 1 }} />
          ))
        })()}

        {/* Active segments */}
        {segments.map((seg, i) => (
          <div key={i}>
            {/* Segment block */}
            <div
              className="absolute top-2 bottom-2 cursor-pointer transition-all"
              style={{
                left:       timeToPct(seg.start),
                width:      timeToPct(seg.end - seg.start),
                background: selectedSeg === i
                  ? seg.speed !== 1.0 ? 'rgba(250,204,21,0.25)' : 'rgba(99,102,241,0.25)'
                  : seg.speed !== 1.0 ? 'rgba(250,204,21,0.12)' : 'rgba(99,102,241,0.12)',
                border: selectedSeg === i
                  ? seg.speed !== 1.0 ? '1px solid rgba(250,204,21,0.5)' : '1px solid rgba(99,102,241,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                zIndex: 2,
              }}
              onClick={e => { e.stopPropagation(); setSelectedSeg(selectedSeg === i ? null : i) }}
            >
              {/* Speed badge */}
              {seg.speed !== 1.0 && (
                <span className="absolute top-1 left-1.5" style={{ fontSize: 9, color: '#fde68a', fontWeight: 700, fontFamily: 'monospace' }}>
                  ×{seg.speed.toFixed(2)}
                </span>
              )}
            </div>

            {/* Start handle */}
            <div
              className="absolute top-0 bottom-0 flex items-center justify-center cursor-ew-resize"
              style={{ left: `calc(${timeToPct(seg.start)} - 8px)`, width: 16, zIndex: 5 }}
              onPointerDown={e => startDrag(e, 'seg-start', i, -1, seg.start)}>
              <div className="h-8 w-[3px] rounded-full" style={{ background: selectedSeg === i ? '#818cf8' : 'rgba(255,255,255,0.3)' }} />
            </div>

            {/* End handle */}
            <div
              className="absolute top-0 bottom-0 flex items-center justify-center cursor-ew-resize"
              style={{ left: `calc(${timeToPct(seg.end)} - 8px)`, width: 16, zIndex: 5 }}
              onPointerDown={e => startDrag(e, 'seg-end', i, -1, seg.end)}>
              <div className="h-8 w-[3px] rounded-full" style={{ background: selectedSeg === i ? '#818cf8' : 'rgba(255,255,255,0.3)' }} />
            </div>
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: timeToPct(currentTime), width: 2, background: '#FAFAFA', zIndex: 10, boxShadow: '0 0 8px rgba(255,255,255,0.4)' }}
        />
        {/* Playhead time label */}
        <div className="absolute -top-6 pointer-events-none"
          style={{ left: `calc(${timeToPct(currentTime)} - 18px)` }}>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#A1A1AA', background: '#18181B', padding: '1px 4px', borderRadius: 4 }}>
            {fmt(currentTime)}
          </span>
        </div>
      </div>

      {/* ── Captions track ───────────────────────────────── */}
      {captions.length > 0 && (
        <div className="relative" style={{ height: 28, marginTop: 4 }}>
          {captions.map((cap, i) => (
            <div key={i}
              className="absolute top-0 h-7 flex items-center"
              style={{ left: timeToPct(cap.start), width: timeToPct(cap.end - cap.start), minWidth: 32, zIndex: 3 }}>
              {editCap?.idx === i ? (
                <input
                  autoFocus
                  value={editCap.text}
                  onChange={e => setEditCap({ idx: i, text: e.target.value })}
                  onBlur={commitCaption}
                  onKeyDown={e => e.key === 'Enter' && commitCaption()}
                  style={{
                    fontSize: 10, color: '#FAFAFA', background: '#1e1e24',
                    border: '1px solid #6366f1', borderRadius: 4,
                    padding: '1px 5px', width: '100%', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <div
                  className="w-full h-6 flex items-center px-1.5 rounded cursor-pointer overflow-hidden"
                  style={{ background: 'rgba(99,102,241,0.18)', border: '0.5px solid rgba(99,102,241,0.3)' }}
                  onClick={e => { e.stopPropagation(); setEditCap({ idx: i, text: cap.text }) }}
                  onPointerDown={e => startDrag(e, 'caption', -1, i, cap.start)}>
                  <span style={{ fontSize: 9, color: '#a5b4fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cap.text}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Audio mix ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="w-3.5 h-3.5" style={{ color: '#52525B' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', letterSpacing: '0.02em' }}>Audio Mix</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 10, color: '#52525B', width: 34 }}>Voice</span>
          <input type="range" min={0} max={100} value={Math.round(voiceVolume * 100)}
            onChange={e => onAudioChange(Number(e.target.value) / 100, musicVolume)}
            className="flex-1" style={{ accentColor: '#6366f1', height: 3, cursor: 'pointer' }} />
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6366f1', width: 28, textAlign: 'right' }}>
            {Math.round(voiceVolume * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 10, color: '#52525B', width: 34 }}>Music</span>
          <input type="range" min={0} max={100} value={Math.round(musicVolume * 100)}
            onChange={e => onAudioChange(voiceVolume, Number(e.target.value) / 100)}
            className="flex-1" style={{ accentColor: '#8b5cf6', height: 3, cursor: 'pointer' }} />
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8b5cf6', width: 28, textAlign: 'right' }}>
            {Math.round(musicVolume * 100)}%
          </span>
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────── */}
      <div className="flex gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: 'rgba(99,102,241,0.4)' }} />
          <span style={{ fontSize: 9, color: '#52525B' }}>Clip</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: 'rgba(250,204,21,0.4)' }} />
          <span style={{ fontSize: 9, color: '#52525B' }}>Speed ramp</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: 'rgba(0,0,0,0.6)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: 9, color: '#52525B' }}>Trimmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: 'rgba(99,102,241,0.18)', border: '0.5px solid rgba(99,102,241,0.3)' }} />
          <span style={{ fontSize: 9, color: '#52525B' }}>Caption</span>
        </div>
      </div>
    </div>
  )
}
