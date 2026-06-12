import { broadcastF1Data } from '../main/remoteControl'
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

type Send = (channel: string, data: unknown) => void

export function handleHeartbeat(data: Heartbeat, send: Send): void {
  send('f1-heartbeat-update', data)
}

export function handleCarData(data: string, send: Send): void {
  let carData: unknown
  try {
    const base64Buf = Buffer.from(data, 'base64')
    try {
      const decompressed = zlib.gunzipSync(base64Buf).toString('utf-8')
      carData = JSON.parse(decompressed)
    } catch {
      const decompressed = inflateRaw(base64Buf, { to: 'string' })
      carData = JSON.parse(decompressed)
    }
    send('f1-cardata-update', carData)
  } catch (error) {
    console.error('❌ Failed to decode CarData.z:', error)
  }
}

export function handlePosition(data: string, send: Send): void {
  let positionData: unknown
  try {
    const base64Buf = Buffer.from(data, 'base64')
    try {
      const decompressed = zlib.gunzipSync(base64Buf).toString('utf-8')
      positionData = JSON.parse(decompressed)
    } catch {
      const decompressed = inflateRaw(base64Buf, { to: 'string' })
      positionData = JSON.parse(decompressed)
    }
    send('f1-position-update', positionData)
  } catch {
    // ignore decode errors
  }
}

export function handleExtrapolatedClock(data: ExtrapolatedClock, send: Send): void {
  send('f1-extrapolatedclock-update', data)
}

export function handleTopThree(data: TopThree, send: Send): void {
  send('f1-topthree-update', data)
}

export function handleRcmSeries(data: unknown[], send: Send): void {
  send('f1-rcmseries-update', data)
}

export function handleTimingStats(data: TimingStats, send: Send): void {
  send('f1-timingstats-update', data)
}

export function handleTimingAppData(data: TimingAppData, send: Send): void {
  send('f1-timingappdata-update', data)
  broadcastF1Data('timingAppData', data)
}

export function handleWeatherData(data: WeatherData, send: Send): void {
  send('f1-weatherdata-update', data)
  broadcastF1Data('weatherData', data)
}

export function handleTrackStatus(data: TrackStatus, send: Send): void {
  send('f1-trackstatus-update', data)
  broadcastF1Data('trackStatus', data)
}

export function handleDriverList(data: { [racingNumber: string]: Driver }, send: Send): void {
  send('f1-driverlist-update', data)
  broadcastF1Data('driverList', data)
}

export function handleRaceControlMessages(data: { [key: string]: unknown }, send: Send): void {
  send('f1-racecontrolmessages-update', data)
  broadcastF1Data('raceControlMessages', data)
}

export function handleSessionInfo(data: SessionInfo, send: Send): void {
  send('f1-sessioninfo-update', data)
  broadcastF1Data('sessionInfo', data)
}

export function handleSessionData(data: SessionData, send: Send): void {
  send('f1-sessiondata-update', data)
}

export function handleLapCount(data: LapCount, send: Send): void {
  send('f1-lapcount-update', data)
  broadcastF1Data('lapCount', data)
}

export function handleTimingData(data: TimingData, send: Send): void {
  send('f1-timingdata-update', data)
  broadcastF1Data('timingData', data)
}

export function processMessage(
  dataType: string,
  dataPayload: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  send: Send
): void {
  switch (dataType) {
    case 'Heartbeat':
      handleHeartbeat(dataPayload, send)
      break
    case 'CarData.z':
      handleCarData(dataPayload, send)
      break
    case 'Position.z':
      handlePosition(dataPayload, send)
      break
    case 'ExtrapolatedClock':
      handleExtrapolatedClock(dataPayload, send)
      break
    case 'TopThree':
      handleTopThree(dataPayload, send)
      break
    case 'RcmSeries':
      handleRcmSeries(dataPayload, send)
      break
    case 'TimingStats':
      handleTimingStats(dataPayload, send)
      break
    case 'TimingAppData':
      handleTimingAppData(dataPayload, send)
      break
    case 'WeatherData':
      handleWeatherData(dataPayload, send)
      break
    case 'TrackStatus':
      handleTrackStatus(dataPayload, send)
      break
    case 'DriverList':
      handleDriverList(dataPayload, send)
      break
    case 'RaceControlMessages':
      handleRaceControlMessages(dataPayload, send)
      break
    case 'SessionInfo':
      handleSessionInfo(dataPayload, send)
      break
    case 'SessionData':
      handleSessionData(dataPayload, send)
      break
    case 'LapCount':
      handleLapCount(dataPayload, send)
      break
    case 'TimingData':
      handleTimingData(dataPayload, send)
      break
    default:
      if (!['ContentStreams', 'AudioStreams', 'TeamRadio', 'TlaRcm'].includes(dataType)) {
        console.log(`⚠️  Unknown data type: "${dataType}"`)
      }
      if (dataType === 'PitLaneTimeCollection') {
        console.log('PitLaneTimeCollection:', JSON.stringify(dataPayload, null, 2))
      }
  }
}
