import { useEffect } from 'react'
import { RaceControlMessage } from '../../types/liveTimingTypes'
import { useLapCountStore } from '../../stores/lapCountStore'
import { useHeartbeatStore } from '@renderer/stores/heartbeatStore'
import { useDriverStore } from '@renderer/stores/driverStore'
import { useDriverTimingStore } from '@renderer/stores/driverTimingStore'
import { useWeatherStore } from '@renderer/stores/weatherStore'
import { useRaceControlMessagesStore } from '@renderer/stores/raceControlMessagesStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useSessionDataStore } from '@renderer/stores/sessionDataStore'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'
import { useTimingStatsStore } from '@renderer/stores/timingStatsStore'
import { useTimingAppDataStore } from '@renderer/stores/timingAppDataStore'
import { useExtrapolatedClockStore } from '@renderer/stores/extrapolatedClockStore'
import { useTopThreeStore } from '@renderer/stores/topThreeStore'
import { useCarDataStore } from '@renderer/stores/carDataStore'
import { usePositionStore } from '@renderer/stores/positionStore'
import { useRcmSeriesStore } from '@renderer/stores/rcmSeriesStore'

export function useStoreSubscriptions(): void {
  const updateLapCount = useLapCountStore((state) => state.updateLapCount)
  const updateHeartbeat = useHeartbeatStore((state) => state.updateHeartbeat)
  const updateDriverList = useDriverStore((state) => state.updateDrivers)
  const updateDriverTiming = useDriverTimingStore((state) => state.updateDriverTiming)
  const updateWeather = useWeatherStore((state) => state.updateWeather)
  const updateRaceControlMessages = useRaceControlMessagesStore(
    (state) => state.addRaceControlMessage
  )
  const updateSessionInfo = useSessionInfoStore((state) => state.updateSessionInfo)
  const updateSessionData = useSessionDataStore((state) => state.updateSessionData)
  const updateTrackStatus = useTrackStatusStore((state) => state.updateTrackStatus)
  const updateTimingStats = useTimingStatsStore((state) => state.updateTimingStats)
  const updateTimingAppData = useTimingAppDataStore((state) => state.updateTimingAppData)
  const updateExtrapolatedClock = useExtrapolatedClockStore(
    (state) => state.updateExtrapolatedClock
  )
  const updateTopThree = useTopThreeStore((state) => state.updateTopThree)
  const updateCarData = useCarDataStore((state) => state.updateCarData)
  const updatePositionData = usePositionStore((state) => state.updatePositionData)
  const updateRcmSeries = useRcmSeriesStore((state) => state.updateRcmSeries)

  useEffect(() => {
    // Subscribe to lap count updates
    window.api.onLapCountUpdate((data) => {
      updateLapCount({
        CurrentLap: data.CurrentLap,
        TotalLaps: data.TotalLaps
      })
    })
    // Subscribe to heartbeat updates
    window.api.onHeartbeatUpdate((data) => {
      updateHeartbeat({
        Utc: data.Utc,
        _kf: data._kf
      })
    })
    // Subscribe to driver list
    window.api.onDriverListUpdate((data) => {
      updateDriverList(data)
    })
    // Subscribe to driver timing updates
    window.api.onTimingDataUpdate((data) => {
      if (data.Lines) {
        updateDriverTiming(data.Lines)
      }
    })
    // Subscribe to weather updates
    window.api.onWeatherDataUpdate((data) => {
      updateWeather(data)
    })

    // Subscribe to race control messages
    window.api.onRaceControlMessagesUpdate((messages: { [key: string]: RaceControlMessage }) => {
      // Data comes in as object with string keys, pass directly to store
      updateRaceControlMessages(messages)
    })

    // Subscribe to session info updates
    window.api.onSessionInfoUpdate((data) => {
      updateSessionInfo(data)
    })

    // Subscribe to session data updates
    window.api.onSessionDataUpdate((data) => {
      updateSessionData(data)
    })

    // Subscribe to track status updates
    window.api.onTrackStatusUpdate((data) => {
      updateTrackStatus(data)
    })

    // Subscribe to timing stats updates
    window.api.onTimingStatsUpdate((data) => {
      updateTimingStats(data)
    })

    // Subscribe to timing app data updates
    window.api.onTimingAppDataUpdate((data) => {
      updateTimingAppData(data)
    })

    // Subscribe to extrapolated clock updates
    window.api.onExtrapolatedClockUpdate((data) => {
      updateExtrapolatedClock(data)
    })

    // Subscribe to top three updates
    // window.api.onTopThreeUpdate((data: TopThree) => {
    //   updateTopThree(data)
    // })

    // Subscribe to car data updates
    window.api.onCarDataUpdate((data) => {
      updateCarData(data)
    })

    // Subscribe to position updates
    window.api.onPositionUpdate((data) => {
      updatePositionData(data)
    })

    // Subscribe to RCM series updates
    window.api.onRcmSeriesUpdate((data) => {
      updateRcmSeries(data)
    })
  }, [
    updateLapCount,
    updateHeartbeat,
    updateDriverList,
    updateDriverTiming,
    updateWeather,
    updateRaceControlMessages,
    updateSessionInfo,
    updateSessionData,
    updateTrackStatus,
    updateTimingStats,
    updateTimingAppData,
    updateExtrapolatedClock,
    updateTopThree,
    updateCarData,
    updatePositionData,
    updateRcmSeries
  ])
}
