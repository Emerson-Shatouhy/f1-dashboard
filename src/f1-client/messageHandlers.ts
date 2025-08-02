import { BrowserWindow } from 'electron'
import type {
  Heartbeat,
  ExtrapolatedClock,
  TopThree,
  TimingStats,
  TimingAppData,
  WeatherData,
  TrackStatus,
  Driver,
  SessionInfo,
  SessionData,
  TimingData,
  LapCount
} from '../renderer/src/types/liveTimingTypes'
import * as zlib from 'zlib'
import { inflateRaw } from 'pako'

/**
 * Handles Heartbeat data.
 * @param data The Heartbeat data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleHeartbeat(data: Heartbeat, window: BrowserWindow): void {
  // console.log('Heartbeat:', data)
  window.webContents.send('f1-heartbeat-update', data)
}

/**
 * Handles CarData.z (encoded) data.
 * @param data The base64 encoded CarData.
 * @param window The Electron BrowserWindow instance.
 */
export function handleCarData(data: string, window: BrowserWindow): void {
  let carData: unknown

  try {
    const base64Buf = Buffer.from(data, 'base64')

    // Try GZIP first
    try {
      const decompressed = zlib.gunzipSync(base64Buf).toString('utf-8')
      carData = JSON.parse(decompressed)
    } catch {
      // If that fails, try raw inflate (pako)
      const decompressed = inflateRaw(base64Buf, { to: 'string' })
      carData = JSON.parse(decompressed)
    }
    // console.log('CarData:', carData.Entries[0].Cars)
    window.webContents.send('f1-cardata-update', carData)
  } catch {
    // console.error('❌ Failed to decode CarData.z:', error)
  }
}

/**
 * Handles Position.z (encoded) data.
 * @param data The base64 encoded Position data.
 * @param window The Electron BrowserWindow instance.
 */
export function handlePosition(data: string, window: BrowserWindow): void {
  let positionData: unknown

  try {
    const base64Buf = Buffer.from(data, 'base64')

    // Try GZIP first
    try {
      const decompressed = zlib.gunzipSync(base64Buf).toString('utf-8')
      positionData = JSON.parse(decompressed)
    } catch {
      // If that fails, try raw inflate (pako)
      const decompressed = inflateRaw(base64Buf, { to: 'string' })
      positionData = JSON.parse(decompressed)
    }
    window.webContents.send('f1-position-update', positionData)
  } catch {
    // console.error('❌ Failed to decode Position.z:', error)
  }
}

/**
 * Handles ExtrapolatedClock data.
 * @param data The ExtrapolatedClock data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleExtrapolatedClock(data: ExtrapolatedClock, window: BrowserWindow): void {
  // console.log('ExtrapolatedClock:', data)
  window.webContents.send('f1-extrapolatedclock-update', data)
}

/**
 * Handles TopThree data.
 * @param data The TopThree data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleTopThree(data: TopThree, window: BrowserWindow): void {
  // console.log('TopThree:', data)
  window.webContents.send('f1-topthree-update', data)
}

/**
 * Handles RcmSeries (Race Control Messages Series) data.
 * @param data The RcmSeries data. (Type unknown, assuming array of any for now)
 * @param window The Electron BrowserWindow instance.
 */
export function handleRcmSeries(data: unknown[], window: BrowserWindow): void {
  // console.log('RcmSeries:', data)
  window.webContents.send('f1-rcmseries-update', data)
}

/**
 * Handles TimingStats data.
 * @param data The TimingStats data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleTimingStats(data: TimingStats, window: BrowserWindow): void {
  // console.log('TimingStats:', data)
  window.webContents.send('f1-timingstats-update', data)
}

/**
 * Handles TimingAppData(Stint info)
 * @param data The TimingAppData.
 * @param window The Electron BrowserWindow instance.
 */
export function handleTimingAppData(data: TimingAppData, window: BrowserWindow): void {
  // console.log('TimingAppData:', data)
  window.webContents.send('f1-timingappdata-update', data)
}

/**
 * Handles WeatherData.
 * @param data The WeatherData.
 * @param window The Electron BrowserWindow instance.
 */
export function handleWeatherData(data: WeatherData, window: BrowserWindow): void {
  // console.log('WeatherData:', data)
  window.webContents.send('f1-weatherdata-update', data)
}

/**
 * Handles TrackStatus data.
 * @param data The TrackStatus data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleTrackStatus(data: TrackStatus, window: BrowserWindow): void {
  // console.log('TrackStatus:', data)
  window.webContents.send('f1-trackstatus-update', data)
}

/**
 * Handles DriverList data.
 * @param data The DriverList data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleDriverList(
  data: { [racingNumber: string]: Driver },
  window: BrowserWindow
): void {
  // console.log('DriverList:', data)
  window.webContents.send('f1-driverlist-update', data)
}

/**
 * Handles RaceControlMessages data. Data comes as object with string keys and RaceControlMessage values.
 * @param data The RaceControlMessages data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleRaceControlMessages(
  data: { [key: string]: unknown },
  window: BrowserWindow
): void {
  // console.log('RaceControlMessages:', data)
  window.webContents.send('f1-racecontrolmessages-update', data)
}

/**
 * Handles SessionInfo data.
 * @param data The SessionInfo data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleSessionInfo(data: SessionInfo, window: BrowserWindow): void {
  // console.log('SessionInfo:', data)
  window.webContents.send('f1-sessioninfo-update', data)
}

/**
 * Handles SessionData.
 * @param data The SessionData.
 * @param window The Electron BrowserWindow instance.
 */
export function handleSessionData(data: SessionData, window: BrowserWindow): void {
  // console.log('SessionData:', data)
  window.webContents.send('f1-sessiondata-update', data)
}

/**
 * Handles LapCount data. (Type unknown, assuming any for now)
 * @param data The LapCount data.
 * @param window The Electron BrowserWindow instance.
 */
export function handleLapCount(data: LapCount, window: BrowserWindow): void {
  // console.log('LapCount:', data)
  // Send data to renderer process
  window.webContents.send('f1-lapcount-update', data)
}

/**
 * Handles TimingData.
 * @param data The TimingData.
 * @param window The Electron BrowserWindow instance.
 */
export function handleTimingData(data: TimingData, window: BrowserWindow): void {
  // console.log('TimingData:', JSON.stringify(data, null, 2))
  window.webContents.send('f1-timingdata-update', data)
}

/**
 * Process a message from the F1 live timing WebSocket
 * @param dataType The type of data received
 * @param dataPayload The data payload
 * @param window The Electron BrowserWindow instance
 */
export function processMessage(
  dataType: string,
  dataPayload: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  window: BrowserWindow
): void {
  switch (dataType) {
    case 'Heartbeat':
      handleHeartbeat(dataPayload, window)
      break
    case 'CarData.z':
      handleCarData(dataPayload, window)
      break
    case 'Position.z':
      handlePosition(dataPayload, window)
      break
    case 'ExtrapolatedClock':
      handleExtrapolatedClock(dataPayload, window)
      break
    case 'TopThree':
      handleTopThree(dataPayload, window)
      break
    case 'RcmSeries':
      handleRcmSeries(dataPayload, window)
      break
    case 'TimingStats':
      handleTimingStats(dataPayload, window)
      break
    case 'TimingAppData':
      handleTimingAppData(dataPayload, window)
      break
    case 'WeatherData':
      handleWeatherData(dataPayload, window)
      break
    case 'TrackStatus':
      handleTrackStatus(dataPayload, window)
      break
    case 'DriverList':
      handleDriverList(dataPayload, window)
      break
    case 'RaceControlMessages':
      handleRaceControlMessages(dataPayload, window)
      break
    case 'SessionInfo':
      handleSessionInfo(dataPayload, window)
      break
    case 'SessionData':
      handleSessionData(dataPayload, window)
      break
    case 'LapCount':
      handleLapCount(dataPayload, window)
      break
    case 'TimingData':
      handleTimingData(dataPayload, window)
      break
    default:
    // console.log(`Unknown data type: ${dataType}`, dataPayload)
  }
}

/**
 * Process a debug websocket message
 * @param data The message data
 * @param window The Electron BrowserWindow instance
 */
export function processDebugMessage(data: string, window: BrowserWindow): void {
  // console.log('Debug WebSocket message:', data)
  window.webContents.send('debug-websocket-message', data)

  try {
    const parsedData = JSON.parse(data)
    if (parsedData.type && parsedData.payload) {
      processMessage(parsedData.type, parsedData.payload, window)
    }
  } catch (e) {
    console.error('Failed to parse debug message as JSON:', e)
  }
}
