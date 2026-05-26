/**
 * Higgsfield AI — server-side helpers.
 * Credentials env var: HIGGSFIELD_CREDENTIALS="KEY_ID:KEY_SECRET"
 */

const BASE = 'https://platform.higgsfield.ai'

function hfHeaders(): Record<string, string> {
  const creds = process.env.HIGGSFIELD_CREDENTIALS ?? ''
  const auth = `Key ${creds}`
  return {
    'Authorization': auth,
    'Content-Type': 'application/json',
  }
}

export interface HFJob {
  request_id: string
  status: string
}

export interface HFStatus {
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw'
  request_id: string
  video?:  { url: string }
  images?: { url: string }[]
  error?:  string
}

/** Generate an image from text using Flux Pro. Returns a request_id to poll. */
export async function hfStartImage(prompt: string, aspectRatio: string): Promise<HFJob> {
  const res = await fetch(`${BASE}/flux-pro/kontext/max/text-to-image`, {
    method: 'POST',
    headers: hfHeaders(),
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        safety_tolerance: 2,
        seed: Math.floor(Math.random() * 999999),
      },
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Higgsfield image: ${res.status} — ${txt.slice(0, 300)}`)
  }
  return res.json()
}

/** Animate an image with the DoP cinematic model. Returns a request_id to poll. */
export async function hfStartVideo(motionPrompt: string, imageUrl: string): Promise<HFJob> {
  const res = await fetch(`${BASE}/v1/image2video/dop`, {
    method: 'POST',
    headers: hfHeaders(),
    body: JSON.stringify({
      input: {
        model: 'dop-turbo',
        prompt: motionPrompt,
        input_images: [{ type: 'image_url', image_url: imageUrl }],
      },
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Higgsfield video: ${res.status} — ${txt.slice(0, 300)}`)
  }
  return res.json()
}

/** Poll a generation job for its current status and result URLs. */
export async function hfGetStatus(requestId: string): Promise<HFStatus> {
  const res = await fetch(`${BASE}/requests/${requestId}/status`, {
    headers: hfHeaders(),
  })
  if (!res.ok) throw new Error(`Higgsfield status: ${res.status}`)
  return res.json()
}
