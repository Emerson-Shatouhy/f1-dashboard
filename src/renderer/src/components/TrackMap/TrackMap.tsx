import React, { useMemo, useEffect, useState, useRef } from 'react'
import { usePositionStore } from '@renderer/stores/positionStore'
import { useDriverStore } from '@renderer/stores/driverStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import getTrackMap from '../../../../f1-client/trackMap/getTrackMap'
import type { TrackMapData } from '@renderer/types/openF1Types'

interface CarDot {
  x: number
  y: number
  raceNumber: string
  teamColor: string
  tla: string
}

interface InterpolatedPosition {
  x: number
  y: number
  targetX: number
  targetY: number
  velocityX: number
  velocityY: number
  lastUpdate: number
}

// Memoized car component for better performance
const CarDotComponent = React.memo(
  ({
    x,
    y,
    teamColor,
    carRadius
  }: {
    x: number
    y: number
    teamColor: string
    carRadius: number
  }) => {
    return (
      <circle
        cx={x}
        cy={y}
        r={carRadius}
        fill={`#${teamColor}`}
        stroke="#000000"
        strokeWidth={carRadius * 0.2}
        className="drop-shadow-lg"
      />
    )
  }
)

CarDotComponent.displayName = 'CarDot'

export default function TrackMap(): React.JSX.Element {
  const positionData = usePositionStore((state) => state.positionData)
  const drivers = useDriverStore((state) => state.Drivers)
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const [trackMapData, setTrackMapData] = useState<TrackMapData | null>(null)
  const [interpolatedPositions, setInterpolatedPositions] = useState(
    new Map<string, InterpolatedPosition>()
  )
  const animationFrameRef = useRef<number | undefined>(undefined)
  const previousPositionsRef = useRef(
    new Map<string, { x: number; y: number; timestamp: number }>()
  )

  useEffect(() => {
    if (sessionInfo?.Key) {
      getTrackMap(sessionInfo.Meeting.Circuit.Key)
        .then((data) => {
          if (data) {
            console.log('🗺️  Track map loaded')
          }
          setTrackMapData(data)
        })
        .catch((error) => {
          console.error('❌ Failed to load track map:', error)
        })
    }
  }, [sessionInfo])

  // Update positions when new data arrives
  useEffect(() => {
    if (!positionData?.Entries || !drivers) return

    const now = Date.now()
    const newInterpolatedPositions = new Map(interpolatedPositions)

    Object.entries(positionData.Entries).forEach(([raceNumber, position]) => {
      if (
        position?.Status === 'OnTrack' &&
        drivers[raceNumber] &&
        typeof position.X === 'number' &&
        typeof position.Y === 'number'
      ) {
        const previousPos = previousPositionsRef.current.get(raceNumber)
        const currentInterpolated = newInterpolatedPositions.get(raceNumber)

        if (previousPos && currentInterpolated) {
          // Calculate velocity based on position change and time elapsed
          const timeDelta = (now - previousPos.timestamp) / 1000 // Convert to seconds
          const velocityX = timeDelta > 0 ? (position.X - previousPos.x) / timeDelta : 0
          const velocityY = timeDelta > 0 ? (position.Y - previousPos.y) / timeDelta : 0

          // Update interpolated position with new target and velocity
          newInterpolatedPositions.set(raceNumber, {
            x: currentInterpolated.x, // Keep current interpolated position
            y: currentInterpolated.y,
            targetX: position.X,
            targetY: position.Y,
            velocityX,
            velocityY,
            lastUpdate: now
          })
        } else {
          // First time seeing this car, set initial position
          newInterpolatedPositions.set(raceNumber, {
            x: position.X,
            y: position.Y,
            targetX: position.X,
            targetY: position.Y,
            velocityX: 0,
            velocityY: 0,
            lastUpdate: now
          })
        }

        // Update previous position for next calculation
        previousPositionsRef.current.set(raceNumber, {
          x: position.X,
          y: position.Y,
          timestamp: now
        })
      }
    })

    setInterpolatedPositions(newInterpolatedPositions)
  }, [positionData, drivers, interpolatedPositions])

  // Animation loop for smooth interpolation
  useEffect(() => {
    const animate = (): void => {
      const now = Date.now()
      const newPositions = new Map(interpolatedPositions)
      let hasChanges = false

      newPositions.forEach((pos, raceNumber) => {
        const timeSinceUpdate = (now - pos.lastUpdate) / 1000 // seconds

        // Predict position based on velocity
        // Use exponential decay to slow down as we approach the target
        const maxPredictionTime = 2.0 // Don't predict more than 2 seconds ahead
        const predictionTime = Math.min(timeSinceUpdate, maxPredictionTime)

        // Calculate predicted position
        const predictedX = pos.targetX + pos.velocityX * predictionTime
        const predictedY = pos.targetY + pos.velocityY * predictionTime

        // Smoothly interpolate towards predicted position
        const smoothingFactor = 0.15 // Lower = smoother, higher = more responsive
        const newX = pos.x + (predictedX - pos.x) * smoothingFactor
        const newY = pos.y + (predictedY - pos.y) * smoothingFactor

        // Only update if position changed significantly (avoid micro-updates)
        if (Math.abs(newX - pos.x) > 0.1 || Math.abs(newY - pos.y) > 0.1) {
          newPositions.set(raceNumber, {
            ...pos,
            x: newX,
            y: newY
          })
          hasChanges = true
        }
      })

      if (hasChanges) {
        setInterpolatedPositions(newPositions)
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [interpolatedPositions])

  // Memoize track bounds and sector paths separately (they don't change with car positions)
  const { bounds, sectorPaths, viewBox, shouldRotate, carRadius, strokeWidth } = useMemo(() => {
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
    const padding = Math.max(dataWidth, dataHeight) * 0.05 // Increased to 5% padding

    const isPortrait = dataHeight > dataWidth
    const shouldRotate = isPortrait

    const viewBoxMinX = minX - padding
    const viewBoxMinY = minY - padding
    const viewBoxWidth = dataWidth + 2 * padding
    const viewBoxHeight = dataHeight + 2 * padding

    // Pre-calculate sizes for performance
    const maxDimension = Math.max(dataWidth, dataHeight)
    const carRadius = maxDimension * 0.018 // Slightly larger cars
    const strokeWidth = maxDimension * 0.005

    return {
      bounds: { minX, maxX, minY, maxY },
      sectorPaths,
      viewBox: `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`,
      shouldRotate,
      carRadius,
      strokeWidth
    }
  }, [trackMapData])

  // Memoize car positions using interpolated positions
  const carDots = useMemo(() => {
    const dots: CarDot[] = []
    if (drivers) {
      interpolatedPositions.forEach((pos, raceNumber) => {
        const driver = drivers[raceNumber]
        if (driver) {
          dots.push({
            x: pos.x,
            y: pos.y,
            raceNumber,
            teamColor: driver.TeamColour,
            tla: driver.Tla
          })
        }
      })
    }
    return dots
  }, [interpolatedPositions, drivers])

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
          {/* Track sectors with different colors */}
          {sectorPaths.map((path, index) => {
            const sectorColors = ['#ef4444', '#f59e0b', '#10b981']
            const color = sectorColors[index] || '#4ade80'

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
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
