'use client'

/**
 * Shared debug mode state — module-level pub/sub so FounderBar and LyraChat
 * stay in sync without relying on DOM events or component mount order.
 */

const listeners = new Set<(v: boolean) => void>()
let _current = false

// Initialise from localStorage immediately (runs once when module loads)
if (typeof window !== 'undefined') {
  try { _current = localStorage.getItem('bl_debug') === 'true' } catch {}
}

export function getDebugMode() { return _current }

export function setDebugMode(v: boolean) {
  _current = v
  try { localStorage.setItem('bl_debug', String(v)) } catch {}
  listeners.forEach(fn => fn(v))
}

export function subscribeDebug(fn: (v: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
