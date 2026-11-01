import { create } from 'zustand'

const STORAGE_KEY_VIEW = 'dashboard.view'

export type DashboardView = 'pitwall' | 'broadcast'

interface NavigationState {
  projectorMode: boolean
  view: DashboardView
  setProjectorMode: (enabled: boolean) => void
  setView: (view: DashboardView) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  projectorMode: false,
  view: localStorage.getItem(STORAGE_KEY_VIEW) === 'broadcast' ? 'broadcast' : 'pitwall',
  setProjectorMode: (enabled) => set({ projectorMode: enabled }),
  setView: (view) => {
    localStorage.setItem(STORAGE_KEY_VIEW, view)
    set({ view })
  }
}))
