import { create } from 'zustand'

interface LabsState {
  isOpen: boolean
  activeToolId: string
  open: (toolId?: string) => void
  close: () => void
  setActiveTool: (toolId: string) => void
}

export const useLabsStore = create<LabsState>((set) => ({
  isOpen: false,
  activeToolId: 'mesh3d',
  open: (toolId) => set((s) => ({ isOpen: true, activeToolId: toolId ?? s.activeToolId })),
  close: () => set({ isOpen: false }),
  setActiveTool: (toolId) => set({ activeToolId: toolId }),
}))
