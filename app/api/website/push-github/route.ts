import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

interface GitHubFileResponse {
  sha: string
  content: string
  encoding: string
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`website-push:${ip}`, 10, 60_000 * 60)
  if (!rl.success) return tooManyRequests(rl.reset)

  let body: {
    pat?: string
    owner?: string
    repo?: string
    filePath?: string
    branch?: string
    content?: string
    createPR?: boolean
    domain?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { pat, owner, repo, filePath = 'index.html', branch = 'main', content, createPR = false, domain = '' } = body

  if (!pat || !owner || !repo || !content) {
    return NextResponse.json({ error: 'Missing required fields: pat, owner, repo, content' }, { status: 400 })
  }

  // Validate PAT format (starts with ghp_ or github_pat_)
  if (!pat.startsWith('ghp_') && !pat.startsWith('github_pat_')) {
    return NextResponse.json({ error: 'Invalid GitHub personal access token format' }, { status: 400 })
  }

  const headers = {
    'Authorization': `Bearer ${pat}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  const targetBranch = createPR ? `brandlift-redesign-${Date.now()}` : branch

  try {
    // If creating PR, create a new branch off the target branch
    if (createPR) {
      // Get the SHA of the target branch HEAD
      const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers })
      if (!refRes.ok) {
        const err = await refRes.json().catch(() => ({}))
        return NextResponse.json({ error: `Could not read branch "${branch}": ${(err as { message?: string }).message ?? refRes.status}` }, { status: 400 })
      }
      const refData = await refRes.json() as { object: { sha: string } }
      const baseSha = refData.object.sha

      // Create new branch
      const createBranchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ref: `refs/heads/${targetBranch}`, sha: baseSha }),
      })
      if (!createBranchRes.ok) {
        const err = await createBranchRes.json().catch(() => ({}))
        return NextResponse.json({ error: `Could not create branch: ${(err as { message?: string }).message ?? createBranchRes.status}` }, { status: 400 })
      }
    }

    // Check if file exists on target branch (to get its SHA for updates)
    let existingSha: string | undefined
    const fileCheckRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${targetBranch}`,
      { headers }
    )
    if (fileCheckRes.ok) {
      const fileData = await fileCheckRes.json() as GitHubFileResponse
      existingSha = fileData.sha
    }

    // Encode content to base64
    const encoded = Buffer.from(content, 'utf-8').toString('base64')

    // Push the file
    const commitBody: Record<string, unknown> = {
      message: `✨ Website redesign from BrandLift analysis${domain ? ` (${domain})` : ''}`,
      content: encoded,
      branch: targetBranch,
    }
    if (existingSha) commitBody.sha = existingSha

    const pushRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(commitBody),
    })

    if (!pushRes.ok) {
      const err = await pushRes.json().catch(() => ({}))
      return NextResponse.json({ error: `Push failed: ${(err as { message?: string }).message ?? pushRes.status}` }, { status: 400 })
    }

    const pushData = await pushRes.json() as { commit: { html_url: string } }
    const commitUrl = pushData.commit.html_url

    // If PR mode, open a pull request
    if (createPR) {
      const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `✨ Website redesign by BrandLift${domain ? ` (${domain})` : ''}`,
          head: targetBranch,
          base: branch,
          body: `## BrandLift Website Redesign\n\nThis PR contains an AI-generated redesign of \`${filePath}\`.\n\n**What changed:**\n- Fixed critical SEO and content issues\n- Added missing page sections\n- Improved CTAs and trust signals\n- Mobile-first responsive layout\n\nReview the changes and merge when ready.`,
        }),
      })

      if (prRes.ok) {
        const prData = await prRes.json() as { html_url: string; number: number }
        return NextResponse.json({ success: true, type: 'pr', url: prData.html_url, number: prData.number, commitUrl })
      }
      // PR creation failed — still return commit info
    }

    return NextResponse.json({ success: true, type: 'commit', commitUrl, branch: targetBranch })
  } catch {
    return NextResponse.json({ error: 'GitHub API request failed — check your token and repo details' }, { status: 500 })
  }
}
