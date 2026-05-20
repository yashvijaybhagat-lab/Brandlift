const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
export const DEFAULT_MODEL = 'gemini-2.5-flash-lite'
export const ALLOWED_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] as const
export type GeminiModel = typeof ALLOWED_MODELS[number]

function apiKey(): string {
  const k = process.env.GEMINI_API_KEY
  if (!k) throw new Error('GEMINI_API_KEY is not set')
  return k
}

interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

interface GeminiRequest {
  system?: string
  messages: GeminiMessage[]
  maxTokens?: number
  tools?: Record<string, unknown>[]
  model?: string
}

/* Non-streaming — returns the full text response */
export async function geminiGenerate({ system, messages, maxTokens = 1024, model }: GeminiRequest): Promise<string> {
  const resolvedModel = ALLOWED_MODELS.includes(model as GeminiModel) ? model! : DEFAULT_MODEL
  const body: Record<string, unknown> = {
    contents: messages,
    generationConfig: { maxOutputTokens: maxTokens },
  }
  if (system) {
    body.system_instruction = { parts: [{ text: system }] }
  }

  const res = await fetch(
    `${GEMINI_BASE}/${resolvedModel}:generateContent?key=${apiKey()}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

/* Streaming — returns a ReadableStream that emits text chunks */
export function geminiStream({ system, messages, maxTokens = 512, tools, model }: GeminiRequest): ReadableStream<Uint8Array> {
  const resolvedModel = ALLOWED_MODELS.includes(model as GeminiModel) ? model! : DEFAULT_MODEL
  const body: Record<string, unknown> = {
    contents: messages,
    generationConfig: { maxOutputTokens: maxTokens },
  }
  if (system) {
    body.system_instruction = { parts: [{ text: system }] }
  }
  if (tools?.length) {
    body.tools = tools
  }

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch(
          `${GEMINI_BASE}/${resolvedModel}:streamGenerateContent?alt=sse&key=${apiKey()}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        )
        if (!res.ok || !res.body) {
          throw new Error(`Gemini stream error ${res.status}`)
        }

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })

          // SSE lines: "data: {...}\n\n"
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const json = line.slice(6).trim()
            if (!json || json === '[DONE]') continue
            try {
              const chunk = JSON.parse(json)
              // Collect text from all parts (skip tool/function call parts)
              const parts: { text?: string }[] = chunk?.candidates?.[0]?.content?.parts ?? []
              for (const part of parts) {
                if (part.text) controller.enqueue(encoder.encode(part.text))
              }
            } catch { /* skip malformed line */ }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
