import React, { useMemo } from 'react'
import { useCarDataStore } from '@renderer/stores/carDataStore'
import { useDriverStore } from '@renderer/stores/driverStore'
import { usePositionStore } from '@renderer/stores/positionStore'
import { useCornerStore, nearestPolylineIndex } from '@renderer/stores/cornerStore'
import { useDriverTimingStore } from '@renderer/stores/driverTimingStore'

interface DriverExpandedRowProps {
  racingNumber: string
  colSpan: number
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

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r},${g},${b}`
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
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-gray-300">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-700/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function DriverExpandedRow({ racingNumber, colSpan }: DriverExpandedRowProps): React.JSX.Element {
  const carChannels = useCarDataStore((state) => state.Cars[racingNumber])
  const driver = useDriverStore((state) => state.Drivers[racingNumber])
  const position = usePositionStore((state) => state.positionData?.Entries?.[racingNumber])
  const inPit = useDriverTimingStore((state) => state.DriverTiming[racingNumber]?.InPit)
  const corners = useCornerStore((state) => state.corners)
  const cornerPolylineIndices = useCornerStore((state) => state.cornerPolylineIndices)
  const trackPositions = useCornerStore((state) => state.trackPositions)

  const teamColor = driver?.TeamColour ? `#${driver.TeamColour}` : '#ffffff'
  const rgb = hexToRgb(teamColor)

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
    <tr style={{ animation: 'expandRow 0.18s ease-out' }}>
      <td
        colSpan={colSpan}
        className="px-4 py-3 border border-t-0 border-gray-700/60 rounded-b-lg"
        style={{
          background: `linear-gradient(to right, rgba(${rgb},0.12) 0%, rgba(${rgb},0.04) 40%, transparent 100%)`,
          borderLeftColor: teamColor,
          borderLeftWidth: '2px'
        }}
      >
        <div style={{ animation: 'fadeSlideDown 0.18s ease-out' }}>
          {carChannels ? (
            <div className="flex items-center gap-4">
              {/* Gear — big, team colored */}
              <div className="flex flex-col items-center gap-0.5 w-8">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Gear</span>
                <span
                  className="text-2xl font-bold font-mono leading-none"
                  style={{ color: teamColor }}
                >
                  {carChannels.gear === 0 ? 'N' : carChannels.gear < 0 ? 'R' : carChannels.gear}
                </span>
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex gap-3">
                  <Bar label="Speed" value={carChannels.speed} max={380} color={speedColor(carChannels.speed, 380)} />
                  <Bar label="RPM" value={carChannels.rpm} max={15000} color="#a78bfa" />
                </div>
                <div className="flex gap-3">
                  <Bar label="Throttle" value={carChannels.throttle} max={100} color="#60a5fa" />
                  <Bar label="Brake" value={carChannels.brake} max={100} color="#f87171" />
                </div>
              </div>

              {/* Nearest corner, PIT indicator, or DRS fallback */}
              <div className="flex flex-col items-center gap-0.5 pl-2 w-10">
                {inPit ? (
                  <span
                    className="text-sm font-bold font-mono leading-none"
                    style={{ color: teamColor }}
                  >
                    PIT
                  </span>
                ) : nearestCorner ? (
                  <>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Turn</span>
                    <span
                      className="text-2xl font-bold font-mono leading-none"
                      style={{ color: teamColor }}
                    >
                      {nearestCorner.number}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">DRS</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded transition-colors duration-200 ${carChannels.drs < 10 ? 'bg-gray-700 text-gray-500' : ''}`}
                      style={
                        carChannels.drs >= 10
                          ? { backgroundColor: `rgba(${rgb},0.2)`, color: teamColor }
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
            <p className="text-xs text-gray-500 text-center">No telemetry data</p>
          )}
        </div>
      </td>
    </tr>
  )
}
