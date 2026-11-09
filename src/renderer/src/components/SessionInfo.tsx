import React from 'react'
import { TrackStatusIndicator } from './badges/TrackStatusIndicator'
import { useLapCountStore } from '@renderer/stores/lapCountStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'
import { useCountdownTimer } from '@renderer/hooks/useCountdownTimer'
import { useDriverTimingStore } from '@renderer/stores/driverTimingStore'
import { getTrackStatusConfig } from '@renderer/utils/trackStatus'
import { getQualiPartLabel, getSessionMode } from '@renderer/utils/timing'
import { SessionInfoSkeleton } from './Skeletons/SessionInfoSkeleton'
import WeatherInfo from './WeatherInfo'
import { SettingsPanel } from './SettingsPanel'

export default function SessionInfo(): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const { CurrentLap, TotalLaps } = useLapCountStore()
  const countdownTime = useCountdownTimer()
  const trackStatus = useTrackStatusStore((state) => state.trackStatus?.Status)
  const sessionPart = useDriverTimingStore((state) => state.SessionPart)

  const { color, clear } = getTrackStatusConfig(trackStatus)
  const qualiPart =
    sessionInfo && getSessionMode(sessionInfo.Type) === 'quali'
      ? getQualiPartLabel(sessionPart, sessionInfo.Name)
      : null

  // The header keeps one structure with or without a session, so SettingsPanel stays mounted
  // (and open) when a reconnect clears the stores
  return (
    <div
      className="flex h-12 w-full shrink-0 flex-row items-center gap-4 rounded-md border-t-2 px-3 transition-colors duration-500"
      style={{
        borderTopColor: sessionInfo ? color : 'var(--color-line)',
        backgroundColor:
          !sessionInfo || clear
            ? 'var(--color-surface-1)'
            : `color-mix(in srgb, ${color} 14%, var(--color-surface-1))`
      }}
    >
      <div className="flex min-w-0 flex-1 flex-row items-center gap-2.5">
        {sessionInfo ? (
          <>
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="truncate text-sm font-semibold text-ink">
                {sessionInfo.Meeting.Name}
              </h1>
              <span className="text-xs whitespace-nowrap text-ink-2">{sessionInfo.Name}</span>
            </div>
          </>
        ) : (
          <SessionInfoSkeleton />
        )}
      </div>

      {sessionInfo && (
        <div className="flex shrink-0 items-center gap-3">
          {qualiPart && (
            <span className="rounded bg-surface-3 px-2 py-0.5 text-sm font-semibold text-ink">
              {qualiPart}
            </span>
          )}
          <span className="text-lg font-semibold whitespace-nowrap text-ink tabular-nums">
            {sessionInfo.Type === 'Race' ? (
              <>
                <span className="mr-1 text-xs font-normal text-ink-3">Lap</span>
                {CurrentLap}
                <span className="text-ink-3"> / {TotalLaps}</span>
              </>
            ) : (
              countdownTime
            )}
          </span>
          <TrackStatusIndicator />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-row items-center justify-end gap-3">
        {sessionInfo && <WeatherInfo />}
        <SettingsPanel />
      </div>
    </div>
  )
}
