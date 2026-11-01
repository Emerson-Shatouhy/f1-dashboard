import React from 'react'
import { useDriverTimingStore } from '@renderer/stores/driverTimingStore'
import { useTimingAppDataStore } from '@renderer/stores/timingAppDataStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useSortedDrivers } from '@renderer/hooks/useSortedDrivers'
import { TireBadge } from '@renderer/components/liveTiming/TireBadge'
import type { Driver } from '@renderer/types/liveTimingTypes'
import { getTeamColorHex } from '@renderer/utils/teamFallbacks'
import {
  DRIVER_STATUS_CLASS,
  getCurrentStint,
  getCutoffPosition,
  getDriverStatus,
  getGapAhead,
  getGapToFirst,
  getSessionMode,
  isDriverInactive,
  isLeader,
  type SessionMode
} from '@renderer/utils/timing'

function LeaderboardRow({
  driver,
  mode
}: {
  driver: Driver
  mode: SessionMode
}): React.JSX.Element {
  const timing = useDriverTimingStore((state) => state.DriverTiming[driver.RacingNumber])
  const stintLine = useTimingAppDataStore((state) => state.TimingAppData[driver.RacingNumber])
  const sessionPart = useDriverTimingStore((state) => state.SessionPart)
  const cutoffPosition = useDriverTimingStore((state) =>
    mode === 'quali' ? getCutoffPosition(state.SessionPart, state.NoEntries) : null
  )

  const status = getDriverStatus(timing)
  const inactive = isDriverInactive(status, mode)
  // Practice ranks by gap to the fastest lap; race and quali read better as gap to the car ahead
  const delta =
    mode === 'practice'
      ? getGapToFirst(timing, mode, sessionPart)
      : getGapAhead(timing, mode, sessionPart)

  return (
    <div
      className={`flex min-h-0 flex-1 items-center gap-[0.5em] px-[0.5em] tabular-nums ${
        inactive ? 'text-ink opacity-50' : 'text-ink'
      } ${
        cutoffPosition !== null && Number(timing?.Position) === cutoffPosition
          ? 'border-b-2 border-danger'
          : 'border-b border-line'
      }`}
    >
      <span className="w-[1.5em] shrink-0 text-center font-semibold">
        {timing?.Position || driver.Line}
      </span>
      <span
        className="h-[1.1em] w-[4px] shrink-0 rounded-full"
        style={{ backgroundColor: getTeamColorHex(driver) }}
      />
      <span className="font-bold tracking-wide">{driver.Tla}</span>
      {status && (
        <span className={`rounded px-1 text-[0.5em] font-semibold ${DRIVER_STATUS_CLASS[status]}`}>
          {status}
        </span>
      )}
      <span className="ml-auto text-right font-medium whitespace-nowrap">
        {isLeader(timing) ? <span className="text-ink-3">Leader</span> : delta || '—'}
      </span>
      <span className="flex w-[1.4em] shrink-0 justify-end">
        <TireBadge stint={getCurrentStint(stintLine)} hideAge />
      </span>
    </div>
  )
}

export function ProjectorTimingTable(): React.JSX.Element {
  const sorted = useSortedDrivers()
  const sessionType = useSessionInfoStore((s) => s.sessionInfo?.Type)
  const mode = getSessionMode(sessionType)

  if (sorted.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-md bg-surface-1 text-lg text-ink-3">
        Waiting for timing data…
      </div>
    )
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-md bg-surface-1"
      style={{ fontSize: 'clamp(13px, 2.5vh, 30px)' }}
    >
      {sorted.map((driver) => (
        <LeaderboardRow key={driver.RacingNumber} driver={driver} mode={mode} />
      ))}
    </div>
  )
}
