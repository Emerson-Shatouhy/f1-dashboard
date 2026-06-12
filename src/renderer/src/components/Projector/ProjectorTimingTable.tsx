import React from 'react'
import { useDriverStore } from '@renderer/stores/driverStore'
import { useDriverTimingStore } from '@renderer/stores/driverTimingStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import type { Driver, DriverTiming } from '@renderer/types/liveTimingTypes'
import { getTeamColorHex } from '@renderer/utils/teamFallbacks'

function getDelta(
  driverTiming: DriverTiming | undefined,
  sessionType: string | undefined,
  isLeader: boolean
): string | null {
  if (isLeader || !driverTiming) return null

  if (sessionType === 'Race') {
    const interval = driverTiming.IntervalToPositionAhead
    if (!interval) return driverTiming.GapToLeader || null
    return typeof interval === 'string' ? interval : interval.Value || null
  }

  if (sessionType?.startsWith('Qualifying')) {
    const stats = driverTiming.Stats
    if (!stats) return null
    const key = stats['2'] ? '2' : stats['1'] ? '1' : '0'
    return stats[key]?.TimeDifftoPositionAhead ?? null
  }

  // Practice and everything else
  return driverTiming.TimeDiffToFastest || driverTiming.TimeDiffToPositionAhead || null
}

export function ProjectorTimingTable(): React.JSX.Element {
  const { Drivers } = useDriverStore()
  const { DriverTiming } = useDriverTimingStore()
  const sessionInfo = useSessionInfoStore((s) => s.sessionInfo)
  const sessionType = sessionInfo?.Type

  const sorted = (Object.values(Drivers) as Driver[]).sort((a, b) => {
    const posA = parseInt(DriverTiming[a.RacingNumber]?.Position ?? '') || a.Line
    const posB = parseInt(DriverTiming[b.RacingNumber]?.Position ?? '') || b.Line
    return posA - posB
  })

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-lg tracking-widest uppercase">
        Waiting for data…
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-1.5 pr-1">
      {sorted.map((driver) => {
        const timing = DriverTiming[driver.RacingNumber]
        const pos = timing?.Position ? parseInt(timing.Position) : driver.Line
        const isLeader = pos === 1
        const teamColor = getTeamColorHex(driver)
        const delta = getDelta(timing, sessionType, isLeader)
        const isRetired = timing?.Retired || !timing?.ShowPosition
        const isInPit = timing?.InPit
        const isPitOut = timing?.PitOut

        return (
          <div
            key={driver.RacingNumber}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
              isRetired ? 'bg-red-950/40 border border-red-800/30' : 'bg-gray-800/50 border border-gray-700/40'
            }`}
            style={{ borderLeft: `4px solid ${teamColor}` }}
          >
            {/* Position */}
            <span className="font-black tabular-nums text-white w-8 text-center text-3xl leading-none shrink-0">
              {pos}
            </span>

            {/* TLA + badges */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className="font-black text-3xl leading-none tracking-wider"
                style={{ color: teamColor }}
              >
                {driver.Tla}
              </span>
              {isRetired && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-900/60 text-red-400 uppercase tracking-wider">
                  DNF
                </span>
              )}
              {!isRetired && isInPit && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400 uppercase tracking-wider">
                  PIT
                </span>
              )}
              {!isRetired && !isInPit && isPitOut && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 uppercase tracking-wider">
                  OUT
                </span>
              )}
            </div>

            {/* Delta */}
            <div className="shrink-0 text-right">
              {isLeader ? (
                <span className="font-black text-xl text-purple-400 tracking-widest uppercase">
                  ●
                </span>
              ) : (
                <span className="font-mono text-xl font-semibold text-gray-300 tabular-nums">
                  {delta ?? '—'}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
