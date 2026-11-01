import React, { useMemo } from 'react'
import { useCarDataStore } from '@renderer/stores/carDataStore'
import { useDriverStore } from '@renderer/stores/driverStore'
import { usePositionStore } from '@renderer/stores/positionStore'
import { useCornerStore, nearestPolylineIndex } from '@renderer/stores/cornerStore'
import { useDriverTimingStore } from '@renderer/stores/driverTimingStore'
import { useTimingStatsStore } from '@renderer/stores/timingStatsStore'
import { getTeamColorHex, getTeamName } from '@renderer/utils/teamFallbacks'
import { truncateLapTime } from '@renderer/utils/timing'

interface DriverExpandedRowProps {
  racingNumber: string
  colSpan: number
  atCutoff?: boolean
}

function speedColor(speed: number, max: number): string {
  const t = Math.min(1, speed / max)
  let r, g, b
  if (t < 0.5) {
    const s = t / 0.5
    r = Math.round(0x4a + s * (0xfa - 0x4a))
    g = Math.round(0xde + s * (0xcc - 0xde))
    b = Math.round(0x80 + s * (0x15 - 0x80))
  } else {
    const s = (t - 0.5) / 0.5
    r = Math.round(0xfa + s * (0xf8 - 0xfa))
    g = Math.round(0xcc + s * (0x71 - 0xcc))
    b = Math.round(0x15 + s * (0x71 - 0x15))
  }
  return `rgb(${r},${g},${b})`
}

function Bar({
  label,
  value,
  max,
  color
}: {
  label: string
  value: number
  max: number
  color: string
}): React.JSX.Element {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-ink-3">{label}</span>
        <span className="text-xs text-ink tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function DriverExpandedRow({
  racingNumber,
  colSpan,
  atCutoff
}: DriverExpandedRowProps): React.JSX.Element {
  const carChannels = useCarDataStore((state) => state.Cars[racingNumber])
  const driver = useDriverStore((state) => state.Drivers[racingNumber])
  const position = usePositionStore((state) => state.positionData?.Entries?.[racingNumber])
  const inPit = useDriverTimingStore((state) => state.DriverTiming[racingNumber]?.InPit)
  const corners = useCornerStore((state) => state.corners)
  const cornerPolylineIndices = useCornerStore((state) => state.cornerPolylineIndices)
  const trackPositions = useCornerStore((state) => state.trackPositions)

  const bestSectors = useTimingStatsStore(
    (state) => state.timingStats?.Lines?.[racingNumber]?.BestSectors
  )

  const teamColor = getTeamColorHex(driver)

  const nearestCorner = useMemo(() => {
    if (
      !position ||
      position.Status !== 'OnTrack' ||
      corners.length === 0 ||
      trackPositions.length === 0
    )
      return null

    // Find where the driver sits on the polyline, then find the corner whose
    // polyline index is closest — this prevents jumping to a geometrically
    // nearby corner that is actually far away along the track.
    const driverIdx = nearestPolylineIndex(trackPositions, position.X, position.Y)
    let nearest = corners[0]
    let bestDiff = Infinity
    for (let i = 0; i < corners.length; i++) {
      const diff = Math.abs(cornerPolylineIndices[i] - driverIdx)
      // Also handle wrap-around (start/finish line crossing)
      const wrappedDiff = Math.abs(trackPositions.length - diff)
      const effectiveDiff = Math.min(diff, wrappedDiff)
      if (effectiveDiff < bestDiff) {
        bestDiff = effectiveDiff
        nearest = corners[i]
      }
    }
    return nearest
  }, [position, corners, cornerPolylineIndices, trackPositions])

  return (
    // An explicit height keeps this row from taking a share of the table's stretched height
    <tr style={{ animation: 'expandRow 0.18s ease-out', height: 1 }}>
      <td
        colSpan={colSpan}
        className={`${atCutoff ? 'border-b-2 border-danger' : 'border-b border-line'} bg-surface-2 px-3 py-2`}
        style={{ boxShadow: `inset 3px 0 0 ${teamColor}` }}
      >
        <div className="flex flex-col gap-2" style={{ animation: 'fadeSlideDown 0.18s ease-out' }}>
          <div className="flex items-center justify-between gap-3 text-[11px] text-ink-3 tabular-nums">
            <span>{getTeamName(driver) ?? '—'}</span>
            <span className="flex gap-3">
              {['0', '1', '2'].map((index) => (
                <span key={index}>
                  Best S{Number(index) + 1}{' '}
                  <span
                    className={bestSectors?.[index]?.Position === 1 ? 'text-best' : 'text-ink-2'}
                  >
                    {truncateLapTime(bestSectors?.[index]?.Value)}
                  </span>
                </span>
              ))}
            </span>
          </div>
          {carChannels ? (
            <div className="flex items-center gap-4">
              {/* Gear — big, team colored */}
              <div className="flex flex-col items-center gap-0.5 w-8">
                <span className="text-[11px] text-ink-3">Gear</span>
                <span
                  className="text-xl font-semibold leading-none tabular-nums"
                  style={{ color: teamColor }}
                >
                  {carChannels.gear === 0 ? 'N' : carChannels.gear < 0 ? 'R' : carChannels.gear}
                </span>
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex gap-3">
                  <Bar
                    label="Speed"
                    value={carChannels.speed}
                    max={380}
                    color={speedColor(carChannels.speed, 380)}
                  />
                  <Bar label="RPM" value={carChannels.rpm} max={15000} color="var(--color-ink-2)" />
                </div>
                <div className="flex gap-3">
                  <Bar
                    label="Throttle"
                    value={carChannels.throttle}
                    max={100}
                    color="var(--color-pb)"
                  />
                  <Bar
                    label="Brake"
                    value={carChannels.brake}
                    max={100}
                    color="var(--color-flag-red)"
                  />
                </div>
              </div>

              {/* Nearest corner, PIT indicator, or DRS fallback */}
              <div className="flex flex-col items-center gap-0.5 pl-2 w-10">
                {inPit ? (
                  <span className="text-sm font-semibold leading-none" style={{ color: teamColor }}>
                    PIT
                  </span>
                ) : nearestCorner ? (
                  <>
                    <span className="text-[11px] text-ink-3">Turn</span>
                    <span
                      className="text-xl font-semibold leading-none tabular-nums"
                      style={{ color: teamColor }}
                    >
                      {nearestCorner.number}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-ink-3">DRS</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded transition-colors duration-200 ${carChannels.drs < 10 ? 'bg-surface-3 text-ink-3' : ''}`}
                      style={
                        carChannels.drs >= 10
                          ? { backgroundColor: `${teamColor}33`, color: teamColor }
                          : undefined
                      }
                    >
                      {carChannels.drs >= 10 ? 'ON' : 'OFF'}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-3 text-center">No telemetry yet</p>
          )}
        </div>
      </td>
    </tr>
  )
}
