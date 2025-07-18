import { create } from 'zustand'
import { TrackStatus } from '../types/liveTimingTypes'

interface TrackStatusState {
  trackStatus: TrackStatus | null
  updateTrackStatus: (trackStatus: TrackStatus) => void
}

export const useTrackStatusStore = create<TrackStatusState>((set) => ({
  trackStatus: null,
  updateTrackStatus: (trackStatus: TrackStatus) => {
    set((state) => {
      if (JSON.stringify(state.trackStatus) !== JSON.stringify(trackStatus)) {
        return { trackStatus }
      }
      return state
    })
  }
}))
