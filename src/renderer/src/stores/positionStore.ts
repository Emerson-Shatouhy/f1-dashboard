import { create } from 'zustand'

interface PositionState {
  positionData: unknown | null
  updatePositionData: (positionData: unknown) => void
}

export const usePositionStore = create<PositionState>((set) => ({
  positionData: null,
  updatePositionData: (positionData: unknown) => {
    set((state) => {
      if (JSON.stringify(state.positionData) !== JSON.stringify(positionData)) {
        return { positionData }
      }
      return state
    })
  }
}))
