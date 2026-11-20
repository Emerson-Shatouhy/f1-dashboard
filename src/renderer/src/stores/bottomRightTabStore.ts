import { create } from 'zustand'

export type BottomRightTab = 'race-control' | 'onboard'

const STORAGE_KEY = 'bottomRight.tab'

function readStoredTab(): BottomRightTab {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'race-control' || v === 'onboard') return v
  } catch {
    // storage unavailable
  }
  return 'race-control'
}

interface BottomRightTabState {
  tab: BottomRightTab
  setTab: (tab: BottomRightTab) => void
}

export const useBottomRightTabStore = create<BottomRightTabState>((set) => ({
  tab: readStoredTab(),
  setTab: (tab) => {
    try {
      localStorage.setItem(STORAGE_KEY, tab)
    } catch {
      // ignore
    }
    set({ tab })
  }
}))
