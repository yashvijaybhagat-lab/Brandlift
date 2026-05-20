/**
 * Input sanitization and prompt-injection detection.
 * Used by API routes before passing user input to AI or external services.
 */

// ── Prompt injection patterns ─────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /you\s+are\s+now\s+(a\s+)?(?!Lyra|BrandLift)/i,
  /forget\s+(everything|all|your\s+instructions?)/i,
  /new\s+instructions?:/i,
  /\bsystem\s*prompt\b.*\breveal\b/i,
  /\bprint\s+(your\s+)?(system\s+)?prompt\b/i,
  /\brepeat\s+(everything|all)\s+(above|before)\b/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(an?\s+)?(?!a\s+brand|a\s+marketing)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(?!Lyra)/i,
  /\bDAN\b.*\bdo\s+anything\s+now\b/i,
  /jailbreak/i,
  /\bbase64\b.{0,30}\bdecode\b/i,
]

// ── SQL injection patterns ────────────────────────────────────
const SQLI_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|TABLE|WHERE)\b)/i,
  /('|")\s*(OR|AND)\s*('|"|\d)/i,
  /;\s*(DROP|DELETE|UPDATE|INSERT)\s+/i,
  /--\s*$/m,
  /\/\*.*\*\//,
]

// ── Command injection patterns ────────────────────────────────
const CMDI_PATTERNS = [
  /[;&|`$()]\s*(ls|cat|rm|wget|curl|bash|sh|python|node|eval)\b/i,
  /\$\(.*\)/,
  /`[^`]+`/,
  /\|{1,2}\s*(bash|sh|cmd|powershell)/i,
]

export interface SanitizeResult {
  clean:   boolean
  reason?: string
  value:   string
}

export function sanitizeText(input: unknown, maxLen = 4000): SanitizeResult {
  if (typeof input !== 'string') return { clean: false, reason: 'not a string', value: '' }

  const trimmed = input.trim().slice(0, maxLen)

  for (const p of SQLI_PATTERNS) {
    if (p.test(trimmed)) return { clean: false, reason: 'sqli', value: trimmed }
  }
  for (const p of CMDI_PATTERNS) {
    if (p.test(trimmed)) return { clean: false, reason: 'cmdi', value: trimmed }
  }

  return { clean: true, value: trimmed }
}

export function detectPromptInjection(messages: { role: string; content: string }[]): boolean {
  for (const msg of messages) {
    if (msg.role !== 'user') continue
    for (const p of INJECTION_PATTERNS) {
      if (p.test(msg.content)) return true
    }
  }
  return false
}

export function sanitizeCode(input: unknown): SanitizeResult {
  if (typeof input !== 'string') return { clean: false, reason: 'not a string', value: '' }
  const v = input.trim().toUpperCase().replace(/[^A-Z0-9_\-]/g, '')
  if (v.length === 0 || v.length > 64) return { clean: false, reason: 'invalid length', value: v }
  return { clean: true, value: v }
}
