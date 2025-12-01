import React from 'react'
import type { Driver, TimingAppLine } from '../../types/liveTimingTypes'
import { DriverBadge } from '../badges/driverBadge'
import { SectorInfo } from './SectorInfo'
import { useDriverTimingStore } from '../../stores/driverTimingStore'
import { useSessionInfoStore } from '../../stores/sessionInfoStore'
import { useTimingAppDataStore } from '@renderer/stores/timingAppDataStore'
import { TireBadge } from '../liveTiming/TireBadge'

interface DriverLineProps {
  driver: Driver
}

export function DriverLine({ driver }: DriverLineProps): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const driverTiming = useDriverTimingStore((state) => state.DriverTiming[driver.RacingNumber])
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

  // Common elements for all driver lines
  const commonCells = (
    <>
      <td className="font-bold text-center px-0 py-3 text-lg sm:text-xl lg:text-2xl xl:text-3xl">
        {driverTiming?.Position || driver.Line}.
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
      <tr className="hover:bg-gray-800/50 transition-colors">
        {commonCells}
        <td className="px-2 py-3 text-sm sm:text-base lg:text-lg text-gray-500 hidden sm:table-cell">
          -:--.---
        </td>
        <td className="px-2 py-3 text-sm sm:text-base lg:text-lg text-red-400 hidden md:table-cell">
          -:--.---
        </td>
        <td className="px-2 py-3 text-sm sm:text-base lg:text-lg font-medium text-red-400">
          {driverTiming.Status === 2048 && 'STOPPED'}
        </td>
        <td className="px-2 py-3 text-center hidden lg:table-cell">-</td>
      </tr>
    )
  }

  // Render content based on session type
  return (
    <tr className="hover:bg-gray-800/50 transition-colors">
      {commonCells}
      {sessionInfo?.Type === 'Race' ? (
        <>
          <td className="px-2 py-3 text-sm sm:text-base lg:text-lg hidden sm:table-cell">
            {typeof driverTiming?.IntervalToPositionAhead === 'string'
              ? driverTiming.IntervalToPositionAhead
              : driverTiming?.IntervalToPositionAhead?.Value || 'Interval'}
          </td>
          <td className="px-2 py-3 text-sm sm:text-base lg:text-lg hidden md:table-cell">
            {driverTiming?.GapToLeader || 'Leader'}
          </td>
          <td className="px-2 py-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
              <div className="flex flex-col gap-1 min-w-0">
                <div
                  className={`text-base sm:text-lg lg:text-xl font-mono font-bold ${
                    driverTiming?.LastLapTime?.PersonalFastest ? 'text-green-400' : 'text-gray-200'
                  }`}
                >
                  {driverTiming?.LastLapTime?.Value || '-'}
                </div>
                <div className="text-sm sm:text-base lg:text-lg text-gray-500 font-mono">
                  {driverTiming?.BestLapTime?.Value || '-'}
                </div>
              </div>
              <div className="hidden sm:block">
                <SectorInfo Sectors={driverTiming?.Sectors} isRace={true} />
              </div>
            </div>
          </td>
          <td className="px-2 py-3 text-center hidden lg:table-cell">
            {stintInfo ? (
              <TireBadge stint={currentStint} />
            ) : (
              <span className="text-xs text-gray-500">-</span>
            )}
          </td>
        </>
      ) : sessionInfo?.Type === 'Qualifying' ? (
        <>
          <td className="px-0 py-3 text-base sm:text-lg lg:text-xl hidden sm:table-cell">
            <div className="flex flex-col gap-1">
              <div
                className={`font-mono font-bold ${
                  driverTiming?.Line == 1 ? 'text-purple-400' : 'text-gray-200'
                }`}
              >
                {driverTiming?.TimeDiffToFastest ?? (driverTiming?.BestLapTime?.Value || '-')}
              </div>
              <div className="text-sm sm:text-base lg:text-lg text-gray-500">
                {driverTiming?.TimeDiffToFastest ?? '-'}
              </div>
            </div>
          </td>
          <td className="px-2 py-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
              {driverTiming?.KnockedOut ? (
                <div className="text-red-400 text-base sm:text-lg lg:text-xl font-bold">OUT</div>
              ) : (
                <>
                  {/* <div className="flex flex-col gap-1 min-w-0">
                    <div
                      className={`text-base sm:text-lg lg:text-xl font-mono font-bold ${driverTiming?.LastLapTime?.PersonalFastest
                          ? 'text-green-400'
                          : 'text-gray-200'
                        }`}
                    >
                      {driverTiming?.LastLapTime?.Value || '-'}
                    </div>
                    <div className="text-sm sm:text-base lg:text-lg text-gray-500 font-mono">
                      {driverTiming?.BestLapTime?.Value || '-'}
                    </div>
                  </div> */}
                  <div className="hidden sm:block">
                    <SectorInfo Sectors={driverTiming?.Sectors} isRace={false} />
                  </div>
                </>
              )}
            </div>
          </td>
          <td className="px-2 py-3 text-center hidden lg:table-cell">
            {stintInfo ? (
              <TireBadge stint={currentStint} />
            ) : (
              <span className="text-xs text-gray-500">-</span>
            )}
          </td>
        </>
      ) : sessionInfo?.Type === 'Practice' ? (
        <>
          <td className="px-2 py-3 text-sm sm:text-base lg:text-lg hidden sm:table-cell">
            <div className="flex flex-col gap-1">
              <div
                className={`font-mono font-bold text-base sm:text-lg lg:text-xl ${
                  driverTiming?.TimeDiffToFastest == null ? 'text-purple-400' : 'text-gray-200'
                }`}
              >
                {driverTiming?.TimeDiffToFastest ?? (driverTiming?.BestLapTime?.Value || '-')}
              </div>
              <div className="text-sm sm:text-base lg:text-lg text-gray-500">
                {driverTiming?.TimeDiffToPositionAhead ?? '-'}
              </div>
            </div>
          </td>
          <td className="px-2 py-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
              <div className="flex flex-col gap-1 min-w-0">
                <div
                  className={`text-base sm:text-lg lg:text-xl font-mono font-bold ${
                    driverTiming?.LastLapTime?.PersonalFastest ? 'text-green-400' : 'text-gray-200'
                  }`}
                >
                  {driverTiming?.LastLapTime?.Value || '-'}
                </div>
                <div className="text-sm sm:text-base lg:text-lg text-gray-500 font-mono">
                  {driverTiming?.BestLapTime?.Value || '-'}
                </div>
              </div>
              <div className="hidden sm:block">
                <SectorInfo Sectors={driverTiming?.Sectors} />
              </div>
            </div>
          </td>
          <td className="px-2 py-3 text-center hidden lg:table-cell">
            {stintInfo ? (
              <TireBadge stint={currentStint} />
            ) : (
              <span className="text-xs text-gray-500">-</span>
            )}
          </td>
        </>
      ) : (
        <td className="px-2 py-3 text-sm text-gray-500" colSpan={4}>
          Unknown session type
        </td>
      )}
    </tr>
  )
}
