import { create } from 'zustand'
import { TimingAppData, TimingAppLine, Stint } from '../types/liveTimingTypes'

interface TimingAppDataState {
  TimingAppData: Record<string, TimingAppLine>
  updateTimingAppData: (data: TimingAppData) => void
  getTimingAppData: (racingNumber: string) => TimingAppLine | null
}

export const useTimingAppDataStore = create<TimingAppDataState>((set, get) => ({
  TimingAppData: {},

  updateTimingAppData: (data: TimingAppData) => {
    set((state) => {
      const newTimingAppData = { ...state.TimingAppData }

      for (const racingNumber in data.Lines) {
        const existingLine = state.TimingAppData[racingNumber]
        const updatedLine = data.Lines[racingNumber]

        newTimingAppData[racingNumber] = mergeTimingAppLine(existingLine, updatedLine)
      }

      return { TimingAppData: newTimingAppData }
    })
  },

  getTimingAppData: (racingNumber: string) => {
    const state = get()
    return state.TimingAppData[racingNumber] || null
  }
}))

function mergeTimingAppLine(
  existing: TimingAppLine | undefined,
  update: TimingAppLine
): TimingAppLine {
  const result: TimingAppLine = {
    ...existing,
    ...update,
    _timestamp: Date.now()
  }

  // Handle Stints merging to preserve existing stint data
  if (update.Stints) {
    result.Stints = mergeStintData(existing?.Stints, update.Stints)
  }

  return result
}

// Deep merge stint data to preserve existing properties when partial updates come in
function mergeStintData(
  existing: { [stintNumber: string]: Stint } | undefined,
  update: { [stintNumber: string]: Stint }
): { [stintNumber: string]: Stint } {
  const result = { ...existing }

  Object.entries(update).forEach(([stintNumber, stintUpdate]) => {
    if (stintUpdate) {
      result[stintNumber] = {
        ...result[stintNumber],
        ...stintUpdate
      }
    }
  })

  return result
}
