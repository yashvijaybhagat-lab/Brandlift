/**
 * Founder-only: AI debugger.
 * POST → takes error description + stack trace + file contents → returns root cause + fix.
 */
import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'
import { geminiGenerate } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

interface FileContext { path: string; content: string }

export async function POST(req: NextRequest) {
  const { authorized, ownerName } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { errorDesc, stackTrace, files }: {
    errorDesc:  string
    stackTrace: string
    files:      FileContext[]
  } = await req.json()

  if (!errorDesc?.trim()) return NextResponse.json({ error: 'errorDesc is required' }, { status: 400 })

  const filesBlock = files?.length
    ? files.map(f => `=== ${f.path} ===\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
    : '(no files provided — diagnose from error description and stack trace alone)'

  const prompt = `You are a senior debugger working on the BrandLift codebase.
BrandLift is a Next.js 14 App Router SaaS using TypeScript, Tailwind CSS, Vercel, Vercel Blob, Gemini API, and NextAuth.
The founder (${ownerName ?? 'founder'}) has reported this bug.

BUG DESCRIPTION:
${errorDesc.trim()}

${stackTrace?.trim() ? `STACK TRACE / ERROR OUTPUT:\n${stackTrace.trim()}` : '(no stack trace provided)'}

RELEVANT FILES:
${filesBlock}

Your job:
1. Identify the exact root cause
2. Explain it clearly in plain English
3. Generate the complete fixed code for any files that need changing

Respond with ONLY a valid JSON object — no markdown fences, no explanation outside the JSON:
{
  "rootCause": "1-2 sentences: what is broken and exactly why",
  "explanation": "3-5 sentences: fuller context — what triggers it, what the impact is, why the fix works",
  "affectedFiles": ["list of file paths that are relevant to this bug"],
  "changes": [
    {
      "path": "relative/path/from/project/root.ts",
      "content": "complete fixed file content — never truncated",
      "isNew": false
    }
  ]
}

Rules:
- Always output complete file contents, never truncated
- If no code change is needed (e.g. it's a config/env issue), return an empty changes array and explain in rootCause
- Only include files that actually need changing`

  try {
    const raw     = await geminiGenerate({
      messages:  [{ role: 'user', parts: [{ text: prompt }] }],
      maxTokens: 8192,
      model:     'gemini-2.5-flash',
    })
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/```\s*$/m, '').trim()
    const result  = JSON.parse(cleaned)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: `AI debug failed: ${String(e)}` }, { status: 500 })
  }
}
