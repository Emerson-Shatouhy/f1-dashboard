import { create } from 'zustand'

const STORAGE_KEY_VIEW = 'dashboard.view'

export type DashboardView = 'pitwall' | 'broadcast'

interface NavigationState {
  view: DashboardView
  setView: (view: DashboardView) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  view: localStorage.getItem(STORAGE_KEY_VIEW) === 'broadcast' ? 'broadcast' : 'pitwall',
  setView: (view) => {
    localStorage.setItem(STORAGE_KEY_VIEW, view)
    set({ view })
  }
}))
