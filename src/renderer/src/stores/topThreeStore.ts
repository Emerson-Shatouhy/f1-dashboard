import { create } from 'zustand'
import { TopThree } from '../types/liveTimingTypes'

interface TopThreeState {
  topThree: TopThree | null
  updateTopThree: (topThree: TopThree) => void
}

export const useTopThreeStore = create<TopThreeState>((set) => ({
  topThree: null,
  updateTopThree: (topThree: TopThree) => {
    set((state) => {
      if (JSON.stringify(state.topThree) !== JSON.stringify(topThree)) {
        return { topThree }
      }
      return state
    })
  }
}))
