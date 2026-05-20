/**
 * Founder-only: AI code editor.
 * POST → generate code changes from natural language instruction.
 * PUT  → commit the approved changes to GitHub.
 */
import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'
import { geminiGenerate } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN
const GITHUB_REPO   = process.env.GITHUB_REPO
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? 'main'

interface FileContext { path: string; content: string }
interface FileChange  { path: string; content: string; isNew?: boolean }

// ── GitHub commit helper ──────────────────────────────────────

async function getFileSha(filePath: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.sha ?? null
  } catch { return null }
}

async function commitFile(filePath: string, content: string, message: string): Promise<string> {
  const sha = await getFileSha(filePath)
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch:  GITHUB_BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      method:  'PUT',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' },
      body:    JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(`GitHub commit failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.commit?.html_url ?? `https://github.com/${GITHUB_REPO}/commit/${data.commit?.sha}`
}

// ── POST: generate changes ────────────────────────────────────

export async function POST(req: NextRequest) {
  const { authorized, ownerName } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { instruction, files }: { instruction: string; files: FileContext[] } = await req.json()

  if (!instruction?.trim()) return NextResponse.json({ error: 'instruction is required' }, { status: 400 })
  if (!files?.length)       return NextResponse.json({ error: 'at least one file is required' }, { status: 400 })

  const filesBlock = files
    .map(f => `=== ${f.path} ===\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n')

  const prompt = `You are a senior TypeScript/Next.js engineer working on the BrandLift codebase.
BrandLift is a Next.js 14 App Router SaaS for AI-powered video marketing.
Tech stack: TypeScript, Tailwind CSS, Vercel, Vercel Blob, Gemini API, NextAuth.

The founder (${ownerName ?? 'founder'}) has given you this instruction:
"${instruction}"

Here are the relevant files in full:

${filesBlock}

Respond with ONLY a valid JSON object — no markdown fences, no explanation outside the JSON.
The JSON must match this exact shape:
{
  "explanation": "2-3 sentences describing what you changed and why",
  "changes": [
    {
      "path": "relative/path/from/project/root.ts",
      "content": "full new file content — never truncated",
      "isNew": false
    }
  ]
}

Rules:
- Always output complete file contents, never truncated or with "// ... rest unchanged" comments
- Preserve all existing functionality unless the instruction explicitly removes it
- Follow the existing code style, naming conventions, and import paths exactly
- Only change files that need changing to fulfil the instruction
- If you need to create a new file, set isNew: true`

  try {
    const raw = await geminiGenerate({
      messages:  [{ role: 'user', parts: [{ text: prompt }] }],
      maxTokens: 8192,
      model:     'gemini-2.5-flash',
    })

    // Strip markdown fences if Gemini wraps it anyway
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/```\s*$/m, '').trim()
    const result  = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: `AI generation failed: ${String(e)}` }, { status: 500 })
  }
}

// ── PUT: commit approved changes to GitHub ────────────────────

export async function PUT(req: NextRequest) {
  const { authorized, ownerName } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return NextResponse.json({ error: 'GITHUB_TOKEN and GITHUB_REPO env vars must be set to commit changes.' }, { status: 400 })
  }

  const { changes, commitMessage }: { changes: FileChange[]; commitMessage: string } = await req.json()

  if (!changes?.length) return NextResponse.json({ error: 'no changes provided' }, { status: 400 })

  const message = commitMessage?.trim() || `[Admin AI] ${ownerName ?? 'Founder'} code edit`
  const results: { path: string; commitUrl: string; ok: boolean; error?: string }[] = []

  for (const change of changes) {
    try {
      const commitUrl = await commitFile(change.path, change.content, message)
      results.push({ path: change.path, commitUrl, ok: true })
    } catch (e) {
      results.push({ path: change.path, commitUrl: '', ok: false, error: String(e) })
    }
  }

  const allOk = results.every(r => r.ok)
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 })
}
