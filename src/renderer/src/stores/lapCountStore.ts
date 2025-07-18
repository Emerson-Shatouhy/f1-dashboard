import { create } from 'zustand'
import { LapCount } from '../types/liveTimingTypes'

interface LapCountState extends LapCount {
  updateLapCount: (lapCount: Partial<LapCount>) => void
}

export const useLapCountStore = create<LapCountState>((set) => ({
  CurrentLap: 0,
  TotalLaps: 0,
  updateLapCount: (lapCount: Partial<LapCount>) =>
    set((state) => ({
      CurrentLap: lapCount.CurrentLap ?? state.CurrentLap,
      TotalLaps: lapCount.TotalLaps ?? state.TotalLaps
    }))
}))
