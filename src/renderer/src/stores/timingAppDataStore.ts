import { create } from 'zustand'
import { TimingAppData } from '../types/liveTimingTypes'

interface TimingAppDataState {
  timingAppData: TimingAppData | null
  updateTimingAppData: (timingAppData: TimingAppData) => void
}

export const useTimingAppDataStore = create<TimingAppDataState>((set) => ({
  timingAppData: null,
  updateTimingAppData: (timingAppData: TimingAppData) => {
    set((state) => {
      if (JSON.stringify(state.timingAppData) !== JSON.stringify(timingAppData)) {
        return { timingAppData }
      }
      return state
    })
  }
}))
