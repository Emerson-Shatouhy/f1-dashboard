import { create } from 'zustand'
import { useBottomRightTabStore } from './bottomRightTabStore'

export interface OnboardFeed {
  label: string
  racingNumber: number | null
  url: string
}

const STORAGE_KEY_DRIVER = 'onboard.driver'

interface OnboardState {
  feeds: OnboardFeed[]
  // Timing-feed session the feeds belong to; null when picked manually on F1 TV
  feedsSessionKey: number | null
  loading: boolean
  error: string | null
  // Last session key an automatic load was tried for, so a failure isn't retried in a loop
  attemptedKey: number | null
  autoLoad: (sessionKey: number) => Promise<void>
  lastRefreshAt: number
  // Re-fetch the feeds for a session whose signed URLs expired; returns false if throttled
  refreshFeeds: (sessionKey: number) => Promise<boolean>
  // Racing number of the driver whose onboard is shown (as a string, like the driver store keys)
  selected: string | null
  setFeedSet: (set: { feeds: OnboardFeed[]; sessionKey: number | null }) => void
  select: (racingNumber: string) => void
  // Show a driver's onboard and bring the Onboard tab forward; no-op if there is no feed for them
  showDriver: (racingNumber: string) => void
}

export const useOnboardStore = create<OnboardState>((set, get) => ({
  feeds: [],
  feedsSessionKey: null,
  loading: false,
  error: null,
  attemptedKey: null,
  autoLoad: async (sessionKey) => {
    set({ loading: true, error: null, attemptedKey: sessionKey })
    try {
      const res = await window.api.autoLoadF1TvFeeds(sessionKey)
      set({ loading: false, error: res.ok ? null : (res.error ?? 'Could not load feeds') })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) })
    }
  },
  lastRefreshAt: 0,
  refreshFeeds: async (sessionKey) => {
    // Don't hammer F1 TV if the new URLs fail as well
    if (Date.now() - get().lastRefreshAt < 30_000) return false
    set({ lastRefreshAt: Date.now() })
    try {
      const res = await window.api.autoLoadF1TvFeeds(sessionKey)
      if (!res.ok) set({ error: res.error ?? 'Could not refresh feeds' })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    }
    return true
  },
  selected: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DRIVER)
    } catch {
      return null
    }
  })(),
  setFeedSet: ({ feeds, sessionKey }) => set({ feeds, feedsSessionKey: sessionKey, error: null }),
  select: (racingNumber) => {
    try {
      localStorage.setItem(STORAGE_KEY_DRIVER, racingNumber)
    } catch {
      // storage unavailable; selection just won't persist
    }
    set({ selected: racingNumber })
  },
  showDriver: (racingNumber) => {
    const has = useOnboardStore
      .getState()
      .feeds.some((f) => f.racingNumber !== null && String(f.racingNumber) === racingNumber)
    if (!has) return
    useOnboardStore.getState().select(racingNumber)
    useBottomRightTabStore.getState().setTab('onboard')
  }
}))

// Feeds come from the main process (captured from F1 TV), not from the timing feed, so they
// are wired here instead of in useStoreSubscriptions and bypass the TV-delay queue.
void window.api.getF1TvFeeds().then((set) => useOnboardStore.getState().setFeedSet(set))
window.api.onF1TvFeeds((set) => useOnboardStore.getState().setFeedSet(set))
