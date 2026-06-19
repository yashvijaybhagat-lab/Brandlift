'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { TopBar } from '@/components/dashboard/TopBar'
import {
  Heart, MessageCircle, Send, Play, VolumeX, Volume2,
  Users, Rss, ArrowLeft, Trash2, Search, ChevronRight,
  ChevronUp, ChevronDown, UserPlus, UserCheck, Eye, X,
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
  viewCount?: number
  sharedAt: number
}

interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  text: string
  postedAt: number
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
type FeedTab = 'foryou' | 'following'

/* ─── Helpers ────────────────────────────────────────── */

function timeAgo(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000) return 'just now'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

/* ─── Avatar ─────────────────────────────────────────── */

function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  const colors = ['#7C5CFF', '#A78BFA', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444']
  const color = colors[name.charCodeAt(0) % colors.length]
  return src ? (
    <img src={src} alt={name} width={size} height={size}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.25)' }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0, border: '2px solid rgba(255,255,255,0.25)' }}>
      {initials(name)}
    </div>
  )
}

/* ─── Comment Panel ──────────────────────────────────── */

function CommentPanel({ postId, currentUserEmail, currentUserName, currentUserAvatar, onClose }: {
  postId: string
  currentUserEmail: string
  currentUserName: string
  currentUserAvatar?: string
  onClose: () => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [posting, setPosting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/community/posts/${postId}/comments`)
      .then(r => r.json())
      .then(d => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [postId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  const submit = async () => {
    const text = input.trim()
    if (!text || posting) return
    setPosting(true)
    setInput('')
    const optimistic: Comment = {
      id: `opt-${Date.now()}`, userId: currentUserEmail, userName: currentUserName,
      userAvatar: currentUserAvatar, text, postedAt: Date.now(),
    }
    setComments(prev => [...prev, optimistic])
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const { comment } = await res.json()
        setComments(prev => [...prev.filter(c => !c.id.startsWith('opt-')), comment])
      }
    } catch {} finally { setPosting(false) }
  }

  const deleteComment = async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId))
    await fetch(`/api/community/posts/${postId}/comments?commentId=${commentId}`, { method: 'DELETE' })
  }

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
        background: 'rgba(14,14,20,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: '20px 20px 0 0', zIndex: 50,
        display: 'flex', flexDirection: 'column',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{comments.length} comments</p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
          <X className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>
      </div>

      {/* Comments list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#7C5CFF' }} />
              ))}
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, opacity: 0.5 }}>
            <MessageCircle className="w-8 h-8 text-white" />
            <p style={{ fontSize: 13, color: '#fff' }}>No comments yet — be first!</p>
          </div>
        ) : comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar src={c.userAvatar} name={c.userName} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{c.userName}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(c.postedAt)}</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>{c.text}</p>
            </div>
            {c.userId === currentUserEmail && (
              <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <Trash2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 16px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <Avatar src={currentUserAvatar} name={currentUserName} size={32} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Add a comment…"
          style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '9px 14px', fontSize: 13, color: '#fff', outline: 'none' }}
        />
        <button
          onClick={submit}
          disabled={!input.trim() || posting}
          style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', background: input.trim() ? 'linear-gradient(135deg,#7C5CFF,#A78BFA)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Video Slide ────────────────────────────────────── */

function VideoSlide({
  post, currentUserEmail, currentUserName, currentUserAvatar,
  following, onLike, onMessage, onDelete, onFollow, index, total, scrollRef, commentCount,
}: {
  post: CommunityPost
  currentUserEmail: string
  currentUserName: string
  currentUserAvatar?: string
  following: Set<string>
  onLike: (id: string) => void
  onMessage: (userId: string, userName: string) => void
  onDelete: (id: string) => void
  onFollow: (userId: string) => void
  index: number
  total: number
  scrollRef: React.RefObject<HTMLDivElement>
  commentCount: number
}) {
  const slideRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastTapRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const [viewSent, setViewSent] = useState(false)

  const liked = post.likedBy.includes(currentUserEmail)
  const isOwn = post.userId === currentUserEmail
  const isFollowing = following.has(post.userId)

  // Auto-play + view count
  useEffect(() => {
    const slide = slideRef.current
    const video = videoRef.current
    if (!slide || !video) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        video.play().then(() => setPlaying(true)).catch(() => {})
        if (!viewSent) {
          setViewSent(true)
          fetch(`/api/community/posts/${post.id}/view`, { method: 'POST' }).catch(() => {})
        }
      } else {
        video.pause()
        setPlaying(false)
      }
    }, { threshold: 0.6 })
    observer.observe(slide)
    return () => observer.disconnect()
  }, [post.id, viewSent])

  const handleTap = () => {
    const now = Date.now()
    const delta = now - lastTapRef.current
    lastTapRef.current = now
    if (delta < 300) {
      // Double tap — like + heart burst
      if (!liked) onLike(post.id)
      setHeartBurst(true)
      setTimeout(() => setHeartBurst(false), 900)
    } else {
      // Single tap — play/pause
      const v = videoRef.current
      if (!v) return
      if (playing) { v.pause(); setPlaying(false) }
      else { v.play().catch(() => {}); setPlaying(true) }
    }
  }

  const scrollTo = (dir: 'up' | 'down') => {
    const c = scrollRef.current
    if (!c) return
    c.scrollBy({ top: dir === 'down' ? c.clientHeight : -c.clientHeight, behavior: 'smooth' })
  }

  const caption = post.caption || post.script || ''

  return (
    <div
      ref={slideRef}
      style={{ height: '100%', flexShrink: 0, scrollSnapAlign: 'start', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      {/* 9:16 video column */}
      <div style={{ height: '100%', aspectRatio: '9 / 16', maxWidth: 420, minWidth: 0, position: 'relative', overflow: 'hidden', background: '#111', flexShrink: 0 }}>
        <video
          ref={videoRef} src={post.videoUrl} muted={muted} loop playsInline
          onClick={handleTap}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', cursor: 'pointer' }}
        />

        {/* Gradients */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)' }} />

        {/* Double-tap heart burst */}
        <AnimatePresence>
          {heartBurst && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1.1, 0.9] }}
              transition={{ duration: 0.8, times: [0, 0.2, 0.5, 1] }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              <Heart className="w-24 h-24 fill-white text-white" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.8))' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play indicator */}
        <AnimatePresence>
          {!playing && !heartBurst && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.2)' }}>
                <Play className="w-7 h-7 fill-white text-white" style={{ marginLeft: 3 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom info */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 12px 16px', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Avatar src={post.userAvatar} name={post.userName} size={28} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
              @{post.userName.replace(/\s+/g, '').toLowerCase()}
            </span>
            {post.businessName && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>· {post.businessName}</span>
            )}
          </div>
          {caption && (
            <p
              onClick={e => { e.stopPropagation(); setCaptionExpanded(v => !v) }}
              style={{
                fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5, pointerEvents: 'all', cursor: 'pointer',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                display: '-webkit-box', WebkitLineClamp: captionExpanded ? undefined : 2,
                WebkitBoxOrient: 'vertical', overflow: captionExpanded ? 'visible' : 'hidden',
              }}
            >
              {caption}
              {!captionExpanded && caption.length > 80 && <span style={{ color: 'rgba(255,255,255,0.45)' }}> more</span>}
            </p>
          )}
        </div>

        {/* Comment panel */}
        <AnimatePresence>
          {showComments && (
            <CommentPanel
              postId={post.id}
              currentUserEmail={currentUserEmail}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              onClose={() => setShowComments(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Action sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '0 14px 60px', minWidth: 68 }}>
        {/* Avatar + follow */}
        {!isOwn && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <div style={{ position: 'relative' }}>
              <Avatar src={post.userAvatar} name={post.userName} size={42} />
              <button
                onClick={() => onFollow(post.userId)}
                style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: isFollowing ? '#22c55e' : 'linear-gradient(135deg,#7C5CFF,#A78BFA)', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                {isFollowing
                  ? <UserCheck style={{ width: 10, height: 10, color: '#fff' }} />
                  : <span style={{ fontSize: 12, color: '#fff', fontWeight: 700, lineHeight: 1 }}>+</span>
                }
              </button>
            </div>
          </div>
        )}

        {/* Like */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <motion.button
            whileTap={{ scale: 1.35 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={() => onLike(post.id)}
            style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Heart className="w-5 h-5" style={{ color: liked ? '#ef4444' : '#fff', fill: liked ? '#ef4444' : 'none', transition: 'all 0.2s' }} />
          </motion.button>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{fmtCount(post.likeCount)}</span>
        </div>

        {/* Comments */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setShowComments(s => !s)}
            style={{ width: 46, height: 46, borderRadius: '50%', background: showComments ? 'rgba(124, 92, 255,0.3)' : 'rgba(255,255,255,0.08)', border: `1px solid ${showComments ? 'rgba(124, 92, 255,0.5)' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </button>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{fmtCount(commentCount)}</span>
        </div>

        {/* DM */}
        {!isOwn && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => onMessage(post.userId, post.userName)}
              style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Send className="w-5 h-5 text-white" />
            </button>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>DM</span>
          </div>
        )}

        {/* Views */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{fmtCount(post.viewCount ?? 0)}</span>
        </div>

        {/* Mute */}
        <button
          onClick={() => setMuted(m => !m)}
          style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>

        {/* Delete (own posts) */}
        {isOwn && (
          <button
            onClick={() => onDelete(post.id)}
            style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
          </button>
        )}

        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 4 }}>{timeAgo(post.sharedAt)}</span>
      </div>

      {/* Up/Down nav */}
      <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {index > 0 && (
          <button onClick={() => scrollTo('up')}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
            <ChevronUp className="w-5 h-5 text-white" />
          </button>
        )}
        {index < total - 1 && (
          <button onClick={() => scrollTo('down')}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
            <ChevronDown className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Chat Window ────────────────────────────────────── */

function ChatWindow({ userId, userName, currentUserEmail, currentUserName, currentUserAvatar, onBack }: {
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

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/messages/${encodeURIComponent(userId)}`)
      if (!res.ok) return
      const { thread } = await res.json()
      setMessages(thread.messages ?? [])
    } catch {} finally { setLoading(false) }
  }, [userId])

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [load])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    setMessages(prev => [...prev, { id: `opt-${Date.now()}`, senderId: currentUserEmail, senderName: currentUserName, senderAvatar: currentUserAvatar, content: text, sentAt: Date.now() }])
    try {
      await fetch(`/api/community/messages/${encodeURIComponent(userId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, recipientName: userName }),
      })
      await load()
    } catch {} finally { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <Avatar name={userName} size={32} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{userName}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C5CFF' }} />)}
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
                <div style={{ padding: '10px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMine ? 'linear-gradient(135deg,#7C5CFF,#A78BFA)' : 'var(--color-surface-elevated)', border: isMine ? 'none' : '0.5px solid var(--color-border)', fontSize: 14, color: isMine ? '#fff' : 'var(--color-text)', lineHeight: 1.5 }}>
                  {msg.content}
                </div>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>{timeAgo(msg.sentAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--color-border)', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={`Message ${userName}…`}
          style={{ flex: 1, background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }} />
        <button onClick={send} disabled={!input.trim() || sending}
          style={{ width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'not-allowed', background: input.trim() ? 'linear-gradient(135deg,#7C5CFF,#A78BFA)' : 'var(--color-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          <Send className="w-4 h-4" style={{ color: input.trim() ? '#fff' : 'var(--color-text-muted)' }} />
        </button>
      </div>
    </div>
  )
}

/* ─── Messages Tab ───────────────────────────────────── */

function MessagesTab({ currentUserEmail, currentUserName, currentUserAvatar, initialUserId, initialUserName }: {
  currentUserEmail: string; currentUserName: string; currentUserAvatar?: string
  initialUserId?: string; initialUserName?: string
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeUserId, setActiveUserId] = useState<string | null>(initialUserId ?? null)
  const [activeUserName, setActiveUserName] = useState(initialUserName ?? '')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/community/conversations').then(r => r.json()).then(d => setConversations(d.conversations ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = conversations.filter(c => c.userName.toLowerCase().includes(search.toLowerCase()))

  if (activeUserId) {
    return <ChatWindow userId={activeUserId} userName={activeUserName} currentUserEmail={currentUserEmail} currentUserName={currentUserName} currentUserAvatar={currentUserAvatar} onBack={() => { setActiveUserId(null); setActiveUserName('') }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
            style={{ width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '9px 12px 9px 36px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }} />
        </div>
      </div>
      {loading ? (
        <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C5CFF' }} />)}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124, 92, 255,0.1)', border: '0.5px solid rgba(124, 92, 255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle className="w-6 h-6" style={{ color: '#7C5CFF' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>No messages yet</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 260, lineHeight: 1.6 }}>Go to the Feed tab and tap DM on a video to start a conversation.</p>
        </div>
      ) : filtered.map(conv => (
        <button key={conv.userId} onClick={() => { setActiveUserId(conv.userId); setActiveUserName(conv.userName) }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid var(--color-border)', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
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

export default function FeedPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('feed')
  const [feedTab, setFeedTab] = useState<FeedTab>('foryou')
  const [allPosts, setAllPosts] = useState<CommunityPost[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [feedLoading, setFeedLoading] = useState(true)
  const [msgUserId, setMsgUserId] = useState<string | undefined>()
  const [msgUserName, setMsgUserName] = useState<string | undefined>()
  const feedScrollRef = useRef<HTMLDivElement>(null)

  const currentEmail = session?.user?.email ?? ''
  const currentName = session?.user?.name ?? currentEmail.split('@')[0]
  const currentAvatar = session?.user?.image ?? undefined

  useEffect(() => {
    Promise.all([
      fetch('/api/community/posts').then(r => r.json()).then(d => d.posts ?? []),
      fetch('/api/community/following').then(r => r.json()).then(d => d.following ?? []),
    ]).then(([posts, followingList]) => {
      setAllPosts(posts)
      setFollowing(new Set(followingList))
    }).catch(() => {}).finally(() => setFeedLoading(false))
  }, [])

  const posts = feedTab === 'following'
    ? allPosts.filter(p => following.has(p.userId) || p.userId === currentEmail)
    : allPosts

  const handleLike = async (postId: string) => {
    if (!currentEmail) return
    setAllPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const liked = p.likedBy.includes(currentEmail)
      return { ...p, likedBy: liked ? p.likedBy.filter(u => u !== currentEmail) : [...p.likedBy, currentEmail], likeCount: liked ? p.likeCount - 1 : p.likeCount + 1 }
    }))
    await fetch(`/api/community/posts/${postId}/like`, { method: 'POST' })
  }

  const handleDelete = async (postId: string) => {
    setAllPosts(prev => prev.filter(p => p.id !== postId))
    await fetch(`/api/community/posts?id=${postId}`, { method: 'DELETE' })
  }

  const handleFollow = async (userId: string) => {
    setFollowing(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
    await fetch(`/api/community/follow/${encodeURIComponent(userId)}`, { method: 'POST' })
  }

  const handleMessage = (userId: string, userName: string) => {
    setMsgUserId(userId)
    setMsgUserName(userName)
    setTab('messages')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)', overflow: 'hidden' }}>
      {tab !== 'feed' && <TopBar />}

      {/* Tab bar */}
      <div style={{
        position: tab === 'feed' ? 'absolute' : 'relative',
        top: tab === 'feed' ? 0 : 'auto', left: 0, right: 0, zIndex: 30,
        display: 'flex', justifyContent: 'center', gap: 4,
        padding: tab === 'feed' ? '12px 0 0' : '0 20px',
        borderBottom: tab === 'feed' ? 'none' : '0.5px solid var(--color-border)',
        background: tab === 'feed' ? 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)' : 'transparent',
      }}>
        {([{ id: 'feed' as const, label: 'Feed', Icon: Rss }, { id: 'messages' as const, label: 'Messages', Icon: MessageCircle }]).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            padding: tab === 'feed' ? '6px 14px' : '10px 16px',
            borderRadius: tab === 'feed' ? 999 : '10px 10px 0 0',
            border: tab === 'feed' ? `1.5px solid ${id === tab ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}` : 'none',
            background: tab === 'feed' ? (id === tab ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)') : 'none',
            color: tab === 'feed' ? (id === tab ? '#fff' : 'rgba(255,255,255,0.55)') : (id === tab ? 'var(--color-text)' : 'var(--color-text-muted)'),
            backdropFilter: tab === 'feed' ? 'blur(8px)' : undefined,
            borderBottom: tab !== 'feed' && id === tab ? '2px solid #7C5CFF' : (tab !== 'feed' ? '2px solid transparent' : undefined),
          }}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <AnimatePresence mode="wait">
          {tab === 'feed' ? (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0 }}>
              {/* For You / Following sub-tabs — shown only when not loading and has posts */}
              {!feedLoading && allPosts.length > 0 && (
                <div style={{ position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)', zIndex: 25, display: 'flex', gap: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', borderRadius: 999, border: '0.5px solid rgba(255,255,255,0.12)', padding: 3 }}>
                  {([{ id: 'foryou' as const, label: 'For You' }, { id: 'following' as const, label: 'Following' }]).map(({ id, label }) => (
                    <button key={id} onClick={() => { setFeedTab(id); feedScrollRef.current?.scrollTo({ top: 0 }) }}
                      style={{ padding: '5px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: feedTab === id ? 'rgba(255,255,255,0.15)' : 'transparent', color: feedTab === id ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {feedLoading ? (
                <div style={{ height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} style={{ width: 10, height: 10, borderRadius: '50%', background: '#7C5CFF' }} />)}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading feed…</p>
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div style={{ height: '100%', background: feedTab === 'following' ? '#000' : 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 32px', textAlign: 'center' }}>
                  {feedTab === 'following' ? (
                    <>
                      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(124, 92, 255,0.15)', border: '0.5px solid rgba(124, 92, 255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserPlus className="w-8 h-8" style={{ color: '#818cf8' }} />
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>Follow creators first</h2>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 280, lineHeight: 1.65 }}>Tap the + on any creator's avatar in the For You feed to follow them.</p>
                      <button onClick={() => setFeedTab('foryou')} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 999, background: 'linear-gradient(135deg,#7C5CFF,#A78BFA)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Go to For You</button>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(124, 92, 255,0.08)', border: '0.5px solid rgba(124, 92, 255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users className="w-8 h-8" style={{ color: '#7C5CFF' }} />
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>Be the first to share</h2>
                      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 300, lineHeight: 1.65 }}>Go to My Videos and click Share to add your first post.</p>
                    </>
                  )}
                </div>
              ) : (
                <div ref={feedScrollRef} style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}>
                  {posts.map((post, i) => (
                    <VideoSlide
                      key={post.id} post={post}
                      currentUserEmail={currentEmail} currentUserName={currentName} currentUserAvatar={currentAvatar}
                      following={following}
                      onLike={handleLike} onMessage={handleMessage} onDelete={handleDelete} onFollow={handleFollow}
                      index={i} total={posts.length}
                      scrollRef={feedScrollRef as React.RefObject<HTMLDivElement>}
                      commentCount={commentCounts[post.id] ?? 0}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0 }}>
              <MessagesTab currentUserEmail={currentEmail} currentUserName={currentName} currentUserAvatar={currentAvatar} initialUserId={msgUserId} initialUserName={msgUserName} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
