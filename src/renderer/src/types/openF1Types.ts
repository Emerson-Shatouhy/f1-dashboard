// A point in F1's position frame: the same decimetre units as the live Position.z feed, with y
// pointing up, so it has to be flipped for the screen. z is height (Mexico City sits at ~22,270).
export interface TrackPosition {
  x: number
  y: number
  z: number
}

// Timing sectors measured by scripts/trackMaps from the qualifying session the map was built from.
// Every number is an index into TrackMapData.positions where that sector or minisector starts.
export interface TrackMapSectors {
  starts: number[] // S1 (the start line), S2, S3
  // minisectors[i][j] is where TimingData Sectors[i].Segments[j] starts; null if unmeasurable
  minisectors: number[][] | null
}

export interface TrackMapPitLane {
  positions: TrackPosition[] // From where it leaves the track to where it rejoins
  entry_index: number // Where it leaves the track, as an index into TrackMapData.positions
  exit_index: number // Where it rejoins the track
}

export interface TrackMapData {
  circuit_key: number
  positions: TrackPosition[] // The outline in driving order, 5m apart
  start_index: number // Where the start/finish line is in positions
  sectors: TrackMapSectors | null
  pit_lane: TrackMapPitLane | null
  rotation: number // Degrees anticlockwise, after flipping y, so the map is landscape
}

// resources/track-maps/{circuit_key}.json, written by scripts/trackMaps/generate.js
export interface TrackMapFile extends TrackMapData {
  circuit_name: string
  circuit_short_name: string
  country: string
  source: {
    session: string // e.g. "2026 Mexico City Grand Prix Qualifying"
    pit_lane_session?: string // When the pit lane had to come from an older session
    laps: { driver: string; time: string }[] // The laps the outline was built from
    timing_offset_ms: number
    generated_at: string
  }
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
