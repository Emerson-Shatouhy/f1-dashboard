import React from 'react'
import { Sector } from '@renderer/types/liveTimingTypes'
import { truncateLapTime } from '@renderer/utils/timing'

function getSectorColor(sector: Sector | undefined): string {
  if (!sector?.Value) return 'text-ink-3'
  if (sector.OverallFastest) return 'text-best'
  if (sector.PersonalFastest) return 'text-pb'
  return 'text-slower'
}

// Any non-zero status means the car has crossed the segment. Checked against the AUS logs:
// 2048 dominates slower sectors and 2049 personal-best ones. 2050 only appears in quali, and
// 2052 and 2068 are rare; their exact meanings are unconfirmed.
function getSegmentColor(status: number): string {
  switch (status) {
    case 0:
      return 'bg-surface-3'
    case 2049:
    case 2050:
      return 'bg-pb'
    case 2051:
      return 'bg-best'
    case 2064:
    case 2068:
      return 'bg-pit'
    default:
      return 'bg-slower'
  }
}

interface SectorCellProps {
  sector: Sector | undefined
  showSegments?: boolean
}

export function SectorCell({ sector, showSegments }: SectorCellProps): React.JSX.Element {
  const segments = sector?.Segments ? Object.values(sector.Segments) : []

  return (
    <div
      className={`${getSectorColor(sector)} flex flex-col items-stretch gap-0.5 transition-colors duration-500`}
    >
      <span>{truncateLapTime(sector?.Value)}</span>
      {showSegments && segments.length > 0 && (
        <div className="flex h-[3px] gap-px">
          {segments.map((segment, index) => (
            <div key={index} className={`flex-1 ${getSegmentColor(segment.Status)}`} />
          ))}
        </div>
      )}
    </div>
  )
}
