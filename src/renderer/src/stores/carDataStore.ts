import { create } from 'zustand'

export interface CarChannels {
  rpm: number
  speed: number
  gear: number
  throttle: number
  brake: number
  drs: number
}

interface CarDataState {
  // Keyed by racing number string e.g. "44"
  Cars: Record<string, CarChannels>
  updateCarData: (data: unknown) => void
}

function parseChannels(channels: Record<string, number>): CarChannels {
  return {
    rpm: channels['0'] ?? 0,
    speed: channels['2'] ?? 0,
    gear: channels['3'] ?? 0,
    throttle: channels['4'] ?? 0,
    brake: channels['5'] ?? 0,
    drs: channels['45'] ?? 0
  }
}

export const useCarDataStore = create<CarDataState>((set) => ({
  Cars: {},
  updateCarData: (data: unknown) => {
    // data shape: { Entries: [ { Utc: string, Cars: { [racingNumber]: { Channels: {...} } } } ] }
    // or directly { Utc: string, Cars: { ... } } for a single entry
    const payload = data as {
      Entries?: Array<{ Utc: string; Cars: Record<string, { Channels: Record<string, number> }> }>
      Cars?: Record<string, { Channels: Record<string, number> }>
    }

    // Take the latest entry if there's an Entries array, otherwise use root
    const entry =
      payload.Entries && payload.Entries.length > 0
        ? payload.Entries[payload.Entries.length - 1]
        : payload.Cars
          ? (payload as { Cars: Record<string, { Channels: Record<string, number> }> })
          : null

    if (!entry) return

    const carsRaw = (entry as { Cars: Record<string, { Channels: Record<string, number> }> }).Cars
    if (!carsRaw) return

    const updated: Record<string, CarChannels> = {}
    for (const [racingNumber, carData] of Object.entries(carsRaw)) {
      if (carData?.Channels) {
        updated[racingNumber] = parseChannels(carData.Channels)
      }
    }

    set((state) => ({ Cars: { ...state.Cars, ...updated } }))
  }
}))
