import type { TrackMapData, TrackMapFile } from '../../renderer/src/types/openF1Types'

// Cache to prevent re-fetching the same track map
const trackMapCache = new Map<number, { data: TrackMapData; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

/**
 * Load track map from JSON file via IPC
 */
async function loadTrackMapFromFile(circuitKey: number): Promise<TrackMapData | null> {
  try {
    if (typeof window !== 'undefined' && window.api?.loadTrackMap) {
      const trackMapFile = (await window.api.loadTrackMap(circuitKey)) as TrackMapFile | null

      if (!trackMapFile) {
        console.log(`[TrackMap] File not found for circuit ${circuitKey}`)
        return null
      }

      console.log(
        `[TrackMap] ✅ Loaded ${trackMapFile.circuit_short_name} from JSON (${trackMapFile.positions.length} points)`
      )

      // Convert TrackMapFile to TrackMapData format
      return {
        circuit_key: trackMapFile.circuit_key,
        positions: trackMapFile.positions,
        start_index: trackMapFile.start_index,
        sectors: trackMapFile.sectors ?? null,
        pit_lane: trackMapFile.pit_lane ?? null,
        rotation: trackMapFile.rotation ?? 0
      }
    }
    return null
  } catch (error) {
    console.error(`[TrackMap] Error loading track map from file:`, error)
    return null
  }
}

async function getTrackMap(circuitKey: number): Promise<TrackMapData> {
  // Check cache first
  const cached = trackMapCache.get(circuitKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[TrackMap] Using cached data for circuit ${circuitKey}`)
    return cached.data
  }

  // Try to load from JSON file
  const fileData = await loadTrackMapFromFile(circuitKey)
  if (fileData) {
    // Cache the file data
    trackMapCache.set(circuitKey, { data: fileData, timestamp: Date.now() })
    return fileData
  }

  // If file not found, return empty track map
  console.warn(`[TrackMap] No track map data available for circuit ${circuitKey}`)
  return {
    circuit_key: circuitKey,
    positions: [],
    start_index: 0,
    sectors: null,
    pit_lane: null,
    rotation: 0
  }
}

export default getTrackMap
