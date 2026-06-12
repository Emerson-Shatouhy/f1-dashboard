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
  onRaceControlMessagesUpdate: (
    callback: (data: { [key: string]: RaceControlMessage }) => void
  ) => void
  onSessionInfoUpdate: (callback: (data: SessionInfo) => void) => void
  onSessionDataUpdate: (callback: (data: SessionData) => void) => void
  onLapCountUpdate: (callback: (data: LapCount) => void) => void
  onTimingDataUpdate: (callback: (data: TimingData) => void) => void

  openProjectorWindow: () => Promise<void>

  // Live viewer (iPad)
  getRemoteControlUrl: () => Promise<string>

  // F1 client control
  startF1Client: () => Promise<void>
  getClientStatus: () => Promise<{ status: 'disconnected' | 'connecting' | 'connected'; debugMode: boolean; enableLogging: boolean }>
  reconnectF1Client: () => Promise<void>
  setDebugMode: (enabled: boolean) => Promise<void>
  setLoggingMode: (enabled: boolean) => Promise<void>
  onClientStatusUpdate: (callback: (data: { status: 'disconnected' | 'connecting' | 'connected'; debugMode: boolean; enableLogging: boolean }) => void) => void
  f1IsAuthenticated: () => Promise<boolean>
  f1ClearAuth: () => Promise<void>
  f1Login: () => Promise<void>
  loadTrackMap: (circuitKey: number) => Promise<unknown>
  checkForUpdates: () => Promise<void>
  restartAndUpdate: () => Promise<void>
  onUpdateChecking: (callback: () => void) => void
  onUpdateAvailable: (callback: (info: unknown) => void) => void
  onUpdateNotAvailable: (callback: (info: unknown) => void) => void
  onUpdateError: (callback: (error: unknown) => void) => void
  onUpdateDownloadProgress: (callback: (progress: unknown) => void) => void
  onUpdateDownloaded: (callback: (info: unknown) => void) => void
  openF1: {
    getSessions: (params?: unknown) => Promise<unknown>
    getMeetings: (params?: unknown) => Promise<unknown>
    getDrivers: (params?: unknown) => Promise<unknown>
    getPosition: (params?: unknown) => Promise<unknown>
    getCarData: (params?: unknown) => Promise<unknown>
    getLaps: (params?: unknown) => Promise<unknown>
    getPit: (params?: unknown) => Promise<unknown>
    getRaceControl: (params?: unknown) => Promise<unknown>
    getTeamRadio: (params?: unknown) => Promise<unknown>
    getWeather: (params?: unknown) => Promise<unknown>
    getIntervals: (params?: unknown) => Promise<unknown>
    getStints: (params?: unknown) => Promise<unknown>
    getSessionResults: (params?: unknown) => Promise<unknown>
    getLocation: (params?: unknown) => Promise<unknown>
  }
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
