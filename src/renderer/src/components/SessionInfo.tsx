import React from 'react'
import { TrackStatusIndicator } from './badges/TrackStatusIndicator'
import { useLapCountStore } from '@renderer/stores/lapCountStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'
import { useCountdownTimer } from '@renderer/hooks/useCountdownTimer'
import { getTrackStatusConfig } from '@renderer/utils/trackStatus'
import { SessionInfoSkeleton } from './Skeletons/SessionInfoSkeleton'
import WeatherInfo from './WeatherInfo'
import { SettingsPanel } from './SettingsPanel'
import { ViewSwitcher } from './ViewSwitcher'

export default function SessionInfo(): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const { CurrentLap, TotalLaps } = useLapCountStore()
  const countdownTime = useCountdownTimer()
  const trackStatus = useTrackStatusStore((state) => state.trackStatus?.Status)

  if (!sessionInfo) {
    return <SessionInfoSkeleton />
  }

  const { Meeting } = sessionInfo
  const { color, clear } = getTrackStatusConfig(trackStatus)

  return (
    <div
      className="flex h-12 w-full shrink-0 flex-row items-center gap-4 rounded-md border-t-2 px-3 transition-colors duration-500"
      style={{
        borderTopColor: color,
        backgroundColor: clear
          ? 'var(--color-surface-1)'
          : `color-mix(in srgb, ${color} 14%, var(--color-surface-1))`
      }}
    >
      <div className="flex min-w-0 flex-1 flex-row items-center gap-2.5">
        <img
          src={`https://f1-dash.com/country-flags/${Meeting.Country.Code.toLowerCase()}.svg`}
          alt={`${Meeting.Country.Name} flag`}
          className="h-5 w-auto rounded-sm object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-sm font-semibold text-ink">{Meeting.Name}</h1>
          <span className="text-xs whitespace-nowrap text-ink-2">{sessionInfo.Name}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
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

      <div className="flex min-w-0 flex-1 flex-row items-center justify-end gap-3">
        <WeatherInfo />
        <ViewSwitcher />
        <SettingsPanel />
      </div>
    </div>
  )
}
