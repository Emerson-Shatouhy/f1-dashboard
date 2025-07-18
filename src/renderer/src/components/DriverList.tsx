import React from 'react'
import { DriverLine } from './Timing/DriverLine'
import { useDriverStore } from '../stores/driverStore'
import { useDriverTimingStore } from '../stores/driverTimingStore'
import { Driver } from '../types/liveTimingTypes'

export function DriverList(): React.JSX.Element {
  const { Drivers } = useDriverStore()
  const { DriverTiming } = useDriverTimingStore()

  // Sort drivers by position (from timing data) or fallback to line number
  const sortedDrivers = (Object.values(Drivers) as Driver[]).sort(
    (a: Driver, b: Driver) => {
      const timingA = DriverTiming[a.RacingNumber]
      const timingB = DriverTiming[b.RacingNumber]

      const positionA = timingA?.Position ? parseInt(timingA.Position) : a.Line
      const positionB = timingB?.Position ? parseInt(timingB.Position) : b.Line

      return positionA - positionB
    }
  )

  if (Object.keys(Drivers).length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-lg text-gray-600">No drivers available</div>
      </div>
    )
  }

  return (
    <div className="w-full p-4 border-2 border-gray-700">
      <table className="w-full text-left table-fixed">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="w-3 p-2 text-center"></th>
            <th className="w-10 p-2"></th>
            <th className="w-10 p-2"></th>
            <th className="w-10 p-2"></th>
            <th className="w-24 p-2 text-center"></th>
          </tr>
        </thead>
        <tbody>
          {sortedDrivers.map((driver) => (
            <DriverLine key={driver.Line} driver={driver} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
