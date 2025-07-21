import { create } from 'zustand'
import { DriverTiming, Sector } from '../types/liveTimingTypes'

type SegmentType = { Status: number }

interface DriverTimingState {
  DriverTiming: Record<string, DriverTiming>
  updateDriverTiming: (drivers: Record<string, DriverTiming>) => void
  getDriverTiming: (racingNumber: string) => DriverTiming | null
}

export const useDriverTimingStore = create<DriverTimingState>((set, get) => ({
  DriverTiming: {},

  updateDriverTiming: (drivers: Record<string, DriverTiming>) => {
    set((state) => {
      const newDriverTiming = { ...state.DriverTiming }

      for (const racingNumber in drivers) {
        const existingTiming = state.DriverTiming[racingNumber]
        const updatedTiming = drivers[racingNumber]

        newDriverTiming[racingNumber] = mergeDriverTiming(existingTiming, updatedTiming)
      }

      return { DriverTiming: newDriverTiming }
    })
  },

  getDriverTiming: (racingNumber: string) => {
    const state = get()
    return state.DriverTiming[racingNumber] || null
  }
}))

// Unified data merge function that handles both partial and bulk updates
function mergeDriverTiming(existing: DriverTiming | undefined, update: DriverTiming): DriverTiming {
  const result: DriverTiming = {
    ...existing,
    ...update,
    _timestamp: Date.now()
  }

  // Handle sectors - can be array or object format
  if (update.Sectors) {
    result.Sectors = mergeSectorData(existing?.Sectors, update.Sectors)
  }

  return result
}

// Merge sector data in any format (array or object)
function mergeSectorData(
  existing: Sector[] | Record<string, Sector> | undefined,
  update: Sector[] | Record<string, Sector>
): Sector[] {
  // Initialize 3 sectors
  const sectors: Sector[] = Array.from({ length: 3 }, (_, i) => ({
    Stopped: false,
    Value: '',
    Status: 0,
    OverallFastest: false,
    PersonalFastest: false,
    Segments: [],
    ...(Array.isArray(existing) ? existing[i] : existing?.[i.toString()])
  }))

  // Apply updates
  if (Array.isArray(update)) {
    update.forEach((sector, i) => {
      if (i < 3 && sector) {
        sectors[i] = {
          ...sectors[i],
          ...sector,
          Segments: mergeSegmentData(sectors[i].Segments, sector.Segments)
        }
      }
    })
  } else {
    Object.entries(update).forEach(([key, sector]) => {
      const i = parseInt(key)
      if (i >= 0 && i < 3 && sector) {
        sectors[i] = {
          ...sectors[i],
          ...sector,
          Segments: mergeSegmentData(sectors[i].Segments, sector.Segments)
        }
      }
    })
  }

  return sectors
}

// Merge segment data in any format
function mergeSegmentData(
  existing: SegmentType[] | Record<string, SegmentType> | undefined,
  update: SegmentType[] | Record<string, SegmentType> | undefined
): SegmentType[] {
  if (!update) return existing ? (Array.isArray(existing) ? existing : Object.values(existing)) : []

  const segments: SegmentType[] = []

  // Copy existing segments
  if (existing) {
    if (Array.isArray(existing)) {
      segments.push(...existing)
    } else {
      Object.entries(existing).forEach(([key, segment]) => {
        const i = parseInt(key)
        if (!isNaN(i)) {
          while (segments.length <= i) segments.push({ Status: 0 })
          segments[i] = segment
        }
      })
    }
  }

  // Apply updates
  if (Array.isArray(update)) {
    update.forEach((segment, i) => {
      if (segment) {
        while (segments.length <= i) segments.push({ Status: 0 })
        segments[i] = { ...segments[i], ...segment }
      }
    })
  } else {
    Object.entries(update).forEach(([key, segment]) => {
      const i = parseInt(key)
      if (!isNaN(i) && segment) {
        while (segments.length <= i) segments.push({ Status: 0 })
        segments[i] = { ...segments[i], ...segment }
      }
    })
  }

  return segments
}
