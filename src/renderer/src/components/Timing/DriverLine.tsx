import React, { useState } from 'react'
import type { Driver, TimingAppLine } from '../../types/liveTimingTypes'
import { DriverBadge } from '../badges/driverBadge'
import { SectorInfo } from './SectorInfo'
import { useDriverTimingStore } from '../../stores/driverTimingStore'
import { useSessionInfoStore } from '../../stores/sessionInfoStore'
import { useTimingAppDataStore } from '@renderer/stores/timingAppDataStore'
import { useTimingStatsStore } from '@renderer/stores/timingStatsStore'
import { TireBadge } from '../liveTiming/TireBadge'
import { DriverExpandedRow } from './DriverExpandedRow'
import { useExpandedDriversStore } from '@renderer/stores/expandedDriversStore'
import { useNavigationStore } from '../../stores/navigationStore'

// Drop (not round) to 2 decimal places: "1:23.456" → "1:23.45"
function truncateLapTime(value: string | undefined): string {
  if (!value) return '-'
  const dotIdx = value.lastIndexOf('.')
  if (dotIdx === -1) return value
  return value.slice(0, dotIdx + 3)
}

interface DriverLineProps {
  driver: Driver
  colSpan: number
}

export function DriverLine({ driver, colSpan }: DriverLineProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const toggleExpanded = useExpandedDriversStore((state) => state.toggle)
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const driverTiming = useDriverTimingStore((state) => state.DriverTiming[driver.RacingNumber])
  const timingStats = useTimingStatsStore((state) => state.timingStats)
  const driverStats = timingStats?.Lines?.[driver.RacingNumber]
  const isLeader = driverTiming?.Line === 1
  const projectorMode = useNavigationStore((s) => s.projectorMode)

  // Font size helpers for projector mode
  const textSm = projectorMode ? 'text-base sm:text-lg lg:text-xl' : 'text-xs sm:text-sm lg:text-base'
  const textBase = projectorMode ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-sm sm:text-base lg:text-lg'
  const textPos = projectorMode ? 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl' : 'text-base sm:text-lg lg:text-xl xl:text-2xl'
  const stintInfo = useTimingAppDataStore(
    (state) => state.TimingAppData[driver.RacingNumber]
  ) as TimingAppLine
  const currentStint =
    stintInfo?.Stints && Object.keys(stintInfo.Stints).length > 0
      ? stintInfo.Stints[Object.keys(stintInfo.Stints).sort((a, b) => parseInt(b) - parseInt(a))[0]]
      : undefined

  if (!driver || !driver.Tla) {
    return <></>
  }

  const handleRowClick = (): void => {
    setExpanded((prev) => !prev)
    toggleExpanded(driver.RacingNumber)
  }
  const teamColor = driver.TeamColour ? `#${driver.TeamColour}` : '#ffffff'

  const rowStyle = {
    borderLeft: `3px solid ${teamColor}`
  }

  // Projector mode: simplified row — pos, TLA + status, delta, tire only
  if (projectorMode) {
    const projectorDelta = isLeader
      ? null
      : sessionInfo?.Type === 'Race'
        ? (typeof driverTiming?.IntervalToPositionAhead === 'string'
          ? driverTiming.IntervalToPositionAhead
          : driverTiming?.IntervalToPositionAhead?.Value)
        : sessionInfo?.Type === 'Qualifying'
          ? (() => {
              const s = driverTiming?.Stats?.['2'] ? '2' : driverTiming?.Stats?.['1'] ? '1' : '0'
              return driverTiming?.Stats?.[s]?.TimeDifftoPositionAhead
            })()
          : driverTiming?.TimeDiffToFastest

    const isStopped = driverTiming?.Stopped
    const rowBg = isStopped
      ? 'bg-red-950/30 border border-red-800/40'
      : 'bg-gray-800/60 border border-gray-700/60'

    return (
      <tr style={rowStyle} className={`${rowBg} rounded-lg`}>
        <td className={`font-bold text-center px-3 py-4 ${textPos} rounded-l-lg`}>
          {driverTiming?.Position || driver.Line}
        </td>
        <td className="px-3 py-4">
          <div className="flex items-center gap-3">
            <span className={`font-bold ${textPos}`}>{driver.Tla}</span>
            {driverTiming?.Retired && (
              <span className={`${textPos} px-3 py-1 rounded-full text-black font-bold`} style={{ backgroundColor: teamColor }}>DNF</span>
            )}
            {!driverTiming?.Retired && driverTiming?.InPit && (
              <span className={`${textPos} px-3 py-1 rounded-full text-black font-bold`} style={{ backgroundColor: teamColor }}>PIT</span>
            )}
            {!driverTiming?.Retired && driverTiming?.PitOut && (
              <span className={`${textPos} px-3 py-1 rounded-full text-black font-bold`} style={{ backgroundColor: teamColor }}>OUT</span>
            )}
          </div>
        </td>
        <td className={`px-3 py-4 font-mono ${textPos}`}>
          {isLeader
            ? <span className="text-purple-400 font-semibold">LEADER</span>
            : <span className="text-gray-200">{projectorDelta || '-'}</span>
          }
        </td>
        <td className="px-3 py-4 rounded-r-lg">
          {stintInfo
            ? <TireBadge stint={currentStint} large />
            : <span className={`${textPos} text-gray-500`}>-</span>
          }
        </td>
      </tr>
    )
  }

  const commonCells = (
    <>
      <td className={`font-bold text-center px-2 py-3 ${textPos} rounded-l-lg`}>
        {driverTiming?.Position || driver.Line}
      </td>
      <td className="px-1 py-3">
        <DriverBadge
          driverCode={driver.Tla}
          teamColor={driver.TeamColour}
          teamName={driver.TeamName}
          driverNumber={driver.RacingNumber}
          isStopped={driverTiming?.Stopped}
          inPit={driverTiming?.InPit}
          pitOut={driverTiming?.PitOut}
          retired={driverTiming?.Retired}
        />
      </td>
    </>
  )

  // If the driver is stopped, show minimal information
  if (driverTiming?.Stopped) {
    return (
      <>
        <tr
          style={rowStyle}
          className="bg-red-950/30 border border-red-800/40 rounded-lg transition-colors cursor-pointer hover:bg-red-950/50"
          onClick={handleRowClick}
        >
          {commonCells}
          <td className={`px-2 py-3 ${textSm} text-gray-500 hidden sm:table-cell`}>
            -:--.---
          </td>
          <td className={`px-2 py-3 ${textSm} text-red-400 hidden md:table-cell`}>
            -:--.---
          </td>
          <td className={`px-2 py-3 ${textSm} font-medium text-red-400`}>
            {driverTiming.Status === 2048 && 'STOPPED'}
          </td>
          <td className="px-2 py-3 text-center rounded-r-lg hidden lg:table-cell">-</td>
        </tr>
        {expanded && (
          <DriverExpandedRow
            racingNumber={driver.RacingNumber}
            colSpan={colSpan}
          />
        )}
      </>
    )
  }

  return (
    <>
      <tr
        style={rowStyle}
        className="bg-gray-800/60 border border-gray-700/60 rounded-lg transition-colors cursor-pointer hover:bg-gray-700/60"
        onClick={handleRowClick}
      >
        {commonCells}
        {sessionInfo?.Type === 'Race' ? (
          <>
            <td className={`px-2 py-3 ${textSm}`}>
              {isLeader ? (
                <span className={`text-purple-400 ${textSm} font-semibold`}>LEADER</span>
              ) : typeof driverTiming?.IntervalToPositionAhead === 'string' ? (
                driverTiming.IntervalToPositionAhead
              ) : (
                driverTiming?.IntervalToPositionAhead?.Value || 'Interval'
              )}
            </td>
            <td className={`px-2 py-3 ${textSm} hidden lg:table-cell`}>
              {isLeader ? 'Leader' : driverTiming?.GapToLeader}
            </td>
            <td className="px-2 py-3">
              <div className="flex flex-col gap-1 min-w-0">
                <div
                  className={`${textBase} font-mono font-bold ${driverTiming?.LastLapTime?.PersonalFastest ? 'text-green-400' : 'text-gray-200'}`}
                >
                  {truncateLapTime(driverTiming?.LastLapTime?.Value)}
                </div>
                <div className={`${textSm} text-gray-500 font-mono`}>
                  {truncateLapTime(driverTiming?.BestLapTime?.Value)}
                </div>
              </div>
            </td>
            <td className="px-2 py-3 hidden xl:table-cell">
              <SectorInfo
                Sectors={driverTiming?.Sectors}
                BestSectors={driverStats?.BestSectors}
                isRace={true}
              />
            </td>
            <td className="pl-2 pr-4 py-3 text-center rounded-r-lg hidden 2xl:table-cell">
              {stintInfo ? (
                <TireBadge stint={currentStint} />
              ) : (
                <span className="text-xs text-gray-500">-</span>
              )}
            </td>
          </>
        ) : sessionInfo?.Type === 'Qualifying' ? (
          <>
            <td className={`px-0 py-3 ${textBase} hidden sm:table-cell`}>
              <div className="flex flex-col gap-1">
                <div
                  className={`font-mono font-bold ${driverTiming?.Line == 1 ? 'text-purple-400' : 'text-gray-200'}`}
                >
                  {truncateLapTime(driverTiming?.BestLapTime?.Value)}
                </div>
                <div className={`${textSm} text-gray-500`}>
                  {(() => {
                    if (driverTiming?.Line == 1) return '-'
                    const currentSession = driverTiming?.Stats?.['2']
                      ? '2'
                      : driverTiming?.Stats?.['1']
                        ? '1'
                        : '0'
                    return driverTiming?.Stats?.[currentSession]?.TimeDifftoPositionAhead ?? '-'
                  })()}
                </div>
              </div>
            </td>
            <td className="px-2 py-3 hidden sm:table-cell">
              {driverTiming?.KnockedOut ? (
                <div className={`text-red-400 ${textBase} font-bold`}>OUT</div>
              ) : (
                <SectorInfo
                  Sectors={driverTiming?.Sectors}
                  BestSectors={driverStats?.BestSectors}
                  isRace={false}
                />
              )}
            </td>
            <td className="pl-2 pr-4 py-3 text-center rounded-r-lg hidden lg:table-cell">
              {stintInfo ? (
                <TireBadge stint={currentStint} />
              ) : (
                <span className="text-xs text-gray-500">-</span>
              )}
            </td>
          </>
        ) : sessionInfo?.Type === 'Practice' ? (
          <>
            <td className={`px-2 py-3 ${textSm} hidden sm:table-cell`}>
              <div className="flex flex-col gap-1">
                <div
                  className={`font-mono font-bold ${textBase} ${driverTiming?.TimeDiffToFastest == null ? 'text-purple-400' : 'text-gray-200'}`}
                >
                  {isLeader ? (
                    <span className={`text-purple-400 ${textSm} font-semibold`}>LEADER</span>
                  ) : (
                    (driverTiming?.TimeDiffToFastest ?? (driverTiming?.BestLapTime?.Value || '-'))
                  )}
                </div>
                <div className={`${textSm} text-gray-500`}>
                  {isLeader
                    ? '-'
                    : (driverTiming?.TimeDiffToPositionAhead ?? (
                      <span className={`text-purple-400 ${textSm}`}>LEADER</span>
                    ))}
                </div>
              </div>
            </td>
            <td className="px-2 py-3">
              <div className="flex flex-col gap-1 min-w-0">
                <div
                  className={`${textBase} font-mono font-bold ${driverTiming?.LastLapTime?.PersonalFastest ? 'text-green-400' : 'text-gray-200'}`}
                >
                  {truncateLapTime(driverTiming?.LastLapTime?.Value)}
                </div>
                <div className={`${textSm} text-gray-500 font-mono`}>
                  {truncateLapTime(driverTiming?.BestLapTime?.Value)}
                </div>
              </div>
            </td>
            <td className="px-2 py-3 hidden sm:table-cell">
              <SectorInfo
                Sectors={driverTiming?.Sectors}
                BestSectors={driverStats?.BestSectors}
              />
            </td>
            <td className="pl-2 pr-4 py-3 text-center rounded-r-lg hidden lg:table-cell">
              {stintInfo ? (
                <TireBadge stint={currentStint} />
              ) : (
                <span className="text-xs text-gray-500">-</span>
              )}
            </td>
          </>
        ) : (
          <td className="px-2 py-3 text-sm text-gray-500 rounded-r-lg" colSpan={4}>
            Unknown session type
          </td>
        )}
      </tr>
      {expanded && (
        <DriverExpandedRow
          racingNumber={driver.RacingNumber}
          colSpan={colSpan}
        />
      )}
    </>
  )
}
