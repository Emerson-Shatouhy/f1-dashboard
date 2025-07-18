import { create } from 'zustand'
import { Driver } from '../types/liveTimingTypes'

interface DriverState {
  Drivers: Record<string, Driver>
  updateDrivers: (drivers: Record<string, Driver>) => void
  getDriver: (racingNumber: string) => Driver | null
}

export const useDriverStore = create<DriverState>((set) => ({
  // Initial State is a map of drivers
  Drivers: {},
  updateDrivers: (drivers: Record<string, Driver>) => {
    set((state) => {
      const newDrivers = { ...state.Drivers }
      let hasChanged = false
      for (const racingNumber in drivers) {
        const existingDriver = state.Drivers[racingNumber]
        const updatedDriver = drivers[racingNumber]

        // If driver exists, merge the new data with existing data
        // If driver doesn't exist, use the new data as is
        const mergedDriver = existingDriver
          ? { ...existingDriver, ...updatedDriver }
          : updatedDriver

        if (!existingDriver || JSON.stringify(existingDriver) !== JSON.stringify(mergedDriver)) {
          newDrivers[racingNumber] = mergedDriver
          hasChanged = true
        }
      }
      if (hasChanged) {
        return { Drivers: newDrivers }
      }
      return state // No changes, return original state
    })
  },
  // Function to get a specific driver by racing number
  getDriver: (racingNumber: string) => {
    const state = useDriverStore.getState()
    return state.Drivers[racingNumber] || null
  }
}))
