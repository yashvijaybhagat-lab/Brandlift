'use client'
import { useState, ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Video, Lightbulb, Eye } from 'lucide-react'

/* ─── Google SVG ──────────────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

/* ─── Floating stat card ──────────────────────────────────────────────────── */
function FloatCard({
  icon: Icon,
  label,
  value,
  delta,
  delay = 0,
  x = 0,
  y = 0,
}: {
  icon: React.ElementType
  label: string
  value: string
  delta: string
  delay?: number
  x?: number
  y?: number
}) {
  return (
    <motion.div
      className="absolute flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: 'translate(-50%, -50%)',
        background: 'rgba(17,17,19,0.85)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset',
        zIndex: 10,
        whiteSpace: 'nowrap',
      }}
      initial={{ opacity: 0, scale: 0.88, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(99,102,241,0.12)', border: '0.5px solid rgba(99,102,241,0.2)' }}
      >
        <Icon className="w-4 h-4" style={{ color: '#818cf8' }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span style={{ fontSize: 11, color: '#52525B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div className="flex items-baseline gap-2">
          <span style={{ fontSize: 18, fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.04em', fontFamily: 'var(--font-display)' }}>{value}</span>
          <span style={{ fontSize: 11, color: '#4ADE80', fontWeight: 600 }}>{delta}</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Left panel ──────────────────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex w-1/2 h-full flex-col justify-end relative overflow-hidden"
      style={{ background: '#080809' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 40% 50%, rgba(99,102,241,0.1) 0%, transparent 70%)',
        }}
      />

      {/* Top vignette */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #080809, transparent)' }}
      />
      {/* Bottom vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #080809, transparent)' }}
      />

      {/* Floating stat cards */}
      <div className="absolute inset-0">
        <FloatCard icon={Eye} label="Monthly reach" value="142K" delta="+28%" delay={0.3} x={-80} y={-140} />
        <FloatCard icon={Video} label="Videos published" value="8" delta="+3" delay={0.45} x={80} y={-40} />
        <FloatCard icon={TrendingUp} label="Avg. engagement" value="4.2%" delta="+0.8pp" delay={0.6} x={-60} y={100} />
        <FloatCard icon={Lightbulb} label="Ideas saved" value="24" delta="+12" delay={0.75} x={100} y={170} />
      </div>

      {/* Center logo */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-20"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.35), 0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <svg viewBox="0 0 28 28" fill="none" width="42" height="42">
            <path d="M4 5h11a5 5 0 0 1 0 10H4V5zm0 10h11.5a5.5 5.5 0 0 1 0 11H4V15z" fill="white" opacity="0.95" />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: '-0.04em',
              color: '#FAFAFA',
            }}
          >
            BrandLift
          </span>
          <p style={{ fontSize: 13, color: '#52525B', textAlign: 'center', maxWidth: 200, lineHeight: 1.5 }}>
            Your digital presence, on autopilot
          </p>
        </div>
      </motion.div>

      {/* Bottom editorial text */}
      <div className="relative z-10 p-10">
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(18px, 2.5vw, 26px)',
            letterSpacing: '-0.03em',
            color: '#FAFAFA',
            lineHeight: 1.2,
            opacity: 0.9,
          }}
        >
          &ldquo;We went from zero content<br />to 142K monthly views in<br />
          <span style={{ color: '#818cf8' }}>under 60 days.&rdquo;</span>
        </p>
        <div className="flex items-center gap-3 mt-4">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            M
          </div>
          <div>
            <p style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>Marcus Reid</p>
            <p style={{ fontSize: 11, color: '#52525B' }}>Reid&apos;s Auto Detailing, Austin TX</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Input ───────────────────────────────────────────────────────────────── */
function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <label style={{ fontSize: 13, fontWeight: 500, color: '#A1A1AA', letterSpacing: '-0.01em' }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-4 py-3 rounded-xl text-[14px] text-[#FAFAFA] outline-none transition-all duration-200"
        style={{
          background: focused ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
          fontFamily: 'inherit',
        }}
        autoComplete={type === 'email' ? 'email' : 'current-password'}
      />
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setTimeout(() => router.push('/dashboard'), 800)
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden" style={{ background: '#080809' }}>
      <LeftPanel />

      {/* Divider */}
      <div className="hidden lg:block w-px self-stretch" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Right — form */}
      <div className="relative flex w-full lg:w-1/2 h-full flex-col items-center justify-center px-8 lg:px-16">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 50% 40% at 70% 50%, rgba(99,102,241,0.06) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              <svg viewBox="0 0 28 28" fill="none" width="20" height="20">
                <path d="M4 5h8a4 4 0 0 1 0 8H4V5zm0 8h8.5a4.5 4.5 0 0 1 0 9H4V13z" fill="white" opacity="0.95" />
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#FAFAFA', letterSpacing: '-0.03em' }}>
              BrandLift
            </span>
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="mb-8"
          >
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 30,
                letterSpacing: '-0.04em',
                color: '#FAFAFA',
                lineHeight: 1.1,
              }}
            >
              Welcome back.
            </h1>
            <p style={{ fontSize: 14, color: '#52525B', marginTop: 8 }}>
              Sign in to your BrandLift account
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Google button */}
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[14px] font-medium transition-all duration-150"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#A1A1AA',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'
                e.currentTarget.style.color = '#FAFAFA'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = '#A1A1AA'
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: 11, color: '#3f3f46', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                or
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            </div>

            <Field
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label style={{ fontSize: 13, fontWeight: 500, color: '#A1A1AA', letterSpacing: '-0.01em' }}>
                  Password
                </label>
                <button
                  type="button"
                  className="text-[12px] transition-colors duration-150"
                  style={{ color: '#52525B' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#818cf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#52525B')}
                >
                  Forgot password?
                </button>
              </div>
              <Field
                label=""
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-200 mt-1"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #5558e8 100%)',
                boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)',
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (loading) return
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 12px 32px rgba(99,102,241,0.35)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(99,102,241,0.25)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </motion.form>

          {/* Footer link */}
          <motion.p
            className="mt-7 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{ fontSize: 13, color: '#3f3f46' }}
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/onboard"
              className="transition-colors duration-150"
              style={{ color: '#818cf8' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#a5b4fc')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#818cf8')}
            >
              Get started free →
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  )
}
