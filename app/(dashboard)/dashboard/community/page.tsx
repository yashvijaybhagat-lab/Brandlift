'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { TopBar } from '@/components/dashboard/TopBar'
import {
  Heart, MessageCircle, Send, Play, Pause, VolumeX, Volume2,
  Users, Rss, ArrowLeft, MoreVertical, Trash2, Search, ChevronRight,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Types ───────────────────────────────────────────── */

interface CommunityPost {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  businessName?: string
  videoUrl: string
  caption?: string
  script?: string
  likeCount: number
  likedBy: string[]
  sharedAt: number
}

interface Conversation {
  userId: string
  userName: string
  lastMessage: string
  lastAt: number
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  sentAt: number
}

type Tab = 'feed' | 'messages'

/* ─── Helpers ────────────────────────────────────────── */

function timeAgo(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000) return 'just now'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

/* ─── Avatar ─────────────────────────────────────────── */

function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444']
  const color = colors[name.charCodeAt(0) % colors.length]
  return src ? (
    <img src={src} alt={name} width={size} height={size}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0,
      border: '2px solid rgba(255,255,255,0.2)',
    }}>
      {initials(name)}
    </div>
  )
}

/* ─── TikTok Video Slide ─────────────────────────────── */

function VideoSlide({
  post, currentUserEmail, onLike, onMessage, onDelete, index, total, scrollRef,
}: {
  post: CommunityPost
  currentUserEmail: string
  onLike: (id: string) => void
  onMessage: (userId: string, userName: string) => void
  onDelete: (id: string) => void
  index: number
  total: number
  scrollRef: React.RefObject<HTMLDivElement>
}) {
  const slideRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const liked = post.likedBy.includes(currentUserEmail)
  const isOwn = post.userId === currentUserEmail

  // Auto-play when scrolled into view
  useEffect(() => {
    const slide = slideRef.current
    const video = videoRef.current
    if (!slide || !video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setPlaying(true)).catch(() => {})
        } else {
          video.pause()
          setPlaying(false)
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(slide)
    return () => observer.disconnect()
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play().catch(() => {}); setPlaying(true) }
  }

  const scrollTo = (dir: 'up' | 'down') => {
    const container = scrollRef.current
    if (!container) return
    const h = container.clientHeight
    container.scrollBy({ top: dir === 'down' ? h : -h, behavior: 'smooth' })
  }

  const caption = post.caption || post.script || ''

  return (
    <div
      ref={slideRef}
      style={{
        height: '100%',
        flexShrink: 0,
        scrollSnapAlign: 'start',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        position: 'relative',
      }}
    >
      {/* ── Centered 9:16 video column ── */}
      <div style={{
        height: '100%',
        aspectRatio: '9 / 16',
        maxWidth: 420,
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
        background: '#111',
        flexShrink: 0,
      }}>
        <video
          ref={videoRef}
          src={post.videoUrl}
          muted={muted}
          loop
          playsInline
          onClick={togglePlay}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', cursor: 'pointer' }}
        />

        {/* Bottom gradient */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.05) 45%, transparent 65%)' }} />

        {/* Play indicator */}
        <AnimatePresence>
          {!playing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.2)' }}>
                <Play className="w-7 h-7 fill-white text-white" style={{ marginLeft: 4 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom info overlaid on video */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Avatar src={post.userAvatar} name={post.userName} size={28} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
              @{post.userName.replace(/\s+/g, '').toLowerCase()}
            </span>
            {post.businessName && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>· {post.businessName}</span>
            )}
          </div>
          {caption && (
            <p
              onClick={() => setCaptionExpanded(e => !e)}
              style={{
                fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, cursor: 'pointer',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                display: '-webkit-box', WebkitLineClamp: captionExpanded ? undefined : 2,
                WebkitBoxOrient: 'vertical', overflow: captionExpanded ? 'visible' : 'hidden',
              }}
            >
              {caption}
              {!captionExpanded && caption.length > 90 && (
                <span style={{ color: 'rgba(255,255,255,0.5)' }}> more</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ── Action sidebar (right of video) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '0 16px 60px 16px', minWidth: 72 }}>
        {/* Like */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <motion.button
            whileTap={{ scale: 1.3 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={() => onLike(post.id)}
            style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Heart className="w-5 h-5" style={{ color: liked ? '#ef4444' : '#fff', fill: liked ? '#ef4444' : 'none', transition: 'all 0.2s' }} />
          </motion.button>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{post.likeCount}</span>
        </div>

        {/* Message */}
        {!isOwn && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <button
              onClick={() => onMessage(post.userId, post.userName)}
              style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </button>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>DM</span>
          </div>
        )}

        {/* Mute */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <button
            onClick={() => setMuted(m => !m)}
            style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </button>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{muted ? 'Muted' : 'Sound'}</span>
        </div>

        {/* More */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(s => !s)}
            style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                style={{ position: 'absolute', left: '110%', top: 0, background: 'rgba(18,18,24,0.97)', backdropFilter: 'blur(16px)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 6, minWidth: 155, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 20 }}
                onMouseLeave={() => setShowMenu(false)}
              >
                {isOwn ? (
                  <button onClick={() => { onDelete(post.id); setShowMenu(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
                    <Trash2 className="w-4 h-4" /> Remove post
                  </button>
                ) : (
                  <button onClick={() => { onMessage(post.userId, post.userName); setShowMenu(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                    <MessageCircle className="w-4 h-4" /> Send message
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timestamp */}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8, textAlign: 'center' }}>{timeAgo(post.sharedAt)}</span>
      </div>

      {/* ── Up/Down nav arrows (far right, like TikTok web) ── */}
      <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {index > 0 && (
          <button
            onClick={() => scrollTo('up')}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <ChevronUp className="w-5 h-5 text-white" />
          </button>
        )}
        {index < total - 1 && (
          <button
            onClick={() => scrollTo('down')}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Chat Window ────────────────────────────────────── */

function ChatWindow({
  userId, userName, currentUserEmail, currentUserName, currentUserAvatar, onBack,
}: {
  userId: string; userName: string
  currentUserEmail: string; currentUserName: string; currentUserAvatar?: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/messages/${encodeURIComponent(userId)}`)
      if (!res.ok) return
      const { thread } = await res.json()
      setMessages(thread.messages ?? [])
    } catch {} finally { setLoading(false) }
  }, [userId])

  useEffect(() => {
    loadMessages()
    pollRef.current = setInterval(loadMessages, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`, senderId: currentUserEmail, senderName: currentUserName,
      senderAvatar: currentUserAvatar, content: text, sentAt: Date.now(),
    }
    setMessages(prev => [...prev, optimistic])
    try {
      await fetch(`/api/community/messages/${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, recipientName: userName }),
      })
      await loadMessages()
    } catch {} finally { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 8 }}>
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <Avatar name={userName} size={32} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{userName}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
            <MessageCircle className="w-10 h-10" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Say hello to {userName}</p>
          </div>
        ) : messages.map(msg => {
          const isMine = msg.senderId === currentUserEmail
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
              {!isMine && <Avatar name={msg.senderName} src={msg.senderAvatar} size={26} />}
              <div style={{ maxWidth: '70%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMine ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-surface-elevated)',
                  border: isMine ? 'none' : '0.5px solid var(--color-border)',
                  fontSize: 14, color: isMine ? '#fff' : 'var(--color-text)', lineHeight: 1.5,
                }}>
                  {msg.content}
                </div>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                  {timeAgo(msg.sentAt)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--color-border)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Message ${userName}…`}
          style={{ flex: 1, background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-surface-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}
        >
          <Send className="w-4 h-4" style={{ color: input.trim() ? '#fff' : 'var(--color-text-muted)' }} />
        </button>
      </div>
    </div>
  )
}

/* ─── Messages Tab ───────────────────────────────────── */

function MessagesTab({
  currentUserEmail, currentUserName, currentUserAvatar, initialUserId, initialUserName,
}: {
  currentUserEmail: string; currentUserName: string; currentUserAvatar?: string
  initialUserId?: string; initialUserName?: string
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeUserId, setActiveUserId] = useState<string | null>(initialUserId ?? null)
  const [activeUserName, setActiveUserName] = useState<string>(initialUserName ?? '')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/community/conversations')
      .then(r => r.json())
      .then(d => setConversations(d.conversations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = conversations.filter(c => c.userName.toLowerCase().includes(search.toLowerCase()))

  if (activeUserId) {
    return (
      <ChatWindow
        userId={activeUserId} userName={activeUserName}
        currentUserEmail={currentUserEmail} currentUserName={currentUserName} currentUserAvatar={currentUserAvatar}
        onBack={() => { setActiveUserId(null); setActiveUserName('') }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
            style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '9px 12px 9px 36px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.1)', border: '0.5px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle className="w-6 h-6" style={{ color: '#6366f1' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>No messages yet</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 260, lineHeight: 1.6 }}>
            Go to the Feed tab and tap Message on a video to start a conversation.
          </p>
        </div>
      ) : filtered.map(conv => (
        <button
          key={conv.userId}
          onClick={() => { setActiveUserId(conv.userId); setActiveUserName(conv.userName) }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid var(--color-border)', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Avatar name={conv.userName} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{conv.userName}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lastMessage}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{timeAgo(conv.lastAt)}</span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        </button>
      ))}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────── */

export default function CommunityPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('feed')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [msgUserId, setMsgUserId] = useState<string | undefined>()
  const [msgUserName, setMsgUserName] = useState<string | undefined>()
  const feedScrollRef = useRef<HTMLDivElement>(null)

  const currentEmail = session?.user?.email ?? ''
  const currentName = session?.user?.name ?? currentEmail.split('@')[0]
  const currentAvatar = session?.user?.image ?? undefined

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/community/posts')
      const { posts: data } = await res.json()
      setPosts(data ?? [])
    } catch {} finally { setFeedLoading(false) }
  }, [])

  useEffect(() => { loadFeed() }, [loadFeed])

  const handleLike = async (postId: string) => {
    if (!currentEmail) return
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const liked = p.likedBy.includes(currentEmail)
      return { ...p, likedBy: liked ? p.likedBy.filter(u => u !== currentEmail) : [...p.likedBy, currentEmail], likeCount: liked ? p.likeCount - 1 : p.likeCount + 1 }
    }))
    await fetch(`/api/community/posts/${postId}/like`, { method: 'POST' })
  }

  const handleDelete = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
    await fetch(`/api/community/posts?id=${postId}`, { method: 'DELETE' })
  }

  const handleMessage = (userId: string, userName: string) => {
    setMsgUserId(userId)
    setMsgUserName(userName)
    setTab('messages')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)', overflow: 'hidden' }}>
      {/* TopBar — hidden on feed tab to maximize video space */}
      {tab !== 'feed' && <TopBar />}

      {/* Tab bar — overlaid on feed, normal on messages */}
      <div style={{
        position: tab === 'feed' ? 'absolute' : 'relative',
        top: tab === 'feed' ? 0 : 'auto',
        left: tab === 'feed' ? 0 : 'auto',
        right: tab === 'feed' ? 0 : 'auto',
        zIndex: 30,
        display: 'flex',
        justifyContent: 'center',
        gap: 4,
        padding: tab === 'feed' ? '12px 0 0' : '0 20px',
        borderBottom: tab === 'feed' ? 'none' : '0.5px solid var(--color-border)',
        background: tab === 'feed' ? 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' : 'transparent',
        backdropFilter: tab === 'feed' ? 'none' : undefined,
      }}>
        {([
          { id: 'feed' as const, label: 'Feed', Icon: Rss },
          { id: 'messages' as const, label: 'Messages', Icon: MessageCircle },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: tab === 'feed' ? '6px 14px' : '10px 16px',
              borderRadius: tab === 'feed' ? 999 : '10px 10px 0 0',
              border: tab === 'feed' ? `1.5px solid ${id === tab ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}` : 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: tab === 'feed'
                ? (id === tab ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)')
                : 'none',
              color: tab === 'feed'
                ? (id === tab ? '#fff' : 'rgba(255,255,255,0.6)')
                : (id === tab ? 'var(--color-text)' : 'var(--color-text-muted)'),
              backdropFilter: tab === 'feed' ? 'blur(8px)' : undefined,
              borderBottom: tab !== 'feed' && id === tab ? '2px solid #6366f1' : (tab !== 'feed' ? '2px solid transparent' : undefined),
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <AnimatePresence mode="wait">
          {tab === 'feed' ? (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              {feedLoading ? (
                <div style={{ height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                          style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
                      ))}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Loading feed…</p>
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div style={{ height: '100%', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 32px', textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users className="w-8 h-8" style={{ color: '#6366f1' }} />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>Be the first to share</h2>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 300, lineHeight: 1.65 }}>
                    No community videos yet. Go to My Videos and click Share to add your first post to the feed.
                  </p>
                </div>
              ) : (
                /* TikTok scroll feed */
                <div ref={feedScrollRef} style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}>
                  {posts.map((post, i) => (
                    <VideoSlide
                      key={post.id}
                      post={post}
                      currentUserEmail={currentEmail}
                      onLike={handleLike}
                      onMessage={handleMessage}
                      onDelete={handleDelete}
                      index={i}
                      total={posts.length}
                      scrollRef={feedScrollRef as React.RefObject<HTMLDivElement>}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <MessagesTab
                currentUserEmail={currentEmail}
                currentUserName={currentName}
                currentUserAvatar={currentAvatar}
                initialUserId={msgUserId}
                initialUserName={msgUserName}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
