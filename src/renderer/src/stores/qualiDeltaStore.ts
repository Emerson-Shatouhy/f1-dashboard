import { create } from 'zustand'
import { DriverTiming, QualiDeltaDisplay, TimingData } from '../types/liveTimingTypes'
import { useSessionInfoStore } from './sessionInfoStore'
import { useDriverTimingStore } from './driverTimingStore'

// The feed only sends segment Status codes, never segment times. Minisector timing is
// inferred from the wall-clock moment each segment status flips, then anchored/rescaled
// against the exact sector times so error never accumulates past a sector boundary.

const PIT_LANE_STATUS = 2064
// Deltas beyond this are cruise/cool-down laps, not push laps — hide instead of showing +25s
const MAX_DISPLAY_DELTA_MS = 5_000

interface LapTimeline {
  startWallMs: number | null // wall clock at the line crossing that started this lap
  segWallMs: (number | null)[][] // [sector][segment] wall clock when the segment completed
  segStatus: number[][] // own status snapshot for diffing (independent of driverTimingStore)
  exactCumMs: (number | null)[] // length 3: exact cumulative ms at each sector boundary
  sectorWallMs: (number | null)[] // wall clock when each sector Value arrived
  isOutLap: boolean
  hasCrossings: boolean
}

interface ReferenceLap {
  lapTimeMs: number
  cumAtSegment: number[][] // [sector][segment] cumulative ms at each minisector completion
  cumAtSector: [number, number, number]
}

// Patches are structurally Partial<DriverTiming> with sectors/segments in array or
// object-keyed form — same duality driverTimingStore's merge handles.
type SegmentPatch = { Status?: number }
type SectorPatch = {
  Value?: string
  Segments?: SegmentPatch[] | Record<string, SegmentPatch>
}
type DriverTimingPatch = {
  PitOut?: boolean
  LastLapTime?: { Value?: string }
  Sectors?: SectorPatch[] | Record<string, SectorPatch>
}

interface QualiDeltaState {
  displays: Record<string, QualiDeltaDisplay>
  ingestTimingPatch: (data: TimingData) => void
  reset: () => void
}

// Working state is non-reactive on purpose: only `displays` drives re-renders
const timelines = new Map<string, LapTimeline>()
const bestLapMs = new Map<string, number>() // per current quali part, cleared on part change
let reference: ReferenceLap | null = null
let sessionPart: number | null = null

function newTimeline(): LapTimeline {
  return {
    startWallMs: null,
    segWallMs: [[], [], []],
    segStatus: [[], [], []],
    exactCumMs: [null, null, null],
    sectorWallMs: [null, null, null],
    isOutLap: false,
    hasCrossings: false
  }
}

// Parses "23.456" and "1:23.456" into milliseconds
export function parseTimeMs(value: string): number | null {
  const parts = value.split(':')
  if (parts.length > 2) return null
  const seconds = parseFloat(parts[parts.length - 1])
  if (isNaN(seconds)) return null
  const minutes = parts.length === 2 ? parseInt(parts[0], 10) : 0
  if (isNaN(minutes)) return null
  return Math.round((minutes * 60 + seconds) * 1000)
}

function forEachSector(
  sectors: SectorPatch[] | Record<string, SectorPatch> | undefined,
  cb: (sectorIdx: number, sector: SectorPatch) => void
): void {
  if (!sectors) return
  if (Array.isArray(sectors)) {
    sectors.forEach((sector, i) => {
      if (sector && i < 3) cb(i, sector)
    })
  } else {
    for (const key of Object.keys(sectors)) {
      const i = parseInt(key, 10)
      if (!isNaN(i) && i >= 0 && i < 3 && sectors[key]) cb(i, sectors[key])
    }
  }
}

function forEachSegment(
  segments: SegmentPatch[] | Record<string, SegmentPatch> | undefined,
  cb: (segIdx: number, status: number) => void
): void {
  if (!segments) return
  if (Array.isArray(segments)) {
    segments.forEach((seg, i) => {
      if (seg && typeof seg.Status === 'number') cb(i, seg.Status)
    })
  } else {
    for (const key of Object.keys(segments)) {
      const i = parseInt(key, 10)
      const seg = segments[key]
      if (!isNaN(i) && i >= 0 && seg && typeof seg.Status === 'number') cb(i, seg.Status)
    }
  }
}

function ensureSegmentSlot(t: LapTimeline, sectorIdx: number, segIdx: number): void {
  while (t.segStatus[sectorIdx].length <= segIdx) t.segStatus[sectorIdx].push(0)
  while (t.segWallMs[sectorIdx].length <= segIdx) t.segWallMs[sectorIdx].push(null)
}

// Maps wall-clock fractions of each sector onto its exact duration so cumulative times
// match the official sector sums at every boundary
export function freezeReference(t: LapTimeline, lapTimeMs: number): ReferenceLap | null {
  const s1 = t.exactCumMs[0]
  const s2 = t.exactCumMs[1]
  if (s1 === null || s2 === null) return null
  const cumAtSector: [number, number, number] = [s1, s2, lapTimeMs]
  const cumAtSegment: number[][] = []

  for (let s = 0; s < 3; s++) {
    const n = t.segStatus[s].length
    if (n === 0) return null
    const startMs = s === 0 ? 0 : cumAtSector[s - 1]
    const endMs = cumAtSector[s]
    if (endMs <= startMs) return null
    const wallStart = s === 0 ? t.startWallMs : t.sectorWallMs[s - 1]
    const wallEnd = t.sectorWallMs[s]
    const usable = wallStart !== null && wallEnd !== null && wallEnd > wallStart
    const walls = t.segWallMs[s]
    const cums: number[] = new Array(n)
    for (let i = 0; i < n; i++) {
      const w = walls[i]
      const frac =
        usable && w !== null && w >= wallStart && w <= wallEnd
          ? (w - wallStart) / (wallEnd - wallStart)
          : (i + 1) / n // missing/implausible wall time → even spacing
      cums[i] = startMs + frac * (endMs - startMs)
    }
    cums[n - 1] = endMs // the last minisector completes exactly at the boundary
    for (let i = 1; i < n; i++) if (cums[i] < cums[i - 1]) cums[i] = cums[i - 1]
    cumAtSegment.push(cums)
  }
  return { lapTimeMs, cumAtSegment, cumAtSector }
}

function projectedPosition(racingNumber: string, projectedFinishMs: number): number {
  // Classification ranks by best lap: a lap slower than the driver's own best cannot
  // demote them, and on identical times the earlier lap stays ahead
  const ownBest = bestLapMs.get(racingNumber)
  const effective = ownBest !== undefined ? Math.min(projectedFinishMs, ownBest) : projectedFinishMs
  let position = 1
  for (const [rn, best] of bestLapMs) {
    if (rn !== racingNumber && best <= effective) position++
  }
  return position
}

function buildDisplay(
  racingNumber: string,
  deltaMs: number,
  projectedFinishMs: number,
  exact: boolean,
  now: number
): QualiDeltaDisplay | null {
  if (Math.abs(deltaMs) > MAX_DISPLAY_DELTA_MS) return null
  return {
    deltaMs,
    projectedPos: projectedPosition(racingNumber, projectedFinishMs),
    exact,
    updatedAt: now
  }
}

// Returns the new display for the driver, null to clear it, undefined for no change
function processLine(
  racingNumber: string,
  rawLine: DriverTiming,
  now: number
): QualiDeltaDisplay | null | undefined {
  const line = rawLine as unknown as DriverTimingPatch
  const merged = useDriverTimingStore.getState().DriverTiming[racingNumber]
  if (merged?.Retired || merged?.KnockedOut || merged?.Stopped || merged?.InPit) {
    timelines.delete(racingNumber)
    return null
  }

  let t = timelines.get(racingNumber)
  if (!t) {
    t = newTimeline()
    timelines.set(racingNumber, t)
  }
  if (line.PitOut === true) t.isOutLap = true

  // Bulk segment reset (non-zero → 0) means a new lap started and we missed the
  // LastLapTime anchor — usually the fresh timeline already exists by now
  let sawReset = false
  forEachSector(line.Sectors, (s, sector) => {
    forEachSegment(sector.Segments, (i, status) => {
      if (status === 0 && (t!.segStatus[s][i] ?? 0) !== 0) sawReset = true
    })
  })
  if (sawReset) {
    const fresh = newTimeline()
    // keep the line-crossing anchor if the old timeline never got going
    if (!t.hasCrossings && t.exactCumMs.every((v) => v === null)) {
      fresh.startWallMs = t.startWallMs
    }
    fresh.isOutLap = line.PitOut === true
    t = fresh
    timelines.set(racingNumber, t)
  }

  // Apply segment statuses; a 0 → non-zero flip is a minisector completion
  const crossings: Array<[number, number]> = []
  forEachSector(line.Sectors, (s, sector) => {
    forEachSegment(sector.Segments, (i, status) => {
      ensureSegmentSlot(t!, s, i)
      if (t!.segStatus[s][i] === 0 && status !== 0) crossings.push([s, i])
      t!.segStatus[s][i] = status
      if (status === PIT_LANE_STATUS) t!.isOutLap = true
    })
  })
  if (crossings.length > 0) {
    t.hasCrossings = true
    // Batched flips (keyframes) have unknowable times — only the latest gets stamped,
    // the rest are filled by even-spacing when the reference is frozen
    crossings.sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const [ls, li] = crossings[crossings.length - 1]
    t.segWallMs[ls][li] = now
    if (ls === 0 && li === 0 && t.startWallMs === null && reference) {
      // joined mid-stream without a line-crossing anchor: assume reference pace so the
      // delta starts neutral and corrects at the first exact sector boundary
      t.startWallMs = now - reference.cumAtSegment[0][0]
    }
  }

  // Exact sector times → cumulative anchors + exact boundary delta
  let display: QualiDeltaDisplay | null | undefined
  forEachSector(line.Sectors, (s, sector) => {
    if (typeof sector.Value !== 'string' || sector.Value === '') return
    const ms = parseTimeMs(sector.Value)
    if (ms === null) return
    if (t!.exactCumMs[s] !== null) {
      if (s === 0 && Math.abs(t!.exactCumMs[0]! - ms) > 1) {
        // a different S1 time while we still hold one → we missed the lap change
        const fresh = newTimeline()
        fresh.isOutLap = t!.isOutLap
        t = fresh
        timelines.set(racingNumber, t)
      } else {
        return // keyframe re-send of a value we already recorded
      }
    }
    const prevCum = s === 0 ? 0 : t!.exactCumMs[s - 1]
    if (prevCum === null) return // joined mid-lap, cumulative chain is broken
    t!.exactCumMs[s] = prevCum + ms
    t!.sectorWallMs[s] = now
    if (s < 2 && !t!.isOutLap && reference) {
      const cum = t!.exactCumMs[s]!
      const deltaMs = cum - reference.cumAtSector[s]
      const projectedFinish = cum + (reference.lapTimeMs - reference.cumAtSector[s])
      display = buildDisplay(racingNumber, deltaMs, projectedFinish, true, now)
    }
  })

  // Lap completion: arrives at the line crossing, so it both closes this lap and
  // anchors the start of the next one
  const lapValue = line.LastLapTime?.Value
  if (typeof lapValue === 'string' && lapValue !== '') {
    const lapMs = parseTimeMs(lapValue)
    if (lapMs !== null) {
      const flying = !t.isOutLap && t.exactCumMs[0] !== null && t.exactCumMs[1] !== null
      if (flying) {
        const prevBest = bestLapMs.get(racingNumber)
        if (prevBest === undefined || lapMs < prevBest) bestLapMs.set(racingNumber, lapMs)
        const referenceBefore = reference
        if (!reference || lapMs < reference.lapTimeMs) {
          const frozen = freezeReference(t, lapMs)
          if (frozen) reference = frozen
        }
        if (referenceBefore) {
          display = buildDisplay(racingNumber, lapMs - referenceBefore.lapTimeMs, lapMs, true, now)
        }
      }
      const fresh = newTimeline()
      fresh.startWallMs = now
      fresh.isOutLap = line.PitOut === true
      timelines.set(racingNumber, fresh)
      return display
    }
  }

  if (t.isOutLap) return display === undefined ? null : display

  // Estimated delta at a minisector crossing, anchored at the last exact boundary
  if (display === undefined && crossings.length > 0 && reference) {
    const [s, i] = crossings[crossings.length - 1]
    let b = s - 1
    while (b >= 0 && (t.exactCumMs[b] === null || t.sectorWallMs[b] === null)) b--
    const anchorMs = b >= 0 ? t.exactCumMs[b]! : 0
    const anchorWall = b >= 0 ? t.sectorWallMs[b]! : t.startWallMs
    const refCum = reference.cumAtSegment[s]?.[i]
    if (anchorWall !== null && refCum !== undefined) {
      const driverElapsed = anchorMs + (now - anchorWall)
      const projectedFinish = driverElapsed + (reference.lapTimeMs - refCum)
      display = buildDisplay(racingNumber, driverElapsed - refCum, projectedFinish, false, now)
    }
  }
  return display
}

export const useQualiDeltaStore = create<QualiDeltaState>((set, get) => ({
  displays: {},

  ingestTimingPatch: (data: TimingData) => {
    if (useSessionInfoStore.getState().sessionInfo?.Type !== 'Qualifying') return
    if (!data.Lines) return
    const now = Date.now()

    const changes = new Map<string, QualiDeltaDisplay | null>()
    if (typeof data.SessionPart === 'number' && data.SessionPart !== sessionPart) {
      if (sessionPart !== null) {
        // Q1 → Q2 → Q3: classification restarts, but the session-best reference persists
        timelines.clear()
        bestLapMs.clear()
        for (const rn of Object.keys(get().displays)) changes.set(rn, null)
      }
      sessionPart = data.SessionPart
    }

    for (const rn in data.Lines) {
      const result = processLine(rn, data.Lines[rn], now)
      if (result !== undefined) changes.set(rn, result)
    }
    if (changes.size === 0) return

    set((state) => {
      const displays = { ...state.displays }
      let mutated = false
      for (const [rn, d] of changes) {
        if (d === null) {
          if (rn in displays) {
            delete displays[rn]
            mutated = true
          }
        } else {
          displays[rn] = d
          mutated = true
        }
      }
      return mutated ? { displays } : state
    })
  },

  reset: () => {
    timelines.clear()
    bestLapMs.clear()
    reference = null
    sessionPart = null
    set({ displays: {} })
  }
}))
