import { create } from 'zustand'
import { SessionInfo } from '../types/liveTimingTypes'

interface SessionInfoState {
  sessionInfo: SessionInfo | null
  updateSessionInfo: (sessionInfo: SessionInfo) => void
}

export const useSessionInfoStore = create<SessionInfoState>((set) => ({
  sessionInfo: null,
  updateSessionInfo: (sessionInfo: SessionInfo) => {
    set((state) => {
      if (JSON.stringify(state.sessionInfo) !== JSON.stringify(sessionInfo)) {
        return { sessionInfo }
      }
      return state
    })
  }
}))
