import { useCallback, useEffect, useRef } from 'react'
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
import { useDelayStore } from '@renderer/stores/delayStore'

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
  const addPositionFrame = usePositionStore((state) => state.addPositionFrame)
  const updateRcmSeries = useRcmSeriesStore((state) => state.updateRcmSeries)

  const enabled = useDelayStore((s) => s.enabled)
  const delayMs = useDelayStore((s) => s.delayMs)
  const _setBuffering = useDelayStore((s) => s._setBuffering)
  const _setCountdown = useDelayStore((s) => s._setCountdown)

  // Refs so the stable enqueue callback can always read current values
  const enabledRef = useRef(enabled)
  const delayMsRef = useRef(delayMs)

  const queueRef = useRef<Array<{ timestamp: number; apply: () => void }>>([])
  const bufferStartRef = useRef<number | null>(null)

  // Keep refs in sync
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    delayMsRef.current = delayMs
  }, [delayMs])

  // When delay is disabled: flush remaining queue immediately and reset state
  useEffect(() => {
    if (!enabled) {
      queueRef.current.forEach((item) => item.apply())
      queueRef.current = []
      bufferStartRef.current = null
      _setBuffering(false)
      _setCountdown(0)
    }
  }, [enabled, _setBuffering, _setCountdown])

  // When delayMs changes: reset buffer so countdown restarts with the new value
  const prevDelayMsRef = useRef(delayMs)
  useEffect(() => {
    if (prevDelayMsRef.current !== delayMs) {
      prevDelayMsRef.current = delayMs
      queueRef.current = []
      bufferStartRef.current = null
      _setBuffering(false)
      _setCountdown(0)
    }
  }, [delayMs, _setBuffering, _setCountdown])

  // Flush interval: check queue every 250ms and apply ready items
  useEffect(() => {
    const interval = setInterval(() => {
      if (!enabledRef.current) return
      if (bufferStartRef.current === null) return

      const now = Date.now()
      const delay = delayMsRef.current
      const bufferAge = now - bufferStartRef.current

      if (bufferAge < delay) {
        _setBuffering(true)
        _setCountdown(Math.ceil((delay - bufferAge) / 1000))
        return
      }

      _setBuffering(false)
      _setCountdown(0)

      const queue = queueRef.current
      let i = 0
      while (i < queue.length && now - queue[i].timestamp >= delay) {
        queue[i].apply()
        i++
      }
      if (i > 0) {
        queueRef.current = queue.slice(i)
      }
    }, 250)

    return () => clearInterval(interval)
  }, [_setBuffering, _setCountdown])

  // Stable enqueue helper — reads current values via refs
  const enqueue = useCallback((apply: () => void) => {
    if (!enabledRef.current) {
      apply()
      return
    }
    const now = Date.now()
    if (bufferStartRef.current === null) {
      bufferStartRef.current = now
    }
    queueRef.current.push({ timestamp: now, apply })
  }, [])

  useEffect(() => {
    window.api.onLapCountUpdate((data) => {
      enqueue(() =>
        updateLapCount({
          CurrentLap: data.CurrentLap,
          TotalLaps: data.TotalLaps
        })
      )
    })

    window.api.onHeartbeatUpdate((data) => {
      enqueue(() =>
        updateHeartbeat({
          Utc: data.Utc,
          _kf: data._kf
        })
      )
    })

    window.api.onDriverListUpdate((data) => {
      enqueue(() => updateDriverList(data))
    })

    window.api.onTimingDataUpdate((data) => {
      enqueue(() => {
        if (data.Lines) {
          updateDriverTiming(data.Lines)
        }
      })
    })

    window.api.onWeatherDataUpdate((data) => {
      enqueue(() => updateWeather(data))
    })

    window.api.onRaceControlMessagesUpdate((messages: { [key: string]: RaceControlMessage }) => {
      enqueue(() => updateRaceControlMessages(messages))
    })

    window.api.onSessionInfoUpdate((data) => {
      enqueue(() => updateSessionInfo(data))
    })

    window.api.onSessionDataUpdate((data) => {
      enqueue(() => updateSessionData(data))
    })

    window.api.onTrackStatusUpdate((data) => {
      enqueue(() => updateTrackStatus(data))
    })

    window.api.onTimingStatsUpdate((data) => {
      enqueue(() => updateTimingStats(data))
    })

    window.api.onTimingAppDataUpdate((data) => {
      enqueue(() => updateTimingAppData(data))
    })

    window.api.onExtrapolatedClockUpdate((data) => {
      enqueue(() => updateExtrapolatedClock(data))
    })

    window.api.onCarDataUpdate((data) => {
      enqueue(() => updateCarData(data))
    })

    window.api.onPositionUpdate((data) => {
      // Capture receive time here so the timeline frame gets the correct wall-clock timestamp
      // even when the queue flushes many updates in a burst
      const receiveTime = Date.now()
      enqueue(() => addPositionFrame(data, receiveTime))
    })

    window.api.onRcmSeriesUpdate((data) => {
      enqueue(() => updateRcmSeries(data))
    })
  }, [
    enqueue,
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
    addPositionFrame,
    updateRcmSeries
  ])
}
