import { create } from 'zustand'
import { TimingStats } from '../types/liveTimingTypes'

interface TimingStatsState {
  timingStats: TimingStats | null
  updateTimingStats: (timingStats: TimingStats) => void
}

export const useTimingStatsStore = create<TimingStatsState>((set) => ({
  timingStats: null,
  updateTimingStats: (timingStats: TimingStats) => {
    set((state) => {
      if (JSON.stringify(state.timingStats) !== JSON.stringify(timingStats)) {
        return { timingStats }
      }
      return state
    })
  }
}))
