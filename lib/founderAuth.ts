/**
 * Server-side founder validation.
 * Checks x-founder-code header (mobile / API clients) OR bl_session cookie (browser).
 */

export function isFounderCode(code: string | null | undefined): { valid: boolean; ownerName: string | null } {
  if (!code) return { valid: false, ownerName: null }
  const n      = code.trim().toUpperCase()
  const codeYB = (process.env.OWNER_CODE_YB ?? '').trim().toUpperCase()
  const codeAN = (process.env.OWNER_CODE_AN ?? '').trim().toUpperCase()
  if (codeYB && n === codeYB) return { valid: true, ownerName: 'Yash' }
  if (codeAN && n === codeAN) return { valid: true, ownerName: 'Ansh' }
  return { valid: false, ownerName: null }
}

function parseCookie(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function founderRequired(req: Request): { authorized: boolean; ownerName: string | null } {
  const headers = req.headers as Headers

  // 1. Header-based (API clients, mobile, admin panel sends this explicitly)
  const headerCode = headers.get('x-founder-code')
  if (headerCode) {
    const r = isFounderCode(headerCode)
    if (r.valid) return { authorized: true, ownerName: r.ownerName }
  }

  // 2. httpOnly cookie (browser — JS cannot read or steal this)
  const cookieCode = parseCookie(headers.get('cookie') ?? '', 'bl_session')
  if (cookieCode) {
    const r = isFounderCode(cookieCode)
    if (r.valid) return { authorized: true, ownerName: r.ownerName }
  }

  return { authorized: false, ownerName: null }
}
