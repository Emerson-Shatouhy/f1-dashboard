import { create } from 'zustand'

interface ExpandedDriversState {
  expandedNumbers: Set<string>
  toggle: (racingNumber: string) => void
  isExpanded: (racingNumber: string) => boolean
}

export const useExpandedDriversStore = create<ExpandedDriversState>((set, get) => ({
  expandedNumbers: new Set(),

  toggle: (racingNumber) => {
    set((state) => {
      const next = new Set(state.expandedNumbers)
      if (next.has(racingNumber)) {
        next.delete(racingNumber)
      } else {
        next.add(racingNumber)
      }
      return { expandedNumbers: next }
    })
  },

  isExpanded: (racingNumber) => get().expandedNumbers.has(racingNumber)
}))
