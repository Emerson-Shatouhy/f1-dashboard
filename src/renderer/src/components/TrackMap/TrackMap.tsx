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

interface AnimatedCarDot extends CarDot {
  prevX?: number
  prevY?: number
}

export default function TrackMap(): React.JSX.Element {
  const positionData = usePositionStore((state) => state.positionData)
  const drivers = useDriverStore((state) => state.Drivers)
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const [trackMapData, setTrackMapData] = useState<TrackMapData | null>(null)
  const previousPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  useEffect(() => {
    if (sessionInfo?.Key) {
      console.log(sessionInfo?.Key)
      getTrackMap(sessionInfo.Meeting.Circuit.Key).then(setTrackMapData).catch(console.error)
    }
  }, [sessionInfo])

  const { carDots, bounds, sectorPaths, viewBox } = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity

    // First, establish bounds from track data if available
    if (trackMapData && trackMapData.positions.length > 0) {
      trackMapData.positions.forEach((point) => {
        minX = Math.min(minX, point.x)
        maxX = Math.max(maxX, point.x)
        minY = Math.min(minY, point.y)
        maxY = Math.max(maxY, point.y)
      })
    }

    // Create car dots from live position data
    const dots: AnimatedCarDot[] = []
    if (positionData?.Entries && drivers) {
      Object.entries(positionData.Entries).forEach(([raceNumber, position]) => {
        if (
          position?.Status === 'OnTrack' &&
          drivers[raceNumber] &&
          typeof position.X === 'number' &&
          typeof position.Y === 'number'
        ) {
          const driver = drivers[raceNumber]
          const previousPosition = previousPositionsRef.current.get(raceNumber)

          dots.push({
            x: position.X,
            y: position.Y,
            raceNumber,
            teamColor: driver.TeamColour,
            tla: driver.Tla,
            prevX: previousPosition?.x,
            prevY: previousPosition?.y
          })

          // Update previous position for next render
          previousPositionsRef.current.set(raceNumber, { x: position.X, y: position.Y })

          // Expand bounds if car positions are outside track bounds
          if (!trackMapData || trackMapData.positions.length === 0) {
            minX = Math.min(minX, position.X)
            maxX = Math.max(maxX, position.X)
            minY = Math.min(minY, position.Y)
            maxY = Math.max(maxY, position.Y)
          }
        }
      })
    }

    // Get sector boundaries from track data
    const sectorBoundaries = trackMapData?.sector_boundaries || []

    // Create SVG paths for each sector
    const sectorPaths: string[] = []
    if (trackMapData && trackMapData.positions.length > 0) {
      sectorBoundaries.forEach((sector, index) => {
        const isLastSector = index === sectorBoundaries.length - 1
        const startIndex = trackMapData.positions.findIndex(
          (p) => p.x === sector.start.x && p.y === sector.start.y
        )

        let endIndex: number
        if (isLastSector) {
          // For sector 3, go all the way to the end and then back to the start to complete the lap
          endIndex = trackMapData.positions.length - 1
        } else {
          endIndex = trackMapData.positions.findIndex(
            (p) => p.x === sector.end.x && p.y === sector.end.y
          )
        }

        if (startIndex !== -1 && endIndex !== -1) {
          let sectorPositions: typeof trackMapData.positions

          if (isLastSector) {
            // For sector 3, include positions from start to end, then back to beginning
            sectorPositions = [
              ...trackMapData.positions.slice(startIndex),
              trackMapData.positions[0] // Close the loop
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

    // Calculate viewBox to maintain aspect ratio and fit the entire track
    const dataWidth = maxX - minX
    const dataHeight = maxY - minY
    const padding = Math.max(dataWidth, dataHeight) * 0.03 // 3% padding

    const viewBoxMinX = minX - padding
    const viewBoxMinY = minY - padding
    const viewBoxWidth = dataWidth + 2 * padding
    const viewBoxHeight = dataHeight + 2 * padding

    return {
      carDots: dots,
      bounds: { minX, maxX, minY, maxY },
      sectorPaths,
      viewBox: `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`
    }
  }, [positionData, drivers, trackMapData])

  const dataWidth = bounds.maxX - bounds.minX
  const dataHeight = bounds.maxY - bounds.minY

  return (
    <svg
      className="w-full h-full bg-gray-900"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Track sectors with different colors */}
      {sectorPaths.map((path, index) => {
        const sectorColors = ['#ef4444', '#f59e0b', '#10b981'] // Red, yellow, green for sectors 1, 2, 3
        const color = sectorColors[index] || '#4ade80'

        return (
          <path
            key={`sector-${index + 1}`}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(dataWidth, dataHeight) * 0.004}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />
        )
      })}
      {/* Car positions */}
      {carDots.map((car) => {
        const carRadius = Math.max(dataWidth, dataHeight) * 0.015

        return (
          <circle
            key={car.raceNumber}
            cx={car.x}
            cy={car.y}
            r={carRadius}
            fill={`#${car.teamColor}`}
            stroke="#000000"
            strokeWidth={carRadius * 0.2}
            className="drop-shadow-lg"
            style={{
              transition:
                'cx 0.8s cubic-bezier(0.4, 0.0, 0.2, 1), cy 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
              transformOrigin: 'center'
            }}
          />
        )
      })}
    </svg>
  )
}
