import { useDriverStore } from '../stores/driverStore'
import { useDriverTimingStore } from '../stores/driverTimingStore'
import { useSessionInfoStore } from '../stores/sessionInfoStore'
import { useSessionDataStore } from '../stores/sessionDataStore'
import { useWeatherStore } from '../stores/weatherStore'
import { useRaceControlMessagesStore } from '../stores/raceControlMessagesStore'
import { useLapCountStore } from '../stores/lapCountStore'
import { useHeartbeatStore } from '../stores/heartbeatStore'
import { useTrackStatusStore } from '../stores/trackStatusStore'
import { useTimingStatsStore } from '../stores/timingStatsStore'
import { useTimingAppDataStore } from '../stores/timingAppDataStore'
import { useExtrapolatedClockStore } from '../stores/extrapolatedClockStore'
import { useTopThreeStore } from '../stores/topThreeStore'
import { useCarDataStore } from '../stores/carDataStore'
import { usePositionStore } from '../stores/positionStore'
import { useRcmSeriesStore } from '../stores/rcmSeriesStore'
import { useQualiDeltaStore } from '../stores/qualiDeltaStore'

export function resetAllStores(): void {
  useDriverStore.setState({ Drivers: {} })
  useDriverTimingStore.setState({ DriverTiming: {} })
  useSessionInfoStore.setState({ sessionInfo: null })
  useSessionDataStore.setState({ sessionData: null })
  useWeatherStore.setState({
    AirTemp: '0',
    Humidity: '0',
    Pressure: '0',
    Rainfall: '0',
    TrackTemp: '0',
    WindDirection: '0',
    WindSpeed: '0',
    _kf: false,
    history: []
  })
  useRaceControlMessagesStore.setState({ Messages: new Map() })
  useLapCountStore.setState({ CurrentLap: 0, TotalLaps: 0 })
  useHeartbeatStore.setState({ Utc: '', _kf: false })
  useTrackStatusStore.setState({ trackStatus: null })
  useTimingStatsStore.setState({ timingStats: null })
  useTimingAppDataStore.setState({ TimingAppData: {} })
  useExtrapolatedClockStore.setState({ extrapolatedClock: null })
  useTopThreeStore.setState({ topThree: null })
  useCarDataStore.setState({ Cars: {} })
  usePositionStore.setState({ positionData: null, positionTimeline: [] })
  useRcmSeriesStore.setState({ rcmSeries: null })
  useQualiDeltaStore.getState().reset()
}
