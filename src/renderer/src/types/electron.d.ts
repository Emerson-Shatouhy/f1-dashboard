interface Window {
  api: {
    // F1 Data APIs
    onDriverListUpdate: (callback: (driverData: Record<string, any>) => void) => void
    onHeartbeatUpdate: (callback: (data: any) => void) => void
    onCarDataUpdate: (callback: (data: string) => void) => void
    onPositionUpdate: (callback: (data: any) => void) => void
    onExtrapolatedClockUpdate: (callback: (data: any) => void) => void
    onTopThreeUpdate: (callback: (data: any) => void) => void
    onRcmSeriesUpdate: (callback: (data: any[]) => void) => void
    onTimingStatsUpdate: (callback: (data: any) => void) => void
    onTimingAppDataUpdate: (callback: (data: any) => void) => void
    onWeatherDataUpdate: (callback: (data: any) => void) => void
    onTrackStatusUpdate: (callback: (data: any) => void) => void
    onRaceControlMessagesUpdate: (callback: (data: { [key: string]: any }) => void) => void
    onSessionInfoUpdate: (callback: (data: any) => void) => void
    onSessionDataUpdate: (callback: (data: any) => void) => void
    onLapCountUpdate: (callback: (data: { currentLap: number; totalLaps: number }) => void) => void
    onTimingDataUpdate: (callback: (data: any) => void) => void

    // Auto-updater APIs
    onUpdateChecking: (callback: () => void) => void
    onUpdateAvailable: (callback: (info: any) => void) => void
    onUpdateNotAvailable: (callback: (info: any) => void) => void
    onUpdateError: (callback: (error: any) => void) => void
    onUpdateDownloadProgress: (callback: (progress: any) => void) => void
    onUpdateDownloaded: (callback: (info: any) => void) => void
    checkForUpdates: () => Promise<void>
    restartAndUpdate: () => Promise<void>

    // F1 client control
    startF1Client: () => Promise<void>

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
      }) => Promise<unknown>
      getMeetings: (params?: {
        meeting_key?: number
        year?: number
        country_name?: string
        circuit_key?: number
        circuit_short_name?: string
      }) => Promise<unknown>
      getDrivers: (params?: {
        driver_number?: number
        broadcast_name?: string
        full_name?: string
        name_acronym?: string
        team_name?: string
        session_key?: number
      }) => Promise<unknown>
      getPosition: (params?: {
        session_key?: number
        driver_number?: number
        date?: string
      }) => Promise<unknown>
      getCarData: (params?: {
        session_key?: number
        driver_number?: number
        speed?: number
        date?: string
      }) => Promise<unknown>
      getLaps: (params?: {
        session_key?: number
        driver_number?: number
        lap_number?: number
      }) => Promise<unknown>
      getPit: (params?: { session_key?: number; driver_number?: number }) => Promise<unknown>
      getRaceControl: (params?: {
        session_key?: number
        category?: string
        date?: string
      }) => Promise<unknown>
      getTeamRadio: (params?: {
        session_key?: number
        driver_number?: number
        date?: string
      }) => Promise<unknown>
      getWeather: (params?: { session_key?: number; date?: string }) => Promise<unknown>
      getIntervals: (params?: { session_key?: number; date?: string }) => Promise<unknown>
      getStints: (params?: {
        session_key?: number
        driver_number?: number
        compound?: string
      }) => Promise<unknown>
      getSessionResults: (params?: {
        session_key?: number
        year?: number
        position?: number
      }) => Promise<unknown>
      getLocation: (params?: {
        session_key?: number
        driver_number?: number
        date?: string
        start_date?: string
        end_date?: string
      }) => Promise<unknown>
    }
  }
}
