import { create } from 'zustand'
import { Heartbeat } from '../types/liveTimingTypes'

interface HeartbeatState extends Heartbeat {
  updateHeartbeat: (heartbeat: Heartbeat) => void
  getFormattedUtc: () => string
}

export const useHeartbeatStore = create<HeartbeatState>((set) => ({
  Utc: '',
  _kf: false,
  updateHeartbeat: (heartbeat: Heartbeat) =>
    set(() => ({
      Utc: heartbeat.Utc,
      _kf: heartbeat._kf
    })),
  getFormattedUtc: () => {
    const utcDate = new Date(useHeartbeatStore.getState().Utc)
    return utcDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
}))
