/**
 * Edit Plan — schema, types, validator, and state engine for Smart Edit.
 *
 * The LLM produces an EditPlan (JSON array of ops + human summary).
 * The deterministic engine below applies those ops to EditState.
 * The original video is never mutated — all edits are held in EditState.
 */

/* ── Op types ─────────────────────────────────────────────── */

export type SizeKey    = 'sm' | 'md' | 'lg' | 'xl'
export type FontKey    = 'inter' | 'impact' | 'serif' | 'mono'
export type PosKey     = 'top' | 'center' | 'bottom'
export type OverlayStyleKey = 'title' | 'cta' | 'label'

export interface TrimOp          { op: 'trim';           start: number; end: number }
export interface SpeedRampOp     { op: 'speed_ramp';     segment: [number, number]; factor: number }
export interface CaptionStyleOp  { op: 'caption_style';  size?: SizeKey; color?: string; font?: FontKey; pos?: PosKey; bold?: boolean }
export interface CaptionEditOp   { op: 'caption_edit';   index: number; text: string }
export interface CaptionTimingOp { op: 'caption_timing'; index: number; start: number; end: number }
export interface CaptionFilterOp { op: 'caption_filter'; mode: 'all' | 'key_phrases' | 'none' }
export interface TextOverlayOp   { op: 'text_overlay';   text: string; at: number | 'start' | 'end'; duration: number; position: PosKey; style?: OverlayStyleKey }
export interface AudioMixOp      { op: 'audio_mix';      voiceVolume: number; musicVolume: number }
export interface MusicSwapOp     { op: 'music_swap';     track: string }
export interface ZoomPunchOp     { op: 'zoom_punch';     at: number; scale: number; duration: number }
export interface ClarifyOp       { op: 'clarify';        question: string }
export interface InterpretOp     { op: 'interpret';      message: string }
export interface UnsupportedOp   { op: 'unsupported';    instruction: string; suggestion: string }

export type EditOp =
  | TrimOp | SpeedRampOp
  | CaptionStyleOp | CaptionEditOp | CaptionTimingOp | CaptionFilterOp
  | TextOverlayOp | AudioMixOp | MusicSwapOp | ZoomPunchOp
  | ClarifyOp | InterpretOp | UnsupportedOp

export interface EditPlan { ops: EditOp[]; summary: string }

/* ── Editor state ─────────────────────────────────────────── */

export interface Segment     { start: number; end: number; speed: number }
export interface TextOverlay { text: string; at: number; duration: number; position: PosKey; style: OverlayStyleKey }
export interface ZoomPunch   { at: number; scale: number; duration: number }
export interface EditCaption { text: string; start: number; end: number }

export interface EditState {
  segments:       Segment[]
  // Caption style
  captionSize:    SizeKey
  captionColor:   string
  captionFont:    FontKey
  captionPos:     PosKey
  captionBold:    boolean
  captionActive:  boolean
  captionFilter:  'all' | 'key_phrases' | 'none'
  captions:       EditCaption[]
  // Overlays & effects
  textOverlays:   TextOverlay[]
  zoomPunches:    ZoomPunch[]
  // Audio
  voiceVolume:    number
  musicVolume:    number
  music:          string
}

export function initialEditState(duration: number, captions: EditCaption[] = []): EditState {
  return {
    segments:      [{ start: 0, end: duration, speed: 1.0 }],
    captionSize:   'md',
    captionColor:  '#FFFFFF',
    captionFont:   'inter',
    captionPos:    'bottom',
    captionBold:   true,
    captionActive: captions.length > 0,
    captionFilter: 'all',
    captions,
    textOverlays:  [],
    zoomPunches:   [],
    voiceVolume:   1.0,
    musicVolume:   0.4,
    music:         'none',
  }
}

/* ── Validator ────────────────────────────────────────────── */

const VALID_OPS = new Set([
  'trim','speed_ramp','caption_style','caption_edit','caption_timing',
  'caption_filter','text_overlay','audio_mix','music_swap','zoom_punch',
  'clarify','interpret','unsupported',
])
const VALID_TRACKS = new Set(['none','cinematic','hype','lofi','corporate','emotional','electronic','ambient','acoustic','dark','jazz'])

export function validateEditPlan(
  raw: unknown,
  duration: number,
): { ok: true; plan: EditPlan } | { ok: false; error: string } {
  if (typeof raw !== 'object' || !raw) return { ok: false, error: 'plan is not an object' }
  const p = raw as Record<string, unknown>
  if (!Array.isArray(p.ops))            return { ok: false, error: 'ops must be an array' }
  if (typeof p.summary !== 'string')    return { ok: false, error: 'summary must be a string' }

  for (let i = 0; i < (p.ops as unknown[]).length; i++) {
    const op = (p.ops as unknown[])[i]
    if (typeof op !== 'object' || !op)  return { ok: false, error: `op[${i}] is not an object` }
    const o = op as Record<string, unknown>
    if (!VALID_OPS.has(o.op as string)) return { ok: false, error: `op[${i}]: unknown op "${o.op}"` }

    if (o.op === 'trim') {
      if (typeof o.start !== 'number' || typeof o.end !== 'number')
        return { ok: false, error: `trim[${i}]: start/end must be numbers` }
      if (o.start < 0 || o.end > duration + 0.5 || o.start >= o.end)
        return { ok: false, error: `trim[${i}]: invalid range ${o.start}–${o.end} (duration=${duration})` }
    }
    if (o.op === 'speed_ramp') {
      if (!Array.isArray(o.segment) || o.segment.length !== 2)
        return { ok: false, error: `speed_ramp[${i}]: segment must be [start, end]` }
      if (typeof o.factor !== 'number' || (o.factor as number) < 0.5 || (o.factor as number) > 3.0)
        return { ok: false, error: `speed_ramp[${i}]: factor must be 0.5–3.0` }
    }
    if (o.op === 'audio_mix') {
      const vv = o.voiceVolume as number, mv = o.musicVolume as number
      if (typeof vv !== 'number' || vv < 0 || vv > 1) return { ok: false, error: `audio_mix[${i}]: voiceVolume must be 0–1` }
      if (typeof mv !== 'number' || mv < 0 || mv > 1) return { ok: false, error: `audio_mix[${i}]: musicVolume must be 0–1` }
    }
    if (o.op === 'zoom_punch') {
      if (typeof o.at !== 'number' || typeof o.scale !== 'number' || typeof o.duration !== 'number')
        return { ok: false, error: `zoom_punch[${i}]: at/scale/duration must be numbers` }
      if ((o.scale as number) < 1.0 || (o.scale as number) > 2.5)
        return { ok: false, error: `zoom_punch[${i}]: scale must be 1.0–2.5` }
    }
    if (o.op === 'music_swap') {
      if (!VALID_TRACKS.has(o.track as string))
        return { ok: false, error: `music_swap[${i}]: unknown track "${o.track}"` }
    }
  }

  return { ok: true, plan: p as unknown as EditPlan }
}

/* ── State engine — applies an EditPlan to an EditState ───── */

export function applyPlanToState(state: EditState, plan: EditPlan, duration: number): EditState {
  let next: EditState = {
    ...state,
    segments:     [...state.segments],
    captions:     state.captions.map(c => ({ ...c })),
    textOverlays: [...state.textOverlays],
    zoomPunches:  [...state.zoomPunches],
  }

  for (const op of plan.ops) {
    switch (op.op) {
      case 'trim':
        next.segments = applyTrim(next.segments, op.start, op.end)
        break
      case 'speed_ramp':
        next.segments = applySpeedRamp(next.segments, op.segment[0], op.segment[1], op.factor)
        break
      case 'caption_style':
        if (op.size)  next.captionSize  = op.size
        if (op.color) next.captionColor = op.color
        if (op.font)  next.captionFont  = op.font
        if (op.pos)   next.captionPos   = op.pos
        if (op.bold !== undefined) next.captionBold = op.bold
        break
      case 'caption_edit':
        if (op.index >= 0 && op.index < next.captions.length)
          next.captions = next.captions.map((c, i) => i === op.index ? { ...c, text: op.text } : c)
        break
      case 'caption_timing':
        if (op.index >= 0 && op.index < next.captions.length)
          next.captions = next.captions.map((c, i) => i === op.index ? { ...c, start: op.start, end: op.end } : c)
        break
      case 'caption_filter':
        next.captionFilter = op.mode
        next.captionActive = op.mode !== 'none'
        break
      case 'text_overlay': {
        const at = op.at === 'start' ? 0 : op.at === 'end' ? Math.max(0, duration - (op.duration ?? 3)) : (op.at as number)
        next.textOverlays = [
          ...next.textOverlays.filter(t => Math.abs(t.at - at) > 0.5),
          { text: op.text, at, duration: op.duration ?? 3, position: op.position ?? 'bottom', style: op.style ?? 'cta' },
        ]
        break
      }
      case 'audio_mix':
        next.voiceVolume = op.voiceVolume
        next.musicVolume = op.musicVolume
        break
      case 'music_swap':
        next.music = op.track
        break
      case 'zoom_punch':
        next.zoomPunches = [
          ...next.zoomPunches.filter(z => Math.abs(z.at - op.at) > 0.5),
          { at: op.at, scale: op.scale, duration: op.duration },
        ]
        break
      // clarify / interpret / unsupported — UI handles these, no state change
    }
  }

  return next
}

/* ── Segment helpers ─────────────────────────────────────── */

function applyTrim(segs: Segment[], s: number, e: number): Segment[] {
  const out: Segment[] = []
  for (const seg of segs) {
    if (e <= seg.start || s >= seg.end) { out.push(seg); continue }
    if (s <= seg.start && e >= seg.end) continue  // fully removed
    if (s <= seg.start) { out.push({ ...seg, start: e }); continue }
    if (e >= seg.end)   { out.push({ ...seg, end: s });   continue }
    // split in middle
    out.push({ ...seg, end: s })
    out.push({ ...seg, start: e })
  }
  return out.filter(s => s.end - s.start > 0.05)
}

function applySpeedRamp(segs: Segment[], rs: number, re: number, factor: number): Segment[] {
  const out: Segment[] = []
  for (const seg of segs) {
    if (re <= seg.start || rs >= seg.end) { out.push(seg); continue }
    if (rs <= seg.start && re >= seg.end) { out.push({ ...seg, speed: factor }); continue }
    if (rs <= seg.start) {
      out.push({ ...seg, end: re, speed: factor })
      out.push({ ...seg, start: re })
      continue
    }
    if (re >= seg.end) {
      out.push({ ...seg, end: rs })
      out.push({ ...seg, start: rs, speed: factor })
      continue
    }
    out.push({ ...seg, end: rs })
    out.push({ start: rs, end: re, speed: factor })
    out.push({ ...seg, start: re })
  }
  return out
}

/* ── Summary helpers for the history panel ───────────────── */

const OP_ICONS: Partial<Record<string, string>> = {
  trim:           '✂️',
  speed_ramp:     '⚡',
  caption_style:  '🎨',
  caption_edit:   '✏️',
  caption_timing: '⏱️',
  caption_filter: '🔍',
  text_overlay:   '📝',
  audio_mix:      '🔊',
  music_swap:     '🎵',
  zoom_punch:     '🔎',
}

export function opToEnglish(op: EditOp): string {
  const icon = OP_ICONS[op.op] ?? '•'
  switch (op.op) {
    case 'trim':           return `${icon} Cut ${fmt(op.start)}–${fmt(op.end)}`
    case 'speed_ramp':     return `${icon} Speed ×${op.factor} on ${fmt(op.segment[0])}–${fmt(op.segment[1])}`
    case 'caption_style':  return `${icon} Captions → ${[op.size, op.color, op.pos, op.font].filter(Boolean).join(', ')}`
    case 'caption_edit':   return `${icon} Caption #${op.index + 1} → "${op.text.slice(0, 30)}${op.text.length > 30 ? '…' : ''}"`
    case 'caption_timing': return `${icon} Caption #${op.index + 1} timing → ${fmt(op.start)}–${fmt(op.end)}`
    case 'caption_filter': return `${icon} Captions: ${op.mode}`
    case 'text_overlay':   return `${icon} Overlay "${op.text.slice(0, 24)}…" at ${typeof op.at === 'number' ? fmt(op.at) : op.at}`
    case 'audio_mix':      return `${icon} Voice ${Math.round(op.voiceVolume * 100)}%, Music ${Math.round(op.musicVolume * 100)}%`
    case 'music_swap':     return `${icon} Music → ${op.track}`
    case 'zoom_punch':     return `${icon} Zoom ×${op.scale} at ${fmt(op.at)}`
    case 'clarify':        return `💬 ${op.question}`
    case 'interpret':      return `💡 ${op.message}`
    case 'unsupported':    return `⚠️ "${op.instruction}" — ${op.suggestion}`
    default:               return `• ${(op as EditOp).op}`
  }
}

function fmt(s: number): string {
  const m = Math.floor(s / 60), sec = Math.round(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/* ── Test cases (10 covering all instruction categories) ─── */
// Run by: import TEST_CASES from '@/lib/editPlan' and pass each through the API

export const TEST_CASES = [
  // 1. Trimming — explicit
  { id: 1, category: 'trim',    prompt: 'cut the first 3 seconds',           expect: 'trim op {start:0, end:3}' },
  // 2. Trimming — vague
  { id: 2, category: 'trim',    prompt: 'tighten all the pauses',            expect: 'interpret + multiple trim ops on pauses >0.8s' },
  // 3. Captions — style
  { id: 3, category: 'captions', prompt: 'make the captions bigger and yellow', expect: 'caption_style {size:"lg", color:"#FFD400"}' },
  // 4. Captions — filter
  { id: 4, category: 'captions', prompt: 'only show captions on key phrases',   expect: 'caption_filter {mode:"key_phrases"}' },
  // 5. Captions — position
  { id: 5, category: 'captions', prompt: 'move captions to the top',            expect: 'caption_style {pos:"top"}' },
  // 6. Pacing — speed
  { id: 6, category: 'pacing',  prompt: 'make it faster paced',              expect: 'interpret + speed_ramp {factor:1.15} on middle segments' },
  // 7. Text overlay
  { id: 7, category: 'overlay', prompt: 'put a call-to-action at 0:12',      expect: 'text_overlay {at:12, style:"cta"}' },
  // 8. Audio
  { id: 8, category: 'audio',   prompt: 'lower the music under my voice',    expect: 'audio_mix {voiceVolume:1.0, musicVolume:0.2}' },
  // 9. Ambiguous — triggers clarify
  { id: 9, category: 'ambiguous', prompt: 'make it better',                  expect: 'clarify op asking what to improve' },
  // 10. Invalid/unsupported
  { id: 10, category: 'unsupported', prompt: 'add a green screen background', expect: 'unsupported op with suggestion' },
] as const
