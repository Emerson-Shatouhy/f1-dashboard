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
  },

  // Auto-updater APIs
  onUpdateChecking: (callback: () => void): void => {
    ipcRenderer.on('update-checking', callback)
  },
  onUpdateAvailable: (callback: (info: any) => void): void => {
    ipcRenderer.on('update-available', (_event, info) => callback(info))
  },
  onUpdateNotAvailable: (callback: (info: any) => void): void => {
    ipcRenderer.on('update-not-available', (_event, info) => callback(info))
  },
  onUpdateError: (callback: (error: any) => void): void => {
    ipcRenderer.on('update-error', (_event, error) => callback(error))
  },
  onUpdateDownloadProgress: (callback: (progress: any) => void): void => {
    ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback: (info: any) => void): void => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info))
  },
  checkForUpdates: (): Promise<void> => {
    return ipcRenderer.invoke('check-for-updates')
  },
  restartAndUpdate: (): Promise<void> => {
    return ipcRenderer.invoke('restart-and-update')
  },

  // F1 client control
  startF1Client: (): Promise<void> => {
    return ipcRenderer.invoke('start-f1-client')
  },

  // OpenF1 API methods
  openF1: {
    getSessions: (params?: {
      circuit_key?: number
      session_type?: string
      session_name?: string
      year?: number
      country_name?: string
      location?: string
      session_key?: number
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-sessions', params)
    },
    getMeetings: (params?: {
      meeting_key?: number
      year?: number
      country_name?: string
      circuit_key?: number
      circuit_short_name?: string
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-meetings', params)
    },
    getDrivers: (params?: {
      driver_number?: number
      broadcast_name?: string
      full_name?: string
      name_acronym?: string
      team_name?: string
      session_key?: number
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-drivers', params)
    },
    getPosition: (params?: {
      session_key?: number
      driver_number?: number
      date?: string
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-position', params)
    },
    getCarData: (params?: {
      session_key?: number
      driver_number?: number
      speed?: number
      date?: string
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-car-data', params)
    },
    getLaps: (params?: {
      session_key?: number
      driver_number?: number
      lap_number?: number
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-laps', params)
    },
    getPit: (params?: { session_key?: number; driver_number?: number }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-pit', params)
    },
    getRaceControl: (params?: {
      session_key?: number
      category?: string
      date?: string
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-race-control', params)
    },
    getTeamRadio: (params?: {
      session_key?: number
      driver_number?: number
      date?: string
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-team-radio', params)
    },
    getWeather: (params?: { session_key?: number; date?: string }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-weather', params)
    },
    getIntervals: (params?: { session_key?: number; date?: string }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-intervals', params)
    },
    getStints: (params?: {
      session_key?: number
      driver_number?: number
      compound?: string
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-stints', params)
    },
    getSessionResults: (params?: {
      session_key?: number
      year?: number
      position?: number
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-session-results', params)
    },
    getLocation: (params?: {
      session_key?: number
      driver_number?: number
      date?: string
      start_date?: string
      end_date?: string
    }): Promise<unknown> => {
      return ipcRenderer.invoke('openf1-get-location', params)
    }
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
