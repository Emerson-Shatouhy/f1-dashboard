import React, { useMemo, useEffect, useReducer, useRef, useState } from 'react'
import { usePositionStore, type PositionFrame } from '@renderer/stores/positionStore'
import { useDelayStore } from '@renderer/stores/delayStore'
import { useDriverStore } from '@renderer/stores/driverStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useRaceControlMessagesStore } from '@renderer/stores/raceControlMessagesStore'
import getTrackMap from '../../../../f1-client/trackMap/getTrackMap'
import { getCircuitCorners } from '../../../../f1-client/trackMap/getCircuitCorners'
import { useCornerStore } from '@renderer/stores/cornerStore'
import { useExpandedDriversStore } from '@renderer/stores/expandedDriversStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import type { TrackMapData } from '@renderer/types/openF1Types'

interface CarDot {
  x: number
  y: number
  raceNumber: string
  teamColor: string
  tla: string
  highlighted: boolean
  dimmed: boolean
}

interface InterpolatedPosition {
  x: number
  y: number
  targetX: number
  targetY: number
}

// Memoized car component for better performance
const CarDotComponent = React.memo(
  ({
    x,
    y,
    teamColor,
    carRadius,
    labelFontSize,
    tla,
    shouldRotate,
    highlighted,
    dimmed
  }: {
    x: number
    y: number
    teamColor: string
    carRadius: number
    labelFontSize: number
    tla: string
    shouldRotate: boolean
    highlighted: boolean
    dimmed: boolean
  }) => {
    const fontSize = labelFontSize
    const textTransform = shouldRotate ? `rotate(-90 ${x} ${y})` : undefined
    return (
      <g opacity={dimmed ? 0.25 : 1}>
        {highlighted && (
          <circle
            cx={x}
            cy={y}
            r={carRadius * 2.2}
            fill="none"
            stroke={`#${teamColor}`}
            strokeWidth={carRadius * 0.35}
            opacity={0.7}
          />
        )}
        <circle
          cx={x}
          cy={y}
          r={highlighted ? carRadius * 1.25 : carRadius}
          fill={`#${teamColor}`}
          stroke="#000000"
          strokeWidth={carRadius * 0.2}
          className="drop-shadow-lg"
        />
        <text
          x={x + (highlighted ? carRadius * 1.25 : carRadius) * 1.4}
          y={y + fontSize * 0.35}
          fontSize={fontSize}
          fontWeight="bold"
          fill={`#${teamColor}`}
          stroke="#000000"
          strokeWidth={fontSize * 0.15}
          paintOrder="stroke"
          fontFamily="monospace"
          transform={textTransform}
        >
          {tla}
        </text>
      </g>
    )
  }
)

CarDotComponent.displayName = 'CarDot'

// Derive sector flag colors from race control messages.
// Returns a map of sector index (0-based) → color, or 'red' for whole-track red flag.
function useSectorFlagColors(sectorCount: number): { sectorColors: string[]; redFlag: boolean } {
  const messages = useRaceControlMessagesStore((state) => state.Messages)

  return useMemo(() => {
    // Sort messages by key (they're keyed numerically/chronologically)
    const sorted = Array.from(messages.entries()).sort(([a], [b]) => {
      const na = parseInt(a, 10)
      const nb = parseInt(b, 10)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return a.localeCompare(b)
    })

    // Track per-sector yellow flags (1-indexed sector numbers from F1 feed)
    const sectorYellow = new Set<number>()
    let redFlag = false

    for (const [, msg] of sorted) {
      if (msg.Category !== 'Flag') continue

      if (msg.Flag === 'RED') {
        redFlag = true
        sectorYellow.clear()
      } else if (
        msg.Flag === 'DOUBLE YELLOW' &&
        msg.Scope === 'Sector' &&
        typeof msg.Sector === 'number'
      ) {
        sectorYellow.add(msg.Sector)
        redFlag = false
      } else if (msg.Flag === 'CLEAR') {
        if (msg.Scope === 'Track') {
          // Full track clear
          sectorYellow.clear()
          redFlag = false
        } else if (msg.Scope === 'Sector' && typeof msg.Sector === 'number') {
          sectorYellow.delete(msg.Sector)
        }
      }
    }

    const defaultColors = ['#ef4444', '#f59e0b', '#10b981']
    const sectorColors = Array.from({ length: sectorCount }, (_, i) => {
      if (redFlag) return '#ef4444'
      // F1 sectors are 1-indexed; map to 0-based index
      if (sectorYellow.has(i + 1)) return '#f97316' // orange-500
      return defaultColors[i] || '#4ade80'
    })

    return { sectorColors, redFlag }
  }, [messages, sectorCount])
}

export default function TrackMap(): React.JSX.Element {
  const positionTimeline = usePositionStore((state) => state.positionTimeline)
  const drivers = useDriverStore((state) => state.Drivers)
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const setCorners = useCornerStore((state) => state.setCorners)
  const setTrackPositions = useCornerStore((state) => state.setTrackPositions)
  const expandedNumbers = useExpandedDriversStore((state) => state.expandedNumbers)
  const projectorMode = useNavigationStore((s) => s.projectorMode)
  const [trackMapData, setTrackMapData] = useState<TrackMapData | null>(null)
  // Use a ref for interpolated positions so the RAF loop never causes useEffect churn
  const interpolatedPositionsRef = useRef(new Map<string, InterpolatedPosition>())
  // Increment this to force a re-render + useMemo recompute from the 50ms display interval
  const [renderCount, forceUpdate] = useReducer((x: number) => x + 1, 0)
  const animationFrameRef = useRef<number | undefined>(undefined)

  // Keep timeline and delay config in refs so RAF loop reads current values without deps
  const positionTimelineRef = useRef<PositionFrame[]>(positionTimeline)
  const delayEnabled = useDelayStore((s) => s.enabled)
  const delayMs = useDelayStore((s) => s.delayMs)
  const delayEnabledRef = useRef(delayEnabled)
  const delayMsRef = useRef(delayMs)

  useEffect(() => { positionTimelineRef.current = positionTimeline }, [positionTimeline])
  useEffect(() => { delayEnabledRef.current = delayEnabled }, [delayEnabled])
  useEffect(() => { delayMsRef.current = delayMs }, [delayMs])

  useEffect(() => {
    if (sessionInfo?.Key) {
      const circuitKey = sessionInfo.Meeting.Circuit.Key
      const year = new Date(sessionInfo.StartDate ?? Date.now()).getFullYear()

      getTrackMap(circuitKey)
        .then((data) => {
          if (data) {
            console.log('🗺️  Track map loaded')
            setTrackPositions(data.positions)
          }
          setTrackMapData(data)
        })
        .catch((error) => {
          console.error('❌ Failed to load track map:', error)
        })

      getCircuitCorners(circuitKey, year)
        .then((data) => setCorners(circuitKey, data))
        .catch(() => setCorners(circuitKey, []))
    }
  }, [sessionInfo, setCorners, setTrackPositions])

  // Animation loop — runs once, reads/writes refs directly to avoid useEffect churn.
  // Uses Catmull-Rom spline interpolation across 4 frames (p0,p1,p2,p3) to produce
  // smooth curved paths with no velocity discontinuities at frame boundaries.
  // Dead reckoning extrapolates position past the last known frame using velocity.
  // A 33ms setInterval triggers React re-renders at ~30fps.
  useEffect(() => {
    // Buffer the map's playback cursor behind real-time so p2/p3 frames always exist.
    // At ~1Hz data, 1500ms guarantees the next two frames are already in the timeline.
    // This replaces the old LOOKAHEAD approach (which pushed into the future — wrong direction).
    const MAP_BUFFER_MS = 1500
    const SMOOTH = 0.12 // light smoothing — CR spline handles the heavy lifting

    // Catmull-Rom basis: smooth curve through p1→p2 using p0 and p3 as tangent guides
    const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
      const t2 = t * t
      const t3 = t2 * t
      return 0.5 * (
        2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
      )
    }

    const animate = (): void => {
      const now = Date.now()
      const timeline = positionTimelineRef.current

      if (timeline.length === 0) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      // Playback cursor: always MAP_BUFFER_MS behind real-time (plus TV delay if active)
      // so the Catmull-Rom p2/p3 frames are guaranteed to already be in the timeline.
      const baseTime = delayEnabledRef.current ? now - delayMsRef.current : now
      const playbackTime = baseTime - MAP_BUFFER_MS

      // Find the last frame at or before playbackTime
      let prevIdx = -1
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (timeline[i].timestamp <= playbackTime) {
          prevIdx = i
          break
        }
      }

      if (prevIdx === -1) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      // Gather 4 surrounding frames for Catmull-Rom: p0, p1 (prev), p2 (next), p3
      const p1Frame = timeline[prevIdx]
      const p0Frame = timeline[prevIdx - 1] ?? null
      const p2Frame = timeline[prevIdx + 1] ?? null
      const p3Frame = timeline[prevIdx + 2] ?? null
      const seenCars = new Set<string>()

      Object.entries(p1Frame.entries).forEach(([raceNumber, p1Pos]) => {
        if (
          p1Pos.Status !== 'OnTrack' ||
          typeof p1Pos.X !== 'number' ||
          typeof p1Pos.Y !== 'number'
        ) {
          interpolatedPositionsRef.current.delete(raceNumber)
          return
        }

        seenCars.add(raceNumber)

        let targetX = p1Pos.X
        let targetY = p1Pos.Y

        if (p2Frame) {
          const p2Pos = p2Frame.entries[raceNumber]
          if (
            p2Pos?.Status === 'OnTrack' &&
            typeof p2Pos.X === 'number' &&
            typeof p2Pos.Y === 'number'
          ) {
            const duration = p2Frame.timestamp - p1Frame.timestamp
            if (duration > 0) {
              const t = Math.max(0, Math.min(1, (playbackTime - p1Frame.timestamp) / duration))

              // Boundary fallbacks: reflect the opposite point to maintain natural velocity
              const p0Pos = p0Frame?.entries[raceNumber]
              const p3Pos = p3Frame?.entries[raceNumber]
              const x0 = (p0Pos?.Status === 'OnTrack' && typeof p0Pos.X === 'number') ? p0Pos.X : 2 * p1Pos.X - p2Pos.X
              const y0 = (p0Pos?.Status === 'OnTrack' && typeof p0Pos.Y === 'number') ? p0Pos.Y : 2 * p1Pos.Y - p2Pos.Y
              const x3 = (p3Pos?.Status === 'OnTrack' && typeof p3Pos.X === 'number') ? p3Pos.X : 2 * p2Pos.X - p1Pos.X
              const y3 = (p3Pos?.Status === 'OnTrack' && typeof p3Pos.Y === 'number') ? p3Pos.Y : 2 * p2Pos.Y - p1Pos.Y

              targetX = catmullRom(x0, p1Pos.X, p2Pos.X, x3, t)
              targetY = catmullRom(y0, p1Pos.Y, p2Pos.Y, y3, t)
            }
          }
        } else if (p0Frame) {
          // Past the last known frame — dead reckoning using velocity from p0→p1
          const p0Pos = p0Frame.entries[raceNumber]
          if (
            p0Pos?.Status === 'OnTrack' &&
            typeof p0Pos.X === 'number' &&
            typeof p0Pos.Y === 'number'
          ) {
            const dt = p1Frame.timestamp - p0Frame.timestamp
            if (dt > 0) {
              const vx = (p1Pos.X - p0Pos.X) / dt
              const vy = (p1Pos.Y - p0Pos.Y) / dt
              const elapsed = Math.min(playbackTime - p1Frame.timestamp, 1500) // cap at 1.5s
              targetX = p1Pos.X + vx * elapsed
              targetY = p1Pos.Y + vy * elapsed
            }
          }
        }

        const current = interpolatedPositionsRef.current.get(raceNumber)
        interpolatedPositionsRef.current.set(raceNumber, {
          x: current ? current.x + (targetX - current.x) * SMOOTH : targetX,
          y: current ? current.y + (targetY - current.y) * SMOOTH : targetY,
          targetX,
          targetY
        })
      })

      // Remove cars no longer present in the current frame
      interpolatedPositionsRef.current.forEach((_pos, raceNumber) => {
        if (!seenCars.has(raceNumber)) {
          interpolatedPositionsRef.current.delete(raceNumber)
        }
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    // Trigger React re-renders at ~60fps so the smooth RAF positions are displayed promptly.
    // Without this, cars visibly freeze between render ticks even though the RAF loop
    // is computing interpolated positions at full frame rate.
    const renderInterval = setInterval(forceUpdate, 16)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      clearInterval(renderInterval)
    }
  }, [forceUpdate])

  // Memoize track bounds and sector paths separately (they don't change with car positions)
  const { bounds, sectorPaths, viewBox, shouldRotate, carRadius, labelFontSize, strokeWidth } = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity

    // Establish bounds from track data if available
    if (trackMapData && trackMapData.positions.length > 0) {
      trackMapData.positions.forEach((point) => {
        minX = Math.min(minX, point.x)
        maxX = Math.max(maxX, point.x)
        minY = Math.min(minY, point.y)
        maxY = Math.max(maxY, point.y)
      })
    } else {
      // Default bounds if no track data
      minX = -1000
      maxX = 1000
      minY = -1000
      maxY = 1000
    }

    const sectorBoundaries = trackMapData?.sector_boundaries || []
    const sectorPaths: string[] = []

    if (trackMapData && trackMapData.positions.length > 0) {
      sectorBoundaries.forEach((sector, index) => {
        const isLastSector = index === sectorBoundaries.length - 1
        const startIndex = trackMapData.positions.findIndex(
          (p) => p.x === sector.start.x && p.y === sector.start.y
        )

        let endIndex: number
        if (isLastSector) {
          endIndex = trackMapData.positions.length - 1
        } else {
          endIndex = trackMapData.positions.findIndex(
            (p) => p.x === sector.end.x && p.y === sector.end.y
          )
        }

        if (startIndex !== -1 && endIndex !== -1) {
          let sectorPositions: typeof trackMapData.positions

          if (isLastSector) {
            sectorPositions = [
              ...trackMapData.positions.slice(startIndex),
              trackMapData.positions[0]
            ]
          } else {
            sectorPositions = trackMapData.positions.slice(startIndex, endIndex + 1)
          }

          const pathString = sectorPositions
            .map((point, idx) => {
              const command = idx === 0 ? 'M' : 'L'
              return `${command} ${point.x} ${point.y}`
            })
            .join(' ')
          sectorPaths.push(pathString)
        }
      })
    }

    const dataWidth = maxX - minX
    const dataHeight = maxY - minY
    const maxDimension = Math.max(dataWidth, dataHeight)

    // Extra padding to prevent labels near the edge from being clipped
    const padding = maxDimension * 0.12

    // In normal mode: prefer landscape (rotate portrait tracks).
    // In projector mode: prefer portrait (rotate landscape tracks).
    const isPortrait = dataHeight > dataWidth
    const shouldRotate = projectorMode ? !isPortrait : isPortrait

    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    let viewBox: string
    if (shouldRotate) {
      // After 90° CW rotation around (cx, cy), the bounding box swaps dimensions.
      // New X spans cy ± (dataWidth/2 + padding), new Y spans cx ± (dataHeight/2 + padding) ... wait
      // Actually: rotated X range = [cx - (dataHeight/2 + padding), cx + (dataHeight/2 + padding)]
      //           rotated Y range = [cy - (dataWidth/2  + padding), cy + (dataWidth/2  + padding)]
      const vbW = dataHeight + 2 * padding
      const vbH = dataWidth + 2 * padding
      viewBox = `${cx - vbW / 2} ${cy - vbH / 2} ${vbW} ${vbH}`
    } else {
      viewBox = `${minX - padding} ${minY - padding} ${dataWidth + 2 * padding} ${dataHeight + 2 * padding}`
    }

    // Pre-calculate sizes for performance
    const carRadius = maxDimension * (projectorMode ? 0.022 : 0.02)
    const labelFontSize = carRadius * (projectorMode ? 2.2 : 1.8)
    const strokeWidth = maxDimension * 0.01

    return {
      bounds: { minX, maxX, minY, maxY },
      sectorPaths,
      viewBox,
      shouldRotate,
      carRadius,
      labelFontSize,
      strokeWidth
    }
  }, [trackMapData, projectorMode])

  // Memoize car positions — depends on forceUpdate counter so it re-runs on each render tick
  const carDots = useMemo(() => {
    const dots: CarDot[] = []
    if (drivers) {
      interpolatedPositionsRef.current.forEach((pos, raceNumber) => {
        const driver = drivers[raceNumber]
        if (driver) {
          dots.push({
            x: pos.x,
            y: pos.y,
            raceNumber,
            teamColor: driver.TeamColour,
            tla: driver.Tla,
            highlighted: expandedNumbers.has(raceNumber),
            dimmed: expandedNumbers.size > 0 && !expandedNumbers.has(raceNumber)
          })
        }
      })
    }
    return dots
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, expandedNumbers, renderCount])

  const { sectorColors, redFlag } = useSectorFlagColors(sectorPaths.length)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg p-2">
      <svg
        className="w-full h-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: '100%', maxWidth: '100%' }}
      >
        <g transform={shouldRotate ? `rotate(90 ${centerX} ${centerY})` : undefined}>
          {/* Track sectors — color reflects current flag state */}
          {sectorPaths.map((path, index) => {
            const color = redFlag ? '#ef4444' : sectorColors[index]

            return (
              <path
                key={`sector-${index + 1}`}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm"
              />
            )
          })}
          {/* Car positions */}
          {carDots.map((car) => (
            <CarDotComponent
              key={car.raceNumber}
              x={car.x}
              y={car.y}
              teamColor={car.teamColor}
              carRadius={carRadius}
              labelFontSize={labelFontSize}
              tla={car.tla}
              shouldRotate={shouldRotate}
              highlighted={car.highlighted}
              dimmed={car.dimmed}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
