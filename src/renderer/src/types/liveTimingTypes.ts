/**
 * Interface for the negotiation response from the SignalR server.
 */
export interface NegotiationResponse {
  ConnectionToken: string
  ConnectionId: string
  ProtocolVersion: string
  TryWebSockets: boolean
  WebSocketServerUrl: string
  KeepAliveTimeout: number
  DisconnectTimeout: number
  ConnectionTimeout: number
  TransportConnectTimeout: number
  LongPollDelay: number
  SetCookie: boolean
}

export interface F1LiveTimingData {
  C?: string // Control or message ID
  G?: string // Encoded data, if present
  S?: number // Status or sequence number
  M?: Array<{
    H: string // Hub name
    M: string // Method name
    A: unknown[] // Arguments array, type varies by method
  }> // Messages or commands
  R?: RaceData // The main race data payload
}

export interface RaceData {
  Heartbeat?: Heartbeat
  CarData?: string // This appears to be a base64 encoded string, likely compressed or encrypted car data
  Position?: string // This appears to be a base64 encoded string, likely compressed or encrypted position data
  ExtrapolatedClock?: ExtrapolatedClock
  TopThree?: TopThree
  TimingStats?: TimingStats
  TimingAppData?: TimingAppData
  WeatherData?: WeatherData
  TrackStatus?: TrackStatus
  DriverList?: { [racingNumber: string]: Driver }
  SessionInfo?: SessionInfo
  SessionData?: SessionData
  TimingData?: TimingData
  LapCount?: LapCount
}

export interface Heartbeat {
  Utc: string // ISO 8601 Date string, e.g., "2024-02-21T06:56:59.8596855Z"
  _kf: boolean // Unknown purpose, possibly "keep-alive" or "key frame"
}

export interface ExtrapolatedClock {
  Utc: string // ISO 8601 Date string
  Remaining: string // Time remaining, e.g., "04:00:00"
  Extrapolating: boolean
  _kf: boolean
}

export interface TopThree {
  Withheld: boolean
  Lines: TopThreeLine[]
  _kf: boolean
}

export interface TopThreeLine {
  Position: string // Appears to be a string, e.g., "1", but represents a number
  ShowPosition: boolean
  RacingNumber: string // Appears to be a string, e.g., "1", but represents a number
  Tla: string // Three-letter acronym for driver, e.g., "VER"
  BroadcastName: string // e.g., "M VERSTAPPEN"
  FullName: string // e.g., "Max VERSTAPPEN"
  LapTime: string // Appears to be an empty string or time string
  LapState: number // Numeric state of the lap
  DiffToAhead: string // Time difference, empty string or formatted time
  DiffToLeader: string // Time difference, empty string or formatted time
  OverallFastest: boolean
  PersonalFastest: boolean
}

export interface TimingStats {
  Withheld: boolean
  Lines: { [racingNumber: string]: TimingStatsLine }
  _kf: boolean
}

export interface TimingStatsLine {
  Line: number
  RacingNumber: string // Appears to be a string, but represents a number
  PersonalBestLapTime: { Value: string } // Time string
  BestSectors: Array<{ Value: string }> // Array of time strings for sectors
  BestSpeeds: {
    I1: { Value: string } // Speed at intermediate 1
    I2: { Value: string } // Speed at intermediate 2
    FL: { Value: string } // Speed at finish line
    ST: { Value: string } // Speed at speed trap
  }
}

export interface TimingAppData {
  Lines: { [racingNumber: string]: TimingAppLine }
  _kf: boolean
}

export interface TimingAppLine {
  RacingNumber: string // Appears to be a string, but represents a number
  Line: number
}

export interface WeatherData {
  AirTemp: string // Appears to be a string, but represents a number e.g., "21.8"
  Humidity: string // Appears to be a string, but represents a number e.g., "61.0"
  Pressure: string // Appears to be a string, but represents a number e.g., "1020.5"
  Rainfall: string // Appears to be a string, but represents a number e.g., "0"
  TrackTemp: string // Appears to be a string, but represents a number e.g., "28.6"
  WindDirection: string // Appears to be a string, but represents a number e.g., "1"
  WindSpeed: string // Appears to be a string, but represents a number e.g., "1.1"
  _kf: boolean
}

/**
 * Status codes:
 * 1 - AllClear
 * 2 - Yellow
 * 3 - Unknown
 * 4 - SCDeployed
 * 5 - Red
 * 6 - VSCDeployed
 * 7 - VSCEnding
 **/
export interface TrackStatus {
  Status: string // Numeric status as a string, e.g., "1"
  Message: string // e.g., "AllClear"
  _kf: boolean
}

export interface Driver {
  RacingNumber: string // Appears to be a string, but represents a number
  BroadcastName: string
  FullName: string
  Tla: string // Three-letter acronym
  Line: number
  Reference: string // Driver reference code, e.g., "MAXVER01"
  HeadshotUrl: string // URL to driver's headshot image
  TeamName: string // Name of the team
  TeamColour: string // Team color in hex format without #
}

export interface SessionInfo {
  Meeting: {
    Key: number
    Name: string // e.g., "Pre-Season Testing"
    OfficialName: string // e.g., "FORMULA 1 ARAMCO PRE-SEASON TESTING 2024"
    Location: string // e.g., "Sakhir"
    Circuit: {
      Key: number
      ShortName: string // e.g., "Sakhir"
    }
  }
  ArchiveStatus: {
    Status: string // e.g., "Generating"
  }
  Key: number
  Type: string // e.g., "Practice"
  Number: number
  Name: string // e.g., "Practice 1"
  StartDate: string // ISO 8601 Date string
  EndDate: string // ISO 8601 Date string
  GmtOffset: string // GMT offset, e.g., "03:00:00"
  Path: string // File path, e.g., "2024/2024-02-23_Pre-Season_Testing/2024-02-21_Practice_1/"
  _kf: boolean
}

export interface SessionData {
  Series: unknown[] // Type varies, needs investigation
  StatusSeries: Array<{
    Utc: string // ISO 8601 Date string
    TrackStatus: string // e.g., "AllClear"
  }>
  _kf: boolean
}

export interface TimingData {
  Lines: { [racingNumber: string]: DriverTiming }
}

export interface DriverTiming {
  // QUALIFYING ONLY
  KnockedOut: boolean // Indicates if the driver is knocked out of qualifying
  Cutoff: boolean // Indicates if the driver is at the cutoff time for qualifying

  // RACE ONLY
  GapToLeader: string // Time difference to leader, empty string or formatted time
  IntervalToPositionAhead: {
    Value: string // Time difference to position ahead, empty string or formatted time
    Catching: boolean // Indicates if the driver is catching up to the position ahead
  }

  TimeDiffToFastest: string // Time difference, empty string or formatted time
  TimeDiffToPositionAhead: string // Time difference, empty string or formatted time
  Line: number
  Position: string // Appears to be a string, but represents a number
  ShowPosition: boolean
  RacingNumber: string // Appears to be a string, but represents a number
  Retired: boolean
  InPit: boolean
  PitOut: boolean
  Stopped: boolean
  Status: number
  Sectors: Sector[]
  Speeds: {
    I1: SpeedInfo // Speed at intermediate 1
    I2: SpeedInfo // Speed at intermediate 2
    FL: SpeedInfo // Speed at finish line
    ST: SpeedInfo // Speed at speed trap
  }
  BestLapTime: { Value: string } // Time string
  LastLapTime: {
    Value: string // Time string
    Status: number
    OverallFastest: boolean
    PersonalFastest: boolean
  }
  _timestamp?: number // Internal field to track update time
}

export interface Sector {
  Stopped: boolean
  Value: string // Time string for the sector
  Status: number
  OverallFastest: boolean
  PersonalFastest: boolean
  Segments: Array<{ Status: number }>
}

export interface SpeedInfo {
  Value: string // Speed value as a string, e.g., "30.279"
  Status: number
  OverallFastest: boolean
  PersonalFastest: boolean
}

export interface RaceControlMessage {
  Utc: string
  Category: string
  Message: string
  Flag?: string
  Scope?: string
  Sector?: number
  RacingNumber?: string
}

export interface LapCount {
  CurrentLap: number
  TotalLaps: number
}
