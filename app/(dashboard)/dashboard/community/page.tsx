'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { TopBar } from '@/components/dashboard/TopBar'
import {
  Heart, MessageCircle, Send, Play, Pause, VolumeX, Volume2,
  Users, Rss, ArrowLeft, MoreVertical, Trash2, Search, ChevronRight,
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
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

/* ─── Video Card ─────────────────────────────────────── */

function VideoCard({
  post, currentUserEmail, onLike, onMessage, onDelete,
}: {
  post: CommunityPost
  currentUserEmail: string
  onLike: (id: string) => void
  onMessage: (userId: string, userName: string) => void
  onDelete: (id: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const liked = post.likedBy.includes(currentUserEmail)
  const isOwn = post.userId === currentUserEmail

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play().catch(() => {}); setPlaying(true) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--color-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Video */}
      <div style={{ position: 'relative', background: '#000', aspectRatio: '9/16', maxHeight: 420, cursor: 'pointer' }} onClick={togglePlay}>
        <video
          ref={videoRef}
          src={post.videoUrl}
          muted={muted}
          loop
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onEnded={() => setPlaying(false)}
        />
        {/* Play overlay */}
        <AnimatePresence>
          {!playing && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)',
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.25)' }}>
                <Play className="w-6 h-6 fill-white text-white" style={{ marginLeft: 3 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Mute button */}
        {playing && (
          <button
            onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
            style={{ position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px' }}>
        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar src={post.userAvatar} name={post.userName} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>{post.userName}</p>
            {post.businessName && (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{post.businessName}</p>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{timeAgo(post.sharedAt)}</span>
          {/* Menu */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
              <MoreVertical className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: 4, minWidth: 140, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                  onMouseLeave={() => setShowMenu(false)}
                >
                  {isOwn && (
                    <button
                      onClick={() => { onDelete(post.id); setShowMenu(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13 }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove post
                    </button>
                  )}
                  {!isOwn && (
                    <button
                      onClick={() => { onMessage(post.userId, post.userName); setShowMenu(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontSize: 13 }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Send message
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Caption / script */}
        {(post.caption || post.script) && (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: 12 }} className="line-clamp-2">
            {post.caption || post.script}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => onLike(post.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <motion.div whileTap={{ scale: 1.3 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
              <Heart
                className="w-5 h-5"
                style={{ color: liked ? '#ef4444' : 'var(--color-text-muted)', fill: liked ? '#ef4444' : 'none', transition: 'all 0.2s' }}
              />
            </motion.div>
            <span style={{ fontSize: 13, color: liked ? '#ef4444' : 'var(--color-text-muted)', fontWeight: 500 }}>{post.likeCount}</span>
          </button>

          {!isOwn && (
            <button
              onClick={() => onMessage(post.userId, post.userName)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Message</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
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
    } catch {} finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadMessages()
    pollRef.current = setInterval(loadMessages, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    } catch {} finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 8 }}>
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <Avatar name={userName} size={32} />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{userName}</p>
      </div>

      {/* Messages */}
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
        ) : (
          messages.map(msg => {
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
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--color-border)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Message ${userName}…`}
          style={{
            flex: 1, background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)',
            borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'var(--color-text)', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            width: 40, height: 40, borderRadius: 12, border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
            background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-surface-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0,
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
      .then(d => { setConversations(d.conversations ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = conversations.filter(c =>
    c.userName.toLowerCase().includes(search.toLowerCase())
  )

  if (activeUserId) {
    return (
      <ChatWindow
        userId={activeUserId}
        userName={activeUserName}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onBack={() => { setActiveUserId(null); setActiveUserName('') }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Search */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            style={{
              width: '100%', background: 'var(--color-surface-elevated)', border: '0.5px solid var(--color-border)',
              borderRadius: 10, padding: '9px 12px 9px 36px', fontSize: 14, color: 'var(--color-text)', outline: 'none',
            }}
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
            Go to the Feed tab and click Message on a video to start a conversation.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map(conv => (
            <button
              key={conv.userId}
              onClick={() => { setActiveUserId(conv.userId); setActiveUserName(conv.userName) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '0.5px solid var(--color-border)', transition: 'background 0.15s',
              }}
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
      )}
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

  const currentEmail = session?.user?.email ?? ''
  const currentName = session?.user?.name ?? currentEmail.split('@')[0]
  const currentAvatar = session?.user?.image ?? undefined

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/community/posts')
      const { posts: data } = await res.json()
      setPosts(data ?? [])
    } catch {} finally {
      setFeedLoading(false)
    }
  }, [])

  useEffect(() => { loadFeed() }, [loadFeed])

  const handleLike = async (postId: string) => {
    if (!currentEmail) return
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const liked = p.likedBy.includes(currentEmail)
      return {
        ...p,
        likedBy: liked ? p.likedBy.filter(u => u !== currentEmail) : [...p.likedBy, currentEmail],
        likeCount: liked ? p.likeCount - 1 : p.likeCount + 1,
      }
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
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '0.5px solid var(--color-border)' }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.03em', marginBottom: 16 }}>
              Community
            </h1>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2 }}>
              {([
                { id: 'feed', label: 'Feed', Icon: Rss },
                { id: 'messages', label: 'Messages', Icon: MessageCircle },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                    borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    background: tab === id ? 'var(--color-surface)' : 'none',
                    color: tab === id ? 'var(--color-text)' : 'var(--color-text-muted)',
                    borderBottom: tab === id ? '2px solid #6366f1' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: tab === 'feed' ? 'auto' : 'hidden', minHeight: 0 }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: tab === 'feed' ? '24px' : 0, height: tab === 'messages' ? '100%' : 'auto' }}>
            <AnimatePresence mode="wait">
              {tab === 'feed' ? (
                <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {feedLoading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                      {[0, 1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 20, overflow: 'hidden' }}>
                          <motion.div animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                            style={{ aspectRatio: '9/16', maxHeight: 420, background: 'var(--color-surface-elevated)' }} />
                          <div style={{ padding: 14 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                              <motion.div animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                                style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-surface-elevated)', flexShrink: 0 }} />
                              <div style={{ flex: 1 }}>
                                <motion.div animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                                  style={{ height: 12, width: '60%', borderRadius: 6, background: 'var(--color-surface-elevated)', marginBottom: 6 }} />
                                <motion.div animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                                  style={{ height: 10, width: '40%', borderRadius: 6, background: 'var(--color-surface-elevated)' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16, textAlign: 'center' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '0.5px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users className="w-8 h-8" style={{ color: '#6366f1' }} />
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>Be the first to share</h2>
                      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 320, lineHeight: 1.65 }}>
                        No community videos yet. Go to My Videos and click Share to add your first post.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                      {posts.map(post => (
                        <VideoCard
                          key={post.id}
                          post={post}
                          currentUserEmail={currentEmail}
                          onLike={handleLike}
                          onMessage={handleMessage}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
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
      </div>
    </div>
  )
}
