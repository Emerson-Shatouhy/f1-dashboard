import { create } from 'zustand'

interface RcmSeriesState {
  rcmSeries: unknown[] | null
  updateRcmSeries: (rcmSeries: unknown[]) => void
}

export const useRcmSeriesStore = create<RcmSeriesState>((set) => ({
  rcmSeries: null,
  updateRcmSeries: (rcmSeries: unknown[]) => {
    set((state) => {
      if (JSON.stringify(state.rcmSeries) !== JSON.stringify(rcmSeries)) {
        return { rcmSeries }
      }
      return state
    })
  }
}))
