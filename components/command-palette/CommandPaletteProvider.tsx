'use client'

import * as React from 'react'

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

interface CommandPaletteContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null)

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = React.useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  }
  return ctx
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export interface CommandPaletteProviderProps {
  children: React.ReactNode
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), [])

  // Global Cmd+K / Ctrl+K listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (modifier && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  const value = React.useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export default CommandPaletteProvider
