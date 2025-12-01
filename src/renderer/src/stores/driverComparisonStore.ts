import { create } from 'zustand'

interface DriverComparisonState {
  selectedDriverNumbers: string[]
  toggleDriver: (racingNumber: string) => void
  clearSelection: () => void
  isDriverSelected: (racingNumber: string) => boolean
  getSelectedCount: () => number
}

export const useDriverComparisonStore = create<DriverComparisonState>((set, get) => ({
  selectedDriverNumbers: [],

  toggleDriver: (racingNumber: string) => {
    set((state) => {
      const isSelected = state.selectedDriverNumbers.includes(racingNumber)
      return {
        selectedDriverNumbers: isSelected
          ? state.selectedDriverNumbers.filter((num) => num !== racingNumber)
          : [...state.selectedDriverNumbers, racingNumber]
      }
    })
  },

  clearSelection: () => {
    set({ selectedDriverNumbers: [] })
  },

  isDriverSelected: (racingNumber: string) => {
    return get().selectedDriverNumbers.includes(racingNumber)
  },

  getSelectedCount: () => {
    return get().selectedDriverNumbers.length
  }
}))
