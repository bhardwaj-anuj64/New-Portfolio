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
  closeAdmin: () => {
    // Clear the #admin deep link on close so it doesn't reopen the portal on the next reload.
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    set({ isAdminOpen: false })
  },
  toggleAdmin: () => set((s) => ({ isAdminOpen: !s.isAdminOpen })),
  setAuthenticated: (token) => set({ isAuthenticated: true, token }),
  logout: () => set({ isAuthenticated: false, token: null }),
}))

/**
 * Wires the global Ctrl/Cmd+Shift+L shortcut and the #admin hash route to open the admin portal.
 * Mount once near the app root.
 */
export function useAdminShortcut() {
  useEffect(() => {
    const openIfAdminHash = () => {
      if (window.location.hash === '#admin') {
        useAdminStore.getState().openAdmin()
      }
    }
    openIfAdminHash()
    window.addEventListener('hashchange', openIfAdminHash)

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        useAdminStore.getState().openAdmin()
      }
    }
    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('hashchange', openIfAdminHash)
      window.removeEventListener('keydown', handler)
    }
  }, [])
}
