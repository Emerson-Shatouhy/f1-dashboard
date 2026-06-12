import { create } from 'zustand'
import type { CircuitCorner, TrackPosition } from '../types/openF1Types'

interface CornerStoreState {
  corners: CircuitCorner[]
  // Precomputed polyline index for each corner (index into trackPositions)
  cornerPolylineIndices: number[]
  trackPositions: TrackPosition[]
  circuitKey: number | null
  setCorners: (circuitKey: number, corners: CircuitCorner[]) => void
  setTrackPositions: (positions: TrackPosition[]) => void
}

/** Find the index of the nearest point in a polyline to (x, y) */
export function nearestPolylineIndex(
  positions: TrackPosition[],
  x: number,
  y: number
): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < positions.length; i++) {
    const d = (positions[i].x - x) ** 2 + (positions[i].y - y) ** 2
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

export const useCornerStore = create<CornerStoreState>((set, get) => ({
  corners: [],
  cornerPolylineIndices: [],
  trackPositions: [],
  circuitKey: null,

  setCorners: (circuitKey, corners) => {
    const { trackPositions } = get()
    const indices =
      trackPositions.length > 0
        ? corners.map((c) =>
            nearestPolylineIndex(trackPositions, c.trackPosition.x, c.trackPosition.y)
          )
        : corners.map(() => 0)
    set({ circuitKey, corners, cornerPolylineIndices: indices })
  },

  setTrackPositions: (positions) => {
    const { corners } = get()
    const indices =
      positions.length > 0
        ? corners.map((c) =>
            nearestPolylineIndex(positions, c.trackPosition.x, c.trackPosition.y)
          )
        : corners.map(() => 0)
    set({ trackPositions: positions, cornerPolylineIndices: indices })
  }
}))
