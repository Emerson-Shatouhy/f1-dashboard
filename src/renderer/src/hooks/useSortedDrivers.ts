import { useDriverStore } from '../stores/driverStore'
import { useDriverTimingStore } from '../stores/driverTimingStore'
import type { Driver } from '../types/liveTimingTypes'

// Drivers ordered by live position, falling back to their DriverList line
export function useSortedDrivers(): Driver[] {
  const Drivers = useDriverStore((state) => state.Drivers)
  const DriverTiming = useDriverTimingStore((state) => state.DriverTiming)

  return (Object.values(Drivers) as Driver[]).sort((a, b) => {
    const positionA = parseInt(DriverTiming[a.RacingNumber]?.Position ?? '') || a.Line
    const positionB = parseInt(DriverTiming[b.RacingNumber]?.Position ?? '') || b.Line
    return positionA - positionB
  })
}
