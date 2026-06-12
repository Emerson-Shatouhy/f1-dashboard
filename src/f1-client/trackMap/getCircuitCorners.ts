import type { CircuitCorner } from '../../renderer/src/types/openF1Types'

const cornerCache = new Map<string, { data: CircuitCorner[]; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

export async function getCircuitCorners(
  circuitKey: number,
  year: number
): Promise<CircuitCorner[]> {
  const cacheKey = `${circuitKey}-${year}`
  const cached = cornerCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    const response = await fetch(
      `https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${year}`
    )
    if (!response.ok) {
      console.warn(`[Corners] Failed to fetch corners for circuit ${circuitKey} (${year}): ${response.status}`)
      return []
    }

    const data = await response.json()
    const corners: CircuitCorner[] = (data.corners ?? []).map(
      (c: { number: number; trackPosition: { x: number; y: number }; angle: number; length: number }) => ({
        number: c.number,
        trackPosition: { x: c.trackPosition.x, y: c.trackPosition.y },
        angle: c.angle,
        length: c.length
      })
    )

    cornerCache.set(cacheKey, { data: corners, timestamp: Date.now() })
    console.log(`[Corners] ✅ Loaded ${corners.length} corners for circuit ${circuitKey} (${year})`)
    return corners
  } catch (error) {
    console.warn(`[Corners] Error fetching corners:`, error)
    return []
  }
}
