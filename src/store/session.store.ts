import { create } from 'zustand'
import type { SessionState } from '@core/types/stealth.types'

interface SessionStore extends SessionState {
  startSession: () => void
  endSession: () => void
  updateState: (state: Partial<SessionState>) => void
  reset: () => void
}

function defaultState(): SessionState {
  return {
    id: '',
    startTime: 0,
    isActive: false,
    totalActiveMs: 0,
    idleMs: 0,
    breakCount: 0,
    lastActivityTime: Date.now(),
    isFatigued: false,
    nextBreakAt: 0,
  }
}

export const useSessionStore = create<SessionStore>()((set) => ({
  ...defaultState(),

  startSession: () =>
    set({
      id: crypto.randomUUID(),
      startTime: Date.now(),
      isActive: true,
      lastActivityTime: Date.now(),
    }),

  endSession: () =>
    set((state) => ({
      ...state,
      isActive: false,
      endTime: Date.now(),
    })),

  updateState: (partial) => set((state) => ({ ...state, ...partial })),

  reset: () => set(defaultState()),
}))
