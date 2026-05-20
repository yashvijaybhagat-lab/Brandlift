/**
 * Founder-only: read the project file tree and individual file contents.
 * Uses GitHub API if GITHUB_TOKEN + GITHUB_REPO are set, falls back to local fs in dev.
 */
import { NextRequest, NextResponse } from 'next/server'
import { founderRequired } from '@/lib/founderAuth'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN
const GITHUB_REPO   = process.env.GITHUB_REPO   // e.g. "yashbhagat/brandlift"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? 'main'

const SOURCE_EXTS   = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.css', '.md'])
const IGNORE_DIRS   = new Set(['node_modules', '.next', '.git', 'dist', '.vercel'])

// ── GitHub helpers ────────────────────────────────────────────

async function ghFetch(endpoint: string) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`)
  return res.json()
}

async function listFilesGithub(): Promise<string[]> {
  const data = await ghFetch(`/repos/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`)
  return (data.tree as { type: string; path: string }[])
    .filter(f => f.type === 'blob' && SOURCE_EXTS.has(path.extname(f.path)) && !f.path.split('/').some(p => IGNORE_DIRS.has(p)))
    .map(f => f.path)
    .slice(0, 300)
}

async function readFileGithub(filePath: string): Promise<string> {
  const data = await ghFetch(`/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`)
  return Buffer.from(data.content as string, 'base64').toString('utf-8')
}

// ── Local fs helpers (dev fallback) ──────────────────────────

function listFilesLocal(dir: string, base = ''): string[] {
  const results: string[] = []
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return results }
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) { results.push(...listFilesLocal(path.join(dir, e.name), rel)) }
    else if (SOURCE_EXTS.has(path.extname(e.name))) { results.push(rel) }
  }
  return results.slice(0, 300)
}

function readFileLocal(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8')
}

// ── Route handlers ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { authorized } = founderRequired(req)
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const filePath = req.nextUrl.searchParams.get('path')
  const useGitHub = GITHUB_TOKEN && GITHUB_REPO

  try {
    if (filePath) {
      const content = useGitHub ? await readFileGithub(filePath) : readFileLocal(filePath)
      return NextResponse.json({ path: filePath, content })
    } else {
      const files = useGitHub ? await listFilesGithub() : listFilesLocal(process.cwd())
      return NextResponse.json({ files, source: useGitHub ? 'github' : 'local' })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
