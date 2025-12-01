import { create } from 'zustand'

interface DriverPosition {
  Status: string
  X: number
  Y: number
  Z: number
}

interface PositionData {
  Timestamp: string
  Entries: {
    [raceNumber: string]: DriverPosition
  }
}

interface PositionState {
  positionData: PositionData | null
  updatePositionData: (positionData: any) => void
}

export const usePositionStore = create<PositionState>((set) => ({
  positionData: null,
  updatePositionData: (positionData: any) => {
    // Extract the latest position data from the array
    let latestData: PositionData | null = null

    // Handle {Position: Array} format
    let positionArray: any[] | null = null
    if (Array.isArray(positionData)) {
      positionArray = positionData
    } else if (positionData?.Position && Array.isArray(positionData.Position)) {
      positionArray = positionData.Position
    }

    if (positionArray && positionArray.length > 0) {
      // Get the most recent entry (last in array)
      const latestEntry = positionArray[positionArray.length - 1]
      if (latestEntry?.Entries) {
        latestData = {
          Timestamp: latestEntry.Timestamp,
          Entries: latestEntry.Entries
        }
      }
    } else if (positionData?.Entries) {
      // Single entry format
      latestData = {
        Timestamp: positionData.Timestamp,
        Entries: positionData.Entries
      }
    }

    if (latestData) {
      set((state) => {
        if (JSON.stringify(state.positionData) !== JSON.stringify(latestData)) {
          return { positionData: latestData }
        }
        return state
      })
    }
  }
}))

export type { DriverPosition, PositionData }
