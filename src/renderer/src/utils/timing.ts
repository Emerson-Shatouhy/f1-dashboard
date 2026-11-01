import type { DriverTiming, Stint, TimingAppLine } from '../types/liveTimingTypes'

export type SessionMode = 'race' | 'quali' | 'practice'

export type DriverStatus = 'DNF' | 'KO' | 'FIN' | 'STOP' | 'PIT' | 'OUT'

// TimingData Status bit set at the driver's first line crossing after the chequered flag.
// Verified against AUS race, FP1 and quali logs: never set before a flag, clears between Q parts.
const STATUS_TOOK_FLAG = 1024

export const DRIVER_STATUS_CLASS: Record<DriverStatus, string> = {
  DNF: 'bg-danger/20 text-danger',
  KO: 'bg-surface-3 text-ink-2',
  FIN: 'bg-surface-3 text-ink',
  STOP: 'bg-danger/20 text-danger',
  PIT: 'bg-pit/20 text-pit',
  OUT: 'bg-surface-3 text-ink'
}

// Sprint sessions report Type 'Race' / 'Qualifying'; anything unrecognised reads as practice
export function getSessionMode(sessionType: string | undefined): SessionMode {
  if (sessionType === 'Race') return 'race'
  if (sessionType?.startsWith('Qualifying')) return 'quali'
  return 'practice'
}

// Drop (not round) to 2 decimal places: "1:23.456" → "1:23.45"
export function truncateLapTime(value: string | undefined): string {
  if (!value) return '—'
  const dotIdx = value.lastIndexOf('.')
  if (dotIdx === -1) return value
  return value.slice(0, dotIdx + 3)
}

export function isLeader(timing: DriverTiming | undefined): boolean {
  return timing?.Line === 1
}

export function getInterval(timing: DriverTiming | undefined): string | undefined {
  const interval = timing?.IntervalToPositionAhead as
    | DriverTiming['IntervalToPositionAhead']
    | string
    | undefined
  return typeof interval === 'string' ? interval : interval?.Value
}

// Stats are keyed by Q part (0=Q1, 1=Q2, 2=Q3); the latest part present is the current one
function getQualiStats(
  timing: DriverTiming | undefined
): DriverTiming['Stats'][string] | undefined {
  const stats = timing?.Stats
  if (!stats) return undefined
  return stats['2'] ?? stats['1'] ?? stats['0']
}

export function getGapAhead(
  timing: DriverTiming | undefined,
  mode: SessionMode
): string | undefined {
  if (mode === 'race') return getInterval(timing)
  if (mode === 'quali') return getQualiStats(timing)?.TimeDifftoPositionAhead
  return timing?.TimeDiffToPositionAhead
}

export function getGapToFirst(
  timing: DriverTiming | undefined,
  mode: SessionMode
): string | undefined {
  if (mode === 'race') return timing?.GapToLeader
  if (mode === 'quali') return getQualiStats(timing)?.TimeDiffToFastest
  return timing?.TimeDiffToFastest
}

export function getDriverStatus(timing: DriverTiming | undefined): DriverStatus | null {
  if (!timing) return null
  if (timing.Retired) return 'DNF'
  if (timing.KnockedOut) return 'KO'
  // Ahead of STOP: cars park after the flag, and that shouldn't read as a problem
  if (hasTakenFlag(timing)) return 'FIN'
  if (timing.Stopped) return 'STOP'
  if (timing.InPit) return 'PIT'
  if (timing.PitOut) return 'OUT'
  return null
}

export function hasTakenFlag(timing: DriverTiming | undefined): boolean {
  return ((timing?.Status ?? 0) & STATUS_TOOK_FLAG) !== 0
}

// Done for the session; these rows render greyed out
export function isDriverInactive(status: DriverStatus | null): boolean {
  return status === 'DNF' || status === 'KO' || status === 'FIN' || status === 'STOP'
}

export function getCurrentStint(line: TimingAppLine | undefined): Stint | undefined {
  const stints = line?.Stints
  if (!stints) return undefined
  const latest = Object.keys(stints).sort((a, b) => parseInt(b) - parseInt(a))[0]
  return latest === undefined ? undefined : stints[latest]
}
