export interface SessionResult {
  driver_number: number
  position: number
  number_of_laps: number
}

export interface LapData {
  date_start: string
  lap_duration: number
}

export interface LocationData {
  x: number
  y: number
  z: number
  date: string
}

export interface TrackPosition {
  x: number
  y: number
  z: number
  timestamp: string
}

export interface Session {
  session_key: number
  session_type: string
  year: number
  circuit_key: number
}

export interface TrackMapData {
  circuit_key: number
  positions: TrackPosition[]
  sector_boundaries: {
    sector: number
    start: TrackPosition
    end: TrackPosition
  }[]
  start_line: TrackPosition
}
