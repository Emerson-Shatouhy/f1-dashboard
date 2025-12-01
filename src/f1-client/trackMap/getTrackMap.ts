import type {
  SessionResult,
  LapData,
  LocationData,
  TrackPosition,
  Session,
  TrackMapData
} from '../../renderer/src/types/openF1Types'


async function getTrackMap(circuitKey: number): Promise<TrackMapData> {
  try {
    console.log(`[TrackMap] Starting track map fetch for circuit key: ${circuitKey}`)

    const currentYear = new Date().getFullYear()

    // Get all sessions for this circuit in the current year
    const currentYearSessions = await getSessionsForCircuit(circuitKey, currentYear)
    console.log(`[TrackMap] Found ${currentYearSessions.length} sessions this year (${currentYear})`)

    let targetSessionKey: number

    if (currentYearSessions.length === 0) {
      // No sessions this year, use last year's race
      console.log(`[TrackMap] No sessions found for ${currentYear}, falling back to previous year`)
      const lastYearSessions = await getSessionsForCircuit(circuitKey, currentYear - 1)

      if (lastYearSessions.length === 0) {
        throw new Error(`No sessions found for circuit ${circuitKey} in ${currentYear} or ${currentYear - 1}`)
      }

      // Find the race session from last year
      const lastYearRace = lastYearSessions.find((s: Session) => s.session_type === 'Race')
      if (!lastYearRace) {
        // Fall back to any session from last year
        targetSessionKey = lastYearSessions[0].session_key
        console.log(
          `[TrackMap] Using session ${targetSessionKey} from ${currentYear - 1} (no race found)`
        )
      } else {
        targetSessionKey = lastYearRace.session_key
        console.log(`[TrackMap] Using last year's race session ${targetSessionKey}`)
      }
    } else {
      // Use the most recent session from this year
      // Sessions are typically returned in chronological order, so take the last one
      targetSessionKey = currentYearSessions[currentYearSessions.length - 1].session_key
      console.log(
        `[TrackMap] Using most recent session from this year: ${targetSessionKey} (${currentYearSessions[currentYearSessions.length - 1].session_type})`
      )
    }

    const positions = await getFastestLapOfSession(targetSessionKey)
    console.log(`[TrackMap] Got ${positions.length} position points`)

    if (positions.length === 0) {
      console.warn(`[TrackMap] WARNING: No position data returned for session ${targetSessionKey}`)
    }

    const sectorBoundaries = calculateSectorBoundaries(positions)

    console.log(`[TrackMap] Final track map data:`, {
      circuit_key: circuitKey,
      positionCount: positions.length,
      sectorCount: sectorBoundaries.length,
      start_line: positions[0]
    })

    return {
      circuit_key: circuitKey,
      positions,
      sector_boundaries: sectorBoundaries,
      start_line: positions[0] || { x: 0, y: 0, z: 0, timestamp: '' }
    }
  } catch (error) {
    console.error(`[TrackMap] Error fetching track map for circuit ${circuitKey}:`, error)
    throw error
  }
}

async function getSessionsForCircuit(circuitKey: number, year: number): Promise<Session[]> {
  if (typeof window !== 'undefined' && window.api?.openF1) {
    const sessions = (await window.api.openF1.getSessions({
      circuit_key: circuitKey,
      year: year
    })) as Session[]

    return sessions
  } else {
    throw new Error('OpenF1 API not available - ensure this is called from renderer process')
  }
}

async function getFastestLapOfSession(sessionKey: number): Promise<TrackPosition[]> {
  if (typeof window !== 'undefined' && window.api?.openF1) {
    console.log(`[TrackMap] Getting fastest lap for session ${sessionKey}`)

    // Try up to 10 positions (P1 through P10) to find one with location data
    const MAX_ATTEMPTS = 10

    for (let position = 1; position <= MAX_ATTEMPTS; position++) {
      try {
        console.log(`[TrackMap] Attempting position ${position}...`)

        // Step 1: Get driver at this position
        const driverResult = (await window.api.openF1.getSessionResults({
          session_key: sessionKey,
          position: position
        })) as SessionResult[]

        if (!driverResult || driverResult.length === 0) {
          console.warn(`[TrackMap] No session results found for position ${position}`)
          continue
        }

        // Step 2: Get lap data
        const lapData = (await window.api.openF1.getLaps({
          session_key: sessionKey,
          driver_number: driverResult[0].driver_number,
          lap_number: driverResult[0].number_of_laps
        })) as LapData[]

        if (!lapData || lapData.length === 0) {
          console.warn(
            `[TrackMap] No lap data found for driver ${driverResult[0].driver_number} at position ${position}`
          )
          continue
        }

        // Add 1 second buffer on each side to ensure we capture all data
        const BUFFER_SECONDS = 0
        const lapStartTime = new Date(lapData[0].date_start).getTime()
        const lapEndTime = lapStartTime + lapData[0].lap_duration * 1000 // lap_duration is likely in seconds

        // Apply buffer: subtract 1s from start, add 1s to end
        const bufferedStartDate = new Date(lapStartTime - BUFFER_SECONDS * 1000).toISOString()
        const bufferedEndDate = new Date(lapEndTime + BUFFER_SECONDS * 1000).toISOString()

        // Step 3: Get location data for the lap with buffered time range
        try {
          const locationData = (await window.api.openF1.getLocation({
            session_key: sessionKey,
            driver_number: driverResult[0].driver_number,
            start_date: bufferedStartDate,
            end_date: bufferedEndDate
          })) as LocationData[]

          console.log(`[TrackMap] ✅ Got ${locationData.length} points from P${position}`)

          const lapPosition: TrackPosition[] = []
          for (const pos of locationData) {
            lapPosition.push({
              x: pos.x,
              y: pos.y,
              z: pos.z,
              timestamp: pos.date
            })
          }

          return lapPosition
        } catch {
          // This driver's lap has no location data, try next position
          console.warn(`[TrackMap] P${position} has no location data, trying next...`)
          continue
        }
      } catch {
        console.warn(`[TrackMap] Error at P${position}, trying next...`)
        continue
      }
    }

    // If we get here, all attempts failed
    console.error(
      `[TrackMap] ⚠️ Failed to get location data after trying ${MAX_ATTEMPTS} positions`
    )
    return []
  } else {
    throw new Error('OpenF1 API not available - ensure this is called from renderer process')
  }
}

function calculateSectorBoundaries(positions: TrackPosition[]): TrackMapData['sector_boundaries'] {
  if (positions.length === 0) return []

  // Divide the track into 3 approximately equal sectors
  const totalPositions = positions.length
  const sector1End = Math.floor(totalPositions / 3)
  const sector2End = Math.floor((totalPositions * 2) / 3)

  return [
    {
      sector: 1,
      start: positions[0],
      end: positions[sector1End - 1] || positions[0]
    },
    {
      sector: 2,
      start: positions[sector1End] || positions[0],
      end: positions[sector2End - 1] || positions[0]
    },
    {
      sector: 3,
      start: positions[sector2End] || positions[0],
      end: positions[positions.length - 1]
    }
  ]
}

export default getTrackMap
