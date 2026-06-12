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

export interface PositionFrame {
  timestamp: number // wall-clock ms when message was received
  entries: Record<string, DriverPosition>
}

const MAX_TIMELINE_FRAMES = 120 // ~30s at 4Hz

interface PositionState {
  positionData: PositionData | null
  positionTimeline: PositionFrame[]
  updatePositionData: (positionData: any) => void
  addPositionFrame: (data: any, timestamp: number) => void
}

function extractEntries(data: any): Record<string, DriverPosition> | null {
  let positionArray: any[] | null = null
  if (Array.isArray(data)) {
    positionArray = data
  } else if (data?.Position && Array.isArray(data.Position)) {
    positionArray = data.Position
  }

  if (positionArray && positionArray.length > 0) {
    const latestEntry = positionArray[positionArray.length - 1]
    if (latestEntry?.Entries) return latestEntry.Entries
  } else if (data?.Entries) {
    return data.Entries
  }

  return null
}

export const usePositionStore = create<PositionState>((set) => ({
  positionData: null,
  positionTimeline: [],

  updatePositionData: (data: any) => {
    const entries = extractEntries(data)
    if (!entries) return
    const latestData: PositionData = { Timestamp: data?.Timestamp ?? '', Entries: entries }
    set((state) => {
      if (JSON.stringify(state.positionData) !== JSON.stringify(latestData)) {
        return { positionData: latestData }
      }
      return state
    })
  },

  addPositionFrame: (data: any, timestamp: number) => {
    const entries = extractEntries(data)
    if (!entries) return
    set((state) => ({
      positionTimeline: [
        ...state.positionTimeline,
        { timestamp, entries }
      ].slice(-MAX_TIMELINE_FRAMES)
    }))
  }
}))

export type { DriverPosition, PositionData }
