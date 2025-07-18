import { create } from 'zustand'
import { SessionData } from '../types/liveTimingTypes'

interface SessionDataState {
  sessionData: SessionData | null
  updateSessionData: (sessionData: SessionData) => void
}

export const useSessionDataStore = create<SessionDataState>((set) => ({
  sessionData: null,
  updateSessionData: (sessionData: SessionData) => {
    set((state) => {
      if (JSON.stringify(state.sessionData) !== JSON.stringify(sessionData)) {
        return { sessionData }
      }
      return state
    })
  }
}))
