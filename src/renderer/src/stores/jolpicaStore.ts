import { create } from 'zustand'
import type { JolpicaRace } from '@renderer/types/jolpicaTypes'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

interface JolpicaState {
  nextRace: JolpicaRace | null
  nextRaceStatus: FetchStatus
  fetchNextRace: () => Promise<void>
}

export const useJolpicaStore = create<JolpicaState>((set) => ({
  nextRace: null,
  nextRaceStatus: 'idle',
  fetchNextRace: async () => {
    set({ nextRaceStatus: 'loading' })
    try {
      const res = await fetch('https://api.jolpi.ca/ergast/f1/current/next.json')
      const json = await res.json()
      const race: JolpicaRace = json.MRData?.RaceTable?.Races?.[0] ?? null
      set({ nextRace: race, nextRaceStatus: 'success' })
    } catch {
      set({ nextRaceStatus: 'error' })
    }
  },
}))
