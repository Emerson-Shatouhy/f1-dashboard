import React from 'react'
import { TrackStatusIndicator } from './badges/TrackStatusIndicator'
import { useLapCountStore } from '@renderer/stores/lapCountStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useCountdownTimer } from '@renderer/hooks/useCountdownTimer'
import { SessionInfoSkeleton } from './Skeletons/SessionInfoSkeleton'
import { Clock } from 'lucide-react'
import WeatherInfo from './WeatherInfo'
import { SettingsPanel } from './SettingsPanel'

export default function SessionInfo(): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const { CurrentLap, TotalLaps } = useLapCountStore()
  const countdownTime = useCountdownTimer()

  if (!sessionInfo) {
    return <SessionInfoSkeleton />
  }

  const { Meeting } = sessionInfo

  return (
    <div className="flex flex-row items-center w-full bg-gray-900 border-2 border-gray-700 rounded-lg px-5 py-3">
      {/* Left: flag + session info */}
      <div className="flex flex-row items-center gap-3 shrink-0">
        <img
          src={`https://f1-dash.com/country-flags/${Meeting.Country.Code.toLowerCase()}.svg`}
          alt={`${Meeting.Country.Name} flag`}
          className="h-9 w-auto object-cover rounded"
        />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-bold text-white uppercase tracking-wide leading-tight">
            {Meeting.Name}
          </h1>
          <div className="flex flex-row items-center gap-2">
            <span className="text-xs text-gray-400">{Meeting.Circuit.ShortName}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">{sessionInfo.Type}</span>
          </div>
        </div>
      </div>

      {/* Center: timer + track status */}
      <div className="flex flex-1 justify-center items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-1.5">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm font-semibold text-gray-200 tracking-widest">
            {sessionInfo.Type === 'Race' ? (
              <>Lap {CurrentLap} / {TotalLaps}</>
            ) : (
              <>{countdownTime}</>
            )}
          </span>
        </div>
        <TrackStatusIndicator />
      </div>

      {/* Right: weather + status */}
      <div className="flex flex-row items-center gap-4 shrink-0">
        <WeatherInfo />
        <SettingsPanel />
      </div>
    </div>
  )
}
