import React from 'react'
import { DriverLine } from './Timing/DriverLine'
import { useDriverStore } from '../stores/driverStore'
import { useDriverTimingStore } from '../stores/driverTimingStore'
import { useSessionInfoStore } from '../stores/sessionInfoStore'
import { Driver } from '../types/liveTimingTypes'
import { DriverTableSkeleton } from './Skeletons/DriverTableSkeleton'

export function DriverList(): React.JSX.Element {
  const { Drivers } = useDriverStore()
  const { DriverTiming } = useDriverTimingStore()
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)

  // Sort drivers by position (from timing data) or fallback to line number
  const sortedDrivers = (Object.values(Drivers) as Driver[]).sort((a: Driver, b: Driver) => {
    const timingA = DriverTiming[a.RacingNumber]
    const timingB = DriverTiming[b.RacingNumber]

    const positionA = timingA?.Position ? parseInt(timingA.Position) : a.Line
    const positionB = timingB?.Position ? parseInt(timingB.Position) : b.Line

    return positionA - positionB
  })

  if (Object.keys(Drivers).length === 0) {
    return <DriverTableSkeleton />
  }

  const getTableHeaders = (): React.JSX.Element => {
    const sessionType = sessionInfo?.Type

    return (
      <tr className="bg-transparent">
        <th className="px-1 py-3 text-center text-md font-semibold text-gray-300 uppercase tracking-wider"></th>
        <th className="px-1 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
        {sessionType === 'Race' && (
          <>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden lg:table-cell"></th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden xl:table-cell"></th>
            <th className="px-2 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider hidden 2xl:table-cell"></th>
          </>
        )}
        {(sessionType === 'Qualifying' || sessionType === 'Practice') && (
          <>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden sm:table-cell"></th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden sm:table-cell"></th>
            <th className="px-2 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider hidden lg:table-cell"></th>
          </>
        )}
      </tr>
    )
  }

  // pos + driver badge + session-specific cols
  const colSpan =
    sessionInfo?.Type === 'Race'
      ? 7 // pos, badge, interval, gap, times, sectors, tire
      : sessionInfo?.Type === 'Qualifying' || sessionInfo?.Type === 'Practice'
        ? 6 // pos, badge, gap/diff, times, sectors, tire
        : 4

  return (
    <div className="w-full rounded-lg bg-gray-900 p-2">
      <div className="overflow-hidden">
        <table className="w-full table-auto border-separate border-spacing-y-1.5">
          <thead className="sticky top-0 z-10">{getTableHeaders()}</thead>
          <tbody>
            {sortedDrivers.map((driver) => (
              <DriverLine key={driver.Tla} driver={driver} colSpan={colSpan} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
