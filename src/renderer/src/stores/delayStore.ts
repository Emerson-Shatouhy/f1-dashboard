import { create } from 'zustand'

const STORAGE_KEY_ENABLED = 'tvDelay.enabled'
const STORAGE_KEY_DELAY_MS = 'tvDelay.delayMs'
const DEFAULT_DELAY_MS = 45000

interface DelayState {
  enabled: boolean
  delayMs: number
  isBuffering: boolean
  countdown: number
  setEnabled: (v: boolean) => void
  setDelayMs: (ms: number) => void
  _setBuffering: (v: boolean) => void
  _setCountdown: (s: number) => void
}

export const useDelayStore = create<DelayState>((set) => ({
  enabled: localStorage.getItem(STORAGE_KEY_ENABLED) === 'true',
  delayMs: (() => {
    const stored = localStorage.getItem(STORAGE_KEY_DELAY_MS)
    if (stored !== null) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed)) return parsed
    }
    return DEFAULT_DELAY_MS
  })(),
  isBuffering: false,
  countdown: 0,

  setEnabled: (v) => {
    localStorage.setItem(STORAGE_KEY_ENABLED, String(v))
    set({ enabled: v })
  },

  setDelayMs: (ms) => {
    localStorage.setItem(STORAGE_KEY_DELAY_MS, String(ms))
    set({ delayMs: ms })
  },

  _setBuffering: (v) => set({ isBuffering: v }),
  _setCountdown: (s) => set({ countdown: s })
}))
