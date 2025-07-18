import React from 'react'
import type { Driver } from '../../types/liveTimingTypes'
import { DriverBadge } from '../badges/driverBadge'
import { SectorInfo } from './SectorInfo'
import { useDriverTimingStore } from '../../stores/driverTimingStore'
import { useSessionInfoStore } from '../../stores/sessionInfoStore'

interface DriverLineProps {
  driver: Driver
}

export function DriverLine({ driver }: DriverLineProps): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const driverTiming = useDriverTimingStore((state) => state.DriverTiming[driver.RacingNumber])

  if (!driver || !driver.Tla) {
    return <></>
  }

  // Common elements for all driver lines
  const commonCells = (
    <>
      <td className="font-bold text-center p-2 w-8">{driverTiming?.Position || driver.Line}.</td>
      <td className="p-2 w-16">
        <DriverBadge
          driverCode={driver.Tla}
          teamColor={driver.TeamColour}
          driverNumber={driver.RacingNumber}
          isStopped={driverTiming?.Stopped}
          inPit={driverTiming?.InPit}
          pitOut={driverTiming?.PitOut}
        />
      </td>
    </>
  )

  // If the driver is stopped, show minimal information
  if (driverTiming?.Stopped) {
    return (
      <tr className="border-b border-gray-700">
        {commonCells}
        <td className="p-2">-</td>
        <td className="p-2">{driverTiming.Status === 2048 && 'STOPPED'}</td>
      </tr>
    )
  }

  // Render content based on session type
  return (
    <tr className="border-b border-gray-700">
      {commonCells}
      {sessionInfo?.Type === 'Race' ? (
        <>
          <td className="p-2">
            {typeof driverTiming?.IntervalToPositionAhead === 'string'
              ? driverTiming.IntervalToPositionAhead
              : driverTiming?.IntervalToPositionAhead?.Value || 'Interval'}
          </td>
          <td className="p-2">{driverTiming?.GapToLeader || 'Leader'}</td>
          <td className="p-2 flex gap-4 items-center">
            <div className="flex flex-col gap-1">
              <div className={driverTiming?.LastLapTime?.PersonalFastest ? 'text-green-500' : ''}>
                {driverTiming?.LastLapTime?.Value || '-'}
              </div>
              <div className="text-gray-500">{driverTiming?.BestLapTime?.Value || '-'}</div>
            </div>
            <SectorInfo Sectors={driverTiming?.Sectors} isRace={true} />
          </td>
        </>
      ) : sessionInfo?.Type === 'Qualifying' ? (
        <>
          <td className="p-2">
            <div className="flex flex-row gap-4">
              <div className={driverTiming?.Line == 1 ? 'text-purple-500' : ''}>
                {driverTiming?.TimeDiffToFastest ?? (driverTiming?.BestLapTime?.Value || '-')}
              </div>
              <div>{driverTiming?.TimeDiffToPositionAhead ?? '-'}</div>
            </div>
          </td>
          <td className="p-2 flex gap-4 items-center">
            {driverTiming?.KnockedOut ? (
              <div className="text-red-500">KNOCKED OUT</div>
            ) : driverTiming?.Cutoff ? (
              <div className="text-yellow-500">CUTOFF</div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <div
                    className={driverTiming?.LastLapTime?.PersonalFastest ? 'text-green-500' : ''}
                  >
                    {driverTiming?.LastLapTime?.Value || '-'}
                  </div>
                  <div className="text-gray-500">{driverTiming?.BestLapTime?.Value || '-'}</div>
                </div>
                <SectorInfo Sectors={driverTiming?.Sectors} isRace={false} />
              </>
            )}
            {/* <SectorInfo Sectors={driverTiming?.Sectors} /> */}
          </td>
        </>
      ) : sessionInfo?.Type === 'Practice' ? (
        <>
          <td className="p-2">
            <div className="flex flex-row gap-4">
              <div className={driverTiming?.TimeDiffToFastest == null ? 'text-purple-500' : ''}>
                {driverTiming?.TimeDiffToFastest ?? (driverTiming?.BestLapTime?.Value || '-')}
              </div>
              <div>{driverTiming?.TimeDiffToPositionAhead ?? '-'}</div>
            </div>
          </td>
          <td className="p-2 flex gap-4 items-center">
            <div className="flex flex-col gap-1">
              <div className={driverTiming?.LastLapTime?.PersonalFastest ? 'text-green-500' : ''}>
                {driverTiming?.LastLapTime?.Value || '-'}
              </div>
              <div className="text-gray-500">{driverTiming?.BestLapTime?.Value || '-'}</div>
            </div>
            <SectorInfo Sectors={driverTiming?.Sectors} />
          </td>
        </>
      ) : (
        <td className="p-2" colSpan={3}>
          Unknown session type
        </td>
      )}
    </tr>
  )
}
