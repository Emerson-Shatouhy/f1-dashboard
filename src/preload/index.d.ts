import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Driver,
  Heartbeat,
  ExtrapolatedClock,
  TopThree,
  TimingStats,
  TimingAppData,
  WeatherData,
  TrackStatus,
  SessionInfo,
  SessionData,
  TimingData,
  RaceControlMessage,
  LapCount
} from '../renderer/src/types/liveTimingTypes'

interface Position {
  Status: string
  X: number
  Y: number
  Z: number
}

interface PositionData {
  Position: {
    Entries: Record<string, Position>
  }[]
}

interface F1API {
  onDriverListUpdate: (callback: (driverData: Record<string, Driver>) => void) => void
  onHeartbeatUpdate: (callback: (data: Heartbeat) => void) => void
  onCarDataUpdate: (callback: (data: string) => void) => void
  onPositionUpdate: (callback: (data: PositionData) => void) => void
  onExtrapolatedClockUpdate: (callback: (data: ExtrapolatedClock) => void) => void
  onTopThreeUpdate: (callback: (data: TopThree[]) => void) => void
  onRcmSeriesUpdate: (callback: (data: RaceControlMessage[]) => void) => void
  onTimingStatsUpdate: (callback: (data: TimingStats) => void) => void
  onTimingAppDataUpdate: (callback: (data: TimingAppData) => void) => void
  onWeatherDataUpdate: (callback: (data: WeatherData) => void) => void
  onTrackStatusUpdate: (callback: (data: TrackStatus) => void) => void
  onRaceControlMessagesUpdate: (callback: (data: { [key: string]: RaceControlMessage }) => void) => void
  onSessionInfoUpdate: (callback: (data: SessionInfo) => void) => void
  onSessionDataUpdate: (callback: (data: SessionData) => void) => void
  onLapCountUpdate: (callback: (data: LapCount) => void) => void
  onTimingDataUpdate: (callback: (data: TimingData) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: F1API
    liveTiming: {
      startF1Client: () => Promise<void>
    }
  }
}
