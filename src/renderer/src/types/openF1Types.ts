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

export interface TrackMapFile {
  circuit_key: number
  circuit_name: string
  circuit_short_name: string
  country: string
  positions: TrackPosition[]
  sector_boundaries: {
    sector: number
    start: TrackPosition
    end: TrackPosition
  }[]
  start_line: TrackPosition
  metadata: {
    source_session_key: number
    source_year: number
    source_session_type: string
    total_points: number
    lap_distance_km?: number
  }
}

export interface CircuitCorner {
  number: number
  trackPosition: { x: number; y: number }
  angle: number
  length: number
}

export interface TrackMapIndex {
  version: string
  last_updated: string
  circuits: {
    circuit_key: number
    name: string
    short_name: string
    country: string
    filename: string
  }[]
}
