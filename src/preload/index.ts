import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
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
  RaceControlMessage
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

// Custom APIs for renderer
const api = {
  // F1 Data APIs
  onDriverListUpdate: (callback: (driverData: Record<string, Driver>) => void): void => {
    ipcRenderer.on('f1-driverlist-update', (_event, data) => callback(data))
  },
  onHeartbeatUpdate: (callback: (data: Heartbeat) => void): void => {
    ipcRenderer.on('f1-heartbeat-update', (_event, data) => callback(data))
  },
  onCarDataUpdate: (callback: (data: string) => void): void => {
    ipcRenderer.on('f1-cardata-update', (_event, data) => callback(data))
  },
  onPositionUpdate: (callback: (data: PositionData) => void): void => {
    ipcRenderer.on('f1-position-update', (_event, data) => callback(data))
  },
  onExtrapolatedClockUpdate: (callback: (data: ExtrapolatedClock) => void): void => {
    ipcRenderer.on('f1-extrapolatedclock-update', (_event, data) => callback(data))
  },
  onTopThreeUpdate: (callback: (data: TopThree) => void): void => {
    ipcRenderer.on('f1-topthree-update', (_event, data) => callback(data))
  },
  onRcmSeriesUpdate: (callback: (data: RaceControlMessage[]) => void): void => {
    ipcRenderer.on('f1-rcmseries-update', (_event, data) => callback(data))
  },
  onTimingStatsUpdate: (callback: (data: TimingStats) => void): void => {
    ipcRenderer.on('f1-timingstats-update', (_event, data) => callback(data))
  },
  onTimingAppDataUpdate: (callback: (data: TimingAppData) => void): void => {
    ipcRenderer.on('f1-timingappdata-update', (_event, data) => callback(data))
  },
  onWeatherDataUpdate: (callback: (data: WeatherData) => void): void => {
    ipcRenderer.on('f1-weatherdata-update', (_event, data) => callback(data))
  },
  onTrackStatusUpdate: (callback: (data: TrackStatus) => void): void => {
    ipcRenderer.on('f1-trackstatus-update', (_event, data) => callback(data))
  },
  onRaceControlMessagesUpdate: (
    callback: (data: { [key: string]: RaceControlMessage }) => void
  ): void => {
    ipcRenderer.on('f1-racecontrolmessages-update', (_event, data) => callback(data))
  },
  onSessionInfoUpdate: (callback: (data: SessionInfo) => void): void => {
    ipcRenderer.on('f1-sessioninfo-update', (_event, data) => callback(data))
  },
  onSessionDataUpdate: (callback: (data: SessionData) => void): void => {
    ipcRenderer.on('f1-sessiondata-update', (_event, data) => callback(data))
  },
  onLapCountUpdate: (callback: (data: { currentLap: number; totalLaps: number }) => void) => {
    ipcRenderer.on('f1-lapcount-update', (_event, data) => callback(data))
  },
  onTimingDataUpdate: (callback: (data: TimingData) => void): void => {
    ipcRenderer.on('f1-timingdata-update', (_event, data) => callback(data))
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', { ...electronAPI })
    contextBridge.exposeInMainWorld('api', { ...api })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
