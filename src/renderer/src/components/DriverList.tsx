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
      <tr className="border-b-2 border-gray-700 bg-gray-800/50">
        <th className="px-2 py-3 text-center text-md font-semibold text-gray-300 uppercase tracking-wider"></th>
        <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
        {sessionType === 'Race' && (
          <>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden sm:table-cell"></th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden md:table-cell"></th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
            <th className="px-2 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider hidden lg:table-cell"></th>
          </>
        )}
        {(sessionType === 'Qualifying' || sessionType === 'Practice') && (
          <>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden sm:table-cell"></th>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"></th>
            <th className="px-2 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider hidden lg:table-cell"></th>
          </>
        )}
      </tr>
    )
  }

  return (
    <div className="w-full overflow-hidden border-2 border-gray-700 rounded-lg bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="sticky top-0 z-10">{getTableHeaders()}</thead>
          <tbody className="divide-y divide-gray-700">
            {sortedDrivers.map((driver) => (
              <DriverLine key={driver.Tla} driver={driver} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
