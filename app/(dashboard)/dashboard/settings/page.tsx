'use client'

import * as React from 'react'
import { useSession, signOut } from 'next-auth/react'
import { TopBar } from '@/components/dashboard/TopBar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { type BusinessProfile } from '@/lib/claude'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 pb-8 border-b border-white/[0.06] last:border-0 last:pb-0">
      <div>
        <h2 className="text-[16px] font-medium text-[#FAFAFA]">{title}</h2>
        {description && <p className="text-[14px] text-[#71717A] mt-1">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#A1A1AA]">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-[#71717A]">{hint}</p>}
    </div>
  )
}

function ChipGroup<T extends string>({ options, value, multiple, onChange, onMultiChange }: {
  options: { label: string; value: T }[]
  value?: T
  multiple?: T[]
  onChange?: (v: T) => void
  onMultiChange?: (v: T[]) => void
}) {
  const isMulti = onMultiChange !== undefined && multiple !== undefined
  function handleClick(opt: T) {
    if (isMulti && multiple !== undefined && onMultiChange) {
      onMultiChange(multiple.includes(opt) ? multiple.filter(v => v !== opt) : [...multiple, opt])
    } else if (onChange) { onChange(opt) }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = isMulti ? multiple?.includes(opt.value) : value === opt.value
        return (
          <button key={opt.value} type="button" onClick={() => handleClick(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-pill text-[13px] font-medium transition-colors duration-160',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/60 overflow-hidden relative',
              active
                ? 'bg-[rgba(124, 92, 255,0.15)] text-[#7C5CFF] border border-[rgba(124, 92, 255,0.35)]'
                : 'bg-[#1A1530] text-[#71717A] border border-white/[0.06] hover:text-[#A1A1AA]',
            )}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const TONE_OPTIONS: { label: string; value: BusinessProfile['tone'] }[] = [
  { label: 'Professional', value: 'professional' },
  { label: 'Casual', value: 'casual' },
  { label: 'Friendly', value: 'friendly' },
  { label: 'Authoritative', value: 'authoritative' },
  { label: 'Playful', value: 'playful' },
]

const STYLE_OPTIONS: { label: string; value: BusinessProfile['style'] }[] = [
  { label: 'Minimal', value: 'minimal' },
  { label: 'Bold', value: 'bold' },
  { label: 'Warm', value: 'warm' },
  { label: 'Premium', value: 'premium' },
  { label: 'Authentic', value: 'authentic' },
]

const PLATFORM_OPTIONS: { label: string; value: BusinessProfile['platforms'][number] }[] = [
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'Website', value: 'website' },
  { label: 'Google', value: 'google' },
]

const DEFAULT_PROFILE: BusinessProfile = {
  businessName: '',
  description: '',
  audience: '',
  location: '',
  services: [],
  differentiator: '',
  tone: 'friendly',
  platforms: [],
  style: 'warm',
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [profile, setProfile] = React.useState<BusinessProfile>(DEFAULT_PROFILE)
  const [servicesText, setServicesText] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [deleteConfirm, setDeleteConfirm] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  /* ── Load profile from server on mount ──────────────────────────────────── */
  React.useEffect(() => {
    if (!session?.user?.email) return
    const load = async () => {
      try {
        const res = await fetch('/api/user/profile')
        const data = await res.json()
        if (data.profile) {
          setProfile(data.profile)
          setServicesText((data.profile.services ?? []).join(', '))
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [session?.user?.email])

  function setField<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setProfile(p => ({ ...p, [key]: value }))
    setSaved(false)
    setSaveError('')
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaved(false)
    setSaveError('')

    const finalProfile: BusinessProfile = {
      ...profile,
      services: servicesText.split(',').map(s => s.trim()).filter(Boolean),
    }
    setProfile(finalProfile)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: finalProfile }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaveError('Failed to save — try again')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-[#52525B]">Loading your profile…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">

          {/* Business profile */}
          <Section title="Business Profile" description="This information shapes every piece of content we generate for you.">
            <Field label="Business Name" htmlFor="businessName">
              <Input id="businessName" value={profile.businessName}
                onChange={e => setField('businessName', e.target.value)}
                placeholder="Your business name" />
            </Field>

            <Field label="What you do" htmlFor="description" hint="A clear, jargon-free description of your business and what makes it great.">
              <textarea id="description" value={profile.description}
                onChange={e => setField('description', e.target.value)}
                rows={3}
                className={cn(
                  'w-full px-3 py-2.5 rounded-[8px] text-[14px] resize-none',
                  'bg-[#1A1530] border border-white/[0.1] text-[#FAFAFA] placeholder:text-[#71717A]',
                  'transition-colors duration-160',
                  'focus:outline-none focus:border-[rgba(124, 92, 255,0.5)] focus:ring-0',
                  'focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/40',
                )} />
            </Field>

            <Field label="Target Audience" htmlFor="audience">
              <Input id="audience" value={profile.audience}
                onChange={e => setField('audience', e.target.value)}
                placeholder="Who are your best customers?" />
            </Field>

            <Field label="Location" htmlFor="location">
              <Input id="location" value={profile.location}
                onChange={e => setField('location', e.target.value)}
                placeholder="City, State" />
            </Field>

            <Field label="Services / Products" htmlFor="services" hint="Comma-separated list of what you offer.">
              <Input id="services" value={servicesText}
                onChange={e => { setServicesText(e.target.value); setSaved(false) }}
                placeholder="Photography, Editing, Social posts" />
            </Field>

            <Field label="What makes you different" htmlFor="differentiator" hint="The one thing your competitors can't claim.">
              <Input id="differentiator" value={profile.differentiator}
                onChange={e => setField('differentiator', e.target.value)}
                placeholder="Your unique value proposition" />
            </Field>
          </Section>

          {/* Content style */}
          <Section title="Content Style" description="Tell us how you like to show up online.">
            <Field label="Brand Tone">
              <ChipGroup options={TONE_OPTIONS} value={profile.tone} onChange={v => setField('tone', v)} />
            </Field>
            <Field label="Visual Style">
              <ChipGroup options={STYLE_OPTIONS} value={profile.style} onChange={v => setField('style', v)} />
            </Field>
            <Field label="Active Platforms">
              <ChipGroup options={PLATFORM_OPTIONS} multiple={profile.platforms}
                onMultiChange={v => setField('platforms', v as BusinessProfile['platforms'])} />
            </Field>
          </Section>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button variant="primary" size="md" loading={saving} onClick={handleSave}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </Button>
            {saved && <span className="text-[13px] text-[#4ADE80]">Profile saved successfully.</span>}
            {saveError && <span className="text-[13px] text-red-400">{saveError}</span>}
          </div>

          {/* Danger zone */}
          <Section title="Danger Zone">
            <div className="rounded-[12px] p-4 bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.15)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-[#FAFAFA]">Delete account</p>
                  <p className="text-[13px] text-[#71717A] mt-0.5">
                    Permanently delete your BrandLift account and all associated data. This action cannot be undone.
                  </p>
                </div>
                {!deleteConfirm ? (
                  <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)} className="flex-shrink-0">
                    Delete account
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                    <Button variant="danger" size="sm" loading={deleting} onClick={async () => {
                      // GDPR right to erasure — calls DELETE /api/user/delete which removes all Vercel Blob data
                      setDeleting(true)
                      try {
                        const res = await fetch('/api/user/delete', { method: 'DELETE' })
                        if (res.ok) {
                          localStorage.clear()
                          await signOut({ callbackUrl: '/' })
                        } else {
                          alert('Deletion failed. Please email support@brandlift.dev.')
                        }
                      } finally { setDeleting(false); setDeleteConfirm(false) }
                    }}>
                      {deleting ? 'Deleting…' : 'Yes, delete everything'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}
