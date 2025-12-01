import React, { useMemo } from 'react'
import { useDriverStore } from '../../stores/driverStore'
import { useTimingAppDataStore } from '../../stores/timingAppDataStore'
import { useDriverComparisonStore } from '../../stores/driverComparisonStore'
import { Driver } from '../../types/liveTimingTypes'

interface LapData {
  lapNumber: number
  times: Record<string, string> // racingNumber -> lapTime
  compounds: Record<string, string>
}

export function DriverComparisonPanel(): React.JSX.Element {
  const selectedDriverNumbers = useDriverComparisonStore((state) => state.selectedDriverNumbers)
  const clearSelection = useDriverComparisonStore((state) => state.clearSelection)
  const { Drivers } = useDriverStore()
  const timingAppData = useTimingAppDataStore((state) => state.TimingAppData)

  const selectedDrivers = selectedDriverNumbers
    .map((num) => Drivers[num])
    .filter((driver): driver is Driver => driver !== undefined)

  // Build lap history table
  const lapHistoryData = useMemo(() => {
    const lapMap: Record<number, LapData> = {}

    selectedDrivers.forEach((driver) => {
      const stintInfo = timingAppData[driver.RacingNumber]
      const stints = stintInfo?.Stints || {}

      Object.entries(stints).forEach(([_, stint]) => {
        if (stint.LapNumber && stint.LapTime) {
          const lapNum = stint.LapNumber
          if (!lapMap[lapNum]) {
            lapMap[lapNum] = {
              lapNumber: lapNum,
              times: {},
              compounds: {}
            }
          }
          lapMap[lapNum].times[driver.RacingNumber] = stint.LapTime
          lapMap[lapNum].compounds[driver.RacingNumber] = stint.Compound
        }
      })
    })

    return Object.values(lapMap)
      .sort((a, b) => a.lapNumber - b.lapNumber)
      .reverse()
  }, [selectedDrivers, timingAppData])

  if (selectedDrivers.length === 0) {
    return (
      <div className="w-full h-full border-2 border-gray-700 rounded-lg bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-2">Select drivers to compare</p>
          <p className="text-xs text-gray-500">Click on driver rows to select them</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full border-2 border-gray-700 rounded-lg bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-gray-800/50">
        <h2 className="text-lg font-semibold text-white">Lap Comparison</h2>
        <button
          onClick={clearSelection}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-800/70 border-b border-gray-700">
            <tr>
              <th className="px-3 py-2 text-left text-gray-400 font-semibold border-r border-gray-700">
                Lap
              </th>
              {selectedDrivers.map((driver) => (
                <th
                  key={driver.RacingNumber}
                  className="px-3 py-2 text-center border-r border-gray-700 min-w-[120px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: `#${driver.TeamColour}` }}
                    ></div>
                    <span className="font-bold text-white">{driver.Tla}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lapHistoryData.map((lap, idx) => (
              <tr key={lap.lapNumber} className={idx % 2 === 0 ? 'bg-gray-800/20' : ''}>
                <td className="px-3 py-2 text-gray-400 border-r border-gray-700 font-mono">
                  {lap.lapNumber}
                </td>
                {selectedDrivers.map((driver) => {
                  const lapTime = lap.times[driver.RacingNumber]
                  const compound = lap.compounds[driver.RacingNumber]

                  return (
                    <td
                      key={driver.RacingNumber}
                      className="px-3 py-2 text-center border-r border-gray-700 border-b border-gray-700/50"
                    >
                      {lapTime ? (
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-gray-200">{lapTime}</span>
                          {compound && (
                            <span className="text-xs text-gray-500 uppercase">{compound}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
