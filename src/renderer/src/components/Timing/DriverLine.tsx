import React from 'react'
import type { Driver } from '../../types/liveTimingTypes'
import { SectorCell } from './SectorInfo'
import { QualiDelta } from './QualiDelta'
import { useDriverTimingStore } from '../../stores/driverTimingStore'
import { useTimingAppDataStore } from '@renderer/stores/timingAppDataStore'
import { TireBadge } from '../liveTiming/TireBadge'
import { DriverExpandedRow } from './DriverExpandedRow'
import { useExpandedDriversStore } from '@renderer/stores/expandedDriversStore'
import { getTeamColorHex } from '../../utils/teamFallbacks'
import {
  DRIVER_STATUS_CLASS,
  getCurrentStint,
  getCutoffPosition,
  getDriverStatus,
  getGapAhead,
  getGapToFirst,
  isDriverInactive,
  isLeader,
  truncateLapTime,
  type SessionMode
} from '../../utils/timing'
import { ALIGN_CLASS, type ColumnKey, type TimingColumn } from './timingColumns'

interface DriverLineProps {
  driver: Driver
  columns: TimingColumn[]
  mode: SessionMode
}

export const DriverLine = React.memo(function DriverLine({
  driver,
  columns,
  mode
}: DriverLineProps): React.JSX.Element {
  const racingNumber = driver.RacingNumber
  const timing = useDriverTimingStore((state) => state.DriverTiming[racingNumber])
  const stintLine = useTimingAppDataStore((state) => state.TimingAppData[racingNumber])
  const expanded = useExpandedDriversStore((state) => state.expandedNumbers.has(racingNumber))
  const toggleExpanded = useExpandedDriversStore((state) => state.toggle)
  const sessionPart = useDriverTimingStore((state) => state.SessionPart)
  const cutoffPosition = useDriverTimingStore((state) =>
    mode === 'quali' ? getCutoffPosition(state.SessionPart, state.NoEntries) : null
  )

  const leader = isLeader(timing)
  const status = getDriverStatus(timing)
  const inactive = isDriverInactive(status, mode)
  const eliminated = status === 'KO'
  const atCutoff = cutoffPosition !== null && Number(timing?.Position) === cutoffPosition
  const teamColor = getTeamColorHex(driver)
  const sectors = timing?.Sectors ? Object.values(timing.Sectors) : []

  const renderCell = (key: ColumnKey): React.ReactNode => {
    switch (key) {
      case 'pos':
        return <span className="font-semibold">{timing?.Position || driver.Line}</span>
      case 'driver':
        return (
          <span className="flex items-center gap-1.5">
            <span
              className="h-[1.15em] w-[3px] shrink-0 rounded-full"
              style={{ backgroundColor: teamColor }}
            />
            <span className="font-semibold tracking-wide">{driver.Tla}</span>
            {status && (
              <span
                className={`rounded px-1 text-[10px] leading-4 font-semibold ${DRIVER_STATUS_CLASS[status]}`}
              >
                {status}
              </span>
            )}
          </span>
        )
      case 'tyre':
        return <TireBadge stint={getCurrentStint(stintLine)} />
      case 'interval':
        return leader ? (
          <span className="text-ink-3">—</span>
        ) : (
          getGapAhead(timing, mode, sessionPart) || '—'
        )
      case 'gap': {
        const gap = leader ? (
          <span className="text-ink-3">—</span>
        ) : (
          <span className="text-ink-2">{getGapToFirst(timing, mode, sessionPart) || '—'}</span>
        )
        return mode === 'quali' ? <QualiDelta racingNumber={racingNumber} fallback={gap} /> : gap
      }
      case 'best':
        return (
          <span className={leader && mode !== 'race' ? 'font-semibold text-best' : 'text-ink-2'}>
            {truncateLapTime(timing?.BestLapTime?.Value)}
          </span>
        )
      case 'last': {
        const last = timing?.LastLapTime
        const color = last?.OverallFastest ? 'text-best' : last?.PersonalFastest ? 'text-pb' : ''
        return <span className={`font-medium ${color}`}>{truncateLapTime(last?.Value)}</span>
      }
      case 's1':
      case 's2':
      case 's3':
        return (
          <SectorCell
            sector={sectors[Number(key[1]) - 1]}
            showSegments={mode !== 'race' && !eliminated}
          />
        )
      case 'pits':
        return <span className="text-ink-2">{timing?.NumberOfPitStops ?? 0}</span>
      case 'laps':
        return <span className="text-ink-2">{timing?.NumberOfLaps ?? '—'}</span>
    }
  }

  if (!driver.Tla) {
    return <></>
  }

  const toggle = (): void => toggleExpanded(racingNumber)

  return (
    <>
      <tr
        tabIndex={0}
        aria-expanded={expanded}
        // An explicit height opts out of the table's stretching, so eliminated rows stay compact
        style={eliminated ? { height: 1 } : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
        className={`cursor-pointer tabular-nums transition-colors outline-none hover:bg-surface-2 focus-visible:bg-surface-2 ${
          expanded ? 'bg-surface-2' : ''
        } ${inactive ? 'opacity-50' : ''} ${
          atCutoff && !expanded ? 'border-b-2 border-danger' : 'border-b border-line'
        }`}
      >
        {columns.map((column) => (
          <td
            key={column.key}
            className={`${ALIGN_CLASS[column.align ?? 'left']} truncate px-1.5 py-0.5`}
          >
            {renderCell(column.key)}
          </td>
        ))}
      </tr>
      {expanded && (
        <DriverExpandedRow
          racingNumber={racingNumber}
          colSpan={columns.length}
          atCutoff={atCutoff}
          raceMode={mode === 'race'}
        />
      )}
    </>
  )
})
