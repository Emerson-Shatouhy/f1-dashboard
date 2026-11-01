import React, { useEffect, useRef, useState } from 'react'
import { DriverLine } from './Timing/DriverLine'
import { ALIGN_CLASS, getTimingColumns } from './Timing/timingColumns'
import { useSessionInfoStore } from '../stores/sessionInfoStore'
import { useSortedDrivers } from '../hooks/useSortedDrivers'
import { getSessionMode } from '../utils/timing'
import { DriverTableSkeleton } from './Skeletons/DriverTableSkeleton'

export function DriverList(): React.JSX.Element {
  const sortedDrivers = useSortedDrivers()
  const sessionType = useSessionInfoStore((state) => state.sessionInfo?.Type)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tableWidth, setTableWidth] = useState(Infinity)

  const hasDrivers = sortedDrivers.length > 0

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => setTableWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasDrivers])

  if (!hasDrivers) {
    return <DriverTableSkeleton />
  }

  const mode = getSessionMode(sessionType)
  const columns = getTimingColumns(mode, tableWidth)
  const totalWeight = columns.reduce((sum, column) => sum + column.weight, 0)

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto rounded-md bg-surface-1 px-1"
      style={{ fontSize: 'clamp(12px, 1.55vh, 17px)' }}
    >
      <table className="h-full w-full table-fixed border-collapse">
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: `${(column.weight / totalWeight) * 100}%` }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface-1">
          <tr style={{ height: 26 }}>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`${ALIGN_CLASS[column.align ?? 'left']} border-b border-line-strong px-1.5 text-[11px] font-medium text-ink-3`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedDrivers.map((driver) => (
            <DriverLine key={driver.RacingNumber} driver={driver} columns={columns} mode={mode} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
