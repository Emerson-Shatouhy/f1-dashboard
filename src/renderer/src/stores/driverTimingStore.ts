import { create } from 'zustand'
import { DriverTiming, Sector, TimingData } from '../types/liveTimingTypes'
import { parseLapSeconds } from '../utils/timing'
import { useTrackStatusStore } from './trackStatusStore'

type SegmentType = { Status: number }

interface DriverTimingState {
  DriverTiming: Record<string, DriverTiming>
  SessionPart: number | null
  NoEntries: number[] | null
  // Each driver's latest clean time per sector, in seconds. The feed clears sector values when a
  // new lap starts, so this remembers them; pit and neutralised laps are left out.
  SectorTimes: Record<string, Array<number | undefined>>
  updateQualiProgress: (data: TimingData) => void
  updateDriverTiming: (drivers: Record<string, DriverTiming>) => void
  getDriverTiming: (racingNumber: string) => DriverTiming | null
}

export const useDriverTimingStore = create<DriverTimingState>((set, get) => ({
  DriverTiming: {},
  SessionPart: null,
  NoEntries: null,
  SectorTimes: {},

  // NoEntries arrives once in the snapshot, SessionPart in the snapshot and at each part's start
  updateQualiProgress: ({ SessionPart, NoEntries }: TimingData) => {
    if (SessionPart === undefined && NoEntries === undefined) return
    set((state) => ({
      SessionPart: SessionPart ?? state.SessionPart,
      NoEntries: NoEntries ?? state.NoEntries
    }))
  },

  updateDriverTiming: (drivers: Record<string, DriverTiming>) => {
    set((state) => {
      const newDriverTiming = { ...state.DriverTiming }
      let newSectorTimes = state.SectorTimes
      const status = useTrackStatusStore.getState().trackStatus?.Status
      const neutralised = status === '4' || status === '5' || status === '6' || status === '7'

      for (const racingNumber in drivers) {
        const existingTiming = state.DriverTiming[racingNumber]
        const updatedTiming = drivers[racingNumber]

        const merged = mergeDriverTiming(existingTiming, updatedTiming)
        newDriverTiming[racingNumber] = merged

        if (updatedTiming.Sectors && !merged.InPit && !merged.PitOut && !neutralised) {
          const times = [...(newSectorTimes[racingNumber] ?? [])]
          let changed = false
          for (const [index, sector] of Object.entries(updatedTiming.Sectors)) {
            const seconds = parseLapSeconds(sector?.Value)
            if (seconds !== null && seconds > 0 && times[Number(index)] !== seconds) {
              times[Number(index)] = seconds
              changed = true
            }
          }
          if (changed) newSectorTimes = { ...newSectorTimes, [racingNumber]: times }
        }
      }

      return { DriverTiming: newDriverTiming, SectorTimes: newSectorTimes }
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

  // Updates can carry just Catching or just Value; keep the other half
  const updateInterval = update.IntervalToPositionAhead
  if (updateInterval && typeof updateInterval === 'object') {
    const existingInterval = existing?.IntervalToPositionAhead
    result.IntervalToPositionAhead = {
      ...(typeof existingInterval === 'object' ? existingInterval : undefined),
      ...updateInterval
    }
  }

  // Handle qualifying Stats - merge deeply to preserve existing session data
  if (update.Stats || existing?.Stats) {
    result.Stats = {
      ...existing?.Stats,
      ...update.Stats
    }

    // Deep merge each session's stats
    if (update.Stats && existing?.Stats) {
      for (const sessionIndex in update.Stats) {
        result.Stats[sessionIndex] = {
          ...existing.Stats[sessionIndex],
          ...update.Stats[sessionIndex]
        }
      }
    }
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
