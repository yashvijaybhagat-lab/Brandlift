'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { put } from '@vercel/blob/client'
import { useBetaAccess } from '@/lib/betaAccess'
import { getDebugMode, setDebugMode, subscribeDebug } from '@/lib/debugMode'

const LYRA_SESSION_KEY = 'bl_lyra_session'

/* ─── Types ─────────────────────────────────────────────── */
interface Attachment { name: string; url: string; type: string }
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
  usedSearch?: boolean
  error?: boolean
  model?: string
  ms?: number
}

/* ─── Quick actions ─────────────────────────────────────── */
const QUICK_ACTIONS = [
  { emoji: '💡', label: 'Content ideas',   prompt: 'Give me 5 viral video content ideas for a small business on TikTok' },
  { emoji: '✍️', label: 'Write a script',  prompt: 'Write a 30-second TikTok script to promote my local business' },
  { emoji: '🔥', label: 'Hook ideas',      prompt: 'Give me 5 scroll-stopping video opening hooks for my business' },
  { emoji: '⏰', label: 'Best post times', prompt: 'When is the best time to post on TikTok, Instagram, and YouTube?' },
  { emoji: '#',  label: 'Hashtag strategy',prompt: 'What hashtag strategy should I use to grow my business account fastest?' },
  { emoji: '🚀', label: 'Grow faster',     prompt: 'How can I grow my social media following 10x faster as a small business?' },
]

/* ─── Markdown renderer ─────────────────────────────────── */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      elements.push(
        <pre key={`code-${i}`} style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', overflowX: 'auto', margin: '6px 0' }}>
          <code style={{ fontSize: 12, color: '#a5b4fc', fontFamily: 'monospace', lineHeight: 1.6 }}>{codeLines.join('\n')}</code>
        </pre>
      )
      i++; continue
    }

    if (line.startsWith('### ')) { elements.push(<p key={i} style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA', margin: '8px 0 2px', letterSpacing: '-0.01em' }}>{inlineRender(line.slice(4))}</p>); i++; continue }
    if (line.startsWith('## '))  { elements.push(<p key={i} style={{ fontSize: 13, fontWeight: 700, color: '#FAFAFA', margin: '8px 0 2px', letterSpacing: '-0.02em' }}>{inlineRender(line.slice(3))}</p>); i++; continue }
    if (line.startsWith('# '))   { elements.push(<p key={i} style={{ fontSize: 14, fontWeight: 800, color: '#FAFAFA', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>{inlineRender(line.slice(2))}</p>); i++; continue }
    if (line === '---' || line === '***') { elements.push(<hr key={i} style={{ border: 'none', borderTop: '0.5px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />); i++; continue }

    if (line.match(/^[-*•] /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*•] /)) { items.push(lines[i].replace(/^[-*•] /, '')); i++ }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: '4px 0', paddingLeft: 0, listStyle: 'none' }}>
          {items.map((item, j) => (
            <li key={j} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 3 }}>
              <span style={{ color: '#6366f1', fontSize: 12, marginTop: 2, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.6 }}>{inlineRender(item)}</span>
            </li>
          ))}
        </ul>
      ); continue
    }

    if (line.match(/^\d+\. /)) {
      const items: string[] = []
      let num = 1
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      elements.push(
        <ol key={`ol-${i}`} style={{ margin: '4px 0', paddingLeft: 0, listStyle: 'none' }}>
          {items.map((item, j) => (
            <li key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', minWidth: 16, marginTop: 2, flexShrink: 0 }}>{num++}.</span>
              <span style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.6 }}>{inlineRender(item)}</span>
            </li>
          ))}
        </ol>
      ); continue
    }

    if (line.trim() === '') { if (elements.length > 0) elements.push(<div key={`sp-${i}`} style={{ height: 4 }} />); i++; continue }

    elements.push(<p key={i} style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.65, margin: '1px 0' }}>{inlineRender(line)}</p>)
    i++
  }

  return <>{elements}</>
}

function inlineRender(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch   = remaining.match(/\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/\*(.+?)\*/)
    const codeMatch   = remaining.match(/`(.+?)`/)
    const linkMatch   = remaining.match(/\[(.+?)\]\((.+?)\)/)

    const candidates = [
      boldMatch   && { idx: boldMatch.index!,   len: boldMatch[0].length,   node: <strong key={key++} style={{ color: '#FAFAFA', fontWeight: 700 }}>{boldMatch[1]}</strong> },
      italicMatch && { idx: italicMatch.index!, len: italicMatch[0].length, node: <em key={key++} style={{ color: '#c4b5fd', fontStyle: 'italic' }}>{italicMatch[1]}</em> },
      codeMatch   && { idx: codeMatch.index!,   len: codeMatch[0].length,   node: <code key={key++} style={{ background: '#18181C', color: '#a5b4fc', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{codeMatch[1]}</code> },
      linkMatch   && { idx: linkMatch.index!,   len: linkMatch[0].length,   node: <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>{linkMatch[1]}</a> },
    ].filter(Boolean) as { idx: number; len: number; node: React.ReactNode }[]

    if (candidates.length === 0) { parts.push(remaining); break }
    const first = candidates.reduce((a, b) => a.idx <= b.idx ? a : b)
    if (first.idx > 0) parts.push(remaining.slice(0, first.idx))
    parts.push(first.node)
    remaining = remaining.slice(first.idx + first.len)
  }

  return <>{parts}</>
}

/* ─── Lyra icon ─────────────────────────────────────────── */
function LyraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lyra-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="5"  r="1.5" fill="url(#lyra-g)" />
      <circle cx="7"  cy="10" r="1.2" fill="url(#lyra-g)" />
      <circle cx="17" cy="10" r="1.2" fill="url(#lyra-g)" />
      <circle cx="9"  cy="17" r="1.2" fill="url(#lyra-g)" />
      <circle cx="15" cy="17" r="1.2" fill="url(#lyra-g)" />
      <circle cx="12" cy="20" r="1.5" fill="#8b5cf6" opacity="0.7" />
      <line x1="12" y1="5"  x2="7"  y2="10" stroke="url(#lyra-g)" strokeWidth="0.9" opacity="0.6" />
      <line x1="12" y1="5"  x2="17" y2="10" stroke="url(#lyra-g)" strokeWidth="0.9" opacity="0.6" />
      <line x1="7"  y1="10" x2="9"  y2="17" stroke="url(#lyra-g)" strokeWidth="0.9" opacity="0.6" />
      <line x1="17" y1="10" x2="15" y2="17" stroke="url(#lyra-g)" strokeWidth="0.9" opacity="0.6" />
      <line x1="9"  y1="17" x2="12" y2="20" stroke="url(#lyra-g)" strokeWidth="0.9" opacity="0.5" />
      <line x1="15" y1="17" x2="12" y2="20" stroke="url(#lyra-g)" strokeWidth="0.9" opacity="0.5" />
    </svg>
  )
}

/* ─── Typing dots ───────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `lyra-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  )
}

/* ─── Attachment card ───────────────────────────────────── */
function AttachmentCard({ att, onRemove }: { att: Attachment; onRemove?: () => void }) {
  const icon = att.type.startsWith('image/') ? '🖼️' : att.type.startsWith('video/') ? '🎬' : att.type === 'application/pdf' ? '📄' : '📎'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.2)', maxWidth: 220 }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#a5b4fc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textDecoration: 'none' }} title={att.name}>
        {att.name.length > 24 ? `${att.name.slice(0, 22)}…` : att.name}
      </a>
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, fontSize: 15 }}>×</button>
      )}
    </div>
  )
}

/* ─── Video compression ─────────────────────────────────── */
const VIDEO_COMPRESS_THRESHOLD = 25 * 1024 * 1024 // 25 MB

async function compressVideo(file: File, onStatus: (msg: string) => void): Promise<File> {
  if (file.size <= VIDEO_COMPRESS_THRESHOLD) return file
  if (typeof window === 'undefined') return file

  const testEl = document.createElement('video')
  const hasCaptureStream = 'captureStream' in testEl || 'mozCaptureStream' in testEl
  if (!hasCaptureStream) return file

  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m))
  if (!mimeType) return file

  return new Promise<File>(resolve => {
    const url   = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src     = url
    video.muted   = false
    video.preload = 'auto'

    video.onloadedmetadata = () => {
      onStatus('Compressing…')
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream: MediaStream = (video as any).captureStream?.() ?? (video as any).mozCaptureStream?.()
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 1_200_000,
          audioBitsPerSecond: 96_000,
        })
        const chunks: Blob[] = []
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
        recorder.onstop = () => {
          URL.revokeObjectURL(url)
          const blob = new Blob(chunks, { type: mimeType })
          onStatus('')
          resolve(blob.size > 0 && blob.size < file.size
            ? new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), { type: mimeType })
            : file)
        }
        recorder.onerror = () => { URL.revokeObjectURL(url); onStatus(''); resolve(file) }
        recorder.start(200)
        video.play().catch(() => recorder.stop())
        video.onended = () => recorder.stop()
        video.onerror = () => recorder.stop()
      } catch { URL.revokeObjectURL(url); onStatus(''); resolve(file) }
    }
    video.onerror = () => { URL.revokeObjectURL(url); onStatus(''); resolve(file) }
  })
}

/* ─── Main component ────────────────────────────────────── */
export function LyraChat() {
  const beta = useBetaAccess()
  const [open,      setOpen]      = useState(false)
  const [visible,   setVisible]   = useState(true)
  const [expanded,  setExpanded]  = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [webSearch, setWebSearch] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [compressStatus, setCompressStatus] = useState('')
  const [pendingAtts, setPendingAtts] = useState<Attachment[]>([])
  const [copied,    setCopied]    = useState<string | null>(null)
  const [hasNewMsg, setHasNewMsg] = useState(false)
  const [debugMode, setDebugModeState] = useState(false)

  useEffect(() => {
    setDebugModeState(getDebugMode())
    return subscribeDebug(setDebugModeState)
  }, [])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const abortRef       = useRef<AbortController | null>(null)

  const panelW = expanded ? 520 : 380
  const panelH = expanded ? 600 : 520

  useEffect(() => { if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  const uploadFile = useCallback(async (file: File): Promise<Attachment | null> => {
    setUploading(true)
    try {
      const tokenRes = await fetch(`/api/chat/upload?filename=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type)}`)
      if (!tokenRes.ok) return null
      const { clientToken, pathname } = await tokenRes.json()
      const blob = await put(pathname, file, { access: 'public', token: clientToken })
      return { name: file.name, url: blob.url, type: file.type }
    } catch { return null }
    finally { setUploading(false) }
  }, [])

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const file of files) {
      const toUpload = file.type.startsWith('video/')
        ? await compressVideo(file, setCompressStatus)
        : file
      const att = await uploadFile(toUpload)
      if (att) setPendingAtts(prev => [...prev, att])
    }
  }, [uploadFile])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content && pendingAtts.length === 0) return
    if (streaming) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: content || '(attached file)', attachments: pendingAtts.length > 0 ? [...pendingAtts] : undefined }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', usedSearch: webSearch }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput(''); setPendingAtts([]); setStreaming(true)

    const history = messages.slice(-20).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    let pageContext = ''
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path.includes('/videos')) pageContext = 'User is in the Video Studio'
      else if (path.includes('/dashboard')) pageContext = 'User is on the Dashboard home page'
      else if (path.includes('/settings')) pageContext = 'User is in Settings'
      else if (path.includes('/website')) pageContext = 'User is on the My Website page'
      else if (path === '/' || path.includes('/home')) pageContext = 'User is on the BrandLift marketing homepage'
      else if (path.includes('/sign-in') || path.includes('/sign-up')) pageContext = 'User is on the authentication page'
    }

    // Founder session overrides
    let founderOverrides: Record<string, unknown> = {}
    if (beta.isOwner) {
      try {
        const sess = JSON.parse(localStorage.getItem(LYRA_SESSION_KEY) ?? '{}')
        if (sess.model)        founderOverrides.model        = sess.model
        if (sess.maxTokens)    founderOverrides.maxTokens    = sess.maxTokens
        if (sess.customSystem) founderOverrides.customSystem = sess.customSystem
      } catch {}
    }

    const ctrl = new AbortController()
    abortRef.current = ctrl
    const startMs = Date.now()

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (beta.isOwner && beta.code) headers['x-founder-code'] = beta.code

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content || `I uploaded: ${pendingAtts.map(a => a.name).join(', ')}`,
          history,
          attachments: userMsg.attachments,
          webSearch,
          pageContext,
          ...founderOverrides,
        }),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error('Chat API error')

      const usedModel = res.headers.get('X-Model') ?? undefined
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value, { stream: true })
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk, model: usedModel } : m))
      }
      const elapsed = Date.now() - startMs
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, ms: elapsed } : m))
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: 'Something went wrong — please try again.', error: true } : m))
    } finally {
      setStreaming(false)
      abortRef.current = null
      if (!open) setHasNewMsg(true)
    }
  }, [input, pendingAtts, streaming, messages, webSearch, open, beta])

  const stop  = () => { abortRef.current?.abort(); setStreaming(false) }
  const clear = () => { setMessages([]); setPendingAtts([]) }

  const copyMsg = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const retry = useCallback((idx: number) => {
    const userMsg = messages[idx - 1]
    if (!userMsg || userMsg.role !== 'user') return
    setMessages(prev => prev.slice(0, idx))
    send(userMsg.content)
  }, [messages, send])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const hide = () => { setOpen(false); setVisible(false) }
  const show = () => { setVisible(true) }

  const isEmpty = messages.length === 0

  return (
    <>
      {/* ── Keyframes ──────────────────────────────────────── */}
      <style>{`
        @keyframes lyra-dot   { 0%,80%,100%{opacity:.3;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }
        @keyframes lyra-in    { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes lyra-tab   { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes lyra-badge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
        @keyframes lyra-ring  { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.9);opacity:0} }
        @keyframes lyra-label { 0%,100%{opacity:1;transform:translateX(0)} 50%{opacity:.85;transform:translateX(-1px)} }
        .lyra-panel { animation: lyra-in .22s cubic-bezier(.34,1.56,.64,1) forwards; }
        .lyra-tab   { animation: lyra-tab .2s ease forwards; }
        .lyra-hover-actions { opacity: 0 !important; }
        .lyra-msg:hover .lyra-hover-actions { opacity: 1 !important; }
        .lyra-btn:hover .lyra-label-pill { opacity: 1 !important; transform: translateX(0) !important; }
      `}</style>

      {/* ── Pull tab — shown when Lyra is hidden ──────────── */}
      {!visible && (
        <button
          onClick={show}
          className="lyra-tab"
          aria-label="Show Lyra AI"
          title="Show Lyra"
          style={{
            position: 'fixed', bottom: 80, right: 0, zIndex: 9001,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 10px 10px 12px',
            background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
            border: 'none',
            borderRadius: '12px 0 0 12px',
            cursor: 'pointer',
            boxShadow: '-4px 4px 20px rgba(99,102,241,0.35)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.paddingRight = '14px' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.paddingRight = '10px' }}
        >
          {/* New message dot */}
          {hasNewMsg && (
            <div style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', border: '1.5px solid #6366f1', animation: 'lyra-badge 1s ease infinite' }} />
          )}
          <LyraIcon size={16} />
          {/* Arrow pointing left (into view) */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1L3 5l4 4"/>
          </svg>
        </button>
      )}

      {/* ── Floating button — shown when visible ──────────── */}
      {visible && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>

          {/* Hide arrow — sits above main button */}
          <button
            onClick={hide}
            title="Hide Lyra"
            aria-label="Hide Lyra"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px 4px 8px',
              background: 'rgba(10,10,11,0.85)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              cursor: 'pointer',
              color: '#52525B',
              fontSize: 11,
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.color = '#A1A1AA'
              b.style.borderColor = 'rgba(255,255,255,0.18)'
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.color = '#52525B'
              b.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            {/* Arrow pointing right (to hide) */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 1l4 4-4 4"/>
            </svg>
            Hide Lyra
          </button>

          {/* Main Lyra button */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

            {/* "Lyra AI" label — peeks out to the left on hover */}
            {!open && (
              <div className="lyra-label-pill" style={{
                position: 'absolute', right: 70,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px',
                background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
                borderRadius: 24,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                opacity: 0,
                transform: 'translateX(8px)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
              }}>
                <LyraIcon size={13} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Lyra AI</span>
              </div>
            )}

            {/* Pulsing rings — only when closed */}
            {!open && (
              <>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(99,102,241,0.35)', animation: 'lyra-ring 2s ease-out infinite', zIndex: -1 }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(139,92,246,0.25)', animation: 'lyra-ring 2s ease-out 0.6s infinite', zIndex: -1 }} />
              </>
            )}

            <button
              className="lyra-btn"
              onClick={() => { setOpen(p => !p); setHasNewMsg(false) }}
              aria-label="Open Lyra AI assistant"
              style={{
                width: 60, height: 60, borderRadius: '50%',
                background: open
                  ? 'rgba(99,102,241,0.15)'
                  : 'linear-gradient(135deg,#5254f0 0%,#7c3aed 100%)',
                border: open
                  ? '1px solid rgba(99,102,241,0.4)'
                  : '2px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: open
                  ? '0 4px 24px rgba(99,102,241,0.2)'
                  : '0 8px 32px rgba(99,102,241,0.55), 0 2px 8px rgba(0,0,0,0.4)',
                transition: 'all 0.2s cubic-bezier(.34,1.56,.64,1)',
                position: 'relative',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            >
              {open
                ? <span style={{ fontSize: 22, color: '#a5b4fc', lineHeight: 1 }}>×</span>
                : <LyraIcon size={28} />
              }
              {/* New message badge */}
              {hasNewMsg && !open && (
                <div style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, borderRadius: '50%', background: '#4ADE80', border: '2px solid #0A0A0B', animation: 'lyra-badge 1s ease infinite' }} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Chat panel ────────────────────────────────────── */}
      {open && visible && (
        <div
          className="lyra-panel"
          style={{
            position: 'fixed', bottom: 88, right: 24, zIndex: 8999,
            width: panelW, height: panelH,
            display: 'flex', flexDirection: 'column',
            background: 'rgba(10,10,11,0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
            overflow: 'hidden',
            transition: 'width 0.2s ease, height 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'rgba(99,102,241,0.04)', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,rgba(99,102,241,0.2) 0%,rgba(139,92,246,0.2) 100%)', border: '0.5px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LyraIcon size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.02em' }}>Lyra</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', letterSpacing: '0.08em', padding: '1px 5px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.25)', textTransform: 'uppercase' }}>AI</span>
              </div>
              <p style={{ fontSize: 10, color: '#52525B', marginTop: 0 }}>BrandLift co-pilot · Gemini powered</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {messages.length > 0 && (
                <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 7px', borderRadius: 6, color: '#3f3f46', fontSize: 11 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#71717A' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3f3f46' }}>
                  Clear
                </button>
              )}
              {/* Expand/collapse */}
              <button onClick={() => setExpanded(p => !p)} title={expanded ? 'Shrink' : 'Expand'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3f3f46', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3f3f46' }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  {expanded
                    ? <><path d="M5 5l6 6M11 5l-6 6"/></>
                    : <><path d="M2 5h12M2 8h12M2 11h12"/></>
                  }
                </svg>
              </button>
              {/* Hide (arrow pointing right) */}
              <button onClick={hide} title="Hide Lyra"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3f3f46', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3f3f46' }}>
                <svg width="13" height="13" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 1l4 4-4 4"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Debug mode banner — only for founders */}
          {beta.isOwner && debugMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'rgba(99,102,241,0.08)', borderBottom: '0.5px solid rgba(99,102,241,0.2)', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#6366f1', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3, background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.3)' }}>DEBUG ON</span>
              <span style={{ fontSize: 10, color: '#52525B', flex: 1 }}>Model · latency · tokens shown per message</span>
              <button onClick={() => setDebugMode(false)} style={{ fontSize: 10, color: '#52525B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ off</button>
            </div>
          )}
          {/* Debug toggle for founders when debug is off */}
          {beta.isOwner && !debugMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
              <button onClick={() => setDebugMode(true)}
                style={{ fontSize: 10, color: '#3f3f46', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525B' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3f3f46' }}>
                ◎ debug
              </button>
            </div>
          )}

          {/* Web search toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', background: webSearch ? 'rgba(99,102,241,0.03)' : 'transparent', flexShrink: 0 }}>
            <button onClick={() => setWebSearch(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: webSearch ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${webSearch ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`, color: webSearch ? '#a5b4fc' : '#52525B', cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Web search {webSearch ? 'on' : 'off'}
            </button>
            {webSearch && <span style={{ fontSize: 10, color: '#3f3f46' }}>Searching the web for current info</span>}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {isEmpty && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, paddingBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 12px', background: 'linear-gradient(135deg,rgba(99,102,241,0.15) 0%,rgba(139,92,246,0.15) 100%)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LyraIcon size={26} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.02em' }}>Hey, I&apos;m Lyra</p>
                  <p style={{ fontSize: 12, color: '#52525B', marginTop: 4, lineHeight: 1.5 }}>Your BrandLift AI co-pilot.<br/>Ask me anything or pick a starting point.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: '100%' }}>
                  {QUICK_ACTIONS.map(q => (
                    <button key={q.label} onClick={() => { setInput(q.prompt); send(q.prompt) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, textAlign: 'left', background: '#111113', border: '0.5px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(99,102,241,0.35)'; b.style.background = 'rgba(99,102,241,0.06)' }}
                      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(255,255,255,0.07)'; b.style.background = '#111113' }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{q.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', lineHeight: 1.3 }}>{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={msg.id} className="lyra-msg" style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 2, background: 'linear-gradient(135deg,rgba(99,102,241,0.2) 0%,rgba(139,92,246,0.2) 100%)', border: '0.5px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LyraIcon size={14} />
                  </div>
                )}
                <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ padding: msg.role === 'user' ? '8px 12px' : '10px 12px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,rgba(99,102,241,0.22) 0%,rgba(139,92,246,0.18) 100%)' : '#111113', border: msg.role === 'user' ? '0.5px solid rgba(99,102,241,0.3)' : msg.error ? '0.5px solid rgba(239,68,68,0.25)' : '0.5px solid rgba(255,255,255,0.07)' }}>
                    {msg.role === 'assistant' && msg.usedSearch && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <span style={{ fontSize: 10, color: '#3f3f46' }}>Searched the web</span>
                      </div>
                    )}
                    {msg.role === 'user'
                      ? <p style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                      : msg.content ? <MarkdownText text={msg.content} /> : <TypingDots />
                    }
                    {msg.role === 'assistant' && streaming && messages[messages.length - 1]?.id === msg.id && msg.content && (
                      <span style={{ display: 'inline-block', width: 2, height: 14, background: '#6366f1', borderRadius: 1, marginLeft: 2, verticalAlign: 'text-bottom', animation: 'lyra-dot 0.8s ease-in-out infinite' }} />
                    )}
                  </div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {msg.attachments.map((att, j) => <AttachmentCard key={j} att={att} />)}
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.content && !streaming && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {debugMode && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '4px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.06)', border: '0.5px solid rgba(99,102,241,0.15)' }}>
                          <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: '#a5b4fc' }}>
                            {msg.model ?? 'gemini-2.5-flash-lite'}
                          </span>
                          <span style={{ fontSize: 9, color: '#3f3f46' }}>·</span>
                          <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#52525B' }}>
                            {msg.ms ? `${msg.ms}ms` : '—'}
                          </span>
                          <span style={{ fontSize: 9, color: '#3f3f46' }}>·</span>
                          <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#52525B' }}>
                            ~{Math.ceil(msg.content.length / 4)} tok out
                          </span>
                        </div>
                      )}
                      <div className="lyra-hover-actions" style={{ display: 'flex', gap: 6, transition: 'opacity 0.15s' }}>
                        <button onClick={() => copyMsg(msg.id, msg.content)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, background: 'none', border: '0.5px solid rgba(255,255,255,0.07)', color: '#52525B', cursor: 'pointer', fontSize: 10 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525B' }}>
                          {copied === msg.id ? '✓ Copied' : 'Copy'}
                        </button>
                        {msg.error && (
                          <button onClick={() => retry(idx)}
                            style={{ padding: '2px 7px', borderRadius: 6, background: 'none', border: '0.5px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontSize: 10 }}>
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Pending attachments */}
          {pendingAtts.length > 0 && (
            <div style={{ padding: '6px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '0.5px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              {pendingAtts.map((att, i) => <AttachmentCard key={i} att={att} onRemove={() => setPendingAtts(prev => prev.filter((_, j) => j !== i))} />)}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '0.5px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '8px 10px', background: '#111113', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 14, transition: 'border-color 0.15s' }}
              onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.4)' }}
              onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.09)' }}>
              {/* Attach / compress status */}
              {compressStatus ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 4px', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" style={{ animation: 'lyra-dot 1s ease infinite' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>{compressStatus}</span>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Attach file"
                  style={{ background: 'none', border: 'none', cursor: uploading ? 'default' : 'pointer', color: uploading ? '#6366f1' : '#3f3f46', padding: '2px 4px', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA' }}
                  onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.color = '#3f3f46' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: uploading ? 'lyra-dot 1s ease infinite' : 'none' }}>
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
              )}
              {/* Textarea */}
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask Lyra anything…" rows={1}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#E4E4E7', fontSize: 13, lineHeight: 1.5, resize: 'none', fontFamily: 'inherit', maxHeight: 120, overflowY: 'auto' }}
                onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px` }} />
              {/* Send / stop */}
              {streaming ? (
                <button onClick={stop} title="Stop" style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                </button>
              ) : (
                <button onClick={() => send()} disabled={!input.trim() && pendingAtts.length === 0}
                  style={{ width: 30, height: 30, borderRadius: 8, background: input.trim() || pendingAtts.length > 0 ? 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)' : '#18181C', border: 'none', cursor: input.trim() || pendingAtts.length > 0 ? 'pointer' : 'default', color: input.trim() || pendingAtts.length > 0 ? '#fff' : '#3f3f46', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxShadow: input.trim() ? '0 2px 12px rgba(99,102,241,0.35)' : 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              )}
            </div>
            <p style={{ fontSize: 10, color: '#27272a', textAlign: 'center', marginTop: 6 }}>Enter to send · Shift+Enter for newline · attach images, videos &amp; docs</p>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,application/pdf,text/plain,.csv" style={{ display: 'none' }} onChange={onFileChange} />
    </>
  )
}
