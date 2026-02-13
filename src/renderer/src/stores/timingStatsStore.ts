import { create } from 'zustand'
import { TimingStats, TimingStatsLine } from '../types/liveTimingTypes'

interface TimingStatsState {
  timingStats: TimingStats | null
  updateTimingStats: (timingStats: TimingStats) => void
}

export const useTimingStatsStore = create<TimingStatsState>((set) => ({
  timingStats: null,
  updateTimingStats: (update: TimingStats) => {
    set((state) => {
      // If no existing state, just set the new data
      if (!state.timingStats) {
        return { timingStats: update }
      }

      // Merge the Lines data to preserve existing values
      const mergedLines: { [racingNumber: string]: TimingStatsLine } = {
        ...state.timingStats.Lines
      }

      // Update each driver's stats, merging with existing data
      if (update.Lines) {
        for (const racingNumber in update.Lines) {
          const existingLine = mergedLines[racingNumber]
          const updatedLine = update.Lines[racingNumber]

          // Deep merge BestSectors to preserve Values when only Position changes
          const mergedBestSectors: {
            [sectorIndex: string]: { Position?: number; Value?: string }
          } = { ...(existingLine?.BestSectors || {}) }

          if (updatedLine.BestSectors) {
            for (const sectorIndex in updatedLine.BestSectors) {
              const existingSector = mergedBestSectors[sectorIndex]
              const updatedSector = updatedLine.BestSectors[sectorIndex]

              mergedBestSectors[sectorIndex] = {
                Position: updatedSector.Position ?? existingSector?.Position,
                // Only update Value if it's provided in the update, otherwise keep existing
                Value: updatedSector.Value || existingSector?.Value
              }
            }
          }

          mergedLines[racingNumber] = {
            ...existingLine,
            ...updatedLine,
            BestSectors: mergedBestSectors
          }
        }
      }

      const newTimingStats: TimingStats = {
        ...state.timingStats,
        ...update,
        Lines: mergedLines
      }

      // Only update if data actually changed
      if (JSON.stringify(state.timingStats) !== JSON.stringify(newTimingStats)) {
        return { timingStats: newTimingStats }
      }

      return state
    })
  }
}))
