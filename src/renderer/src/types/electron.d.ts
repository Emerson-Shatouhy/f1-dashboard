interface Window {
  api: {
    // F1 Data APIs
    onDriverListUpdate: (callback: (driverData: Record<string, any>) => void) => void
    onHeartbeatUpdate: (callback: (data: any) => void) => void
    onCarDataUpdate: (callback: (data: string) => void) => void
    onPositionUpdate: (callback: (data: any) => void) => void
    onExtrapolatedClockUpdate: (callback: (data: any) => void) => void
    onRcmSeriesUpdate: (callback: (data: any[]) => void) => void
    onTimingStatsUpdate: (callback: (data: any) => void) => void
    onTimingAppDataUpdate: (callback: (data: any) => void) => void
    onWeatherDataUpdate: (callback: (data: any) => void) => void
    onTrackStatusUpdate: (callback: (data: any) => void) => void
    onRaceControlMessagesUpdate: (callback: (data: { [key: string]: any }) => void) => void
    onSessionInfoUpdate: (callback: (data: any) => void) => void
    onSessionDataUpdate: (callback: (data: any) => void) => void
    onLapCountUpdate: (callback: (data: { CurrentLap: number; TotalLaps: number }) => void) => void
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
    getClientStatus: () => Promise<{ status: 'disconnected' | 'connecting' | 'connected'; debugMode: boolean; enableLogging: boolean }>
    reconnectF1Client: () => Promise<void>
    setDebugMode: (enabled: boolean, url?: string) => Promise<void>
    setLoggingMode: (enabled: boolean) => Promise<void>
    onClientStatusUpdate: (callback: (data: { status: 'disconnected' | 'connecting' | 'connected'; debugMode: boolean; enableLogging: boolean }) => void) => void

    // F1TV Pro authentication
    f1IsAuthenticated: () => Promise<boolean>
    f1ClearAuth: () => Promise<void>
    f1Login: () => Promise<void>

    // Track map loading
    loadTrackMap: (circuitKey: number) => Promise<unknown>
  }
}
