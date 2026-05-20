/**
 * Server-side founder code validation.
 * Used by admin API routes and the chat route to verify x-founder-code header.
 */
export function isFounderCode(code: string | null | undefined): { valid: boolean; ownerName: string | null } {
  if (!code) return { valid: false, ownerName: null }
  const normalized = code.trim().toUpperCase()
  const codeYB = (process.env.OWNER_CODE_YB ?? '').trim().toUpperCase()
  const codeAN = (process.env.OWNER_CODE_AN ?? '').trim().toUpperCase()
  if (codeYB && normalized === codeYB) return { valid: true, ownerName: 'Yash' }
  if (codeAN && normalized === codeAN) return { valid: true, ownerName: 'Ansh' }
  return { valid: false, ownerName: null }
}

export function founderRequired(req: Request): { authorized: boolean; ownerName: string | null } {
  const code = (req.headers as Headers).get('x-founder-code')
  const result = isFounderCode(code)
  return { authorized: result.valid, ownerName: result.ownerName }
}
