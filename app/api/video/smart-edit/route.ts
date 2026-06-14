/**
 * Smart Edit API — translates natural-language instructions into
 * a validated EditPlan. Retries on bad JSON (up to 2 attempts).
 */
import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { validateEditPlan, type EditCaption } from '@/lib/editPlan'
import { SMART_EDIT_SYSTEM } from '@/lib/smartEditSystem'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { sanitizeText } from '@/lib/sanitize'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic   = 'force-dynamic'
export const maxDuration = 30

interface ReqBody {
  prompt:   string
  duration: number
  captions: EditCaption[]
  history:  string[]   // plain-English summaries of previous edits
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`smart-edit:${ip}`, 40, 60 * 60_000)  // 40/hour
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  let body: ReqBody
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { prompt, duration, captions = [], history = [] } = body

  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  if (typeof duration !== 'number' || duration <= 0 || duration > 7200) {
    return NextResponse.json({ error: 'duration must be a positive number (seconds)' }, { status: 400 })
  }

  const sanitized = sanitizeText(prompt, 800)
  if (!sanitized.clean) return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })

  // Build context-injected system prompt
  const captionsSample = captions.length === 0
    ? 'none'
    : captions.slice(0, 8).map((c, i) => `[${i}] "${c.text}" (${c.start.toFixed(1)}s–${c.end.toFixed(1)}s)`).join(', ')
  const historyStr = history.length === 0 ? 'none yet' : history.slice(-5).join(' · ')

  const system = SMART_EDIT_SYSTEM
    .replace('{{duration}}', duration.toFixed(1))
    .replace('{{captionCount}}', String(captions.length))
    .replace('{{captionsSample}}', captionsSample)
    .replace('{{history}}', historyStr)

  const messages = [{ role: 'user' as const, parts: [{ text: sanitized.value }] }]

  // Retry loop — up to 2 attempts on invalid JSON or failed validation
  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryHint = attempt > 0
      ? ` (Previous attempt failed: ${lastError}. Fix the JSON and try again.)`
      : ''

    const raw = await geminiGenerate({
      system,
      messages: attempt === 0
        ? messages
        : [...messages, { role: 'model' as const, parts: [{ text: '(invalid output)' }] }, { role: 'user' as const, parts: [{ text: retryHint }] }],
      maxTokens: 1024,
      model: 'gemini-2.0-flash',
    })

    // Strip markdown fences if Gemini wrapped the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let parsed: unknown
    try { parsed = JSON.parse(cleaned) } catch (e) {
      lastError = `JSON parse error: ${e instanceof Error ? e.message : String(e)}`
      continue
    }

    const result = validateEditPlan(parsed, duration)
    if (!result.ok) { lastError = result.error; continue }

    return NextResponse.json({ plan: result.plan })
  }

  return NextResponse.json(
    { error: `Failed to generate a valid edit plan after 2 attempts. Last error: ${lastError}` },
    { status: 422 },
  )
}
