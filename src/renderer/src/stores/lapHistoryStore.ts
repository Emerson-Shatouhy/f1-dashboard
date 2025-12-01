import { create } from 'zustand'
import { Stint } from '../types/liveTimingTypes'

export interface LapHistory {
  lapNumber: number
  lapTime: string
  compound: string
  isNew: boolean
  sectors?: { Value: string }[]
  personalFastest?: boolean
  deleted?: boolean
  stintNumber: number
}

interface LapHistoryState {
  lapHistory: Record<string, LapHistory[]> // racingNumber -> array of laps
  addLap: (racingNumber: string, lap: LapHistory) => void
  updateLap: (racingNumber: string, lapNumber: number, updates: Partial<LapHistory>) => void
  getLapHistory: (racingNumber: string) => LapHistory[]
  getAllLapHistory: (racingNumber: string) => LapHistory[]
  updateFromStints: (racingNumber: string, stints: Record<string, Stint>) => void
}

export const useLapHistoryStore = create<LapHistoryState>((set, get) => ({
  lapHistory: {},

  addLap: (racingNumber: string, lap: LapHistory) => {
    set((state) => {
      const driverHistory = state.lapHistory[racingNumber] || []
      // Check if lap already exists
      const existingIndex = driverHistory.findIndex((l) => l.lapNumber === lap.lapNumber)

      let updated: LapHistory[]
      if (existingIndex >= 0) {
        updated = [...driverHistory]
        updated[existingIndex] = { ...updated[existingIndex], ...lap }
      } else {
        updated = [...driverHistory, lap].sort((a, b) => a.lapNumber - b.lapNumber)
      }

      return {
        lapHistory: {
          ...state.lapHistory,
          [racingNumber]: updated
        }
      }
    })
  },

  updateLap: (racingNumber: string, lapNumber: number, updates: Partial<LapHistory>) => {
    set((state) => {
      const driverHistory = state.lapHistory[racingNumber] || []
      const updated = driverHistory.map((lap) =>
        lap.lapNumber === lapNumber ? { ...lap, ...updates } : lap
      )

      return {
        lapHistory: {
          ...state.lapHistory,
          [racingNumber]: updated
        }
      }
    })
  },

  getLapHistory: (racingNumber: string) => {
    const state = get()
    return (state.lapHistory[racingNumber] || []).filter((lap) => !lap.deleted)
  },

  getAllLapHistory: (racingNumber: string) => {
    const state = get()
    return state.lapHistory[racingNumber] || []
  },

  updateFromStints: (racingNumber: string, stints: Record<string, Stint>) => {
    set((state) => {
      const driverHistory = state.lapHistory[racingNumber] || []

      // Convert stints to lap history
      Object.entries(stints).forEach(([stintNumber, stint]) => {
        if (stint.LapTime && stint.LapNumber) {
          const lap: LapHistory = {
            lapNumber: stint.LapNumber,
            lapTime: stint.LapTime,
            compound: stint.Compound,
            isNew: stint.New === 'true',
            stintNumber: parseInt(stintNumber),
            personalFastest: false,
            deleted: stint.LapFlags === 0 // 0 means deleted/invalid
          }

          const existingIndex = driverHistory.findIndex((l) => l.lapNumber === lap.lapNumber)
          if (existingIndex >= 0) {
            driverHistory[existingIndex] = { ...driverHistory[existingIndex], ...lap }
          } else {
            driverHistory.push(lap)
          }
        }
      })

      return {
        lapHistory: {
          ...state.lapHistory,
          [racingNumber]: driverHistory.sort((a, b) => a.lapNumber - b.lapNumber)
        }
      }
    })
  }
}))
