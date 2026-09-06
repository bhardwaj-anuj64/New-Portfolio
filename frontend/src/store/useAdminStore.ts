import { useEffect } from 'react'
import { create } from 'zustand'

interface AdminState {
  isAdminOpen: boolean
  isAuthenticated: boolean
  token: string | null
  openAdmin: () => void
  closeAdmin: () => void
  toggleAdmin: () => void
  setAuthenticated: (token: string) => void
  logout: () => void
}

export const useAdminStore = create<AdminState>((set) => ({
  isAdminOpen: false,
  isAuthenticated: false,
  token: null,
  openAdmin: () => set({ isAdminOpen: true }),
  closeAdmin: () => set({ isAdminOpen: false }),
  toggleAdmin: () => set((s) => ({ isAdminOpen: !s.isAdminOpen })),
  setAuthenticated: (token) => set({ isAuthenticated: true, token }),
  logout: () => set({ isAuthenticated: false, token: null }),
}))

/** Wires the global Ctrl/Cmd+Shift+L shortcut to open the admin portal. Mount once near the app root. */
export function useAdminShortcut() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        useAdminStore.getState().openAdmin()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
