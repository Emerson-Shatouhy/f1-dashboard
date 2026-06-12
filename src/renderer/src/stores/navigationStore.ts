import { create } from 'zustand'

interface NavigationState {
  projectorMode: boolean
  setProjectorMode: (enabled: boolean) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  projectorMode: false,
  setProjectorMode: (enabled) => set({ projectorMode: enabled }),
}))
