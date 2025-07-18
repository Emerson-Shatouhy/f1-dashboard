import { create } from 'zustand'
import { ExtrapolatedClock } from '../types/liveTimingTypes'

interface ExtrapolatedClockState {
  extrapolatedClock: ExtrapolatedClock | null
  updateExtrapolatedClock: (extrapolatedClock: ExtrapolatedClock) => void
}

export const useExtrapolatedClockStore = create<ExtrapolatedClockState>((set) => ({
  extrapolatedClock: null,
  updateExtrapolatedClock: (extrapolatedClock: ExtrapolatedClock) => {
    set((state) => {
      if (JSON.stringify(state.extrapolatedClock) !== JSON.stringify(extrapolatedClock)) {
        return { extrapolatedClock }
      }
      return state
    })
  }
}))
