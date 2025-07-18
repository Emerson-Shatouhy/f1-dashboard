import { create } from 'zustand'

interface CarDataState {
  carData: unknown | null
  updateCarData: (carData: unknown) => void
}

export const useCarDataStore = create<CarDataState>((set) => ({
  carData: null,
  updateCarData: (carData: unknown) => {
    set((state) => {
      if (JSON.stringify(state.carData) !== JSON.stringify(carData)) {
        return { carData }
      }
      return state
    })
  }
}))
