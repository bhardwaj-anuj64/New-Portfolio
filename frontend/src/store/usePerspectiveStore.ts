import { create } from 'zustand'
import type { Perspective } from '../types'

interface PerspectiveState {
  perspective: Perspective
  setPerspective: (perspective: Perspective) => void
}

export const usePerspectiveStore = create<PerspectiveState>((set) => ({
  perspective: 'professional',
  setPerspective: (perspective) => set({ perspective }),
}))
