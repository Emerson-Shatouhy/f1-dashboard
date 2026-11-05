import React, { useMemo, useEffect, useReducer, useRef, useState } from 'react'
import { usePositionStore, type PositionFrame } from '@renderer/stores/positionStore'
import { useDelayStore } from '@renderer/stores/delayStore'
import { useDriverStore } from '@renderer/stores/driverStore'
import { useDriverTimingStore } from '@renderer/stores/driverTimingStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'
import getTrackMap from '../../../../f1-client/trackMap/getTrackMap'
import { useExpandedDriversStore } from '@renderer/stores/expandedDriversStore'
import type { TrackMapData } from '@renderer/types/openF1Types'
import { getTeamColour } from '@renderer/utils/teamFallbacks'
import { hasTakenFlag } from '@renderer/utils/timing'

interface CarDot {
  x: number
  y: number
  raceNumber: string
  teamColor: string
  tla: string
  highlighted: boolean
  dimmed: boolean
  inPit: boolean
}

interface InterpolatedPosition {
  x: number
  y: number
  targetX: number
  targetY: number
}

// Cars in the pit lane are drawn smaller so the field on track stays readable
const PIT_DOT_SCALE = 0.6
const PIT_LABEL_SCALE = 0.7
const PIT_OPACITY = 0.5

// Memoized car component for better performance
const CarDotComponent = React.memo(
  ({
    x,
    y,
    teamColor,
    carRadius,
    labelFontSize,
    tla,
    highlighted,
    dimmed,
    inPit
  }: {
    x: number
    y: number
    teamColor: string
    carRadius: number
    labelFontSize: number
    tla: string
    highlighted: boolean
    dimmed: boolean
    inPit: boolean
  }) => {
    const baseRadius = inPit ? carRadius * PIT_DOT_SCALE : carRadius
    const radius = highlighted ? baseRadius * 1.25 : baseRadius
    const fontSize = inPit ? labelFontSize * PIT_LABEL_SCALE : labelFontSize
    return (
      <g opacity={dimmed ? 0.25 : inPit ? PIT_OPACITY : 1}>
        {highlighted && (
          <circle
            cx={x}
            cy={y}
            r={baseRadius * 2.2}
            fill="none"
            stroke={`#${teamColor}`}
            strokeWidth={baseRadius * 0.35}
            opacity={0.7}
          />
        )}
        <circle
          cx={x}
          cy={y}
          r={radius}
          fill={`#${teamColor}`}
          stroke="#000000"
          strokeWidth={baseRadius * 0.2}
          className="drop-shadow-lg"
        />
        {/* Pit lane names crowd the map, so they're only shown for a driver whose row is expanded */}
        {(!inPit || highlighted) && (
          <text
            x={x + radius * 1.4}
            y={y + fontSize * 0.35}
            fontSize={fontSize}
            fontWeight="bold"
            fill={`#${teamColor}`}
            stroke="#000000"
            strokeWidth={fontSize * 0.15}
            paintOrder="stroke"
          >
            {tla}
          </text>
        )}
      </g>
    )
  }
)

CarDotComponent.displayName = 'CarDot'

interface Bar {
  x1: number
  y1: number
  x2: number
  y2: number
}

// A bar across the track at an outline point, perpendicular to the direction of travel
function crossTrackBar(
  points: { x: number; y: number }[],
  index: number,
  half: number
): Bar | null {
  if (points.length < 3 || index < 0 || index >= points.length) return null
  const at = points[index]
  // Tangent through the point, using its neighbours either side (the outline is a loop)
  const before = points[(index - 1 + points.length) % points.length]
  const after = points[(index + 1) % points.length]
  const dx = after.x - before.x
  const dy = after.y - before.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return null
  const nx = (-dy / length) * half
  const ny = (dx / length) * half
  return { x1: at.x - nx, y1: at.y - ny, x2: at.x + nx, y2: at.y + ny }
}

// Position.z carries the safety car under one of these slots. Which slot is used varies by race
// (242 at Spa 2025, 243 at Silverstone 2025, 241 at Mexico 2026), and unused slots sit OffTrack at (0,0).
const SAFETY_CAR_NUMBERS = ['241', '242', '243']
// A parked safety car still reports OnTrack (Spa 2025), so only show it while it's leading the field:
// track status 4 = SCDeployed, 5 = Red (it leads the cars into the pit lane)
const SAFETY_CAR_TRACK_STATUSES = new Set(['4', '5'])

const SafetyCarMarker = ({
  x,
  y,
  carRadius,
  labelFontSize
}: {
  x: number
  y: number
  carRadius: number
  labelFontSize: number
}): React.JSX.Element => {
  const size = carRadius * 1.25
  return (
    <g>
      {/* Expanding halo; SMIL keeps running across the 60fps re-renders since the element isn't remounted */}
      <circle
        cx={x}
        cy={y}
        fill="none"
        stroke="var(--color-flag-yellow)"
        strokeWidth={carRadius * 0.3}
        className="motion-reduce:hidden"
      >
        <animate
          attributeName="r"
          values={`${size};${size * 2.8}`}
          dur="1.2s"
          repeatCount="indefinite"
        />
        <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <rect
        x={x - size}
        y={y - size}
        width={size * 2}
        height={size * 2}
        rx={size * 0.3}
        fill="var(--color-flag-yellow)"
        stroke="#000000"
        strokeWidth={carRadius * 0.2}
        transform={`rotate(45 ${x} ${y})`}
        className="drop-shadow-lg"
      />
      <text
        x={x + size * 1.6}
        y={y + labelFontSize * 0.35}
        fontSize={labelFontSize}
        fontWeight="bold"
        fill="var(--color-flag-yellow)"
        stroke="#000000"
        strokeWidth={labelFontSize * 0.15}
        paintOrder="stroke"
      >
        SC
      </text>
    </g>
  )
}

// Written out in full: Tailwind only emits theme colours it finds literally in the source
const SECTOR_COLOURS = ['var(--color-sector-1)', 'var(--color-sector-2)', 'var(--color-sector-3)']

// Flags that cover the whole track, from track status: 4 = safety car, 5 = red, 6/7 = VSC.
// Yellows ("TRACK SECTOR n" in race control) are marshal sectors, which F1 doesn't publish the
// positions of, so they can't be placed on a timing sector.
function trackWideFlagColour(status: string | undefined): string | null {
  if (status === '5') return 'var(--color-flag-red)'
  if (status === '4') return 'var(--color-flag-sc)'
  if (status === '6' || status === '7') return 'var(--color-flag-vsc)'
  return null
}

export default function TrackMap(): React.JSX.Element {
  const positionTimeline = usePositionStore((state) => state.positionTimeline)
  const drivers = useDriverStore((state) => state.Drivers)
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const expandedNumbers = useExpandedDriversStore((state) => state.expandedNumbers)
  const trackStatus = useTrackStatusStore((state) => state.trackStatus?.Status)
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
      getTrackMap(sessionInfo.Meeting.Circuit.Key)
        .then(setTrackMapData)
        .catch((error) => {
          console.error('❌ Failed to load track map:', error)
        })
    }
  }, [sessionInfo])

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

  // Track geometry in screen space. Everything that comes from the position frame (the outline, cars,
  // the safety car) goes through toScreen, so labels stay upright and nothing needs an SVG transform.
  const {
    toScreen,
    sectorPaths,
    pitPath,
    viewBox,
    carRadius,
    labelFontSize,
    strokeWidth,
    startFinishLine,
    sectorLines,
    minisectorTicks
  } = useMemo(() => {
    // The feed's y points up; the screen's points down. Flip, then turn anticlockwise by the map's
    // rotation so circuits face the way F1's own graphics show them.
    const angle = (-(trackMapData?.rotation ?? 0) * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const toScreen = (x: number, y: number): { x: number; y: number } => ({
      x: x * cos + y * sin,
      y: x * sin - y * cos
    })

    const points = (trackMapData?.positions ?? []).map((p) => toScreen(p.x, p.y))
    let minX = -1000
    let maxX = 1000
    let minY = -1000
    let maxY = 1000
    if (points.length > 0) {
      minX = Math.min(...points.map((p) => p.x))
      maxX = Math.max(...points.map((p) => p.x))
      minY = Math.min(...points.map((p) => p.y))
      maxY = Math.max(...points.map((p) => p.y))
    }
    const maxDimension = Math.max(maxX - minX, maxY - minY)
    // Extra padding to prevent labels near the edge from being clipped
    const padding = maxDimension * 0.12
    const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + 2 * padding} ${maxY - minY + 2 * padding}`

    // Pre-calculate sizes for performance
    const carRadius = maxDimension * 0.016
    // Set separately so the names stay the same size when the dots are resized
    const labelFontSize = maxDimension * 0.029
    const strokeWidth = maxDimension * 0.01

    const toPath = (run: { x: number; y: number }[], closed: boolean): string =>
      run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + (closed ? ' Z' : '')
    // One path per timing sector, coloured like F1's graphics; a map without measured sectors is one
    // neutral path. sector is 0-2, or null for that single path.
    const run = (from: number, to: number): { x: number; y: number }[] =>
      to > from ? points.slice(from, to + 1) : [...points.slice(from), ...points.slice(0, to + 1)]
    const starts = trackMapData?.sectors?.starts ?? []
    const sectorPaths: { d: string; sector: number | null }[] = !points.length
      ? []
      : starts.length === 3
        ? starts.map((start, i) => ({ d: toPath(run(start, starts[(i + 1) % 3]), false), sector: i }))
        : [{ d: toPath(points, true), sector: null }]
    const pitPoints = (trackMapData?.pit_lane?.positions ?? []).map((p) => toScreen(p.x, p.y))
    const pitPath = pitPoints.length ? toPath(pitPoints, false) : ''

    const startFinishLine = crossTrackBar(points, trackMapData?.start_index ?? 0, strokeWidth * 2)
    // Only maps whose timing sectors were measured have sector lines
    const sectorLines = (trackMapData?.sectors?.starts.slice(1) ?? [])
      .map((index) => crossTrackBar(points, index, strokeWidth * 1.4))
      .filter((bar): bar is Bar => bar !== null)
    // Minisector boundaries: every minisector start except the first of each sector, which is a
    // sector line already
    const minisectorTicks = (trackMapData?.sectors?.minisectors ?? [])
      .flatMap((starts) => starts.slice(1))
      .map((index) => crossTrackBar(points, index, strokeWidth * 0.9))
      .filter((bar): bar is Bar => bar !== null)

    return {
      toScreen,
      sectorPaths,
      pitPath,
      viewBox,
      carRadius,
      labelFontSize,
      strokeWidth,
      startFinishLine,
      sectorLines,
      minisectorTicks
    }
  }, [trackMapData])

  // Memoize car positions — depends on forceUpdate counter so it re-runs on each render tick
  const carDots = useMemo(() => {
    const dots: CarDot[] = []
    if (drivers) {
      // Read once per tick; a subscription would re-render on every timing update for nothing
      const timing = useDriverTimingStore.getState().DriverTiming
      interpolatedPositionsRef.current.forEach((pos, raceNumber) => {
        const driver = drivers[raceNumber]
        const driverTiming = timing[raceNumber]
        // The position feed keeps reporting parked and retired cars as on track
        if (driver && !driverTiming?.Retired && !driverTiming?.Stopped) {
          dots.push({
            ...toScreen(pos.x, pos.y),
            raceNumber,
            teamColor: getTeamColour(driver),
            tla: driver.Tla,
            highlighted: expandedNumbers.has(raceNumber),
            inPit: !!driverTiming?.InPit,
            dimmed:
              hasTakenFlag(driverTiming) ||
              (expandedNumbers.size > 0 && !expandedNumbers.has(raceNumber))
          })
        }
      })
    }
    return dots
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, expandedNumbers, renderCount, toScreen])

  // Interpolated by the same loop as the drivers; unused slots are OffTrack so never interpolated
  const safetyCar = useMemo(() => {
    if (!trackStatus || !SAFETY_CAR_TRACK_STATUSES.has(trackStatus)) return null
    for (const raceNumber of SAFETY_CAR_NUMBERS) {
      const pos = interpolatedPositionsRef.current.get(raceNumber)
      if (pos && (pos.x !== 0 || pos.y !== 0)) return toScreen(pos.x, pos.y)
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackStatus, renderCount, toScreen])

  const flagColour = trackWideFlagColour(trackStatus)

  return (
    <div className="flex h-full w-full items-center justify-center rounded-md bg-surface-1 p-2">
      <svg
        className="w-full h-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: '100%', maxWidth: '100%' }}
      >
        <g>
          {/* Outline around the track; pulses in the flag's colour while a flag covers that sector */}
          {sectorPaths.map(({ d, sector }) => (
            <path
              key={`halo-${sector ?? 'track'}`}
              d={d}
              fill="none"
              stroke={flagColour ?? '#ffffff'}
              strokeOpacity={flagColour ? 0.85 : 0.13}
              strokeWidth={strokeWidth * 3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={
                flagColour ? 'animate-[flag-pulse_1s_ease-in-out_infinite] motion-reduce:animate-none' : undefined
              }
            />
          ))}
          {/* Pit lane: dashed light grey, under the track */}
          {pitPath && (
            <path
              d={pitPath}
              fill="none"
              stroke="var(--color-ink-2)"
              strokeWidth={strokeWidth * 0.45}
              strokeDasharray={`${strokeWidth * 1.2} ${strokeWidth * 0.9}`}
              strokeLinejoin="round"
            />
          )}
          {/* Track in sector colours, dimmed under a flag so the pulsing outline stands out */}
          {sectorPaths.map(({ d, sector }) => (
            <path
              key={`sector-${sector ?? 'track'}`}
              d={d}
              fill="none"
              stroke={sector === null ? 'var(--color-line-strong)' : SECTOR_COLOURS[sector]}
              strokeOpacity={flagColour ? 0.35 : 1}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {/* Minisector boundaries: short thin ticks, smaller than the sector lines */}
          {minisectorTicks.map((bar, index) => (
            <line
              key={`minisector-${index}`}
              {...bar}
              stroke="#ffffff"
              strokeOpacity={0.85}
              strokeWidth={strokeWidth * 0.22}
            />
          ))}
          {/* Sector lines: shorter and grey so they read as secondary to start/finish */}
          {sectorLines.map((bar, index) => (
            <g key={`sector-line-${index}`}>
              <line {...bar} stroke="#000000" strokeWidth={strokeWidth * 0.9} />
              <line {...bar} stroke="var(--color-ink-2)" strokeWidth={strokeWidth * 0.55} />
            </g>
          ))}
          {/* Start/finish line: dark outline under a white bar so it reads on any sector colour */}
          {startFinishLine && (
            <g>
              <line
                {...startFinishLine}
                stroke="#000000"
                strokeWidth={strokeWidth * 1.3}
                strokeLinecap="butt"
              />
              <line
                {...startFinishLine}
                stroke="#ffffff"
                strokeWidth={strokeWidth * 0.9}
                strokeLinecap="butt"
              />
            </g>
          )}
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
              highlighted={car.highlighted}
              dimmed={car.dimmed}
              inPit={car.inPit}
            />
          ))}
          {/* Drawn last so it stays visible over the leader it's running ahead of */}
          {safetyCar && (
            <SafetyCarMarker
              x={safetyCar.x}
              y={safetyCar.y}
              carRadius={carRadius}
              labelFontSize={labelFontSize}
            />
          )}
        </g>
      </svg>
    </div>
  )
}
